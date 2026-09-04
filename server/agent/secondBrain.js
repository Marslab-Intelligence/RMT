import db from '../db.js';

/**
 * 4.1 Record an agent execution episode in agent_episodes table
 */
export async function recordEpisode({
  renewalId,
  userId,
  action,
  contextSnapshot = {},
  retrievedMemory = [],
  proposedAction = {},
  modelVersion = 'v1.1.0-rules',
  confidence = 0.95,
  humanVerdict = 'pending'
}) {
  const { rows } = await db.query(`
    INSERT INTO agent_episodes (
      renewal_id, user_id, action, context_snapshot, retrieved_memory,
      proposed_action, model_version, confidence, human_verdict, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `, [
    renewalId || null,
    userId || null,
    action,
    JSON.stringify(contextSnapshot),
    JSON.stringify(retrievedMemory),
    JSON.stringify(proposedAction),
    modelVersion,
    confidence,
    humanVerdict
  ]);

  return rows[0];
}

/**
 * 4.4 Decision-Time Memory Retrieval
 * Priority: 1. Guardrail / Suppression -> 2. Client Memory -> 3. Top 5 Playbook lessons
 */
export async function retrieveLessonsForContext({ clientName, templateId, scopeKey }) {
  try {
    const { rows } = await db.query(`
      SELECT * FROM agent_lessons
      WHERE status IN ('active', 'probation')
        AND (
          (scope = 'client' AND LOWER(scope_key) = LOWER($1)) OR
          (scope = 'template' AND LOWER(scope_key) = LOWER($2)) OR
          (scope = 'global')
        )
      ORDER BY 
        CASE scope 
          WHEN 'global' THEN 1 
          WHEN 'client' THEN 2 
          WHEN 'template' THEN 3 
          ELSE 4 
        END, confidence DESC
      LIMIT 10
    `, [clientName || '', templateId || '']);

    return rows;
  } catch (err) {
    console.error('Error retrieving agent lessons:', err);
    return [];
  }
}

/**
 * 4.2 Nightly Lesson Extractor Job
 * Clusters rejected/edited episodes (count >= 3) to propose structured memory rules
 */
export async function runLessonExtractorJob() {
  console.log('🧠 [Second Brain] Running nightly lesson extraction job...');

  // Group rejected or edited episodes by rejection reason / action pattern
  const { rows: clusters } = await db.query(`
    SELECT action, rejection_reason, COUNT(*)::int as count, ARRAY_AGG(id) as episode_ids
    FROM agent_episodes
    WHERE human_verdict IN ('rejected', 'edited')
      AND rejection_reason IS NOT NULL
    GROUP BY action, rejection_reason
    HAVING COUNT(*) >= 3
  `);

  let newLessonsProposed = 0;

  for (const cluster of clusters) {
    const scopeKey = cluster.action;
    const lessonText = `Avoid pattern leading to rejection: ${cluster.rejection_reason}`;

    // Check if lesson already exists
    const existing = await db.query(`
      SELECT id FROM agent_lessons
      WHERE scope_key = $1 AND lesson = $2
    `, [scopeKey, lessonText]);

    if (existing.rows.length === 0) {
      await db.query(`
        INSERT INTO agent_lessons (
          scope, scope_key, trigger_condition, lesson, evidence_episode_ids, proposed_rule_type, confidence, status
        ) VALUES ('template', $1, $2, $3, $4, 'prompt_hint', 0.85, 'proposed')
      `, [
        scopeKey,
        JSON.stringify({ action: cluster.action }),
        lessonText,
        JSON.stringify(cluster.episode_ids)
      ]);
      newLessonsProposed++;
    }
  }

  console.log(`✅ [Second Brain] Lesson extraction complete: ${newLessonsProposed} new rules proposed.`);
  return { newLessonsProposed };
}

/**
 * 4.5 Lesson Promotion Ladder
 */
export async function promoteLesson(lessonId, newStatus) {
  const validStatuses = ['proposed', 'active', 'probation', 'retired'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid lesson status: ${newStatus}`);
  }

  const { rows } = await db.query(`
    UPDATE agent_lessons
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [newStatus, lessonId]);

  return rows[0];
}
