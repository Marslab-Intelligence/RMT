import db from '../db.js';
import { extractFieldEdits } from './geminiClient.js';

// Field allow-list for natural language editing
export const EDITABLE_FIELDS_ALLOWLIST = new Set([
  'client_email',
  'contact_number',
  'sales_email',
  'owner',
  'follow_up_status',
  'follow_up_remarks',
  'renewal_confirmation',
  'expiry_reason',
  'quotation_number',
  'description',
  'renewal_date',
  'quantity'
]);

// Vocabulary enums
export const VALID_RENEWAL_CONFIRMATIONS = new Set([
  'pending',
  'reminder_sent',
  'quote_sent',
  'quotation_confirmation',
  'awaiting_client_approval',
  'awaiting_with_vendor',
  'renewed',
  'cancelled',
  'lost',
  'service_discontinued'
]);

/**
 * Parse natural language request into a safe structured mutation diff
 */
export async function parseNaturalLanguageMutation(utterance, requestingUser) {
  const result = {
    utterance,
    target: null,
    changes: [],
    requiresApproval: false,
    blockedFields: [],
    error: null
  };

  // Blocked field detection (money, invoices, payment, flags)
  const blockedKeywords = /\b(cost|purchase_cost|sales_cost|profit|value|price|invoice|payment|payment_state|day_\d+_sent|locked)\b/i;
  if (blockedKeywords.test(utterance)) {
    result.error = 'Financial amounts, payment states, invoices, and automated ladder flags cannot be edited via chat sentences. Please use dedicated forms or endpoints.';
    return result;
  }

  // Target Resolution by RMT ID (e.g. RMT-273 or unique_id)
  const idMatch = utterance.match(/\b(RMT-\d+)\b/i);
  let renewalRecord = null;

  if (idMatch) {
    const { rows } = await db.query('SELECT * FROM renewals WHERE LOWER(unique_id) = LOWER($1) AND is_deleted = FALSE', [idMatch[1]]);
    if (rows.length > 0) renewalRecord = rows[0];
  }

  if (!renewalRecord) {
    result.error = 'Could not uniquely resolve target renewal record. Please specify exact RMT ID (e.g. RMT-273).';
    return result;
  }

  // Role Scoping: Sales user can only edit their own records
  if (requestingUser?.role === 'sales' && renewalRecord.owner !== requestingUser.full_name && renewalRecord.sales_email !== requestingUser.email) {
    result.error = 'Access denied: You can only edit renewal records assigned to your sales account.';
    return result;
  }

  result.target = {
    id: renewalRecord.id,
    uniqueId: renewalRecord.unique_id,
    clientName: renewalRecord.client_name,
    service: renewalRecord.service
  };

  // Try model-based extraction first; the regex rules below are the
  // degradation path if the API key is missing, budget is exhausted, or the
  // call fails for any reason — the feature must keep working without Gemini.
  const extraction = await extractFieldEdits({
    utterance,
    allowedFields: Array.from(EDITABLE_FIELDS_ALLOWLIST),
    enums: { renewal_confirmation: Array.from(VALID_RENEWAL_CONFIRMATIONS) },
    currentRecord: renewalRecord,
  });

  if (extraction.ok && extraction.edits.length > 0) {
    for (const edit of extraction.edits) {
      if (edit.field === 'renewal_confirmation' && !VALID_RENEWAL_CONFIRMATIONS.has(edit.value)) continue;
      result.changes.push({
        field: edit.field,
        from: renewalRecord[edit.field] ?? '',
        to: edit.value,
      });
    }
  }

  if (result.changes.length === 0) {
    // Rule-based extraction for remarks/status — same behavior as before
    // Gemini was wired in, kept as the fallback path.
    if (/contact|number|phone/i.test(utterance)) {
      const phoneMatch = utterance.match(/\b\d{10}\b/);
      if (phoneMatch) {
        result.changes.push({
          field: 'contact_number',
          from: renewalRecord.contact_number || '',
          to: phoneMatch[0]
        });
      }
    }

    if (/remark|note|follow-up|followup/i.test(utterance)) {
      const remarkMatch = utterance.match(/(?:remark|note|followup|follow-up)\s+(?:to\s+)?["']?([^"']+)["']?/i);
      if (remarkMatch) {
        result.changes.push({
          field: 'follow_up_remarks',
          from: renewalRecord.follow_up_remarks || '',
          to: remarkMatch[1].trim()
        });
      }
    }

    if (/quote sent|quotation sent/i.test(utterance)) {
      result.changes.push({
        field: 'renewal_confirmation',
        from: renewalRecord.renewal_confirmation,
        to: 'quote_sent'
      });
    }
  }

  if (result.changes.length === 0) {
    result.error = 'No valid allow-listed field changes could be parsed from your instruction.';
  }

  return result;
}

/**
 * Execute confirmed natural language mutation with full audit trail
 */
export async function executeNaturalLanguageMutation(mutation, user) {
  if (!mutation || !mutation.target || mutation.changes.length === 0) {
    throw new Error('Invalid mutation object');
  }

  const { id } = mutation.target;

  for (const change of mutation.changes) {
    if (!EDITABLE_FIELDS_ALLOWLIST.has(change.field)) {
      throw new Error(`Field ${change.field} is not in the editable allow-list.`);
    }

    await db.query(`
      UPDATE renewals
      SET ${change.field} = $1, updated_at = NOW()
      WHERE id = $2
    `, [change.to, id]);

    // Audit log
    await db.query(`
      INSERT INTO renewal_history (renewal_id, action, previous_data, new_data, performed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      `Natural Language Edit: ${change.field}`,
      JSON.stringify({ [change.field]: change.from }),
      JSON.stringify({ [change.field]: change.to, utterance: mutation.utterance }),
      user.id
    ]);
  }

  return { success: true, updatedRecordId: id };
}
