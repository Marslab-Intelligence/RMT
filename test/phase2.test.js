import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRiskScore } from '../server/agent/riskScorer.js';
import { APPROVAL_TIERS, runAgentTask } from '../server/agent/agentRunner.js';

test('Phase 2 - Deterministic Risk Scorer', () => {
  const urgentExpired = {
    days_left: -2,
    payment_state: 'overdue',
    day_30_sent: 'Yes',
    day_20_sent: 'Yes',
    day_15_sent: 'Yes',
    day_10_sent: 'Yes',
    renewal_confirmation: 'pending',
    value: 150000
  };

  const risk = computeRiskScore(urgentExpired);
  assert.equal(risk.tier, 'CRITICAL');
  assert.equal(risk.score >= 70, true);
  assert.equal(risk.factors.length >= 3, true);
});

test('Phase 2 - Approval Tier Classifications', () => {
  assert.equal(APPROVAL_TIERS['get_portfolio_summary'], 'auto');
  assert.equal(APPROVAL_TIERS['draft_outreach_email'], 'approve_first');
  assert.equal(APPROVAL_TIERS['delete_renewal_record'], 'human_only');
});

test('Phase 2 - Agent Execution Budgeting & Loop Prevention', async () => {
  const user = { role: 'sales', full_name: 'John Sales', email: 'john@example.com' };
  const res = await runAgentTask({ prompt: 'Show portfolio summary', user });

  assert.equal(res.completed, true);
  assert.equal(res.totalSteps <= 12, true);
  assert.equal(typeof res.finalResult === 'string', true);
});
