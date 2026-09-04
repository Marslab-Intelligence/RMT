/**
 * Deterministic Risk Scorer for Renewal Management System
 * Evaluates risk score (0 - 100) based on weighted database fields.
 */
export function computeRiskScore(renewal) {
  let score = 0;
  const factors = [];

  if (!renewal) return { score: 0, factors: [] };

  // 1. Days to Renewal Date
  const daysLeft = renewal.days_left !== undefined && renewal.days_left !== null
    ? renewal.days_left
    : (renewal.renewal_date ? Math.ceil((new Date(renewal.renewal_date) - new Date()) / (1000 * 60 * 60 * 24)) : 999);

  if (daysLeft < 0) {
    score += 35;
    factors.push({ feature: 'days_left', weight: 35, note: `Expired by ${Math.abs(daysLeft)} days` });
  } else if (daysLeft <= 5) {
    score += 30;
    factors.push({ feature: 'days_left', weight: 30, note: `Imminent expiry in ${daysLeft} days` });
  } else if (daysLeft <= 15) {
    score += 20;
    factors.push({ feature: 'days_left', weight: 20, note: `Expiring soon in ${daysLeft} days` });
  } else if (daysLeft <= 30) {
    score += 10;
    factors.push({ feature: 'days_left', weight: 10, note: `Within 30-day window (${daysLeft} days left)` });
  }

  // 2. Payment State
  const paymentState = renewal.payment_state || 'unknown';
  if (paymentState === 'overdue' || paymentState === 'disputed') {
    score += 25;
    factors.push({ feature: 'payment_state', weight: 25, note: `Payment state is ${paymentState}` });
  } else if (paymentState === 'unpaid') {
    score += 15;
    factors.push({ feature: 'payment_state', weight: 15, note: 'Invoice sent but remains unpaid' });
  } else if (paymentState === 'partially_paid') {
    score += 10;
    factors.push({ feature: 'payment_state', weight: 10, note: 'Partial payment received' });
  }

  // 3. Unresponsive Reminders Count
  const sentCount = ['day_30_sent', 'day_20_sent', 'day_15_sent', 'day_10_sent', 'day_5_sent', 'day_3_sent', 'day_0_sent']
    .filter(flag => renewal[flag] === 'Yes').length;

  if (sentCount >= 4 && renewal.renewal_confirmation === 'pending') {
    score += 20;
    factors.push({ feature: 'unresponsive_reminders', weight: 20, note: `${sentCount} automated reminders sent without response` });
  } else if (sentCount >= 2 && renewal.renewal_confirmation === 'pending') {
    score += 10;
    factors.push({ feature: 'unresponsive_reminders', weight: 10, note: `${sentCount} reminders sent with no confirmation` });
  }

  // 4. Expiry / Cancellation History
  if (renewal.expiry_reason) {
    score += 10;
    factors.push({ feature: 'expiry_reason', weight: 10, note: `Prior notes: ${renewal.expiry_reason}` });
  }

  // 5. Value Magnitude
  const val = parseFloat(renewal.value || 0);
  if (val >= 100000) {
    factors.push({ feature: 'high_value_contract', weight: 0, note: `High-value contract: ₹${val.toLocaleString('en-IN')}` });
  }

  const finalScore = Math.min(Math.max(score, 0), 100);
  const tier = finalScore >= 70 ? 'CRITICAL' : finalScore >= 40 ? 'HIGH' : finalScore >= 20 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    tier,
    factors
  };
}
