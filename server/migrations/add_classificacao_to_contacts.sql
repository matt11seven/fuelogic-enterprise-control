-- Adiciona a coluna classificacao para diferenciar contatos internos e externos
ALTER TABLE contatos 
ADD COLUMN IF NOT EXISTS classificacao VARCHAR(20) DEFAULT 'interno';

-- Atualiza registros existentes
UPDATE contatos SET classificacao = 'interno' WHERE classificacao IS NULL;

-- Adiciona comentário para documentação
COMMENT ON COLUMN contatos.classificacao IS 'Classificação do contato: interno ou externo. Usado para filtrar contatos disponíveis para SlingFlow.';
