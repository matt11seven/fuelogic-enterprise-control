-- Migration 004b: Adicionar colunas faltantes na tabela orders existente
-- Execute este script se a tabela orders já existia antes da migration 004

-- Adicionar colunas que podem não existir
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS station_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS station_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tank_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS truck_id INTEGER REFERENCES trucks(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS webhook_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_estimate TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sophia_sent_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_station_id ON orders(station_id);

-- Criar tabelas novas (order_timeline e order_quotations) se não existirem
CREATE TABLE IF NOT EXISTS order_timeline (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50),
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);

CREATE TABLE IF NOT EXISTS order_quotations (
  id SERIAL PRIMARY KEY,
  order_group_id UUID,
  supplier_name VARCHAR(255),
  product_type VARCHAR(100),
  unit_price NUMERIC(10,4),
  total_price NUMERIC(12,2),
  delivery_days INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_quotations_group_id ON order_quotations(order_group_id);
