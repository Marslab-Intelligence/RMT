import db from '../db.js';
import { broadcastEvent } from '../services/realtime.js';
import { runAgentTask } from './agentRunner.js';

const CONCURRENCY_CAP = 2;
let activeJobsCount = 0;

/**
 * Enqueue a new agent job into agent_jobs table
 */
export async function enqueueAgentJob({ jobType, userId, payload = {} }) {
  const { rows } = await db.query(`
    INSERT INTO agent_jobs (job_type, user_id, status, payload, created_at)
    VALUES ($1, $2, 'pending', $3, NOW())
    RETURNING *
  `, [jobType, userId || null, JSON.stringify(payload)]);

  const job = rows[0];
  broadcastEvent('agent_job_enqueued', { jobId: job.id, jobType: job.job_type });
  
  // Trigger queue check asynchronously
  processNextJobs().catch(err => console.error('Error processing agent job queue:', err));

  return job;
}

/**
 * Registry of executable job handlers
 */
const jobHandlers = {
  agent_chat_query: async (payload) => {
    return await runAgentTask({
      prompt: payload.prompt,
      context: payload.context,
      user: { role: payload.userRole, full_name: payload.userName, email: payload.userEmail }
    });
  }
};

export function registerJobHandler(jobType, handlerFn) {
  jobHandlers[jobType] = handlerFn;
}

/**
 * Process pending jobs in background with concurrency cap = 2
 */
export async function processNextJobs() {
  if (activeJobsCount >= CONCURRENCY_CAP) return;

  const { rows } = await db.query(`
    SELECT * FROM agent_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1
  `, [CONCURRENCY_CAP - activeJobsCount]);

  for (const job of rows) {
    if (activeJobsCount >= CONCURRENCY_CAP) break;
    executeJob(job).catch(err => console.error(`Error executing job ${job.id}:`, err));
  }
}

async function executeJob(job) {
  activeJobsCount++;
  
  try {
    await db.query(`
      UPDATE agent_jobs
      SET status = 'running', started_at = NOW()
      WHERE id = $1
    `, [job.id]);

    broadcastEvent('agent_job_update', { jobId: job.id, status: 'running', jobType: job.job_type });

    const handler = jobHandlers[job.job_type];
    let result = {};

    if (handler) {
      result = await handler(job.payload, job);
    } else {
      result = { note: `No handler registered for job_type: ${job.job_type}` };
    }

    await db.query(`
      UPDATE agent_jobs
      SET status = 'completed', result = $2, completed_at = NOW()
      WHERE id = $1
    `, [job.id, JSON.stringify(result)]);

    broadcastEvent('agent_job_update', { jobId: job.id, status: 'completed', jobType: job.job_type, result });

  } catch (error) {
    console.error(`🔴 Agent Job ${job.id} failed:`, error.message);
    await db.query(`
      UPDATE agent_jobs
      SET status = 'failed', error = $2, completed_at = NOW()
      WHERE id = $1
    `, [job.id, error.message]);

    broadcastEvent('agent_job_update', { jobId: job.id, status: 'failed', jobType: job.job_type, error: error.message });

  } finally {
    activeJobsCount--;
    processNextJobs().catch(err => console.error('Error in post-job queue tick:', err));
  }
}
