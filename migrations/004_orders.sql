-- Migration 004: Tabelas de pedidos
-- Criado em: 2026-03-04

-- Tabela principal de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  group_id UUID,
  station_id VARCHAR(255),
  station_name VARCHAR(255),
  tank_id VARCHAR(255),
  product_type VARCHAR(100),
  quantity INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  truck_id INTEGER REFERENCES trucks(id),
  webhook_id INTEGER,
  delivery_estimate TIMESTAMP,
  notes TEXT,
  sophia_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_station_id ON orders(station_id);

-- Timeline de eventos do pedido
CREATE TABLE IF NOT EXISTS order_timeline (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50),
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);

-- Cotações retornadas pela Sophia (agrupadas por group_id do batch)
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
