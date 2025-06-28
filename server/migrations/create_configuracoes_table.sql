-- Migration para criar tabela de configurações de sistema

-- Limpar estrutura anterior se existir
DROP TABLE IF EXISTS configuracoes CASCADE;

-- Criar tabela de configurações relacionada ao usuário
CREATE TABLE configuracoes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- Relacionamento obrigatório com users
  
  -- Thresholds de status para tanques e pedidos
  threshold_critico INTEGER NOT NULL DEFAULT 20, -- Percentual abaixo do qual é crítico (padrão 20%)
  threshold_atencao INTEGER NOT NULL DEFAULT 50, -- Percentual abaixo do qual é atenção (padrão 50%)
  
  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key para users
  CONSTRAINT fk_configuracoes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Garantir que cada usuário tenha no máximo um registro
  CONSTRAINT uq_user_config UNIQUE (user_id)
);

-- Índices para performance
CREATE INDEX idx_configuracoes_user_id ON configuracoes(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracoes_updated_at();

-- Comentários para documentação
COMMENT ON TABLE configuracoes IS 'Configurações de sistema por usuário, incluindo thresholds de status para tanques e pedidos';
COMMENT ON COLUMN configuracoes.user_id IS 'ID do usuário proprietário das configurações';
COMMENT ON COLUMN configuracoes.threshold_critico IS 'Percentual abaixo do qual um tanque ou pedido é considerado crítico (vermelho)';
COMMENT ON COLUMN configuracoes.threshold_atencao IS 'Percentual abaixo do qual um tanque ou pedido é considerado em atenção (amarelo)';

-- Inserir dados de configuração padrão para o usuário exemplo
INSERT INTO configuracoes (user_id, threshold_critico, threshold_atencao) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 20, 50);

-- Função para obter configurações de um usuário
CREATE OR REPLACE FUNCTION get_user_config(user_uuid UUID)
RETURNS TABLE (
    id INTEGER,
    threshold_critico INTEGER,
    threshold_atencao INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.threshold_critico, c.threshold_atencao
    FROM configuracoes c
    WHERE c.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular status baseado nos thresholds configurados
CREATE OR REPLACE FUNCTION calcular_status_tanque(
    user_uuid UUID,
    percentual_atual INTEGER
) RETURNS VARCHAR AS $$
DECLARE
    config_critico INTEGER;
    config_atencao INTEGER;
    status_result VARCHAR;
BEGIN
    -- Obter parâmetros de configuração do usuário
    SELECT 
        c.threshold_critico, c.threshold_atencao 
    INTO 
        config_critico, config_atencao
    FROM 
        configuracoes c
    WHERE 
        c.user_id = user_uuid
    LIMIT 1;
    
    -- Se não existir configuração, usar valores padrão
    IF config_critico IS NULL THEN
        config_critico := 20;
    END IF;
    
    IF config_atencao IS NULL THEN
        config_atencao := 50;
    END IF;
    
    -- Calcular status baseado no percentual e configurações
    IF percentual_atual < config_critico THEN
        status_result := 'critico';
    ELSIF percentual_atual < config_atencao THEN
        status_result := 'atencao';
    ELSE
        status_result := 'operacional';
    END IF;
    
    RETURN status_result;
END;
$$ LANGUAGE plpgsql;
