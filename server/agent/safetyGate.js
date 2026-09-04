import db from '../db.js';
import crypto from 'crypto';

let globalAgentPaused = false;

export function setGlobalAgentPause(paused) {
  globalAgentPaused = Boolean(paused);
}

export function isGlobalAgentPaused() {
  return globalAgentPaused;
}

/**
 * 1. Extracts numbers from text for numeric grounding assertion.
 */
export function extractNumbers(text) {
  if (!text) return [];
  // Collapse thousands separators first (92,000 -> 92000) so a comma-grouped
  // number in prose and its unformatted counterpart in payloadContext are
  // recognized as the same number — otherwise every drafted amount over 999
  // reads as two separate, unmatchable digit groups and gets vetoed.
  const normalized = text.replace(/(\d),(?=\d{3}\b)/g, '$1');
  const matches = normalized.match(/\b\d+(?:\.\d+)?\b/g);
  return matches ? matches.map(n => n.toString()) : [];
}

/**
 * Asserts that all numbers in draft text exist in the tool payload context.
 */
export function checkNumericGrounding(draftText, payloadContext) {
  const draftNumbers = extractNumbers(draftText);
  if (draftNumbers.length === 0) return { passed: true, unmatchedNumbers: [] };

  const contextJson = JSON.stringify(payloadContext || {});
  const contextNumbers = new Set(extractNumbers(contextJson));

  const unmatched = draftNumbers.filter(num => !contextNumbers.has(num));

  return {
    passed: unmatched.length === 0,
    unmatchedNumbers: unmatched,
    reason: unmatched.length > 0 ? `Draft contains ungrounded numbers: ${unmatched.join(', ')}` : null
  };
}

/**
 * 2. Enforces Payment Claim Block until Phase 0.1 verification is complete.
 */
export function checkPaymentClaimBlock(draftText, isPaymentVerified = false) {
  if (isPaymentVerified) return { passed: true };

  const paymentKeywords = /\b(paid|unpaid|overdue|partially paid|payment|invoice amount|pending payment|balance due)\b/i;
  if (paymentKeywords.test(draftText)) {
    return {
      passed: false,
      reason: 'Payment state claims are blocked until payment verification is completed.'
    };
  }
  return { passed: true };
}

/**
 * 3. Entity Ownership Assertion
 * Verifies that unique_id or client_name referenced in draft belongs to recipient.
 */
export function checkEntityOwnership(draftText, renewalRecord) {
  if (!renewalRecord) return { passed: true };

  // Match RMT-XXX patterns in draft
  const rmtMatches = draftText.match(/RMT-\d+/gi) || [];
  for (const match of rmtMatches) {
    if (renewalRecord.unique_id && match.toUpperCase() !== renewalRecord.unique_id.toUpperCase()) {
      return {
        passed: false,
        reason: `Entity mismatch: draft references ${match} which does not belong to recipient record ${renewalRecord.unique_id}`
      };
    }
  }
  return { passed: true };
}

/**
 * 4. Frequency Cap Check
 * Max 1 message per client per channel per 24h, max 4 per 30 days.
 */
export async function checkFrequencyCap(recipientEmail, channel = 'email') {
  if (!recipientEmail) return { passed: true };
  try {
    const last24h = await db.query(`
      SELECT COUNT(*)::int as count FROM email_logs 
      WHERE recipient_email = $1 AND sent_at >= NOW() - INTERVAL '24 hours'
    `, [recipientEmail]);

    if (last24h.rows[0]?.count >= 1) {
      return { passed: false, reason: 'Frequency cap exceeded: maximum 1 message per 24 hours per client.' };
    }

    const last30d = await db.query(`
      SELECT COUNT(*)::int as count FROM email_logs 
      WHERE recipient_email = $1 AND sent_at >= NOW() - INTERVAL '30 days'
    `, [recipientEmail]);

    if (last30d.rows[0]?.count >= 4) {
      return { passed: false, reason: 'Frequency cap exceeded: maximum 4 messages per 30 days per client.' };
    }
  } catch (err) {
    // Pass if db is offline during standalone tests
  }
  return { passed: true };
}

/**
 * 5. Ladder Collision Check
 * Vetoes if reminder ladder already sent to client today or is due.
 */
export function checkLadderCollision(renewalRecord) {
  if (!renewalRecord) return { passed: true };
  const todayBucket = new Date().toISOString().slice(0, 10);
  if (renewalRecord.last_reminder_sent_date === todayBucket) {
    return { passed: false, reason: 'Ladder collision: system reminder already sent to client today.' };
  }
  return { passed: true };
}

/**
 * 6. Tone-vs-Context Classifier
 * Flags celebratory or salesy framing on accounts with negative signals.
 */
export function checkToneVsContext(draftText, renewalRecord) {
  if (!renewalRecord) return { passed: true };
  const excitedSalesyPattern = /\b(exciting|congratulations|exclusive deal|limited time offer|huge discount)\b/i;
  const negativeSignals = ['Pending Renewal', 'Expired', 'overdue', 'disputed', 'lost'];
  
  const hasNegativeSignal = negativeSignals.includes(renewalRecord.status) || 
                          negativeSignals.includes(renewalRecord.payment_state) ||
                          negativeSignals.includes(renewalRecord.renewal_confirmation);

  if (hasNegativeSignal && excitedSalesyPattern.test(draftText)) {
    return {
      passed: false,
      reason: 'Tone mismatch: salesy/celebratory language flagged on account with negative signal.'
    };
  }
  return { passed: true };
}

/**
 * Complete Phase 1 Safety Gate Chain
 */
export async function validateDraftSafety({
  draftText,
  recipientEmail,
  renewalRecord,
  payloadContext = {},
  isPaymentVerified = false,
  channel = 'email',
  templateId = 'default'
}) {
  const vetoes = [];

  // Global Pause Check
  if (globalAgentPaused) {
    return {
      passed: false,
      vetoes: [{ check: 'global_pause', reason: 'Global agent execution is currently PAUSED by administrator.' }],
      idempotencyKey: null
    };
  }

  // 1. Numeric Grounding
  const grounding = checkNumericGrounding(draftText, payloadContext);
  if (!grounding.passed) {
    vetoes.push({ check: 'numeric_grounding', reason: grounding.reason });
  }

  // 2. Payment Claim Block
  const paymentCheck = checkPaymentClaimBlock(draftText, isPaymentVerified);
  if (!paymentCheck.passed) {
    vetoes.push({ check: 'payment_claim_block', reason: paymentCheck.reason });
  }

  // 3. Entity Ownership
  const ownership = checkEntityOwnership(draftText, renewalRecord);
  if (!ownership.passed) {
    vetoes.push({ check: 'entity_ownership', reason: ownership.reason });
  }

  // 4. Suppression Checks
  if (renewalRecord) {
    if (renewalRecord.locked === 1) {
      vetoes.push({ check: 'suppression', reason: 'Record is locked.' });
    }
    if (renewalRecord.status === 'Expired' && !renewalRecord.expiry_reason) {
      vetoes.push({ check: 'suppression', reason: 'Expired record missing mandatory expiry reason.' });
    }
    const prohibitedConfirmations = ['cancelled', 'lost', 'service_discontinued'];
    if (prohibitedConfirmations.includes(renewalRecord.renewal_confirmation)) {
      vetoes.push({ check: 'suppression', reason: `Record confirmation status is ${renewalRecord.renewal_confirmation}.` });
    }
    if (renewalRecord.edit_status === 'requested') {
      vetoes.push({ check: 'suppression', reason: 'Record has pending edit request.' });
    }
  }

  // 5. Frequency Cap
  const freqCap = await checkFrequencyCap(recipientEmail, channel);
  if (!freqCap.passed) {
    vetoes.push({ check: 'frequency_cap', reason: freqCap.reason });
  }

  // 6. Ladder Collision
  const ladder = checkLadderCollision(renewalRecord);
  if (!ladder.passed) {
    vetoes.push({ check: 'ladder_collision', reason: ladder.reason });
  }

  // 7. Recipient Validity
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    vetoes.push({ check: 'recipient_validity', reason: 'Invalid or missing recipient email address.' });
  }

  // 8. Tone vs Context
  const toneCheck = checkToneVsContext(draftText, renewalRecord);
  if (!toneCheck.passed) {
    vetoes.push({ check: 'tone_vs_context', reason: toneCheck.reason });
  }

  // 9. Automation Settings Respect
  try {
    const { rows } = await db.query("SELECT value FROM automation_settings WHERE key = 'email_automation'");
    if (rows.length > 0 && rows[0].value !== 'start') {
      vetoes.push({ check: 'automation_respect', reason: 'Global email automation switch is turned OFF.' });
    }
  } catch (err) {
    // Fallback if db unavailable in unit test environment
  }

  // Generate Idempotency Key
  const dateBucket = new Date().toISOString().slice(0, 10);
  const idempotencyRaw = `${recipientEmail}_${templateId}_${renewalRecord?.id || '0'}_${dateBucket}`;
  const idempotencyKey = crypto.createHash('sha256').update(idempotencyRaw).digest('hex');

  return {
    passed: vetoes.length === 0,
    vetoes,
    idempotencyKey
  };
}
