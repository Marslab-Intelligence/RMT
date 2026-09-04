import db from '../db.js';
import { computeRiskScore } from './riskScorer.js';
import { validateDraftSafety } from './safetyGate.js';
import { draftOutreach } from './geminiClient.js';

/**
 * 09:05 IST Catch-Up Aware Daily Sweep
 */
export async function runDailySweep() {
  console.log('🤖 [Agent Daily Sweep] Starting 09:05 IST catch-up aware renewal scan...');

  // Fetch all active or pending renewals with upcoming or past-due renewal dates
  const { rows: renewals } = await db.query(`
    SELECT *, (renewal_date - CURRENT_DATE) as days_left
    FROM renewals
    WHERE is_deleted = FALSE
      AND status IN ('Active', 'Pending Renewal')
      AND renewal_date IS NOT NULL
    ORDER BY renewal_date ASC
  `);

  const sweepSummary = {
    totalScanned: renewals.length,
    criticalCount: 0,
    highCount: 0,
    queuedForApproval: 0,
    skippedCount: 0
  };

  for (const r of renewals) {
    const risk = computeRiskScore(r);
    r.value = parseFloat(r.value || 0);

    if (risk.tier === 'CRITICAL') sweepSummary.criticalCount++;
    if (risk.tier === 'HIGH') sweepSummary.highCount++;

    // Check if outreach is needed (e.g. 30, 20, 15, 10, 5, 3, 0 day windows)
    const days = r.days_left;
    let targetLadderDay = null;

    if (days <= 0 && r.day_0_sent !== 'Yes') targetLadderDay = 0;
    else if (days <= 3 && r.day_3_sent !== 'Yes') targetLadderDay = 3;
    else if (days <= 5 && r.day_5_sent !== 'Yes') targetLadderDay = 5;
    else if (days <= 10 && r.day_10_sent !== 'Yes') targetLadderDay = 10;
    else if (days <= 15 && r.day_15_sent !== 'Yes') targetLadderDay = 15;
    else if (days <= 20 && r.day_20_sent !== 'Yes') targetLadderDay = 20;
    else if (days <= 30 && r.day_30_sent !== 'Yes') targetLadderDay = 30;

    if (targetLadderDay !== null) {
      // Template text doubles as the fallback if drafting fails or the API
      // key is unset — the sweep must keep producing a proposal either way.
      const templateText = `Dear ${r.client_name}, your ${r.service} subscription (ID: ${r.unique_id}) is due for renewal on ${new Date(r.renewal_date).toLocaleDateString('en-IN')}. Current contract value is ₹${r.value.toLocaleString('en-IN')}. Please confirm your renewal preference.`;

      const drafted = await draftOutreach({
        clientName: r.client_name,
        service: r.service,
        uniqueId: r.unique_id,
        renewalDate: new Date(r.renewal_date).toLocaleDateString('en-IN'),
        value: r.value,
        daysLeft: days,
      });
      const draftMessageText = drafted.ok ? drafted.text : templateText;
      const modelVersion = drafted.ok ? drafted.model : 'v1.1.0-rules-fallback';

      // Validate through Safety Gate. checkNumericGrounding re-verifies every
      // number in the final text against payloadContext regardless of
      // whether it came from Gemini or the template — drafting source
      // doesn't change what the gate is willing to trust.
      const gateResult = await validateDraftSafety({
        draftText: draftMessageText,
        recipientEmail: r.client_email,
        renewalRecord: r,
        // renewalDate included in both forms actually seen in drafted text —
        // a formatted date (25/8/2026) and drafts occasionally reference the
        // year or day alone. Without this, any date mention in the draft was
        // unconditionally vetoed since nothing in the context could ground it.
        payloadContext: {
          value: r.value,
          daysLeft: days,
          service: r.service,
          client: r.client_name,
          renewalDate: new Date(r.renewal_date).toLocaleDateString('en-IN'),
          renewalDateIso: r.renewal_date,
        },
        isPaymentVerified: false,
        templateId: `ladder_${targetLadderDay}`
      });

      // Queue in agent_episodes for Human Approval Inbox
      await db.query(`
        INSERT INTO agent_episodes (
          renewal_id, action, context_snapshot, proposed_action, model_version, confidence, human_verdict, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, 0.95, 'pending', $6)
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
      `, [
        r.id,
        `outreach_draft_day_${targetLadderDay}`,
        JSON.stringify({ risk, daysLeft: days, clientEmail: r.client_email, uniqueId: r.unique_id }),
        JSON.stringify({
          message: draftMessageText,
          gateResult,
          targetLadderDay,
          proposedChannel: 'email'
        }),
        modelVersion,
        gateResult.idempotencyKey
      ]);

      if (gateResult.passed) {
        await db.query(
          `UPDATE renewals SET last_reminder_sent_date = CURRENT_DATE WHERE id = $1`,
          [r.id]
        );
      }

      sweepSummary.queuedForApproval++;
    } else {
      sweepSummary.skippedCount++;
    }
  }

  console.log('✅ [Agent Daily Sweep] Completed:', sweepSummary);
  return sweepSummary;
}
