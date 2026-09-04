import db from '../db.js';

/**
 * Guardian Mode — System Anomaly and Integrity Scanner
 */
export async function runGuardianIntegrityScan() {
  const findings = [];

  // 1. Arithmetic Anomalies
  const { rows: arithmeticErrors } = await db.query(`
    SELECT id, unique_id, client_name, purchase_cost, sales_cost, quantity, total_purchase_cost, total_sales_cost, profit
    FROM renewals
    WHERE is_deleted = FALSE
      AND (
        ABS(profit - (total_sales_cost - total_purchase_cost)) > 1.00
        OR total_sales_cost < total_purchase_cost
      )
  `);

  arithmeticErrors.forEach(r => {
    findings.push({
      category: 'Arithmetic Discrepancy',
      severity: r.total_sales_cost < r.total_purchase_cost ? 'HIGH' : 'MEDIUM',
      renewalId: r.id,
      uniqueId: r.unique_id,
      clientName: r.client_name,
      description: r.total_sales_cost < r.total_purchase_cost
        ? `Contract selling at a net loss (Total Sales: ₹${r.total_sales_cost}, Total Purchase: ₹${r.total_purchase_cost})`
        : `Profit column (₹${r.profit}) mismatches calculated net margin (₹${(r.total_sales_cost - r.total_purchase_cost).toFixed(2)})`,
      suggestedFix: 'Re-calculate line-item totals and update cost structures.'
    });
  });

  // 2. State Contradictions (Expired without reason)
  const { rows: missingReasons } = await db.query(`
    SELECT id, unique_id, client_name, renewal_date
    FROM renewals
    WHERE is_deleted = FALSE
      AND status = 'Expired'
      AND (expiry_reason IS NULL OR TRIM(expiry_reason) = '')
  `);

  missingReasons.forEach(r => {
    findings.push({
      category: 'Missing Mandatory Reason',
      severity: 'MEDIUM',
      renewalId: r.id,
      uniqueId: r.unique_id,
      clientName: r.client_name,
      description: `Renewal lapsed on ${r.renewal_date ? new Date(r.renewal_date).toLocaleDateString('en-IN') : 'N/A'} without mandatory expiry reason recorded.`,
      suggestedFix: 'Prompt owner for churn/expiry reason.'
    });
  });

  // 3. Payment Anomalies
  const { rows: paymentAnomalies } = await db.query(`
    SELECT id, unique_id, client_name, invoice_value, payment_amount
    FROM renewals
    WHERE is_deleted = FALSE
      AND payment_amount IS NOT NULL
      AND invoice_value IS NOT NULL
      AND payment_amount > invoice_value
  `);

  paymentAnomalies.forEach(r => {
    findings.push({
      category: 'Payment Amount Overflow',
      severity: 'HIGH',
      renewalId: r.id,
      uniqueId: r.unique_id,
      clientName: r.client_name,
      description: `Payment received (₹${r.payment_amount}) exceeds total invoice value (₹${r.invoice_value}).`,
      suggestedFix: 'Verify Zoho Books payment sync or manual payment entry.'
    });
  });

  return {
    scannedAt: new Date().toISOString(),
    totalFindings: findings.length,
    findings
  };
}
