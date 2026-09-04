import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all product pricing catalog items
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Auto-sync missing vendor products directly from live client renewal records
    await pool.query(`
      INSERT INTO product_pricing (vendor, product_name, service_category, list_price, erp_price, purchase_cost, sales_cost, coupon_discount_percent, description)
      SELECT 
        r.vendor,
        r.product AS product_name,
        COALESCE(NULLIF(r.service, ''), 'Software & Services') AS service_category,
        ROUND(COALESCE(NULLIF(AVG(r.sales_cost), 0), NULLIF(AVG(r.value), 0), 1000) * 1.15, 2) AS list_price,
        0.00 AS erp_price,
        ROUND(COALESCE(NULLIF(AVG(r.purchase_cost), 0), 0), 2) AS purchase_cost,
        ROUND(COALESCE(NULLIF(AVG(r.sales_cost), 0), NULLIF(AVG(r.value / NULLIF(r.quantity, 0)), 0), 0), 2) AS sales_cost,
        10.00 AS coupon_discount_percent,
        CONCAT('Synced from client renewals (Service Plan: ', COALESCE(r.service, 'General'), ')') AS description
      FROM renewals r
      WHERE r.vendor IS NOT NULL AND r.vendor != '' AND r.product IS NOT NULL AND r.product != ''
        AND NOT EXISTS (
          SELECT 1 FROM product_pricing p 
          WHERE LOWER(p.vendor) = LOWER(r.vendor) AND LOWER(p.product_name) = LOWER(r.product)
        )
      GROUP BY r.vendor, r.product, r.service
    `);

    // Update zero or uninitialized purchase_cost and sales_cost from client renewal records for matching vendor and product
    await pool.query(`
      UPDATE product_pricing p
      SET 
        purchase_cost = CASE WHEN sub.avg_purchase_cost > 0 THEN sub.avg_purchase_cost ELSE p.purchase_cost END,
        sales_cost = CASE WHEN sub.avg_sales_cost > 0 THEN sub.avg_sales_cost ELSE p.sales_cost END
      FROM (
        SELECT 
          LOWER(r.vendor) AS vendor_clean, 
          LOWER(r.product) AS product_clean, 
          ROUND(COALESCE(NULLIF(AVG(r.purchase_cost), 0), 0), 2) AS avg_purchase_cost,
          ROUND(COALESCE(NULLIF(AVG(r.sales_cost), 0), 0), 2) AS avg_sales_cost
        FROM renewals r
        WHERE r.vendor IS NOT NULL AND r.vendor != '' 
          AND r.product IS NOT NULL AND r.product != '' 
          AND (r.purchase_cost > 0 OR r.sales_cost > 0)
        GROUP BY LOWER(r.vendor), LOWER(r.product)
      ) sub
      WHERE LOWER(p.vendor) = sub.vendor_clean 
        AND LOWER(p.product_name) = sub.product_clean;
    `);

    const { vendor, search } = req.query;
    
    let query = `
      SELECT 
        p.*,
        COALESCE(
          STRING_AGG(DISTINCT r.client_name, ', ') FILTER (WHERE r.client_name IS NOT NULL AND r.client_name != ''),
          ''
        ) as associated_clients_summary,
        COALESCE(
          STRING_AGG(DISTINCT CONCAT(r.client_name, ' ', COALESCE(r.client_email,''), ' ', COALESCE(r.owner,''), ' ', COALESCE(r.unique_id,''), ' ', COALESCE(r.quotation_number,''), ' ', COALESCE(r.invoice_number,''), ' ', COALESCE(r.reference_id,'')), ' | ') FILTER (WHERE r.client_name IS NOT NULL),
          ''
        ) as associated_clients,
        COUNT(DISTINCT r.id) FILTER (WHERE r.id IS NOT NULL AND (r.is_deleted IS FALSE OR r.is_deleted IS NULL)) as active_client_contracts
      FROM product_pricing p
      LEFT JOIN renewals r 
        ON LOWER(r.vendor) = LOWER(p.vendor) 
        AND (
          LOWER(r.product) = LOWER(p.product_name)
          OR LOWER(r.service) = LOWER(p.service_category)
          OR LOWER(r.product) LIKE LOWER('%' || p.product_name || '%')
          OR LOWER(p.product_name) LIKE LOWER('%' || r.product || '%')
          OR REPLACE(REPLACE(LOWER(r.product), ' ', ''), '-', '') LIKE LOWER('%' || REPLACE(REPLACE(p.product_name, ' ', ''), '-', '') || '%')
        )
      WHERE 1=1
    `;
    const params = [];

    if (vendor && vendor !== 'all') {
      params.push(vendor);
      query += ` AND LOWER(p.vendor) = LOWER($${params.length})`;
    }

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      const normSearch = cleanSearch.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s = `%${cleanSearch}%`;
      const sNorm = `%${normSearch}%`;

      params.push(s);
      const sIdx = params.length;
      params.push(sNorm);
      const sNormIdx = params.length;

      query += ` AND (
        LOWER(p.product_name) LIKE LOWER($${sIdx}) OR 
        LOWER(p.vendor) LIKE LOWER($${sIdx}) OR 
        LOWER(p.service_category) LIKE LOWER($${sIdx}) OR
        LOWER(p.description) LIKE LOWER($${sIdx}) OR
        REPLACE(REPLACE(LOWER(p.product_name), ' ', ''), '-', '') LIKE $${sNormIdx} OR
        REPLACE(REPLACE(LOWER(p.service_category), ' ', ''), '-', '') LIKE $${sNormIdx} OR
        EXISTS (
          SELECT 1 FROM renewals r2
          WHERE LOWER(r2.vendor) = LOWER(p.vendor)
            AND (
              LOWER(r2.client_name) LIKE LOWER($${sIdx}) OR
              LOWER(r2.product) LIKE LOWER($${sIdx}) OR
              LOWER(r2.service) LIKE LOWER($${sIdx}) OR
              LOWER(r2.client_email) LIKE LOWER($${sIdx}) OR
              LOWER(r2.unique_id) LIKE LOWER($${sIdx}) OR
              REPLACE(REPLACE(LOWER(r2.client_name), ' ', ''), '-', '') LIKE $${sNormIdx} OR
              REPLACE(REPLACE(LOWER(r2.product), ' ', ''), '-', '') LIKE $${sNormIdx} OR
              REPLACE(REPLACE(LOWER(r2.service), ' ', ''), '-', '') LIKE $${sNormIdx}
            )
        )
      )`;
    }

    query += ' GROUP BY p.id ORDER BY p.vendor ASC, p.product_name ASC';
    const result = await pool.query(query, params);

    // Enrich records with calculated financial metrics:
    // Profit = Sales Cost - Purchase Cost
    // Net Margin (%) = (Profit / Sales Cost) * 100
    const items = result.rows.map(row => {
      const listPrice = parseFloat(row.list_price || 0);
      const erpPrice = parseFloat(row.erp_price || 0);
      const couponDiscountPct = parseFloat(row.coupon_discount_percent || 0);

      // Discounted Price after applying coupon discount
      const discountedPrice = listPrice > 0 
        ? listPrice * (1 - (couponDiscountPct / 100))
        : erpPrice;

      // Purchase Cost: cost to us from vendor
      const rawPurchase = parseFloat(row.purchase_cost || 0);
      const rawSales = parseFloat(row.sales_cost || 0);
      const purchaseCost = rawPurchase > 0 ? rawPurchase : (rawSales > 0 ? rawSales : 0);

      // Effective Sales Cost: selling price to client
      let salesCost = erpPrice > 0 ? erpPrice : (discountedPrice > 0 ? discountedPrice : listPrice);
      if (rawSales > 0 && rawSales !== purchaseCost) {
        salesCost = rawSales;
      }

      // Profit = Sales Cost - Purchase Cost
      const profitAmount = salesCost - purchaseCost;

      // Net Margin (%) = (Profit / Sales Cost) * 100
      const marginPercent = salesCost > 0 ? (profitAmount / salesCost) * 100 : 0;

      // Purchase Cost Percentage relative to Sales Cost
      const salesCostPercent = salesCost > 0 ? (purchaseCost / salesCost) * 100 : 0;

      // ERP Savings Percentage
      const erpSavingsPercent = listPrice > 0 ? ((listPrice - (erpPrice > 0 ? erpPrice : salesCost)) / listPrice) * 100 : 0;

      return {
        ...row,
        list_price: listPrice,
        erp_price: erpPrice,
        purchase_cost: Math.round(purchaseCost * 100) / 100,
        sales_cost: Math.round(salesCost * 100) / 100,
        coupon_discount_percent: couponDiscountPct,
        discounted_price: Math.round((erpPrice > 0 ? erpPrice : discountedPrice) * 100) / 100,
        sales_cost_percent: Math.round(salesCostPercent * 10) / 10,
        margin_amount: Math.round(profitAmount * 100) / 100,
        profit: Math.round(profitAmount * 100) / 100,
        margin_percent: Math.round(marginPercent * 10) / 10,
        erp_savings_percent: Math.round(erpSavingsPercent * 10) / 10
      };
    });

    res.json(items);
  } catch (err) {
    console.error('Error fetching product pricing catalog:', err);
    res.status(500).json({ error: 'Failed to retrieve pricing catalog' });
  }
});

// GET Executive Non-Technical Profit/Loss Analytical Summary
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    // 1. Fetch total aggregated revenue, cost, and profit from live client renewals
    const renewalStatsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_contracts,
        COALESCE(SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN value ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN total_purchase_cost ELSE 0 END), 0) as total_purchase_cost,
        COALESCE(SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN profit ELSE 0 END), 0) as total_profit,
        COALESCE(SUM(CASE WHEN status = 'Expired' THEN value ELSE 0 END), 0) as total_loss_value,
        COUNT(CASE WHEN status = 'Expired' THEN 1 END) as expired_count,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'Pending Renewal' THEN 1 END) as pending_count
      FROM renewals;
    `);

    const stats = renewalStatsRes.rows[0];
    const totalRev = parseFloat(stats.total_revenue || 0);
    const totalCost = parseFloat(stats.total_purchase_cost || 0);
    const totalProfit = parseFloat(stats.total_profit || (totalRev - totalCost));
    const totalLoss = parseFloat(stats.total_loss_value || 0);
    
    // Overall Net Margin Percentage: (Profit / Sales Cost) * 100
    const netMarginPercent = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const isProfitable = totalProfit >= 0;

    // 2. Vendor Breakdown Analytics
    const vendorBreakdownRes = await pool.query(`
      SELECT 
        COALESCE(NULLIF(vendor, ''), 'Microsoft') as vendor_name,
        COUNT(*) as contract_count,
        SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN value ELSE 0 END) as total_value,
        SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN total_purchase_cost ELSE 0 END) as total_purchase_cost,
        SUM(CASE WHEN status IN ('Active', 'Renewed', 'Pending Renewal') THEN profit ELSE 0 END) as total_profit
      FROM renewals
      GROUP BY vendor_name
      ORDER BY total_value DESC;
    `);

    const vendorBreakdown = vendorBreakdownRes.rows.map(v => {
      const vVal = parseFloat(v.total_value || 0);
      const vProf = parseFloat(v.total_profit || (vVal - parseFloat(v.total_purchase_cost || 0)));
      const sharePct = totalRev > 0 ? (vVal / totalRev) * 100 : 0;
      const vMarginPct = vVal > 0 ? (vProf / vVal) * 100 : 0;
      return {
        vendor: v.vendor_name,
        contracts: parseInt(v.contract_count || 0),
        total_value: vVal,
        total_profit: vProf,
        share_percent: Math.round(sharePct * 10) / 10,
        margin_percent: Math.round(vMarginPct * 10) / 10
      };
    });

    // 3. Catalog Average Margin
    const catalogAvgRes = await pool.query(`
      SELECT 
        AVG(erp_price) as avg_erp_price,
        AVG(purchase_cost) as avg_purchase_cost,
        AVG(sales_cost) as avg_sales_cost,
        AVG(coupon_discount_percent) as avg_discount
      FROM product_pricing;
    `);
    const catAvg = catalogAvgRes.rows[0];
    const avgErp = parseFloat(catAvg.avg_erp_price || 0);
    const avgPur = parseFloat(catAvg.avg_purchase_cost || 0);
    const avgSales = parseFloat(catAvg.avg_sales_cost || avgErp);
    const catalogMarginPercent = avgSales > 0 ? ((avgSales - avgPur) / avgSales) * 100 : 0;

    // Executive Summary statement
    const executiveSummaryText = isProfitable
      ? `RMT is currently operating in PROFIT with a net margin of ${Math.round(netMarginPercent * 10) / 10}%. Total portfolio value is ₹${(totalRev / 100000).toFixed(2)} Lakhs generating ₹${(totalProfit / 100000).toFixed(2)} Lakhs in net earnings.`
      : `ATTENTION REQUIRED: RMT is currently showing higher costs than revenue with a net deficit of ₹${(Math.abs(totalProfit) / 100000).toFixed(2)} Lakhs. Review pricing discounts and expiring contracts immediately.`;

    res.json({
      is_profitable: isProfitable,
      status_label: isProfitable ? 'PROFITABLE (Healthy Growth)' : 'LOSS RISK (Action Needed)',
      net_margin_percent: Math.round(netMarginPercent * 10) / 10,
      total_revenue: totalRev,
      total_purchase_cost: totalCost,
      total_profit: totalProfit,
      total_loss_value: totalLoss,
      active_contracts_count: parseInt(stats.active_count || 0),
      pending_renewals_count: parseInt(stats.pending_count || 0),
      expired_contracts_count: parseInt(stats.expired_count || 0),
      executive_summary: executiveSummaryText,
      catalog_avg_margin_percent: Math.round(catalogMarginPercent * 10) / 10,
      catalog_avg_discount_percent: Math.round(parseFloat(catAvg.avg_discount || 0) * 10) / 10,
      vendor_breakdown: vendorBreakdown
    });
  } catch (err) {
    console.error('Error computing pricing analytics:', err);
    res.status(500).json({ error: 'Failed to compute executive analytics' });
  }
});

// POST Create new product pricing entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      vendor,
      product_name,
      service_category,
      list_price,
      erp_price,
      purchase_cost,
      sales_cost,
      coupon_discount_percent,
      description
    } = req.body;

    if (!vendor || !product_name) {
      return res.status(400).json({ error: 'Vendor and Product Name are required' });
    }

    const result = await pool.query(
      `INSERT INTO product_pricing 
       (vendor, product_name, service_category, list_price, erp_price, purchase_cost, sales_cost, coupon_discount_percent, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        vendor,
        product_name,
        service_category || 'Software & Services',
        parseFloat(list_price || 0),
        parseFloat(erp_price || 0),
        parseFloat(purchase_cost || 0),
        parseFloat(sales_cost || 0),
        parseFloat(coupon_discount_percent || 0),
        description || ''
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product pricing:', err);
    res.status(500).json({ error: 'Failed to create pricing entry' });
  }
});

// PUT Update existing product pricing (Editable ERP Price & Discounts)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor,
      product_name,
      service_category,
      list_price,
      erp_price,
      purchase_cost,
      sales_cost,
      coupon_discount_percent,
      description
    } = req.body;

    const checkRes = await pool.query('SELECT * FROM product_pricing WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product pricing entry not found' });
    }

    const existing = checkRes.rows[0];

    const result = await pool.query(
      `UPDATE product_pricing SET
        vendor = $1,
        product_name = $2,
        service_category = $3,
        list_price = $4,
        erp_price = $5,
        purchase_cost = $6,
        sales_cost = $7,
        coupon_discount_percent = $8,
        description = $9,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        vendor !== undefined ? vendor : existing.vendor,
        product_name !== undefined ? product_name : existing.product_name,
        service_category !== undefined ? service_category : existing.service_category,
        list_price !== undefined ? parseFloat(list_price) : existing.list_price,
        erp_price !== undefined ? parseFloat(erp_price) : existing.erp_price,
        purchase_cost !== undefined ? parseFloat(purchase_cost) : existing.purchase_cost,
        sales_cost !== undefined ? parseFloat(sales_cost) : existing.sales_cost,
        coupon_discount_percent !== undefined ? parseFloat(coupon_discount_percent) : existing.coupon_discount_percent,
        description !== undefined ? description : existing.description,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product pricing:', err);
    res.status(500).json({ error: 'Failed to update pricing entry' });
  }
});

// DELETE product pricing entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM product_pricing WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product pricing entry not found' });
    }
    res.json({ message: 'Pricing entry deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product pricing:', err);
    res.status(500).json({ error: 'Failed to delete pricing entry' });
  }
});

export default router;
