-- =============================================
-- Story 001 - Schema Canonico de Integracoes
-- Data: 2026-03-04
-- =============================================

-- -------------------------------------------------
-- TABELA: integracao_fontes
-- Descricao: Configuracao de conectores externos por usuario
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS integracao_fontes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  source_system VARCHAR(50) NOT NULL, -- ex: gasmobile, emsys, sap, totvs
  nome_exibicao VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo', 'erro')),
  config JSONB, -- credenciais e parametros especificos da fonte
  sync_mode VARCHAR(20) NOT NULL DEFAULT 'incremental'
    CHECK (sync_mode IN ('full', 'incremental')),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_integracao_fontes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_integracao_fontes_user_source
    UNIQUE (user_id, source_system)
);

CREATE INDEX IF NOT EXISTS idx_integracao_fontes_user
  ON integracao_fontes(user_id);
CREATE INDEX IF NOT EXISTS idx_integracao_fontes_source
  ON integracao_fontes(source_system);
CREATE INDEX IF NOT EXISTS idx_integracao_fontes_status
  ON integracao_fontes(status);

-- -------------------------------------------------
-- TABELA: integracao_mapeamentos
-- Descricao: Mapeamento de IDs externos para entidades internas
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS integracao_mapeamentos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  source_system VARCHAR(50) NOT NULL,
  entity_type VARCHAR(30) NOT NULL
    CHECK (entity_type IN ('posto', 'tanque', 'combustivel', 'fornecedor', 'pedido')),
  external_id VARCHAR(120) NOT NULL,
  external_key VARCHAR(200), -- chave alternativa da fonte (ex: codigo ERP)
  posto_id INTEGER,
  tanque_id INTEGER,
  combustivel_id INTEGER,
  metadata JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_integracao_mapeamentos_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_integracao_mapeamentos_posto
    FOREIGN KEY (posto_id) REFERENCES postos(id) ON DELETE SET NULL,
  CONSTRAINT fk_integracao_mapeamentos_tanque
    FOREIGN KEY (tanque_id) REFERENCES tanques(id) ON DELETE SET NULL,
  CONSTRAINT fk_integracao_mapeamentos_combustivel
    FOREIGN KEY (combustivel_id) REFERENCES combustiveis(id) ON DELETE SET NULL,
  CONSTRAINT uk_integracao_mapeamentos_chave
    UNIQUE (user_id, source_system, entity_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_integracao_mapeamentos_lookup
  ON integracao_mapeamentos(user_id, source_system, entity_type);
CREATE INDEX IF NOT EXISTS idx_integracao_mapeamentos_external_key
  ON integracao_mapeamentos(source_system, external_key)
  WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integracao_mapeamentos_posto_id
  ON integracao_mapeamentos(posto_id)
  WHERE posto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integracao_mapeamentos_tanque_id
  ON integracao_mapeamentos(tanque_id)
  WHERE tanque_id IS NOT NULL;

-- -------------------------------------------------
-- TABELA: medicoes_tanque
-- Descricao: Historico de medicoes/snapshots de tanque por fonte
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS medicoes_tanque (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  source_system VARCHAR(50) NOT NULL,
  posto_id INTEGER,
  tanque_id INTEGER,
  external_unidade_id VARCHAR(120),
  external_tanque_id VARCHAR(120),
  external_record_id VARCHAR(120),
  measured_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ,
  produto VARCHAR(120),
  quantidade_atual NUMERIC,
  capacidade NUMERIC,
  quantidade_vazia NUMERIC,
  quantidade_agua NUMERIC,
  temperatura NUMERIC,
  nivel_percentual NUMERIC,
  payload JSONB, -- payload bruto original da fonte
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_medicoes_tanque_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_medicoes_tanque_posto
    FOREIGN KEY (posto_id) REFERENCES postos(id) ON DELETE SET NULL,
  CONSTRAINT fk_medicoes_tanque_tanque
    FOREIGN KEY (tanque_id) REFERENCES tanques(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_medicoes_tanque_user_measured
  ON medicoes_tanque(user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicoes_tanque_source_measured
  ON medicoes_tanque(source_system, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicoes_tanque_tanque_measured
  ON medicoes_tanque(tanque_id, measured_at DESC)
  WHERE tanque_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medicoes_tanque_ext_unidade_tanque
  ON medicoes_tanque(source_system, external_unidade_id, external_tanque_id);

-- Idempotencia de ingestao:
-- Evita duplicar snapshot da mesma fonte/chave natural no mesmo instante de medicao.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uk_medicoes_tanque_snapshot'
  ) THEN
    ALTER TABLE medicoes_tanque
      ADD CONSTRAINT uk_medicoes_tanque_snapshot
      UNIQUE (user_id, source_system, external_unidade_id, external_tanque_id, measured_at);
  END IF;
END $$;

-- -------------------------------------------------
-- TABELA: integracao_sync_logs
-- Descricao: Auditoria de execucoes de sincronizacao
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS integracao_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  source_system VARCHAR(50) NOT NULL,
  sync_type VARCHAR(30) NOT NULL
    CHECK (sync_type IN ('full', 'incremental', 'master_data', 'measurements')),
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_integracao_sync_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integracao_sync_logs_user_started
  ON integracao_sync_logs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_integracao_sync_logs_source_started
  ON integracao_sync_logs(source_system, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_integracao_sync_logs_status
  ON integracao_sync_logs(status);

-- -------------------------------------------------
-- FUNCOES/TRIGGERS DE updated_at
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_integracoes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integracao_fontes_updated_at ON integracao_fontes;
CREATE TRIGGER trg_integracao_fontes_updated_at
  BEFORE UPDATE ON integracao_fontes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_integracoes();

DROP TRIGGER IF EXISTS trg_integracao_mapeamentos_updated_at ON integracao_mapeamentos;
CREATE TRIGGER trg_integracao_mapeamentos_updated_at
  BEFORE UPDATE ON integracao_mapeamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_integracoes();

-- -------------------------------------------------
-- COMENTARIOS
-- -------------------------------------------------
COMMENT ON TABLE integracao_fontes IS
  'Configuracao de conectores externos por usuario (GasMobile, EMSys, etc).';
COMMENT ON TABLE integracao_mapeamentos IS
  'Mapeamento de identificadores externos para entidades internas canônicas.';
COMMENT ON TABLE medicoes_tanque IS
  'Snapshots historicos de medicao de tanques por fonte externa.';
COMMENT ON TABLE integracao_sync_logs IS
  'Auditoria de execucao de sincronizacoes (full/incremental).';
