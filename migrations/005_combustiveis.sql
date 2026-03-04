CREATE TABLE IF NOT EXISTS combustiveis (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(50),
  unidade VARCHAR(20) DEFAULT 'litros',
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posto_combustiveis (
  id SERIAL PRIMARY KEY,
  posto_id INTEGER REFERENCES postos(id) ON DELETE CASCADE,
  combustivel_id INTEGER REFERENCES combustiveis(id) ON DELETE CASCADE,
  codigo_erp VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ativo',
  UNIQUE(posto_id, combustivel_id)
);
