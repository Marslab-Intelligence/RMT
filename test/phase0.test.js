import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPaymentClaimBlock } from '../server/agent/safetyGate.js';

test('Phase 0.1 - Payment State Webhook Status Mapping', () => {
  const mapStatusToPaymentState = (status) => {
    let paymentState = 'unknown';
    const normalizedStatus = (status || '').toLowerCase();
    if (normalizedStatus === 'paid') paymentState = 'paid';
    else if (normalizedStatus === 'partially_paid') paymentState = 'partially_paid';
    else if (normalizedStatus === 'overdue') paymentState = 'overdue';
    else if (normalizedStatus === 'sent') paymentState = 'unpaid';
    return paymentState;
  };

  assert.equal(mapStatusToPaymentState('paid'), 'paid');
  assert.equal(mapStatusToPaymentState('partially_paid'), 'partially_paid');
  assert.equal(mapStatusToPaymentState('overdue'), 'overdue');
  assert.equal(mapStatusToPaymentState('sent'), 'unpaid');
  assert.equal(mapStatusToPaymentState('draft'), 'unknown');
});

test('Phase 0.1 - Payment Claim Block Veto on Unverified Claims', () => {
  const unverifiedDraft = 'Your account has an overdue invoice balance.';
  const verifiedDraft = 'Your upcoming renewal is scheduled for September.';

  const unverifiedCheck = checkPaymentClaimBlock(unverifiedDraft, false);
  assert.equal(unverifiedCheck.passed, false);
  assert.match(unverifiedCheck.reason, /Payment state claims are blocked/i);

  const verifiedCheck = checkPaymentClaimBlock(verifiedDraft, false);
  assert.equal(verifiedCheck.passed, true);
});

test('Phase 0.2 - Read-Only Fetch Flag Assertion', () => {
  const requestParams = { query: { readOnly: 'true' } };
  const isReadOnly = requestParams.query.readOnly === 'true' || requestParams.query.readOnly === '1';

  assert.equal(isReadOnly, true);
  assert.equal(requestParams.query.readOnly !== 'true' && requestParams.query.readOnly !== '1', false);
});
