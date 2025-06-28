-- =============================================
-- CRIAÇÃO COMPLETA DAS TABELAS POSTOS E TANQUES
-- Sistema Fuelogic Enterprise Control
-- =============================================

-- ---------------------------------------------
-- TABELA: postos
-- Descrição: Postos/unidades de abastecimento com endereço completo e integração ERP
-- ---------------------------------------------
CREATE TABLE postos (
   -- Identificação Principal
   id SERIAL PRIMARY KEY,
   user_id UUID NOT NULL,
   nome VARCHAR(200) NOT NULL,
   cnpj VARCHAR(18), -- CNPJ no formato XX.XXX.XXX/XXXX-XX
   
   -- Dados do Payload GM
   cliente_gm VARCHAR(200), -- Cliente conforme payload (ex: "Grupo SLING")
   id_unidade INTEGER, -- ID externo da unidade (ex: 765, 776, 781)
   indice_equipamento INTEGER, -- Índice do equipamento de medição (ex: 150, 153, 154)
   
   -- Integração ERP
   erp VARCHAR(100), -- Sistema ERP utilizado (ex: "emsys", "SAP", "Oracle")
   codigo_empresa_erp VARCHAR(50), -- Código da empresa no sistema ERP
   
   -- Endereço Completo
   cep VARCHAR(9), -- CEP no formato XXXXX-XXX
   logradouro VARCHAR(200), -- Nome da rua/avenida/estrada
   numero VARCHAR(20), -- Número do endereço
   complemento VARCHAR(100), -- Complemento (apto, sala, bloco, etc.)
   bairro VARCHAR(100), -- Nome do bairro/distrito
   cidade VARCHAR(100), -- Nome da cidade/município
   estado VARCHAR(2), -- Sigla do estado (UF)
   pais VARCHAR(50) DEFAULT 'Brasil', -- Nome do país
   
   -- Controle
   status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   
   -- Constraints
   CONSTRAINT fk_postos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
   CONSTRAINT uk_postos_user_id_unidade UNIQUE (user_id, id_unidade),
   CONSTRAINT uk_postos_user_cnpj UNIQUE (user_id, cnpj)
);

-- Índices para Performance - Tabela Postos
CREATE INDEX idx_postos_user_id ON postos(user_id);
CREATE INDEX idx_postos_id_unidade ON postos(id_unidade);
CREATE INDEX idx_postos_cliente_gm ON postos(cliente_gm) WHERE cliente_gm IS NOT NULL;
CREATE INDEX idx_postos_cnpj ON postos(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_postos_cep ON postos(cep) WHERE cep IS NOT NULL;
CREATE INDEX idx_postos_cidade_estado ON postos(cidade, estado);
CREATE INDEX idx_postos_estado ON postos(estado);
CREATE INDEX idx_postos_erp ON postos(erp) WHERE erp IS NOT NULL;

-- ---------------------------------------------
-- TABELA: tanques
-- Descrição: Tanques de combustível dos postos com dados de medição em tempo real
-- ---------------------------------------------
CREATE TABLE tanques (
   -- Identificação Principal
   id SERIAL PRIMARY KEY,
   user_id UUID NOT NULL,
   posto_id INTEGER NOT NULL,
   numero_tanque INTEGER NOT NULL,
   produto VARCHAR(100) NOT NULL, -- Tipo de combustível (ex: "GASOLINA GRID", "ETANOL", "DIESEL S10")
   
   -- Especificações do Tanque
   capacidade NUMERIC NOT NULL CHECK (capacidade > 0), -- Capacidade total em litros
   capacidade_menos_10_porcento NUMERIC, -- Capacidade considerando margem de segurança
   
   -- Medições em Tempo Real
   quantidade_atual NUMERIC DEFAULT 0, -- Quantidade atual de combustível em litros
   quantidade_agua NUMERIC DEFAULT 0, -- Quantidade de água detectada em litros
   temperatura NUMERIC, -- Temperatura atual do combustível
   nivel_percentual NUMERIC, -- Nível atual em percentual
   nivel_percentual_com_tolerancia NUMERIC, -- Nível com tolerância aplicada
   
   -- Timestamps de Medição
   data_ultima_medicao TIMESTAMP WITH TIME ZONE, -- Data da última medição dos sensores
   data_ultimo_recebimento TIMESTAMP WITH TIME ZONE, -- Data do último recebimento de combustível
   
   -- Controle
   status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'manutencao')),
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   
   -- Constraints
   CONSTRAINT fk_tanques_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
   CONSTRAINT fk_tanques_posto FOREIGN KEY (posto_id) REFERENCES postos(id) ON DELETE CASCADE,
   CONSTRAINT uk_tanques_posto_numero UNIQUE (posto_id, numero_tanque)
);

-- Índices para Performance - Tabela Tanques
CREATE INDEX idx_tanques_user_id ON tanques(user_id);
CREATE INDEX idx_tanques_posto_id ON tanques(posto_id);
CREATE INDEX idx_tanques_numero ON tanques(numero_tanque);
CREATE INDEX idx_tanques_produto ON tanques(produto);
CREATE INDEX idx_tanques_nivel ON tanques(nivel_percentual);
CREATE INDEX idx_tanques_status ON tanques(status);
CREATE INDEX idx_tanques_capacidade ON tanques(capacidade);
CREATE INDEX idx_tanques_quantidade_atual ON tanques(quantidade_atual);
CREATE INDEX idx_tanques_data_medicao ON tanques(data_ultima_medicao);

-- ---------------------------------------------
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMPS
-- ---------------------------------------------

-- Função para atualizar timestamp da tabela postos
CREATE OR REPLACE FUNCTION update_postos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar timestamp da tabela tanques
CREATE OR REPLACE FUNCTION update_tanques_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para execução automática
CREATE TRIGGER trigger_update_postos_timestamp
   BEFORE UPDATE ON postos
   FOR EACH ROW
   EXECUTE FUNCTION update_postos_timestamp();

CREATE TRIGGER trigger_update_tanques_timestamp
   BEFORE UPDATE ON tanques
   FOR EACH ROW
   EXECUTE FUNCTION update_tanques_timestamp();

-- ---------------------------------------------
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ---------------------------------------------

-- Comentários da Tabela Postos
COMMENT ON TABLE postos IS 'Postos/unidades de abastecimento com endereço completo e integração ERP';
COMMENT ON COLUMN postos.user_id IS 'ID do usuário proprietário do posto';
COMMENT ON COLUMN postos.nome IS 'Nome do posto/unidade';
COMMENT ON COLUMN postos.cnpj IS 'CNPJ da empresa do posto no formato XX.XXX.XXX/XXXX-XX';
COMMENT ON COLUMN postos.cliente_gm IS 'Nome do cliente conforme payload do sistema GM';
COMMENT ON COLUMN postos.id_unidade IS 'ID externo da unidade conforme sistema GM';
COMMENT ON COLUMN postos.indice_equipamento IS 'Índice do equipamento de medição';
COMMENT ON COLUMN postos.erp IS 'Sistema ERP utilizado pelo posto';
COMMENT ON COLUMN postos.codigo_empresa_erp IS 'Código da empresa no sistema ERP';
COMMENT ON COLUMN postos.cep IS 'CEP no formato XXXXX-XXX';
COMMENT ON COLUMN postos.logradouro IS 'Nome da rua/avenida/estrada';
COMMENT ON COLUMN postos.numero IS 'Número do endereço';
COMMENT ON COLUMN postos.complemento IS 'Complemento do endereço';
COMMENT ON COLUMN postos.bairro IS 'Nome do bairro/distrito';
COMMENT ON COLUMN postos.cidade IS 'Nome da cidade/município';
COMMENT ON COLUMN postos.estado IS 'Sigla do estado (UF)';
COMMENT ON COLUMN postos.pais IS 'Nome do país';

-- Comentários da Tabela Tanques
COMMENT ON TABLE tanques IS 'Tanques de combustível com dados de medição em tempo real';
COMMENT ON COLUMN tanques.user_id IS 'ID do usuário proprietário do tanque';
COMMENT ON COLUMN tanques.posto_id IS 'ID do posto ao qual o tanque pertence';
COMMENT ON COLUMN tanques.numero_tanque IS 'Número identificador do tanque no posto';
COMMENT ON COLUMN tanques.produto IS 'Tipo de combustível armazenado';
COMMENT ON COLUMN tanques.capacidade IS 'Capacidade total do tanque em litros';
COMMENT ON COLUMN tanques.capacidade_menos_10_porcento IS 'Capacidade considerando margem de segurança de 10%';
COMMENT ON COLUMN tanques.quantidade_atual IS 'Quantidade atual de combustível em litros';
COMMENT ON COLUMN tanques.quantidade_agua IS 'Quantidade de água detectada em litros';
COMMENT ON COLUMN tanques.temperatura IS 'Temperatura atual do combustível';
COMMENT ON COLUMN tanques.nivel_percentual IS 'Nível atual em percentual';
COMMENT ON COLUMN tanques.nivel_percentual_com_tolerancia IS 'Nível percentual com tolerância aplicada';
COMMENT ON COLUMN tanques.data_ultima_medicao IS 'Data e hora da última medição dos sensores';
COMMENT ON COLUMN tanques.data_ultimo_recebimento IS 'Data e hora do último recebimento de combustível';

-- ---------------------------------------------
-- DADOS DE EXEMPLO
-- ---------------------------------------------

-- Inserir postos de exemplo
INSERT INTO postos (user_id, nome, cnpj, cliente_gm, id_unidade, indice_equipamento, erp, codigo_empresa_erp, cep, logradouro, numero, complemento, bairro, cidade, estado, status) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'POSTO SLING IX', '12.345.678/0001-90', 'Grupo SLING', 765, 150, 'emsys', 'SLING_IX', '59140-000', 'BR-101', 'Km 15', 'Posto de Combustível', 'Distrito Industrial', 'Parnamirim', 'RN', 'ativo'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'POSTO SLING XXI', '12.345.678/0002-71', 'Grupo SLING', 776, 153, 'emsys', 'SLING_XXI', '59138-000', 'Avenida das Nações', '1500', 'Esquina com BR-101', 'Centro', 'Parnamirim', 'RN', 'ativo'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'POSTO SLING VIII', '12.345.678/0003-52', 'Grupo SLING', 781, 154, 'emsys', 'SLING_VIII', '59139-000', 'Rua dos Combustíveis', '850', 'Próximo ao Terminal', 'Industrial', 'Parnamirim', 'RN', 'ativo');

-- Inserir tanques do POSTO SLING IX (posto_id = 1)
INSERT INTO tanques (user_id, posto_id, numero_tanque, produto, capacidade, capacidade_menos_10_porcento, quantidade_atual, quantidade_agua, temperatura, nivel_percentual, nivel_percentual_com_tolerancia, data_ultima_medicao, data_ultimo_recebimento) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 1, 1, 'GASOLINA GRID', 15160.00, 13644.00, 9171.06, 0, 29.70, 60.50, 67.22, '2025-06-28 15:10:57+00', '2025-06-28 15:10:28+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 1, 2, 'ETANOL', 15160.00, 13644.00, 2948.52, 0, 29.76, 19.45, 21.61, '2025-06-28 15:10:57+00', '2025-06-28 15:10:28+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 1, 3, 'GASOLINA GRID', 15627.00, 14064.30, 9659.32, 0, 28.64, 61.81, 68.68, '2025-06-28 15:10:57+00', '2025-06-28 15:10:28+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 1, 4, 'DIESEL S10', 15320.00, 13788.00, 5124.89, 0, 28.74, 33.45, 37.17, '2025-06-28 15:10:57+00', '2025-06-28 15:10:28+00');

-- Inserir tanques do POSTO SLING XXI (posto_id = 2)
INSERT INTO tanques (user_id, posto_id, numero_tanque, produto, capacidade, capacidade_menos_10_porcento, quantidade_atual, quantidade_agua, temperatura, nivel_percentual, nivel_percentual_com_tolerancia, data_ultima_medicao, data_ultimo_recebimento) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 2, 1, 'DIESEL S10 GRID', 15625.59, 14063.03, 4093.96, 0, 31.94, 26.20, 29.11, '2025-06-28 15:11:35+00', '2025-06-28 15:10:56+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 2, 3, 'ETANOL', 15626.53, 14063.88, 4079.76, 0, 32.17, 26.11, 29.01, '2025-06-28 15:11:35+00', '2025-06-28 15:10:56+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 2, 6, 'GASOLINA GRID', 15627.67, 14064.90, 5791.72, 29.65, 31.81, 37.06, 41.18, '2025-06-28 15:11:35+00', '2025-06-28 15:10:56+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 2, 7, 'GASOLINA GRID', 15626.23, 14063.61, 6138.50, 0, 31.88, 39.28, 43.65, '2025-06-28 15:11:35+00', '2025-06-28 15:10:56+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 2, 8, 'GASOLINA GRID', 15626.97, 14064.27, 5068.08, 0, 32.18, 32.43, 36.04, '2025-06-28 15:11:35+00', '2025-06-28 15:10:56+00');

-- Inserir tanques do POSTO SLING VIII (posto_id = 3)
INSERT INTO tanques (user_id, posto_id, numero_tanque, produto, capacidade, capacidade_menos_10_porcento, quantidade_atual, quantidade_agua, temperatura, nivel_percentual, nivel_percentual_com_tolerancia, data_ultima_medicao, data_ultimo_recebimento) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 1, 'GASOLINA COMUM', 15320.00, 13788.00, 9424.65, 25.11, 28.75, 61.52, 68.35, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 2, 'ETANOL', 15627.00, 14064.30, 9174.84, 0, 29.12, 58.71, 65.23, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 3, 'DIESEL COMUM', 15320.00, 13788.00, 4080.23, 0, 30.52, 26.63, 29.59, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 4, 'GASOLINA ADITIVADA', 15627.00, 14064.30, 12797.08, 0, 29.00, 81.89, 90.99, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 5, 'GASOLINA COMUM', 15627.00, 14064.30, 3516.27, 0, 31.15, 22.50, 25.00, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00'),
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 3, 6, 'GASOLINA PODIUM', 15627.00, 14064.30, 3436.78, 0, 31.41, 21.99, 24.44, '2025-06-28 15:07:37+00', '2025-06-28 15:07:26+00');



-- =============================================
-- TRIGGER E FUNCTION PARA CONCATENAR ENDEREÇO
-- Atualiza automaticamente o campo 'endereco' sempre que os campos de endereço forem alterados
-- =============================================

-- Adicionar coluna endereco na tabela postos se não existir
ALTER TABLE postos ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Criar índice para busca no endereço completo
CREATE INDEX IF NOT EXISTS idx_postos_endereco ON postos USING GIN (to_tsvector('portuguese', endereco));

-- Comentário da nova coluna
COMMENT ON COLUMN postos.endereco IS 'Endereço completo formatado automaticamente';

-- ---------------------------------------------
-- FUNCTION: Formatar Endereço Completo
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION format_endereco_completo(
   p_logradouro VARCHAR,
   p_numero VARCHAR,
   p_complemento VARCHAR,
   p_bairro VARCHAR,
   p_cidade VARCHAR,
   p_estado VARCHAR,
   p_cep VARCHAR,
   p_pais VARCHAR
) RETURNS TEXT AS $$
DECLARE
   endereco_formatado TEXT := '';
BEGIN
   -- Construir endereço no formato padrão brasileiro
   
   -- Logradouro + Número
   IF p_logradouro IS NOT NULL AND p_logradouro != '' THEN
       endereco_formatado := p_logradouro;
       
       IF p_numero IS NOT NULL AND p_numero != '' THEN
           endereco_formatado := endereco_formatado || ', ' || p_numero;
       END IF;
   END IF;
   
   -- Complemento
   IF p_complemento IS NOT NULL AND p_complemento != '' THEN
       IF endereco_formatado != '' THEN
           endereco_formatado := endereco_formatado || ', ' || p_complemento;
       ELSE
           endereco_formatado := p_complemento;
       END IF;
   END IF;
   
   -- Bairro
   IF p_bairro IS NOT NULL AND p_bairro != '' THEN
       IF endereco_formatado != '' THEN
           endereco_formatado := endereco_formatado || ' - ' || p_bairro;
       ELSE
           endereco_formatado := p_bairro;
       END IF;
   END IF;
   
   -- Cidade/Estado
   IF p_cidade IS NOT NULL AND p_cidade != '' THEN
       IF endereco_formatado != '' THEN
           endereco_formatado := endereco_formatado || ', ' || p_cidade;
       ELSE
           endereco_formatado := p_cidade;
       END IF;
       
       IF p_estado IS NOT NULL AND p_estado != '' THEN
           endereco_formatado := endereco_formatado || '/' || UPPER(p_estado);
       END IF;
   END IF;
   
   -- CEP
   IF p_cep IS NOT NULL AND p_cep != '' THEN
       endereco_formatado := endereco_formatado || ' - CEP: ' || p_cep;
   END IF;
   
   -- País (apenas se diferente do Brasil)
   IF p_pais IS NOT NULL AND p_pais != '' AND UPPER(p_pais) != 'BRASIL' THEN
       endereco_formatado := endereco_formatado || ', ' || p_pais;
   END IF;
   
   -- Retornar endereço formatado ou NULL se vazio
   IF endereco_formatado = '' THEN
       RETURN NULL;
   ELSE
       RETURN TRIM(endereco_formatado);
   END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------
-- FUNCTION: Atualizar Endereço Completo
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION update_endereco_completo()
RETURNS TRIGGER AS $$
BEGIN
   -- Formatar e atualizar o endereço completo
   NEW.endereco := format_endereco_completo(
       NEW.logradouro,
       NEW.numero,
       NEW.complemento,
       NEW.bairro,
       NEW.cidade,
       NEW.estado,
       NEW.cep,
       NEW.pais
   );
   
   -- Atualizar timestamp
   NEW.updated_at := CURRENT_TIMESTAMP;
   
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------
-- TRIGGER: Executar atualização automática
-- ---------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_endereco_completo ON postos;

CREATE TRIGGER trigger_update_endereco_completo
   BEFORE INSERT OR UPDATE OF logradouro, numero, complemento, bairro, cidade, estado, cep, pais
   ON postos
   FOR EACH ROW
   EXECUTE FUNCTION update_endereco_completo();

-- ---------------------------------------------
-- ATUALIZAR REGISTROS EXISTENTES
-- ---------------------------------------------
-- Atualizar todos os registros existentes para popular o campo endereco
UPDATE postos SET 
   endereco = format_endereco_completo(
       logradouro,
       numero,
       complemento,
       bairro,
       cidade,
       estado,
       cep,
       pais
   )
WHERE user_id = '0bd186df-d34b-4aa9-82f5-813f1b50141d';

-- ---------------------------------------------
-- EXEMPLOS DE TESTE
-- ---------------------------------------------

-- Teste 1: Inserir novo posto com endereço
/*
INSERT INTO postos (user_id, nome, cnpj, cliente_gm, id_unidade, logradouro, numero, complemento, bairro, cidade, estado, cep) VALUES 
('0bd186df-d34b-4aa9-82f5-813f1b50141d', 'POSTO TESTE', '12.345.678/0004-33', 'Grupo SLING', 999, 'Avenida Brasil', '1000', 'Loja A', 'Centro', 'Natal', 'RN', '59000-000');
*/

-- Teste 2: Atualizar endereço existente
/*
UPDATE postos SET 
   logradouro = 'Rua Nova Esperança',
   numero = '500',
   complemento = 'Posto de Gasolina'
WHERE nome = 'POSTO SLING IX';
*/

-- ---------------------------------------------
-- CONSULTAS DE VERIFICAÇÃO
-- ---------------------------------------------

-- Verificar endereços formatados
SELECT 
   nome,
   endereco as endereco_completo,
   CONCAT(logradouro, ', ', numero) as endereco_parcial
FROM postos 
WHERE user_id = '0bd186df-d34b-4aa9-82f5-813f1b50141d'
ORDER BY id;

-- Busca full-text no endereço
/*
SELECT nome, endereco 
FROM postos 
WHERE to_tsvector('portuguese', endereco) @@ to_tsquery('portuguese', 'BR-101 | Parnamirim');
*/

-- Verificar formatação por componentes
SELECT 
   nome,
   logradouro,
   numero,
   complemento,
   bairro,
   cidade,
   estado,
   cep,
   endereco as endereco_formatado
FROM postos 
WHERE user_id = '0bd186df-d34b-4aa9-82f5-813f1b50141d'
ORDER BY id;

-- ---------------------------------------------
-- EXEMPLOS DE FORMATAÇÃO
-- ---------------------------------------------
/*
EXEMPLOS DE SAÍDA DA FUNCTION:

Entrada:
- logradouro: "BR-101"
- numero: "Km 15"  
- complemento: "Posto de Combustível"
- bairro: "Distrito Industrial"
- cidade: "Parnamirim"
- estado: "RN"
- cep: "59140-000"

Saída:
"BR-101, Km 15, Posto de Combustível - Distrito Industrial, Parnamirim/RN - CEP: 59140-000"

Entrada apenas com campos básicos:
- logradouro: "Rua das Flores"
- numero: "123"
- cidade: "Natal"
- estado: "RN"

Saída:
"Rua das Flores, 123, Natal/RN"

Entrada com país diferente:
- logradouro: "Main Street"
- numero: "456"
- cidade: "New York"
- estado: "NY"
- pais: "Estados Unidos"

Saída:
"Main Street, 456, New York/NY, Estados Unidos"
*/