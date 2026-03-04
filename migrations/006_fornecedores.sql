CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18),
  telefone VARCHAR(20),
  email VARCHAR(100),
  contato_comercial VARCHAR(255),
  prazo_entrega_dias INTEGER,
  observacoes TEXT,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedor_combustiveis (
  fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE CASCADE,
  combustivel_id INTEGER REFERENCES combustiveis(id) ON DELETE CASCADE,
  PRIMARY KEY (fornecedor_id, combustivel_id)
);
