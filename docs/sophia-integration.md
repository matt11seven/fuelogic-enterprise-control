# Integração com IA Sophia

## Visão Geral

A integração com a IA Sophia permite o envio de pedidos de combustível agrupados por empresa, facilitando o processamento inteligente e otimização de entregas. O sistema agrupa automaticamente os pedidos por posto/empresa, calcula totais por tipo de combustível e envia um payload estruturado para a Sophia processar.

A IA Sophia realizará de forma automática a cotação desses pedidos com diferentes fornecedores, retornando posteriormente os valores por fornecedor. Portanto, o envio inicial é apenas da necessidade de compra, sem informações de preço ou valores.

## Estrutura do Payload

O payload enviado para a IA Sophia segue a seguinte estrutura:

```json
{
  "event_id": "sophia_ai_order_[timestamp]",
  "event_type": "sophia_ai_order",
  "timestamp": "2025-06-28T12:27:22.000Z",
  "pedido": {
    "data_solicitacao": "2025-06-28T12:27:22.000Z",
    "status": "pendente",
    "empresas": [
      {
        "nome": "Posto Exemplo LTDA",
        "cnpj": "12.345.678/0001-90",
        "endereco": "Av. Principal, 1000",
        "cidade": "São Paulo",
        "estado": "SP",
        "pedidos": [
          {
            "id": 1,
            "tank_id": 15,
            "product_type": "Gasolina Comum",
            "quantity": 5000,
            "scheduled_date": "2025-07-01T10:00:00Z",
            "notes": "Entrega prioritária"
          },
          {
            "id": 2,
            "tank_id": 16,
            "product_type": "Diesel S10",
            "quantity": 3000,
            "scheduled_date": "2025-07-01T10:00:00Z"
          }
        ],
        "totais_por_combustivel": {
          "Gasolina Comum": 5000,
          "Diesel S10": 3000
        }
      },
      {
        "nome": "Posto Central Ltda",
        "cnpj": "98.765.432/0001-21",
        "endereco": "Rua das Flores, 500",
        "cidade": "Rio de Janeiro",
        "estado": "RJ",
        "pedidos": [
          {
            "id": 3,
            "tank_id": 22,
            "product_type": "Etanol",
            "quantity": 2000,
            "scheduled_date": "2025-07-02T09:30:00Z"
          }
        ],
        "totais_por_combustivel": {
          "Etanol": 2000
        }
      }
    ],
    "resumo": {
      "total_combustiveis": {
        "Gasolina Comum": 5000,
        "Diesel S10": 3000,
        "Etanol": 2000
      },
      "quantidade_total": 10000,
      "data_entrega_estimada": "2025-07-02T09:30:00Z"
    }
  },
  "metadata": {
    "source": "Fuelogic Enterprise",
    "version": "1.0",
    "gerado_por": "Sistema de Pedidos Automatizados",
    "interface": "Webhook Sophia AI"
  }
}
```

## Endpoints da API

### 1. Enviar Pedidos Selecionados para a IA Sophia

**Endpoint:** `POST /api/sophia/orders/send`

**Descrição:** Envia pedidos específicos para a IA Sophia, agrupados por empresa.

**Corpo da Requisição:**
```json
{
  "orderIds": [1, 2, 3, 4],
  "webhookId": 5
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Pedidos enviados com sucesso para a IA Sophia",
  "details": {
    "empresas": 2,
    "pedidos": 4,
    "tipos_combustivel": 3
  }
}
```

### 2. Processar Pedidos Pendentes

**Endpoint:** `POST /api/sophia/orders/process-pending/:webhookId`

**Descrição:** Processa todos os pedidos pendentes no sistema, agrupando-os por empresa e enviando para a IA Sophia.

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Pedidos pendentes processados com sucesso",
  "details": {
    "empresas": 2,
    "pedidos": 4,
    "tipos_combustivel": 3
  }
}
```

### 3. Obter Exemplo de Payload

**Endpoint:** `GET /api/sophia/payload-example`

**Descrição:** Retorna um exemplo do payload formatado que é enviado para a IA Sophia.

## Configuração do Webhook

Para usar a integração com a IA Sophia, é necessário configurar um webhook com as seguintes características:

1. **Nome:** Um nome que identifique a IA Sophia (ex: "Sophia AI")
2. **URL:** O endpoint da IA Sophia para onde os pedidos serão enviados
3. **Método:** POST
4. **Tipo de Integração:** sophia_ai
5. **Autenticação:** Configure conforme as credenciais fornecidas pela Sophia

## Componente de Teste no Frontend

Foi implementado um componente React para testar a integração com a IA Sophia, permitindo:

- Selecionar um webhook da Sophia configurado
- Selecionar pedidos pendentes específicos para envio
- Processar todos os pedidos pendentes com um único clique
- Visualizar resultado do processamento

Para utilizar o componente, importe-o em sua aplicação:

```jsx
import SophiaWebhookTester from '@/components/SophiaWebhookTester';

const TestPage = () => {
  return (
    <div>
      <h1>Teste da IA Sophia</h1>
      <SophiaWebhookTester />
    </div>
  );
};
```

## Cliente de API no Frontend

Para integrar com os endpoints da Sophia em outros componentes, utilize o cliente de API fornecido:

```typescript
import SophiaAPI from '@/services/sophia-api';

// Enviar pedidos específicos
const result = await SophiaAPI.sendOrdersToSophia([1, 2, 3], 5);

// Processar pedidos pendentes
const result = await SophiaAPI.processPendingOrders(5);

// Obter exemplo do payload
const example = await SophiaAPI.getPayloadExample();
```

## Configuração no Servidor

Para habilitar esta integração, certifique-se de que as rotas da Sophia estão registradas no servidor.
Você precisará incluir as rotas no arquivo principal do servidor:

```javascript
// Importar as rotas da Sophia
const sophiaRoutes = require('./routes/sophia.routes');

// Registrar as rotas da Sophia
app.use('/api/sophia', sophiaRoutes);
```
