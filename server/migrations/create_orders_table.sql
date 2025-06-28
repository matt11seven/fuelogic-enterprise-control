-- Migration: create_orders_table.sql
-- Criação da tabela de pedidos de abastecimento com vínculo a webhooks
CREATE TABLE orders (
   id SERIAL PRIMARY KEY,
   user_id UUID NOT NULL,
   station_id VARCHAR(50) NOT NULL,
   tank_id VARCHAR(50) NOT NULL,
   product_type VARCHAR(50) NOT NULL,
   quantity NUMERIC NOT NULL CHECK (quantity > 0),
   status VARCHAR(20) NOT NULL DEFAULT 'pendente' 
       CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
   notes TEXT,
   webhook_id INTEGER,
   notification_sent BOOLEAN DEFAULT FALSE,
   scheduled_date TIMESTAMP WITH TIME ZONE,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   
   -- Constraints e validações
   CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
   CONSTRAINT fk_orders_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE SET NULL
);

-- Comentários da tabela e colunas para documentação
COMMENT ON TABLE orders IS 'Pedidos de abastecimento de combustível';
COMMENT ON COLUMN orders.id IS 'Identificador único do pedido';
COMMENT ON COLUMN orders.user_id IS 'ID do usuário que criou o pedido';
COMMENT ON COLUMN orders.station_id IS 'Identificador do posto (estação)';
COMMENT ON COLUMN orders.tank_id IS 'Identificador do tanque';
COMMENT ON COLUMN orders.product_type IS 'Tipo de combustível/produto';
COMMENT ON COLUMN orders.quantity IS 'Quantidade em litros';
COMMENT ON COLUMN orders.status IS 'Status do pedido: pendente, processando, concluído ou cancelado';
COMMENT ON COLUMN orders.notes IS 'Observações ou instruções especiais';
COMMENT ON COLUMN orders.webhook_id IS 'Referência ao webhook para notificação';
COMMENT ON COLUMN orders.notification_sent IS 'Indica se a notificação já foi enviada';
COMMENT ON COLUMN orders.scheduled_date IS 'Data/hora agendada para o abastecimento';

-- Trigger para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION update_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_timestamp_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_timestamp();

-- Índices para melhorar performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_station_tank ON orders(station_id, tank_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_webhook_id ON orders(webhook_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Inserir dados de exemplo (sem webhook para evitar erro de foreign key)
INSERT INTO orders (user_id, station_id, tank_id, product_type, quantity, status, notes, scheduled_date) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'ST001', 'TK001', 'gasoline', 15000, 'pendente', 'Pedido urgente - nível crítico', '2025-06-27 08:00:00+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'ST001', 'TK002', 'ethanol', 8000, 'processando', 'Entrega programada', '2025-06-28 14:00:00+00');