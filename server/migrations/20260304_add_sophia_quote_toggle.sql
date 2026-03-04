-- Adiciona toggle para habilitar/desabilitar uso da Sophia apenas na etapa de cotacao.
ALTER TABLE IF EXISTS sophia_configuracoes
ADD COLUMN IF NOT EXISTS use_quote_assistant BOOLEAN NOT NULL DEFAULT FALSE;
