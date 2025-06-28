-- Script para atualizar referências de nomes de colunas para inglês nos modelos
-- Adapte conforme necessário para outros modelos além de 'contatos'

-- Este arquivo documenta as alterações já realizadas nas colunas
-- da tabela contatos para referência futura e possível uso em outros modelos

/*
-- Alterações já aplicadas em contatos:
ALTER TABLE contatos 
RENAME COLUMN criado_em TO created_at;

ALTER TABLE contatos 
RENAME COLUMN atualizado_em TO updated_at;

ALTER TABLE contatos 
RENAME COLUMN deletado_em TO deleted_at;

-- Atualizar comentários para inglês
COMMENT ON COLUMN contatos.created_at IS 'Data e hora de criação do contato';
COMMENT ON COLUMN contatos.updated_at IS 'Data e hora da última atualização do contato';
COMMENT ON COLUMN contatos.deleted_at IS 'Data e hora da exclusão do contato (soft delete)';

-- Recriar o trigger com o nome da coluna atualizado
DROP TRIGGER IF EXISTS trigger_atualizar_contatos_timestamp ON contatos;
DROP FUNCTION IF EXISTS atualizar_contatos_timestamp();

CREATE OR REPLACE FUNCTION update_contatos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contatos_timestamp
   BEFORE UPDATE ON contatos
   FOR EACH ROW
   EXECUTE FUNCTION update_contatos_timestamp();
*/

-- Aplicar alterações semelhantes à tabela webhooks
ALTER TABLE IF EXISTS webhooks 
RENAME COLUMN criado_em TO created_at;

ALTER TABLE IF EXISTS webhooks 
RENAME COLUMN atualizado_em TO updated_at;

ALTER TABLE IF EXISTS webhooks 
RENAME COLUMN deletado_em TO deleted_at;

-- Atualizar comentários para inglês na tabela webhooks
COMMENT ON COLUMN webhooks.created_at IS 'Data e hora de criação do webhook';
COMMENT ON COLUMN webhooks.updated_at IS 'Data e hora da última atualização do webhook';
COMMENT ON COLUMN webhooks.deleted_at IS 'Data e hora da exclusão do webhook (soft delete)';

-- Recriar o trigger para webhooks com o nome da coluna atualizado
DROP TRIGGER IF EXISTS trigger_atualizar_webhooks_timestamp ON webhooks;
DROP FUNCTION IF EXISTS atualizar_webhooks_timestamp();

CREATE OR REPLACE FUNCTION update_webhooks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhooks_timestamp
   BEFORE UPDATE ON webhooks
   FOR EACH ROW
   EXECUTE FUNCTION update_webhooks_timestamp();
