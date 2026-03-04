#!/usr/bin/env node
require('dotenv').config();

const db = require('../server/src/db');
const { syncGasMobileMeasurements } = require('../server/src/services/gasmobile-sync');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

async function main() {
  const userId = getArg('--user-id');
  const apiKey = getArg('--api-key');

  if (!userId) {
    console.error('Uso: node bin/sync-gasmobile-medicoes.cjs --user-id <uuid> [--api-key <chave>]');
    process.exit(1);
  }

  try {
    await db.connect();
    const result = await syncGasMobileMeasurements({ userId, apiKey: apiKey || undefined });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('[sync-gasmobile-medicoes] erro:', error.message);
    process.exit(1);
  } finally {
    try {
      await db.disconnect();
    } catch (_) {
      // noop
    }
  }
}

main();

