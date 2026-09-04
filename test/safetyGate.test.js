import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDraftSafety,
  checkNumericGrounding,
  checkPaymentClaimBlock,
  checkEntityOwnership,
  checkLadderCollision,
  checkToneVsContext,
  setGlobalAgentPause
} from '../server/agent/safetyGate.js';

test('1. Numeric Grounding - Vetoes draft when draft contains ungrounded numbers', () => {
  const contextData = { value: 50000, daysLeft: 15 };
  const draftText = 'Your renewal cost is 75000 and due in 15 days.';
  
  const result = checkNumericGrounding(draftText, contextData);
  assert.equal(result.passed, false);
  assert.equal(result.unmatchedNumbers.includes('75000'), true);
});

test('1. Numeric Grounding - Passes when all numbers exist in context', () => {
  const contextData = { value: 50000, daysLeft: 15 };
  const draftText = 'Your renewal cost is 50000 and due in 15 days.';
  
  const result = checkNumericGrounding(draftText, contextData);
  assert.equal(result.passed, true);
});

test('2. Payment Claim Block - Vetoes payment claims when payment state is unverified', () => {
  const draftText = 'We noticed your payment of 10000 is overdue.';
  const isPaymentVerified = false;
  
  const result = checkPaymentClaimBlock(draftText, isPaymentVerified);
  assert.equal(result.passed, false);
  assert.match(result.reason, /Payment state claims are blocked/i);
});

test('3. Entity Ownership - Vetoes when draft references a different RMT ID', () => {
  const record = { id: 1, unique_id: 'RMT-100', client_name: 'Acme Corp' };
  const draftText = 'Regarding your contract RMT-200, please confirm.';

  const result = checkEntityOwnership(draftText, record);
  assert.equal(result.passed, false);
  assert.match(result.reason, /Entity mismatch/i);
});

test('4. Suppression Rules - Vetoes locked records and cancelled confirmations', async () => {
  const lockedRecord = { id: 1, unique_id: 'RMT-100', locked: 1, renewal_confirmation: 'pending' };
  const res = await validateDraftSafety({
    draftText: 'Hello, your renewal is due.',
    recipientEmail: 'client@example.com',
    renewalRecord: lockedRecord
  });
  assert.equal(res.passed, false);
  assert.equal(res.vetoes.some(v => v.check === 'suppression'), true);
});

test('5. Ladder Collision - Vetoes when reminder was already sent today', () => {
  const todayBucket = new Date().toISOString().slice(0, 10);
  const record = { id: 1, last_reminder_sent_date: todayBucket };

  const result = checkLadderCollision(record);
  assert.equal(result.passed, false);
  assert.match(result.reason, /Ladder collision/i);
});

test('6. Recipient Validity - Vetoes malformed or missing emails', async () => {
  const res = await validateDraftSafety({
    draftText: 'Hello',
    recipientEmail: 'invalid-email-address'
  });
  assert.equal(res.passed, false);
  assert.equal(res.vetoes.some(v => v.check === 'recipient_validity'), true);
});

test('7. Tone vs Context - Vetoes salesy/celebratory wording on overdue accounts', () => {
  const record = { status: 'Pending Renewal', payment_state: 'overdue' };
  const draftText = 'Congratulations! Take advantage of this exclusive deal!';

  const result = checkToneVsContext(draftText, record);
  assert.equal(result.passed, false);
  assert.match(result.reason, /Tone mismatch/i);
});

test('8. Global Emergency Pause - Vetoes all executions when pause is enabled', async () => {
  setGlobalAgentPause(true);
  const res = await validateDraftSafety({
    draftText: 'Hello client',
    recipientEmail: 'client@example.com'
  });
  assert.equal(res.passed, false);
  assert.equal(res.vetoes[0].check, 'global_pause');
  setGlobalAgentPause(false); // reset
});
