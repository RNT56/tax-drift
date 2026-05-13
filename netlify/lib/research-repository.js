const { getPool } = require('./db');

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function rowTime(value) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapSubject(row = {}) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: row.user_id,
    symbol: row.symbol,
    name: row.name || '',
    isin: row.isin || '',
    exchange: row.exchange || '',
    currency: row.currency || '',
    instrumentType: row.instrument_type || 'stock',
    providerSymbols: parseJson(row.provider_symbols, {}),
    issuerUrls: parseJson(row.issuer_urls, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: rowTime(row.created_at),
    updatedAt: rowTime(row.updated_at)
  };
}

function mapEvidence(row = {}) {
  return {
    id: row.id,
    runId: String(row.run_id),
    sourceSnapshotId: row.source_snapshot_id ? String(row.source_snapshot_id) : '',
    category: row.category,
    claim: row.claim,
    evidence: row.evidence,
    sourceUrl: row.source_url || '',
    sourceName: row.source_name,
    sourceDate: row.source_date || '',
    confidence: row.confidence,
    thesisImpact: row.thesis_impact,
    sourceEvidenceIds: parseJson(row.source_evidence_ids, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: rowTime(row.created_at)
  };
}

function mapSnapshot(row = {}) {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    sourceType: row.source_type,
    sourceName: row.source_name,
    status: row.status,
    url: row.url || '',
    fetchedAt: rowTime(row.fetched_at),
    sourceDate: rowTime(row.source_date),
    freshness: row.freshness || '',
    contentHash: row.content_hash || '',
    metadata: parseJson(row.metadata, {}),
    rawPayload: parseJson(row.raw_payload, null),
    errorCode: row.error_code || '',
    errorMessage: row.error_message || ''
  };
}

function mapMetric(row = {}) {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    category: row.category,
    label: row.label,
    value: row.value === null || row.value === undefined ? null : Number(row.value),
    textValue: row.text_value || '',
    unit: row.unit || '',
    period: row.period || '',
    sourceEvidenceIds: parseJson(row.source_evidence_ids, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: rowTime(row.created_at)
  };
}

function mapEvent(row = {}) {
  return {
    id: row.id,
    runId: String(row.run_id),
    type: row.event_type,
    title: row.title,
    summary: row.summary || '',
    occurredAt: rowTime(row.occurred_at),
    sourceName: row.source_name,
    sourceUrl: row.source_url || '',
    severity: row.severity,
    directness: Number(row.directness || 0),
    riskScore: Number(row.risk_score || 0),
    affectedCountries: parseJson(row.affected_countries, []),
    affectedSectors: parseJson(row.affected_sectors, []),
    sourceEvidenceIds: parseJson(row.source_evidence_ids, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: rowTime(row.created_at)
  };
}

function mapRun(row = {}) {
  return {
    id: String(row.id),
    userId: row.user_id,
    subjectId: String(row.subject_id),
    targetSubjectId: row.target_subject_id ? String(row.target_subject_id) : '',
    thesis: row.thesis || '',
    status: row.status,
    generatedAt: rowTime(row.generated_at),
    completedAt: rowTime(row.completed_at),
    horizon: row.horizon || '',
    sourcePolicy: parseJson(row.source_policy, {}),
    coverage: parseJson(row.coverage, []),
    summary: parseJson(row.summary, {}),
    aiPayload: parseJson(row.ai_payload, {}),
    sourceErrors: parseJson(row.source_errors, []),
    createdAt: rowTime(row.created_at)
  };
}

function mapThread(row = {}) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: row.user_id,
    runId: row.run_id ? String(row.run_id) : '',
    subjectId: row.subject_id ? String(row.subject_id) : '',
    title: row.title,
    status: row.status,
    createdAt: rowTime(row.created_at),
    updatedAt: rowTime(row.updated_at)
  };
}

function mapMessage(row = {}) {
  return {
    id: String(row.id),
    userId: row.user_id,
    threadId: String(row.thread_id),
    runId: row.run_id ? String(row.run_id) : '',
    role: row.role,
    content: row.content,
    sourceEvidenceIds: parseJson(row.source_evidence_ids, []),
    sourceRequests: parseJson(row.source_requests, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: rowTime(row.created_at)
  };
}

function createResearchRepository(options = {}) {
  const env = options.env || process.env;
  const poolOverride = options.pool;

  async function pool() {
    return poolOverride || getPool(env);
  }

  async function query(sql, params) {
    const activePool = await pool();
    if (!activePool) {
      const error = new Error('Research database is not configured.');
      error.code = 'database_not_configured';
      error.statusCode = 503;
      throw error;
    }
    return activePool.query(sql, params);
  }

  async function ensureUser(userId) {
    await query(
      `insert into portfolio_users (id, base_currency, locale)
       values ($1, 'EUR', 'de-DE')
       on conflict (id) do update set updated_at = now()`,
      [userId]
    );
  }

  async function upsertSubject(userId, subject = {}) {
    const symbol = upper(subject.symbol || subject.ticker);
    if (!symbol) {
      const error = new Error('Research subject symbol is required.');
      error.statusCode = 400;
      throw error;
    }
    const isin = upper(subject.isin);
    const existing = await query(
      `select * from research_subjects
       where user_id = $1 and symbol = $2 and coalesce(isin, '') = $3
       limit 1`,
      [userId, symbol, isin]
    );
    if (existing.rows[0]) {
      const result = await query(
        `update research_subjects
         set name = coalesce($3, name),
             exchange = coalesce($4, exchange),
             currency = coalesce($5, currency),
             instrument_type = $6,
             provider_symbols = $7::jsonb,
             issuer_urls = $8::jsonb,
             metadata = $9::jsonb,
             updated_at = now()
         where id = $1 and user_id = $2
         returning *`,
        [
          existing.rows[0].id,
          userId,
          clean(subject.name) || null,
          clean(subject.exchange) || null,
          upper(subject.currency) || null,
          clean(subject.instrumentType || subject.instrument_type || existing.rows[0].instrument_type || 'stock').toLowerCase(),
          JSON.stringify(subject.providerSymbols || subject.provider_symbols || {}),
          JSON.stringify(subject.issuerUrls || subject.issuer_urls || []),
          JSON.stringify(subject.metadata || {})
        ]
      );
      return mapSubject(result.rows[0]);
    }
    const result = await query(
      `insert into research_subjects (
         user_id, symbol, name, isin, exchange, currency, instrument_type,
         provider_symbols, issuer_urls, metadata
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
       returning *`,
      [
        userId,
        symbol,
        clean(subject.name || symbol),
        isin || null,
        clean(subject.exchange) || null,
        upper(subject.currency) || null,
        clean(subject.instrumentType || subject.instrument_type || 'stock').toLowerCase(),
        JSON.stringify(subject.providerSymbols || subject.provider_symbols || {}),
        JSON.stringify(subject.issuerUrls || subject.issuer_urls || []),
        JSON.stringify(subject.metadata || {})
      ]
    );
    return mapSubject(result.rows[0]);
  }

  async function recordAuditEvent(userId, eventType, metadata = {}) {
    await query(
      `insert into audit_events (user_id, actor_id, event_type, entity_type, entity_id, metadata)
       values ((select id from portfolio_users where id = $1), $1, $2, $3, $4, $5::jsonb)`,
      [userId, eventType, metadata.entityType || 'research', metadata.entityId || null, JSON.stringify(metadata)]
    );
  }

  return {
    ensureUser,
    upsertSubject,
    recordAuditEvent,

    async createRun(userId, bundle = {}) {
      await ensureUser(userId);
      const subject = await upsertSubject(userId, bundle.subject);
      const targetSubject = bundle.targetSubject ? await upsertSubject(userId, bundle.targetSubject) : null;
      const runResult = await query(
        `insert into research_runs (
           user_id, subject_id, target_subject_id, thesis, status, generated_at,
           completed_at, horizon, source_policy, coverage, summary, ai_payload,
           source_errors
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb)
         returning *`,
        [
          userId,
          subject.id,
          targetSubject?.id || null,
          bundle.thesis || null,
          bundle.status || 'partial',
          bundle.generatedAt || new Date().toISOString(),
          bundle.completedAt || new Date().toISOString(),
          bundle.horizon || null,
          JSON.stringify(bundle.sourcePolicy || {}),
          JSON.stringify(bundle.coverage || []),
          JSON.stringify(bundle.summary || {}),
          JSON.stringify(bundle.aiPayload || {}),
          JSON.stringify(bundle.sourceErrors || [])
        ]
      );
      const run = mapRun(runResult.rows[0]);
      const snapshotIdMap = new Map();
      for (const snapshot of bundle.sourceSnapshots || []) {
        const result = await query(
          `insert into research_source_snapshots (
             user_id, run_id, source_type, source_name, status, url, fetched_at,
             source_date, freshness, content_hash, metadata, raw_payload,
             error_code, error_message
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14)
           returning id`,
          [
            userId,
            run.id,
            snapshot.sourceType,
            snapshot.sourceName,
            snapshot.status,
            snapshot.url || null,
            snapshot.fetchedAt || new Date().toISOString(),
            snapshot.sourceDate || null,
            snapshot.freshness || null,
            snapshot.contentHash || null,
            JSON.stringify(snapshot.metadata || {}),
            snapshot.rawPayload === undefined ? null : JSON.stringify(snapshot.rawPayload),
            snapshot.errorCode || null,
            snapshot.errorMessage || null
          ]
        );
        snapshotIdMap.set(snapshot.id, String(result.rows[0].id));
      }
      for (const item of bundle.evidence || []) {
        await query(
          `insert into research_evidence (
             id, user_id, run_id, source_snapshot_id, category, claim, evidence,
             source_url, source_name, source_date, confidence, thesis_impact,
             source_evidence_ids, metadata
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
           on conflict (run_id, id) do nothing`,
          [
            item.id,
            userId,
            run.id,
            snapshotIdMap.get(item.sourceSnapshotId) || null,
            item.category || 'context',
            item.claim,
            item.evidence,
            item.sourceUrl || null,
            item.sourceName,
            item.sourceDate || null,
            item.confidence || 'medium',
            item.thesisImpact || 'neutral',
            JSON.stringify(item.sourceEvidenceIds || []),
            JSON.stringify(item.metadata || {})
          ]
        );
      }
      for (const metric of bundle.metrics || []) {
        await query(
          `insert into research_metrics (
             user_id, run_id, category, label, value, text_value, unit,
             period, source_evidence_ids, metadata
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
          [
            userId,
            run.id,
            metric.category || 'context',
            metric.label,
            metric.value,
            metric.textValue || null,
            metric.unit || null,
            metric.period || null,
            JSON.stringify(metric.sourceEvidenceIds || []),
            JSON.stringify(metric.metadata || {})
          ]
        );
      }
      for (const event of bundle.events || []) {
        await query(
          `insert into research_events (
             id, user_id, run_id, event_type, title, summary, occurred_at,
             source_name, source_url, severity, directness, risk_score,
             affected_countries, affected_sectors, source_evidence_ids, metadata
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb)
           on conflict (run_id, id) do nothing`,
          [
            event.id,
            userId,
            run.id,
            event.type || event.eventType || 'event',
            event.title,
            event.summary || null,
            event.occurredAt || null,
            event.sourceName,
            event.sourceUrl || null,
            event.severity || 'medium',
            event.directness || 0,
            event.riskScore || 0,
            JSON.stringify(event.affectedCountries || []),
            JSON.stringify(event.affectedSectors || []),
            JSON.stringify(event.sourceEvidenceIds || []),
            JSON.stringify(event.metadata || {})
          ]
        );
      }
      await recordAuditEvent(userId, 'research_run_created', { entityType: 'research_run', entityId: run.id, symbol: subject.symbol });
      return this.getRun(userId, run.id);
    },

    async getRun(userId, runId) {
      const runResult = await query(
        `select r.*, s.symbol, s.name, s.isin, s.exchange, s.currency, s.instrument_type,
                s.provider_symbols, s.issuer_urls, s.metadata as subject_metadata,
                ts.symbol as target_symbol, ts.name as target_name, ts.instrument_type as target_instrument_type
         from research_runs r
         join research_subjects s on s.id = r.subject_id
         left join research_subjects ts on ts.id = r.target_subject_id
         where r.user_id = $1 and r.id = $2
         limit 1`,
        [userId, runId]
      );
      const row = runResult.rows[0];
      if (!row) return null;
      const [snapshots, evidence, metrics, events, threads] = await Promise.all([
        query('select * from research_source_snapshots where user_id = $1 and run_id = $2 order by fetched_at asc', [userId, runId]),
        query('select * from research_evidence where user_id = $1 and run_id = $2 order by created_at asc', [userId, runId]),
        query('select * from research_metrics where user_id = $1 and run_id = $2 order by category asc, label asc', [userId, runId]),
        query('select * from research_events where user_id = $1 and run_id = $2 order by risk_score desc, occurred_at desc nulls last', [userId, runId]),
        query('select * from research_copilot_threads where user_id = $1 and run_id = $2 order by updated_at desc', [userId, runId])
      ]);
      const run = mapRun(row);
      run.subject = {
        id: String(row.subject_id),
        userId,
        symbol: row.symbol,
        name: row.name || '',
        isin: row.isin || '',
        exchange: row.exchange || '',
        currency: row.currency || '',
        instrumentType: row.instrument_type || 'stock',
        providerSymbols: parseJson(row.provider_symbols, {}),
        issuerUrls: parseJson(row.issuer_urls, []),
        metadata: parseJson(row.subject_metadata, {})
      };
      run.targetSubject = row.target_symbol ? {
        id: String(row.target_subject_id),
        userId,
        symbol: row.target_symbol,
        name: row.target_name || '',
        instrumentType: row.target_instrument_type || 'stock'
      } : null;
      run.sourceSnapshots = snapshots.rows.map(mapSnapshot);
      run.evidence = evidence.rows.map(mapEvidence);
      run.metrics = metrics.rows.map(mapMetric);
      run.events = events.rows.map(mapEvent);
      run.copilotThreads = threads.rows.map(mapThread);
      return run;
    },

    async listRuns(userId, filters = {}) {
      const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 50);
      const symbol = upper(filters.symbol);
      const result = symbol
        ? await query(
          `select r.*, s.symbol, s.name, s.instrument_type
           from research_runs r
           join research_subjects s on s.id = r.subject_id
           where r.user_id = $1 and s.symbol = $2
           order by r.generated_at desc
           limit $3`,
          [userId, symbol, limit]
        )
        : await query(
          `select r.*, s.symbol, s.name, s.instrument_type
           from research_runs r
           join research_subjects s on s.id = r.subject_id
           where r.user_id = $1
           order by r.generated_at desc
           limit $2`,
          [userId, limit]
        );
      return result.rows.map((row) => ({
        ...mapRun(row),
        subject: {
          symbol: row.symbol,
          name: row.name || '',
          instrumentType: row.instrument_type || 'stock'
        }
      }));
    },

    async appendCopilotExchange(userId, input = {}, response = {}) {
      await ensureUser(userId);
      let run = null;
      if (input.runId) run = await this.getRun(userId, input.runId);
      let thread = null;
      if (input.threadId) {
        const threadResult = await query(
          'select * from research_copilot_threads where user_id = $1 and id = $2 limit 1',
          [userId, input.threadId]
        );
        thread = mapThread(threadResult.rows[0]);
      }
      if (!thread) {
        const threadResult = await query(
          `insert into research_copilot_threads (user_id, run_id, subject_id, title)
           values ($1, $2, $3, $4)
           returning *`,
          [
            userId,
            run?.id || null,
            run?.subjectId || null,
            clean(input.title || input.message || 'Research copilot').slice(0, 160)
          ]
        );
        thread = mapThread(threadResult.rows[0]);
      }
      const userMessage = await query(
        `insert into research_copilot_messages (
           user_id, thread_id, run_id, role, content, source_evidence_ids,
           source_requests, metadata
         )
         values ($1, $2, $3, 'user', $4, '[]'::jsonb, '[]'::jsonb, $5::jsonb)
         returning *`,
        [userId, thread.id, run?.id || null, clean(input.message), JSON.stringify(input.metadata || {})]
      );
      const assistantMessage = await query(
        `insert into research_copilot_messages (
           user_id, thread_id, run_id, role, content, source_evidence_ids,
           source_requests, metadata
         )
         values ($1, $2, $3, 'assistant', $4, $5::jsonb, $6::jsonb, $7::jsonb)
         returning *`,
        [
          userId,
          thread.id,
          run?.id || null,
          clean(response.answer),
          JSON.stringify(response.sourceEvidenceIds || []),
          JSON.stringify(response.sourceRequests || []),
          JSON.stringify(response.metadata || {})
        ]
      );
      await query('update research_copilot_threads set updated_at = now() where user_id = $1 and id = $2', [userId, thread.id]);
      await recordAuditEvent(userId, 'research_copilot_message_created', { entityType: 'research_copilot_thread', entityId: thread.id, runId: run?.id || null });
      return {
        thread,
        messages: [mapMessage(userMessage.rows[0]), mapMessage(assistantMessage.rows[0])]
      };
    }
  };
}

module.exports = {
  createResearchRepository,
  mapSubject,
  mapRun,
  mapEvidence,
  mapSnapshot,
  mapMetric,
  mapEvent,
  mapThread,
  mapMessage
};
