-- Migração para atualizar a constraint type_check da tabela webhooks
-- Adicionando suporte para os tipos de webhook da IA Sophia

-- 1. Primeiro, identificar a constraint atual
SELECT con.conname, con.conrelid::regclass AS table_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'webhooks' AND con.conname = 'webhooks_type_check';

-- 2. Remover a constraint atual
ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_type_check;

-- 3. Adicionar a nova constraint com os tipos atualizados
-- Nota: Este é um exemplo que deve ser ajustado com base na constraint original
-- Assumindo que a constraint atual verifica o campo "type"
ALTER TABLE webhooks ADD CONSTRAINT webhooks_type_check 
  CHECK (type IN ('inspection_alert', 'order_placed', 'sophia', 'sophia_ai_order'));

-- 4. Se também houver uma constraint para o campo "integration", ajustá-la também
-- Verificar se existe uma constraint para integration
SELECT con.conname, con.conrelid::regclass AS table_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'webhooks' AND con.conname LIKE '%integration%';

-- 5. Se existir, remover e adicionar a nova
ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_integration_check;

-- 6. Adicionar nova constraint para integration
ALTER TABLE webhooks ADD CONSTRAINT webhooks_integration_check 
  CHECK (integration IN ('generic', 'slingflow', 'sophia_ai'));

-- 7. Confirmar que as novas constraints foram aplicadas
SELECT con.conname, con.conrelid::regclass AS table_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'webhooks' AND (con.conname LIKE '%type%' OR con.conname LIKE '%integration%');
