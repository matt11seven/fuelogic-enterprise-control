const db = require('../db');

const GM_ENDPOINT = 'https://services.gasmobile.online/Medicao/ObterMedicoesTanque';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s || null;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getUserApiKey(userId) {
  const result = await db.query('SELECT api_key FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.api_key || null;
}

async function ensureIntegrationSource(userId) {
  await db.query(
    `
    INSERT INTO integracao_fontes (user_id, source_system, nome_exibicao, status, sync_mode)
    VALUES ($1, 'gasmobile', 'GasMobile', 'ativo', 'incremental')
    ON CONFLICT (user_id, source_system)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `,
    [userId],
  );
}

async function createSyncLog(userId) {
  const result = await db.query(
    `
    INSERT INTO integracao_sync_logs (user_id, source_system, sync_type, status, started_at)
    VALUES ($1, 'gasmobile', 'measurements', 'running', CURRENT_TIMESTAMP)
    RETURNING id
    `,
    [userId],
  );
  return result.rows[0].id;
}

async function finishSyncLog({
  logId,
  status,
  recordsRead,
  recordsCreated,
  recordsUpdated,
  recordsSkipped,
  recordsFailed,
  errorMessage = null,
}) {
  await db.query(
    `
    UPDATE integracao_sync_logs
    SET
      status = $1,
      finished_at = CURRENT_TIMESTAMP,
      records_read = $2,
      records_created = $3,
      records_updated = $4,
      records_skipped = $5,
      records_failed = $6,
      error_message = $7
    WHERE id = $8
    `,
    [
      status,
      recordsRead,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
      errorMessage,
      logId,
    ],
  );
}

async function markIntegrationHealth(userId, success, errorMessage = null) {
  if (success) {
    await db.query(
      `
      UPDATE integracao_fontes
      SET
        status = 'ativo',
        last_success_at = CURRENT_TIMESTAMP,
        last_error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND source_system = 'gasmobile'
      `,
      [userId],
    );
    return;
  }

  await db.query(
    `
    UPDATE integracao_fontes
    SET
      status = 'erro',
      last_error_at = CURRENT_TIMESTAMP,
      last_error_message = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND source_system = 'gasmobile'
    `,
    [userId, errorMessage || 'Falha desconhecida'],
  );
}

async function syncGasMobileMeasurements({ userId, apiKey }) {
  if (!userId) {
    throw new Error('userId é obrigatório para sincronização');
  }

  const effectiveApiKey = apiKey || await getUserApiKey(userId);
  if (!effectiveApiKey) {
    throw new Error('API Key GasMobile não configurada para o usuário');
  }

  let logId = null;
  let finished = false;

  let recordsRead = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;

  try {
    await ensureIntegrationSource(userId);
    logId = await createSyncLog(userId);

    const gmUrl = `${GM_ENDPOINT}?apiKey=${encodeURIComponent(effectiveApiKey)}`;
    const gmResponse = await fetch(gmUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!gmResponse.ok) {
      throw new Error(`GasMobile retornou status ${gmResponse.status}`);
    }

    const gmRawText = await gmResponse.text();
    const gmTrimmed = gmRawText ? gmRawText.trim() : '';
    let gmData = [];

    if (!gmTrimmed) {
      gmData = [];
    } else {
      try {
        gmData = JSON.parse(gmTrimmed);
      } catch (parseError) {
        throw new Error(`Payload inválido da API GasMobile (JSON malformado): ${parseError.message}`);
      }
    }

    if (!Array.isArray(gmData)) {
      throw new Error('Payload inválido da API GasMobile: esperado array');
    }
    recordsRead = gmData.length;

    const [postosResult, tanquesResult] = await Promise.all([
      db.query(
        'SELECT id, id_unidade FROM postos WHERE user_id = $1 AND status = $2',
        [userId, 'ativo'],
      ),
      db.query(
        `
        SELECT t.id, t.posto_id, t.numero_tanque
        FROM tanques t
        JOIN postos p ON p.id = t.posto_id
        WHERE p.user_id = $1 AND t.status != 'inativo'
        `,
        [userId],
      ),
    ]);

    const postosByUnidade = new Map(
      postosResult.rows.map((p) => [String(p.id_unidade), p]),
    );

    const tanquesByPostoNumero = new Map(
      tanquesResult.rows.map((t) => [`${t.posto_id}:${t.numero_tanque}`, t]),
    );

    for (const item of gmData) {
      try {
        const externalUnidadeId = toText(item.IdUnidade);
        const externalTanqueId = toText(item.NumeroDoTanque ?? item.Tanque);
        const posto = externalUnidadeId ? postosByUnidade.get(externalUnidadeId) : null;

        if (!posto || !externalTanqueId) {
          recordsSkipped++;
          continue;
        }

        const tanque = tanquesByPostoNumero.get(`${posto.id}:${externalTanqueId}`);
        if (!tanque) {
          recordsSkipped++;
          continue;
        }

        await db.query(
          `
          INSERT INTO integracao_mapeamentos
            (user_id, source_system, entity_type, external_id, posto_id, metadata, last_synced_at)
          VALUES
            ($1, 'gasmobile', 'posto', $2, $3, $4::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, source_system, entity_type, external_id)
          DO UPDATE SET
            posto_id = EXCLUDED.posto_id,
            metadata = EXCLUDED.metadata,
            last_seen_at = CURRENT_TIMESTAMP,
            last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            userId,
            externalUnidadeId,
            posto.id,
            JSON.stringify({
              unidade: toText(item.Unidade),
              cliente: toText(item.Cliente),
              indice_equipamento: toNumber(item.IndiceDoEquipamento),
            }),
          ],
        );

        await db.query(
          `
          INSERT INTO integracao_mapeamentos
            (user_id, source_system, entity_type, external_id, tanque_id, posto_id, metadata, last_synced_at)
          VALUES
            ($1, 'gasmobile', 'tanque', $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, source_system, entity_type, external_id)
          DO UPDATE SET
            tanque_id = EXCLUDED.tanque_id,
            posto_id = EXCLUDED.posto_id,
            metadata = EXCLUDED.metadata,
            last_seen_at = CURRENT_TIMESTAMP,
            last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            userId,
            `${externalUnidadeId}:${externalTanqueId}`,
            tanque.id,
            posto.id,
            JSON.stringify({
              numero_tanque: toNumber(externalTanqueId),
              produto: toText(item.Produto),
            }),
          ],
        );

        const measuredAt = toDate(item.DataMedicao) || new Date();
        const receivedAt = toDate(item.DataRecebimento);

        const measurementResult = await db.query(
          `
          INSERT INTO medicoes_tanque
            (
              user_id, source_system, posto_id, tanque_id,
              external_unidade_id, external_tanque_id, external_record_id,
              measured_at, received_at, produto, quantidade_atual, capacidade,
              quantidade_vazia, quantidade_agua, temperatura, nivel_percentual, payload
            )
          VALUES
            (
              $1, 'gasmobile', $2, $3,
              $4, $5, $6,
              $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16::jsonb
            )
          ON CONFLICT (user_id, source_system, external_unidade_id, external_tanque_id, measured_at)
          DO UPDATE SET
            received_at = EXCLUDED.received_at,
            produto = EXCLUDED.produto,
            quantidade_atual = EXCLUDED.quantidade_atual,
            capacidade = EXCLUDED.capacidade,
            quantidade_vazia = EXCLUDED.quantidade_vazia,
            quantidade_agua = EXCLUDED.quantidade_agua,
            temperatura = EXCLUDED.temperatura,
            nivel_percentual = EXCLUDED.nivel_percentual,
            payload = EXCLUDED.payload
          RETURNING (xmax = 0) AS inserted
          `,
          [
            userId,
            posto.id,
            tanque.id,
            externalUnidadeId,
            externalTanqueId,
            toText(item.Id),
            measuredAt.toISOString(),
            receivedAt ? receivedAt.toISOString() : null,
            toText(item.Produto),
            toNumber(item.QuantidadeAtual),
            toNumber(item.CapacidadeDoTanque),
            toNumber(item.QuantidadeVazia),
            toNumber(item.QuantidadeDeAgua),
            toNumber(item.Temperatura),
            toNumber(item.NivelEmPercentual),
            JSON.stringify(item),
          ],
        );

        if (measurementResult.rows[0]?.inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        await db.query(
          `
          UPDATE tanques
          SET
            quantidade_atual = $1,
            quantidade_agua = $2,
            temperatura = $3,
            nivel_percentual = $4,
            nivel_percentual_com_tolerancia = $5,
            data_ultima_medicao = $6,
            data_ultimo_recebimento = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
          `,
          [
            toNumber(item.QuantidadeAtual),
            toNumber(item.QuantidadeDeAgua),
            toNumber(item.Temperatura),
            toNumber(item.NivelEmPercentual),
            toNumber(item.NivelEmPercentualComTolerancia),
            measuredAt.toISOString(),
            receivedAt ? receivedAt.toISOString() : null,
            tanque.id,
          ],
        );
      } catch (rowError) {
        recordsFailed++;
        console.error('Falha ao sincronizar item da GasMobile:', rowError.message);
      }
    }

    await finishSyncLog({
      logId,
      status: recordsFailed > 0 ? 'partial' : 'success',
      recordsRead,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
    });
    finished = true;

    await markIntegrationHealth(userId, true);

    return {
      success: true,
      source_system: 'gasmobile',
      summary: {
        records_read: recordsRead,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_skipped: recordsSkipped,
        records_failed: recordsFailed,
      },
      sync_log_id: logId,
    };
  } catch (error) {
    try {
      if (logId && !finished) {
        await finishSyncLog({
          logId,
          status: 'failed',
          recordsRead,
          recordsCreated,
          recordsUpdated,
          recordsSkipped,
          recordsFailed: recordsFailed + 1,
          errorMessage: error.message,
        });
        finished = true;
      }
      await markIntegrationHealth(userId, false, error.message);
    } catch (finalizeError) {
      console.error('Erro ao finalizar sync log GasMobile:', finalizeError.message);
    }
    throw error;
  }
}

module.exports = {
  syncGasMobileMeasurements,
};
