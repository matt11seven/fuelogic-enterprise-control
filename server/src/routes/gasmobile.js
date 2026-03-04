const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');
const { syncGasMobileMeasurements } = require('../services/gasmobile-sync');
const { getGasMobileAutoSyncStatus } = require('../services/gasmobile-auto-sync');

router.use(authenticateToken);

const GM_ENDPOINT = 'https://services.gasmobile.online/Medicao/ObterMedicoesTanque';

// GET /api/gasmobile/preview
// Busca dados da API GasMobile e compara com o banco, retornando preview para importação
router.get('/preview', async (req, res) => {
  try {
    const userId = req.user.id;

    // Busca api_key do usuário no banco
    const userResult = await db.query(
      'SELECT api_key FROM users WHERE id = $1',
      [userId]
    );

    const apiKey = userResult.rows[0]?.api_key;
    if (!apiKey) {
      return res.status(400).json({ message: 'API Key GasMobile não configurada para este usuário' });
    }

    // Busca dados da API GasMobile
    const gmUrl = `${GM_ENDPOINT}?apiKey=${encodeURIComponent(apiKey)}`;
    const gmResponse = await fetch(gmUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!gmResponse.ok) {
      return res.status(502).json({ message: `Erro ao conectar com GasMobile: ${gmResponse.status}` });
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
        return res.status(502).json({
          message: 'GasMobile retornou JSON inválido no preview',
          detail: parseError.message,
        });
      }
    }

    if (!Array.isArray(gmData) || gmData.length === 0) {
      return res.json({ postos: [], combustiveis: [] });
    }

    // Busca postos e tanques e combustíveis existentes do usuário
    const [postosResult, tanquesResult, combustiveisResult] = await Promise.all([
      db.query('SELECT * FROM postos WHERE user_id = $1', [userId]),
      db.query(`
        SELECT t.* FROM tanques t
        JOIN postos p ON p.id = t.posto_id
        WHERE p.user_id = $1
      `, [userId]),
      db.query("SELECT * FROM combustiveis WHERE user_id = $1 AND status != 'inativo'", [userId])
    ]);

    const postosExistentes = postosResult.rows;
    const tanquesExistentes = tanquesResult.rows;
    const combustiveisExistentes = combustiveisResult.rows;

    // Agrupa dados GM por unidade
    const unidadesMap = {};
    for (const item of gmData) {
      const key = String(item.IdUnidade);
      if (!unidadesMap[key]) {
        unidadesMap[key] = {
          id_unidade: item.IdUnidade,
          nome: item.Unidade,
          cliente_gm: item.Cliente,
          indice_equipamento: item.IndiceDoEquipamento,
          tanques: []
        };
      }
      unidadesMap[key].tanques.push({
        numero_tanque: item.NumeroDoTanque,
        produto: item.Produto?.trim(),
        capacidade: item.CapacidadeDoTanque,
        capacidade_menos_10_porcento: item.CapacidadeDoTanqueMenos10Porcento,
        // dados de medição exibidos no preview mas não gravados no banco (já vêm ao vivo da API)
        nivel_percentual: item.NivelEmPercentual,
        quantidade_atual: item.QuantidadeAtual,
      });
    }

    // Para cada posto GM, verificar se já existe no banco
    const postos = Object.values(unidadesMap).map(gmPosto => {
      const existente = postosExistentes.find(
        p => String(p.id_unidade) === String(gmPosto.id_unidade)
      );
      const nomeSistema = typeof existente?.nome === 'string' ? existente.nome.trim() : '';
      const clienteSistema = typeof existente?.cliente_gm === 'string' ? existente.cliente_gm.trim() : '';
      const nomeGM = typeof gmPosto.nome === 'string' ? gmPosto.nome.trim() : '';
      const clienteGM = typeof gmPosto.cliente_gm === 'string' ? gmPosto.cliente_gm.trim() : '';
      const nomeResolvido = nomeSistema || nomeGM;
      const clienteResolvido = clienteSistema || clienteGM;

      const tanques = gmPosto.tanques.map(gt => {
        const tanqueExistente = existente
          ? tanquesExistentes.find(t => t.posto_id === existente.id && t.numero_tanque === gt.numero_tanque)
          : null;

        return {
          ...gt,
          status: tanqueExistente ? 'existente' : 'novo',
          existing_id: tanqueExistente?.id || null,
        };
      });

      return {
        ...gmPosto,
        nome: nomeResolvido,
        cliente_gm: clienteResolvido,
        nome_gasmobile: nomeGM,
        cliente_gm_gasmobile: clienteGM,
        status: existente ? 'existente' : 'novo',
        existing_id: existente?.id || null,
        nome_atual: nomeResolvido,
        tanques,
      };
    });

    // Produtos únicos
    const produtosGM = [...new Set(gmData.map(d => d.Produto?.trim()).filter(Boolean))];
    const combustiveis = produtosGM.map(produto => {
      const existente = combustiveisExistentes.find(
        c => c.nome.toLowerCase().trim() === produto.toLowerCase()
      );
      return {
        nome: produto,
        status: existente ? 'existente' : 'novo',
        existing_id: existente?.id || null,
      };
    });

    res.json({ postos, combustiveis });
  } catch (error) {
    console.error('Erro no preview GasMobile:', error);
    res.status(500).json({ message: 'Erro ao buscar preview GasMobile', detail: error.message });
  }
});

// POST /api/gasmobile/import
// Importa postos, tanques e combustíveis selecionados
router.post('/import', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postos = [], combustiveis = [], atualizar_existentes = false } = req.body;

    await db.query('BEGIN');

    const resultado = {
      postos_criados: 0,
      postos_atualizados: 0,
      tanques_criados: 0,
      tanques_atualizados: 0,
      combustiveis_criados: 0,
    };

    // Importar combustíveis primeiro (para poder vincular depois)
    const combustiveisIds = {};
    for (const comb of combustiveis) {
      if (comb.status === 'existente') {
        combustiveisIds[comb.nome] = comb.existing_id;
        continue;
      }
      const r = await db.query(
        `INSERT INTO combustiveis (user_id, nome, unidade, status)
         VALUES ($1, $2, 'litros', 'ativo')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [userId, comb.nome]
      );
      if (r.rows.length > 0) {
        combustiveisIds[comb.nome] = r.rows[0].id;
        resultado.combustiveis_criados++;
      }
    }

    // Buscar combustíveis já existentes que não foram enviados para criar
    const existentesResult = await db.query(
      "SELECT id, nome FROM combustiveis WHERE user_id = $1 AND status != 'inativo'",
      [userId]
    );
    for (const c of existentesResult.rows) {
      if (!combustiveisIds[c.nome]) combustiveisIds[c.nome] = c.id;
    }

    // Importar postos e tanques
    for (const posto of postos) {
      let postoId = posto.existing_id;

      if (posto.status === 'novo') {
        const r = await db.query(
          `INSERT INTO postos (user_id, nome, id_unidade, indice_equipamento, cliente_gm, status)
           VALUES ($1, $2, $3, $4, $5, 'ativo')
           RETURNING id`,
          [userId, posto.nome, posto.id_unidade, posto.indice_equipamento, posto.cliente_gm]
        );
        postoId = r.rows[0].id;
        resultado.postos_criados++;
      } else if (atualizar_existentes && postoId) {
        await db.query(
          `UPDATE postos SET nome=$1, cliente_gm=$2, updated_at=NOW()
           WHERE id=$3 AND user_id=$4`,
          [posto.nome, posto.cliente_gm, postoId, userId]
        );
        resultado.postos_atualizados++;
      }

      if (!postoId) continue;

      // Importar tanques do posto (apenas dados de cadastro, não medições em tempo real)
      for (const tanque of (posto.tanques || [])) {
        if (tanque.status === 'novo') {
          await db.query(
            `INSERT INTO tanques
             (user_id, posto_id, numero_tanque, produto, capacidade,
              capacidade_menos_10_porcento, status)
             VALUES ($1,$2,$3,$4,$5,$6,'ativo')
             ON CONFLICT (posto_id, numero_tanque) DO NOTHING`,
            [userId, postoId, tanque.numero_tanque, tanque.produto,
             tanque.capacidade, tanque.capacidade_menos_10_porcento]
          );
          resultado.tanques_criados++;

          // Vincular combustível ao posto
          const combId = combustiveisIds[tanque.produto];
          if (combId) {
            await db.query(
              `INSERT INTO posto_combustiveis (posto_id, combustivel_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [postoId, combId]
            );
          }
        }
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Importação concluída', resultado });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro na importação GasMobile:', error);
    res.status(500).json({ message: 'Erro na importação', detail: error.message });
  }
});

// POST /api/gasmobile/sync-medicoes
// Sincroniza medições da GasMobile para tabela histórica (medicoes_tanque)
router.post('/sync-medicoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await syncGasMobileMeasurements({ userId });
    return res.json(result);
  } catch (error) {
    console.error('Erro ao sincronizar medições GasMobile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar medições GasMobile',
      detail: error.message,
    });
  }
});

// GET /api/gasmobile/sync-status
// Retorna status do scheduler de sync automático
router.get('/sync-status', async (_req, res) => {
  try {
    return res.json({ success: true, ...getGasMobileAutoSyncStatus() });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar status do sync automático',
      detail: error.message,
    });
  }
});

// GET /api/gasmobile/medicoes/latest
// Retorna última medição por tanque registrada no banco (fallback operacional)
router.get('/medicoes/latest', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (mt.user_id, mt.source_system, mt.external_unidade_id, mt.external_tanque_id)
          mt.*,
          p.nome AS posto_nome,
          p.cliente_gm,
          p.id_unidade,
          p.indice_equipamento,
          t.numero_tanque,
          t.capacidade_menos_10_porcento,
          t.nivel_percentual_com_tolerancia
        FROM medicoes_tanque mt
        LEFT JOIN postos p ON p.id = mt.posto_id
        LEFT JOIN tanques t ON t.id = mt.tanque_id
        WHERE mt.user_id = $1 AND mt.source_system = 'gasmobile'
        ORDER BY mt.user_id, mt.source_system, mt.external_unidade_id, mt.external_tanque_id, mt.measured_at DESC
      )
      SELECT
        id,
        COALESCE(NULLIF(TRIM(cliente_gm), ''), NULLIF(TRIM(posto_nome), ''), 'N/A') AS cliente,
        COALESCE(NULLIF(TRIM(posto_nome), ''), NULLIF(TRIM(cliente_gm), ''), external_unidade_id) AS unidade,
        COALESCE(
          numero_tanque,
          CASE WHEN external_tanque_id ~ '^[0-9]+$' THEN external_tanque_id::int ELSE NULL END
        ) AS tanque,
        produto,
        quantidade_atual,
        quantidade_agua,
        quantidade_vazia,
        temperatura,
        measured_at,
        received_at,
        indice_equipamento,
        COALESCE(
          numero_tanque,
          CASE WHEN external_tanque_id ~ '^[0-9]+$' THEN external_tanque_id::int ELSE NULL END
        ) AS numero_tanque,
        capacidade,
        capacidade_menos_10_porcento,
        nivel_percentual,
        nivel_percentual_com_tolerancia,
        id_unidade,
        payload
      FROM latest
      ORDER BY unidade ASC, numero_tanque ASC
      `,
      [userId],
    );

    const rows = result.rows.map((r) => ({
      Id: r.id,
      Cliente: r.cliente,
      Unidade: r.unidade,
      Tanque: r.tanque,
      Produto: r.produto || '',
      QuantidadeAtual: Number(r.quantidade_atual || 0),
      QuantidadeAtualEmMetrosCubicos: Number(r.quantidade_atual || 0) / 1000,
      QuantidadeDeAgua: Number(r.quantidade_agua || 0),
      QuantidadeVazia: Number(r.quantidade_vazia || 0),
      Temperatura: Number(r.temperatura || 0),
      DataMedicao: r.measured_at ? new Date(r.measured_at).toISOString() : null,
      DataRecebimento: r.received_at ? new Date(r.received_at).toISOString() : null,
      IndiceDoEquipamento: Number(r.indice_equipamento || 0),
      NumeroDoTanque: Number(r.numero_tanque || 0),
      CapacidadeDoTanque: Number(r.capacidade || 0),
      CapacidadeDoTanqueMenos10Porcento: Number(r.capacidade_menos_10_porcento || 0),
      NivelEmPercentual: Number(r.nivel_percentual || 0),
      NivelEmPercentualComTolerancia: Number(r.nivel_percentual_com_tolerancia || 0),
      IdUnidade: Number(r.id_unidade || 0),
    }));

    const latestMeasuredAt = rows
      .map((r) => r.DataMedicao)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    return res.json({ success: true, count: rows.length, latest_measured_at: latestMeasuredAt, rows });
  } catch (error) {
    console.error('Erro ao buscar medições locais GasMobile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar medições locais GasMobile',
      detail: error.message,
    });
  }
});

module.exports = router;
