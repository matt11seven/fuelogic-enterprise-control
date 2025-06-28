-- Limpar estrutura anterior se existir
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;

-- Criar tabela webhooks relacionada ao usuário
CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- Relacionamento obrigatório com users
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('inspection_alert', 'order_placed', 'ai_sophia')),
  integration VARCHAR(30) NOT NULL DEFAULT 'generic' CHECK (integration IN ('slingflow', 'generic')),
  url VARCHAR(500) NOT NULL, -- URL obrigatória para ambos os tipos
  method VARCHAR(10) DEFAULT 'POST',
  headers JSONB,
  auth_type VARCHAR(20) CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key')),
  auth_config JSONB,
  selected_contacts JSONB, -- Array de IDs dos contatos selecionados para SlingFlow
  is_active BOOLEAN DEFAULT true,
  timeout_seconds INTEGER DEFAULT 30,
  retry_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key para users
  CONSTRAINT fk_webhooks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de logs dos webhooks
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- Relacionamento com users
  webhook_id INTEGER NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  execution_time_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_webhook_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_webhook_logs_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_type ON webhooks(type);
CREATE INDEX idx_webhooks_user_type ON webhooks(user_id, type);
CREATE INDEX idx_webhooks_integration ON webhooks(integration);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

CREATE INDEX idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhooks_updated_at();

-- Função para buscar contatos elegíveis para webhooks (apenas internos)
CREATE OR REPLACE FUNCTION get_eligible_contacts_for_webhook(webhook_type VARCHAR, user_uuid UUID)
RETURNS TABLE (
    id INTEGER,
    nome VARCHAR,
    telefone VARCHAR,
    tipo VARCHAR,
    classificacao VARCHAR
) AS $$
BEGIN
    CASE webhook_type
        WHEN 'inspection_alert', 'order_placed' THEN
            -- Para ambos os tipos de webhook, apenas contatos INTERNOS
            RETURN QUERY
            SELECT c.id, c.nome, c.telefone, c.tipo, c.classificacao
            FROM contatos c
            WHERE c.user_id = user_uuid 
            AND c.status = 'ativo'
            AND c.classificacao = 'interno'  -- APENAS INTERNOS
            ORDER BY c.tipo, c.nome;
        ELSE
            -- Para outros tipos de webhook, retorna todos os contatos ativos
            RETURN QUERY
            SELECT c.id, c.nome, c.telefone, c.tipo, c.classificacao
            FROM contatos c
            WHERE c.user_id = user_uuid 
            AND c.status = 'ativo'
            ORDER BY c.classificacao, c.tipo, c.nome;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE webhooks IS 'Configuração de webhooks por usuário - SlingFlow usa payload simplificado (numero + msg)';
COMMENT ON TABLE webhook_logs IS 'Logs de execução dos webhooks por usuário';

COMMENT ON COLUMN webhooks.user_id IS 'ID do usuário proprietário do webhook';
COMMENT ON COLUMN webhooks.integration IS 'Tipo de integração: slingflow (payload simples) ou generic (payload completo)';
COMMENT ON COLUMN webhooks.selected_contacts IS 'Array JSON com IDs dos contatos selecionados para SlingFlow';
COMMENT ON COLUMN webhooks.url IS 'URL do webhook - obrigatória para ambos os tipos';

-- Atualizar classificação dos contatos existentes se necessário
UPDATE contatos SET classificacao = 'interno' 
WHERE user_id = '0bd186df-d34b-4aa9-82f5-813f1b50141d'
AND tipo IN ('gerente', 'supervisor', 'proprietario')
AND classificacao IS NULL;

UPDATE contatos SET classificacao = 'externo' 
WHERE user_id = '0bd186df-d34b-4aa9-82f5-813f1b50141d'
AND tipo IN ('distribuidora', 'fornecedor', 'manutencao')
AND classificacao IS NULL;

-- Inserir dados de exemplo para o usuário específico
INSERT INTO webhooks (user_id, name, type, integration, url, selected_contacts, is_active) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'Alerta de Inspeção - SlingFlow', 'inspection_alert', 'slingflow', 'https://api.slingflow.com/send', '[2, 3, 4]', true),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'Pedidos - Webhook Genérico', 'order_placed', 'generic', 'https://api.exemplo.com/webhooks/orders', NULL, true),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'IA Sophia - Análises', 'ai_sophia', 'generic', 'https://sophia.ai/api/analyze', NULL, true),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'Pedidos - SlingFlow', 'order_placed', 'slingflow', 'https://api.slingflow.com/send', '[2, 3]', true);

-- Exemplos de uso da função para buscar contatos elegíveis
-- SELECT * FROM get_eligible_contacts_for_webhook('inspection_alert', '0bd186df-d34b-4aa9-82f5-813f1b50141d');
-- SELECT * FROM get_eligible_contacts_for_webhook('order_placed', '0bd186df-d34b-4aa9-82f5-813f1b50141d');