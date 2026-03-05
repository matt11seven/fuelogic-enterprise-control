-- Story 012: Adiciona custo de frete próprio ao cadastro de fornecedor
-- Usado no cálculo do custo real/L quando o fornecedor pratica frete FOB
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS custo_frete_proprio_rl NUMERIC(10,4) DEFAULT 0;
