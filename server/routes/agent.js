import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { enqueueAgentJob } from '../agent/jobProcessor.js';
import { runDailySweep } from '../agent/dailySweep.js';
import { runGuardianIntegrityScan } from '../agent/guardian.js';
import { parseNaturalLanguageMutation, executeNaturalLanguageMutation } from '../agent/naturalLanguageEditor.js';
import { computeRiskScore } from '../agent/riskScorer.js';
import { getAgentBudgetStatus } from '../agent/geminiClient.js';

const router = express.Router();

// AI usage/quota status — lets the chat UI show how much of the daily Gemini
// allowance has been used and stop offering the AI path once it's gone,
// rather than the user finding out via a confusing failed request.
router.get('/usage', authenticateToken, (req, res) => {
  res.json(getAgentBudgetStatus());
});

// Enqueue agent job (Chat / Analytics / Report)
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { prompt, context = {} } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt instruction is required.' });

    const job = await enqueueAgentJob({
      jobType: 'agent_chat_query',
      userId: req.user.id,
      payload: { prompt, context, userRole: req.user.role, userName: req.user.fullName, userEmail: req.user.email }
    });

    res.json({ message: 'Agent query job enqueued.', jobId: job.id });
  } catch (err) {
    console.error('Agent query error:', err);
    res.status(500).json({ error: 'Failed to process agent query.' });
  }
});

// Fetch a background job's status/result — the piece that was missing
// entirely: jobs completed and broadcast their result over SSE, but nothing
// in the app ever listened for that or had a way to poll for it, so a chat
// query would enqueue successfully and then never surface an actual answer.
router.get('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, job_type, status, result, error, created_at, completed_at
       FROM agent_jobs WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch agent job error:', err);
    res.status(500).json({ error: 'Failed to fetch job status.' });
  }
});

// Fetch pending items for Approval Inbox
router.get('/episodes', authenticateToken, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await db.query(`
      SELECT ae.*, r.unique_id, r.client_name, r.service, r.owner, r.value
      FROM agent_episodes ae
      LEFT JOIN renewals r ON ae.renewal_id = r.id
      WHERE ae.human_verdict = $1
      ORDER BY ae.created_at DESC
    `, [status]);

    res.json(rows);
  } catch (err) {
    console.error('Fetch agent episodes error:', err);
    res.status(500).json({ error: 'Failed to fetch approval inbox items.' });
  }
});

// Approve or Reject draft episode in Approval Inbox
router.post('/episodes/:id/verdict', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict, rejectionReason, editDiff } = req.body;

    if (!['approved', 'edited', 'rejected', 'expired'].includes(verdict)) {
      return res.status(400).json({ error: 'Invalid verdict value.' });
    }

    const { rows } = await db.query(`
      UPDATE agent_episodes
      SET human_verdict = $1, rejection_reason = $2, edit_diff = $3, approver_id = $4
      WHERE id = $5
      RETURNING *
    `, [verdict, rejectionReason || null, JSON.stringify(editDiff || {}), req.user.id, id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Episode item not found.' });

    res.json({ message: `Item successfully marked as ${verdict}.`, episode: rows[0] });
  } catch (err) {
    console.error('Update episode verdict error:', err);
    res.status(500).json({ error: 'Failed to update item verdict.' });
  }
});

// Trigger Catch-Up Daily Sweep
router.post('/daily-sweep', authenticateToken, async (req, res) => {
  try {
    const summary = await runDailySweep();
    res.json({ message: 'Daily sweep completed successfully.', summary });
  } catch (err) {
    console.error('Daily sweep trigger error:', err);
    res.status(500).json({ error: 'Failed to execute daily sweep.' });
  }
});

// Fetch Guardian Health Findings
router.get('/guardian-health', authenticateToken, async (req, res) => {
  try {
    const health = await runGuardianIntegrityScan();
    res.json(health);
  } catch (err) {
    console.error('Guardian health scan error:', err);
    res.status(500).json({ error: 'Failed to perform guardian scan.' });
  }
});

// Parse & preview natural language edit instruction
router.post('/nl-edit/parse', authenticateToken, async (req, res) => {
  try {
    const { utterance } = req.body;
    if (!utterance) return res.status(400).json({ error: 'Utterance is required.' });

    const mutation = await parseNaturalLanguageMutation(utterance, req.user);
    res.json(mutation);
  } catch (err) {
    console.error('NL edit parse error:', err);
    res.status(500).json({ error: 'Failed to parse natural language edit.' });
  }
});

// Confirm & execute natural language edit instruction
router.post('/nl-edit/confirm', authenticateToken, async (req, res) => {
  try {
    const { mutation } = req.body;
    if (!mutation) return res.status(400).json({ error: 'Mutation object is required.' });

    const result = await executeNaturalLanguageMutation(mutation, req.user);
    res.json({ message: 'Mutation executed successfully.', result });
  } catch (err) {
    console.error('NL edit execute error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute edit.' });
  }
});

export default router;
