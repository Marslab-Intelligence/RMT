import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { broadcastEvent } from '../services/realtime.js';

const router = Router();

// Middleware to restrict Finance users completely
const forbidFinance = (req, res, next) => {
  if (req.user.role === 'finance') {
    return res.status(403).json({ error: 'Access Denied: Finance users are not authorized to access visit tracking data.' });
  }
  next();
};

// Middleware to restrict access to Admin only
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
  }
  next();
};

// Haversine distance calculator in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ────────────────────────────────────────────────────────
// CST / Admin endpoints
// ────────────────────────────────────────────────────────

// GET /api/visits/active - Get current active visit session
router.get('/active', authenticateToken, forbidFinance, async (req, res) => {
  try {
    let query = `
      SELECT v.*, r.client_name, r.service, r.client_latitude, r.client_longitude, u.full_name as cst_name
      FROM visits v
      JOIN renewals r ON v.renewal_id = r.id
      JOIN users u ON v.cst_id = u.id
      WHERE v.status IN ('active', 'checked_in')
    `;
    const params = [];

    // CST users only see their own active visits
    if (req.user.role === 'sales') {
      query += ` AND v.cst_id = $1`;
      params.push(req.user.id);
    }

    const { rows } = await db.query(query, params);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Error fetching active visit:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/visits/start - Start a client visit
router.post('/start', authenticateToken, forbidFinance, async (req, res) => {
  const { renewal_id, latitude, longitude } = req.body;
  if (!renewal_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing renewal_id, latitude, or longitude' });
  }

  try {
    // Check if user already has an active visit
    const { rows: existing } = await db.query(
      `SELECT id FROM visits WHERE cst_id = $1 AND status IN ('active', 'checked_in')`,
      [req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have an active visit. Please complete or cancel it first.' });
    }

    // Check if client coordinates exist, if not fetch from renewal
    const { rows: renewalRows } = await db.query(
      `SELECT client_latitude, client_longitude, client_name FROM renewals WHERE id = $1`,
      [renewal_id]
    );

    if (renewalRows.length === 0) {
      return res.status(404).json({ error: 'Renewal record not found' });
    }

    const resVisit = await db.query(
      `INSERT INTO visits (renewal_id, cst_id, status, start_latitude, start_longitude, start_time)
       VALUES ($1, $2, 'active', $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [renewal_id, req.user.id, latitude, longitude]
    );

    const newVisit = resVisit.rows[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Start Visit', 'visit', $2, $3)`,
      [req.user.id, String(newVisit.id), `Started visit to client: ${renewalRows[0].client_name}`]
    );

    // Broadcast SSE update for admin dashboard live monitoring
    broadcastEvent('visit_started', {
      visit_id: newVisit.id,
      cst_id: req.user.id,
      cst_name: req.user.fullName,
      client_name: renewalRows[0].client_name,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newVisit);
  } catch (err) {
    console.error('Error starting visit:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/visits/:id/location - Send periodic tracking coordinates
router.post('/:id/location', authenticateToken, forbidFinance, async (req, res) => {
  const visitId = parseInt(req.params.id);
  const { latitude, longitude, accuracy } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  // Anti-spoofing validation: Reject locations with accuracy > 50 meters
  if (accuracy !== undefined && accuracy > 50) {
    console.warn(`[Anti-Spoofing] Rejected coordinates with poor accuracy: ${accuracy}m`);
    return res.status(400).json({ error: 'Location verification failed: Low GPS accuracy. Please ensure you are outdoors or have high GPS accuracy.' });
  }

  try {
    // Verify visit ownership (CST can only update their own visits)
    const { rows: visitRows } = await db.query(`SELECT cst_id, status FROM visits WHERE id = $1`, [visitId]);
    if (visitRows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }

    if (req.user.role === 'sales' && visitRows[0].cst_id !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You cannot update locations for another executive.' });
    }

    if (visitRows[0].status === 'completed' || visitRows[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot append location to an inactive visit.' });
    }

    // Insert coordinates into breadcrumbs trail
    await db.query(
      `INSERT INTO visit_locations (visit_id, latitude, longitude, accuracy)
       VALUES ($1, $2, $3, $4)`,
      [visitId, latitude, longitude, accuracy || null]
    );

    // Broadcast SSE update for live route visualizer
    broadcastEvent('location_updated', {
      visit_id: visitId,
      cst_id: visitRows[0].cst_id,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error recording live location:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/visits/:id/check-in - Perform client check-in & verification
router.post('/:id/check-in', authenticateToken, forbidFinance, async (req, res) => {
  const visitId = parseInt(req.params.id);
  const { latitude, longitude, notes, photo_data } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing current latitude or longitude coordinates.' });
  }

  try {
    // Fetch visit and associated client coordinates
    const { rows: visitRows } = await db.query(
      `SELECT v.*, r.client_latitude, r.client_longitude, r.client_name 
       FROM visits v
       JOIN renewals r ON v.renewal_id = r.id
       WHERE v.id = $1`,
      [visitId]
    );

    if (visitRows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found.' });
    }

    const visit = visitRows[0];

    if (req.user.role === 'sales' && visit.cst_id !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You cannot check-in for another executive.' });
    }

    // Proximity check is removed per user request (they do not have pre-set client coordinates)
    const clientReached = true;
    const distanceMeters = null;

    await db.query(
      `UPDATE visits
       SET status = 'checked_in',
           check_in_time = CURRENT_TIMESTAMP,
           arrival_time = COALESCE(arrival_time, CURRENT_TIMESTAMP),
           client_reached = $1,
           arrival_latitude = $2,
           arrival_longitude = $3,
           arrival_distance_meters = $4,
           notes = $5,
           photo_data = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [clientReached, latitude, longitude, distanceMeters, notes || '', photo_data || null, visitId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Check-In', 'visit', $2, $3)`,
      [req.user.id, String(visitId), `Checked in at ${visit.client_name} (Coordinates: ${latitude}, ${longitude})`]
    );

    // Broadcast SSE check-in notification
    broadcastEvent('visit_checked_in', {
      visit_id: visitId,
      cst_id: visit.cst_id,
      cst_name: req.user.fullName,
      client_name: visit.client_name,
      client_reached: clientReached,
      distance_meters: distanceMeters,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      client_reached: clientReached,
      distance_meters: distanceMeters
    });
  } catch (err) {
    console.error('Error checking in:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/visits/:id/notes - Save draft notes and photo data in real-time
router.post('/:id/notes', authenticateToken, forbidFinance, async (req, res) => {
  const visitId = parseInt(req.params.id);
  const { notes, photo_data } = req.body;

  try {
    const { rows: visitRows } = await db.query(
      `SELECT v.*, r.client_name 
       FROM visits v
       JOIN renewals r ON v.renewal_id = r.id
       WHERE v.id = $1`,
      [visitId]
    );

    if (visitRows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found.' });
    }

    const visit = visitRows[0];

    if (req.user.role === 'sales' && visit.cst_id !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You cannot update notes for another executive.' });
    }

    await db.query(
      `UPDATE visits
       SET notes = $1,
           photo_data = COALESCE($2, photo_data),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [notes !== undefined ? notes : '', photo_data !== undefined ? photo_data : null, visitId]
    );

    // Broadcast SSE update event
    broadcastEvent('location_updated', {
      visit_id: visitId,
      cst_id: visit.cst_id,
      cst_name: req.user.fullName,
      client_name: visit.client_name,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating visit notes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// POST /api/visits/:id/check-out - Complete visit session
router.post('/:id/check-out', authenticateToken, forbidFinance, async (req, res) => {
  const visitId = parseInt(req.params.id);

  try {
    const { rows: visitRows } = await db.query(
      `SELECT v.*, r.client_name 
       FROM visits v
       JOIN renewals r ON v.renewal_id = r.id
       WHERE v.id = $1`,
      [visitId]
    );

    if (visitRows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found.' });
    }

    const visit = visitRows[0];

    if (req.user.role === 'sales' && visit.cst_id !== req.user.id) {
      return res.status(403).json({ error: 'Access Denied: You cannot check-out for another executive.' });
    }

    const { notes, photo_data } = req.body;

    await db.query(
      `UPDATE visits
       SET status = 'completed',
           check_out_time = CURRENT_TIMESTAMP,
           notes = COALESCE(NULLIF($1::text, ''), notes, ''),
           photo_data = COALESCE($2::text, photo_data),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [notes !== undefined ? notes : null, photo_data !== undefined ? photo_data : null, visitId]
    );

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'Check-Out', 'visit', $2, $3)`,
      [req.user.id, String(visitId), `Completed visit to client: ${visit.client_name}`]
    );

    // Broadcast SSE complete event
    broadcastEvent('visit_completed', {
      visit_id: visitId,
      cst_id: visit.cst_id,
      cst_name: req.user.fullName,
      client_name: visit.client_name,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error checking out:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ────────────────────────────────────────────────────────
// Admin endpoints (strictly require Admin role)
// ────────────────────────────────────────────────────────

// GET /api/visits/admin/active - Fetch list of active/ongoing visits (Admin)
router.get('/admin/active', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, r.client_name, r.service, r.client_latitude, r.client_longitude,
             u.full_name as cst_name, u.email as cst_email,
             (SELECT JSON_BUILD_OBJECT('latitude', l.latitude, 'longitude', l.longitude, 'captured_at', l.captured_at) 
              FROM visit_locations l 
              WHERE l.visit_id = v.id 
              ORDER BY l.captured_at DESC LIMIT 1) as last_location
      FROM visits v
      JOIN renewals r ON v.renewal_id = r.id
      JOIN users u ON v.cst_id = u.id
      WHERE v.status IN ('active', 'checked_in')
      ORDER BY v.start_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin active visits:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/visits/admin/history - Fetch historical visits with filtering (Admin)
router.get('/admin/history', authenticateToken, requireAdmin, async (req, res) => {
  const { cst_id, renewal_id, start_date, end_date, client_reached, status } = req.query;

  try {
    let query = `
      SELECT v.*, r.client_name, r.service, r.client_latitude, r.client_longitude,
             u.full_name as cst_name, u.email as cst_email
      FROM visits v
      JOIN renewals r ON v.renewal_id = r.id
      JOIN users u ON v.cst_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (cst_id && String(cst_id).trim()) {
      const trimmed = String(cst_id).trim();
      const numVal = parseInt(trimmed, 10);
      if (!isNaN(numVal) && String(numVal) === trimmed) {
        query += ` AND (v.cst_id = $${pIdx} OR u.full_name ILIKE $${pIdx+1} OR u.email ILIKE $${pIdx+1})`;
        params.push(numVal, `%${trimmed}%`);
        pIdx += 2;
      } else {
        query += ` AND (u.full_name ILIKE $${pIdx} OR u.email ILIKE $${pIdx})`;
        params.push(`%${trimmed}%`);
        pIdx += 1;
      }
    }
    if (renewal_id && !isNaN(parseInt(renewal_id, 10))) {
      query += ` AND v.renewal_id = $${pIdx++}`;
      params.push(parseInt(renewal_id, 10));
    }
    if (status && status !== 'all') {
      query += ` AND v.status = $${pIdx++}`;
      params.push(status);
    }
    if (client_reached) {
      query += ` AND v.client_reached = $${pIdx++}`;
      params.push(client_reached === 'true');
    }
    if (start_date) {
      query += ` AND v.start_time >= $${pIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND v.start_time <= $${pIdx++}::timestamp + interval '1 day'`;
      params.push(end_date);
    }

    query += ` ORDER BY v.start_time DESC LIMIT 100`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching historical visits:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/visits/admin/history/:id - Get details + locations trail of a specific visit (Admin)
router.get('/admin/history/:id', authenticateToken, requireAdmin, async (req, res) => {
  const visitId = parseInt(req.params.id);

  try {
    const { rows: visitRows } = await db.query(`
      SELECT v.*, r.client_name, r.service, r.client_latitude, r.client_longitude,
             u.full_name as cst_name, u.email as cst_email
      FROM visits v
      JOIN renewals r ON v.renewal_id = r.id
      JOIN users u ON v.cst_id = u.id
      WHERE v.id = $1
    `, [visitId]);

    if (visitRows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found.' });
    }

    const { rows: locationRows } = await db.query(`
      SELECT latitude, longitude, captured_at, accuracy
      FROM visit_locations
      WHERE visit_id = $1
      ORDER BY captured_at ASC
    `, [visitId]);

    res.json({
      visit: visitRows[0],
      route: locationRows
    });
  } catch (err) {
    console.error('Error fetching detailed visit history:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/visits/admin/metrics - Fetch visit KPIs & analytics (Admin)
router.get('/admin/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total visits, Reached vs Missed, Active, Cancelled
    const statsQuery = `
      SELECT 
        COUNT(id) as total,
        COUNT(id) FILTER (WHERE status = 'completed' AND client_reached = true) as success,
        COUNT(id) FILTER (WHERE status = 'completed' AND client_reached = false) as missed_proximity,
        COUNT(id) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(id) FILTER (WHERE status IN ('active', 'checked_in')) as ongoing
      FROM visits
    `;

    // Success rate per CST
    const cstRankingQuery = `
      SELECT 
        u.full_name as cst_name,
        COUNT(v.id) as total_visits,
        COUNT(v.id) FILTER (WHERE v.status = 'completed' AND v.client_reached = true) as success_visits,
        ROUND((COUNT(v.id) FILTER (WHERE v.status = 'completed' AND v.client_reached = true)::decimal / NULLIF(COUNT(v.id) FILTER (WHERE v.status = 'completed'), 0)) * 100, 2) as success_rate
      FROM users u
      LEFT JOIN visits v ON v.cst_id = u.id
      WHERE u.role = 'sales'
      GROUP BY u.id, u.full_name
      ORDER BY success_rate DESC NULLS LAST
    `;

    // Timeline count of visits in last 30 days
    const visitTimelineQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(id) as visit_count
      FROM visits
      WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `;

    const [statsResult, cstResult, timelineResult] = await Promise.all([
      db.query(statsQuery),
      db.query(cstRankingQuery),
      db.query(visitTimelineQuery)
    ]);

    res.json({
      summary: statsResult.rows[0],
      cstPerformance: cstResult.rows,
      timeline: timelineResult.rows
    });
  } catch (err) {
    console.error('Error fetching admin metrics:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
