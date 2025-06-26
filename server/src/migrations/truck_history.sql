-- Tabela para armazenar o histórico de alterações dos caminhões
CREATE TABLE truck_history (
    id SERIAL PRIMARY KEY,
    truck_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    field_name VARCHAR(50), -- Nome do campo alterado (null para create/delete)
    old_value TEXT, -- Valor antigo (null para create)
    new_value TEXT, -- Valor novo (null para delete)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_truck_history_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE,
    CONSTRAINT fk_truck_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para melhorar a performance das consultas
CREATE INDEX idx_truck_history_truck_id ON truck_history(truck_id);
CREATE INDEX idx_truck_history_user_id ON truck_history(user_id);
CREATE INDEX idx_truck_history_created_at ON truck_history(created_at);
