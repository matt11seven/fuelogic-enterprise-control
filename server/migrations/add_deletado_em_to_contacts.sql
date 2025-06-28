-- Adiciona a coluna deletado_em para implementar soft delete na tabela contatos
ALTER TABLE contatos 
ADD COLUMN deletado_em TIMESTAMP;

-- Atualiza registros existentes com valor NULL (não deletados)
UPDATE contatos SET deletado_em = NULL;

-- Adiciona índice para melhorar performance das consultas com filtro de soft delete
CREATE INDEX idx_contatos_deletado_em ON contatos (deletado_em);
