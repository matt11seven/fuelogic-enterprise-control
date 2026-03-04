const db = require('../db');
const { syncGasMobileMeasurements } = require('./gasmobile-sync');

let autoSyncTimer = null;
let cycleRunning = false;
let lastCycleAt = null;
let lastCycleResult = null;

function toBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function getIntervalMs() {
  const raw = Number(process.env.GASMOBILE_AUTO_SYNC_INTERVAL_MS || 20 * 60 * 1000);
  if (!Number.isFinite(raw) || raw < 60_000) return 20 * 60 * 1000;
  return raw;
}

async function getEligibleUsers() {
  const result = await db.query(
    `
    SELECT DISTINCT u.id
    FROM users u
    LEFT JOIN integracao_fontes f
      ON f.user_id = u.id
     AND f.source_system = 'gasmobile'
    WHERE u.api_key IS NOT NULL
      AND TRIM(u.api_key) <> ''
      AND (f.id IS NULL OR f.status = 'ativo')
    ORDER BY u.id
    `,
    [],
  );
  return result.rows.map((r) => r.id);
}

async function closeStaleRunningLogs() {
  await db.query(
    `
    UPDATE integracao_sync_logs
    SET
      status = 'failed',
      finished_at = CURRENT_TIMESTAMP,
      error_message = COALESCE(error_message, 'Execução interrompida (stale running log)'),
      records_failed = CASE WHEN records_failed = 0 THEN 1 ELSE records_failed END
    WHERE source_system = 'gasmobile'
      AND status = 'running'
      AND started_at < (CURRENT_TIMESTAMP - INTERVAL '15 minutes')
    `,
    [],
  );
}

async function runAutoSyncCycle() {
  if (cycleRunning) {
    console.log('[gasmobile-auto-sync] ciclo anterior ainda em execução, pulando ciclo atual.');
    return;
  }

  cycleRunning = true;
  lastCycleAt = new Date();
  const summary = {
    started_at: lastCycleAt.toISOString(),
    users_total: 0,
    users_success: 0,
    users_failed: 0,
    error: null,
  };

  try {
    await closeStaleRunningLogs();

    const userIds = await getEligibleUsers();
    summary.users_total = userIds.length;

    for (const userId of userIds) {
      try {
        await syncGasMobileMeasurements({ userId });
        summary.users_success++;
      } catch (error) {
        summary.users_failed++;
        console.error(`[gasmobile-auto-sync] falha no usuário ${userId}:`, error.message);
      }
    }
  } catch (error) {
    summary.error = error.message;
    console.error('[gasmobile-auto-sync] erro no ciclo:', error.message);
  } finally {
    lastCycleResult = summary;
    cycleRunning = false;
    console.log('[gasmobile-auto-sync] ciclo finalizado:', summary);
  }
}

function startGasMobileAutoSync() {
  const enabled = toBool(process.env.GASMOBILE_AUTO_SYNC_ENABLED, true);
  if (!enabled) {
    console.log('[gasmobile-auto-sync] desativado por configuração (GASMOBILE_AUTO_SYNC_ENABLED=false).');
    return;
  }

  if (autoSyncTimer) return;

  const intervalMs = getIntervalMs();
  const runOnStartup = toBool(process.env.GASMOBILE_AUTO_SYNC_RUN_ON_STARTUP, true);

  if (runOnStartup) {
    runAutoSyncCycle().catch((error) => {
      console.error('[gasmobile-auto-sync] erro no ciclo inicial:', error.message);
    });
  }

  autoSyncTimer = setInterval(() => {
    runAutoSyncCycle().catch((error) => {
      console.error('[gasmobile-auto-sync] erro no ciclo agendado:', error.message);
    });
  }, intervalMs);

  console.log(`[gasmobile-auto-sync] iniciado com intervalo de ${intervalMs}ms.`);
}

function stopGasMobileAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log('[gasmobile-auto-sync] finalizado.');
  }
}

function getGasMobileAutoSyncStatus() {
  const intervalMs = getIntervalMs();
  return {
    enabled: !!autoSyncTimer,
    running: cycleRunning,
    interval_ms: intervalMs,
    stale_threshold_ms: intervalMs * 2,
    last_cycle_at: lastCycleAt ? lastCycleAt.toISOString() : null,
    last_cycle_result: lastCycleResult,
  };
}

module.exports = {
  startGasMobileAutoSync,
  stopGasMobileAutoSync,
  getGasMobileAutoSyncStatus,
  runAutoSyncCycle,
};
