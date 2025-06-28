# API de Pedidos - Documentação

Esta API permite gerenciar pedidos de abastecimento e sua integração com webhooks para notificações.

## Base URL

```
{BASE_URL}/api/orders
```

Onde `{BASE_URL}` é a URL base da API do Fuelogic Enterprise.

## Autenticação

Todos os endpoints requerem autenticação JWT. O token deve ser enviado no header `Authorization`:

```
Authorization: Bearer {seu_token_jwt}
```

## Endpoints

### Listar Pedidos

Retorna todos os pedidos ou filtra por parâmetros específicos.

**Requisição:**

```
GET /api/orders
```

**Parâmetros de Query:**

| Parâmetro   | Tipo   | Descrição                                    |
|-------------|--------|----------------------------------------------|
| station_id  | string | (opcional) Filtra por ID da estação          |
| tank_id     | string | (opcional) Filtra por ID do tanque           |
| status      | string | (opcional) Filtra por status                 |
| start_date  | string | (opcional) Data inicial no formato ISO       |
| end_date    | string | (opcional) Data final no formato ISO         |

**Resposta (200):**

```json
[
  {
    "id": 1,
    "user_id": 123,
    "station_id": "station-456",
    "tank_id": "tank-789",
    "product_type": "Gasolina",
    "quantity": 5000,
    "status": "pending",
    "notes": "Entrega urgente",
    "webhook_id": 2,
    "webhook_name": "Meu Webhook",
    "notification_sent": false,
    "scheduled_date": "2025-07-01T10:00:00.000Z",
    "created_at": "2025-06-28T12:00:00.000Z",
    "updated_at": "2025-06-28T12:00:00.000Z"
  },
  // ...
]
```

### Obter Detalhes de um Pedido

Retorna detalhes de um pedido específico.

**Requisição:**

```
GET /api/orders/{id}
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| id        | integer | ID único do pedido  |

**Resposta (200):**

```json
{
  "id": 1,
  "user_id": 123,
  "station_id": "station-456",
  "tank_id": "tank-789",
  "product_type": "Gasolina",
  "quantity": 5000,
  "status": "pending",
  "notes": "Entrega urgente",
  "webhook_id": 2,
  "webhook_name": "Meu Webhook", 
  "webhook_url": "https://exemplo.com/webhook",
  "notification_sent": false,
  "scheduled_date": "2025-07-01T10:00:00.000Z",
  "created_at": "2025-06-28T12:00:00.000Z",
  "updated_at": "2025-06-28T12:00:00.000Z"
}
```

**Resposta (404):**

```json
{
  "message": "Pedido não encontrado"
}
```

### Obter Pedidos por Estação

Retorna todos os pedidos de uma estação específica.

**Requisição:**

```
GET /api/orders/station/{stationId}
```

**Parâmetros de URL:**

| Parâmetro  | Tipo   | Descrição           |
|------------|--------|----------------------|
| stationId  | string | ID único da estação  |

**Resposta (200):**

```json
[
  {
    "id": 1,
    "user_id": 123,
    "station_id": "station-456",
    "tank_id": "tank-789",
    "product_type": "Gasolina",
    "quantity": 5000,
    "status": "pending",
    "notes": "Entrega urgente",
    "webhook_id": 2,
    "notification_sent": false,
    "scheduled_date": "2025-07-01T10:00:00.000Z",
    "created_at": "2025-06-28T12:00:00.000Z",
    "updated_at": "2025-06-28T12:00:00.000Z"
  },
  // ...
]
```

### Criar Pedido

Cria um novo pedido de abastecimento.

**Requisição:**

```
POST /api/orders
```

**Payload:**

```json
{
  "station_id": "station-456",
  "tank_id": "tank-789",
  "product_type": "Gasolina",
  "quantity": 5000,
  "notes": "Entrega urgente",
  "webhook_id": 2,
  "scheduled_date": "2025-07-01T10:00:00.000Z"
}
```

**Campos Obrigatórios:**
- station_id
- tank_id
- product_type
- quantity

**Resposta (201):**

```json
{
  "id": 1,
  "user_id": 123,
  "station_id": "station-456",
  "tank_id": "tank-789",
  "product_type": "Gasolina",
  "quantity": 5000,
  "status": "pending",
  "notes": "Entrega urgente",
  "webhook_id": 2,
  "notification_sent": false,
  "scheduled_date": "2025-07-01T10:00:00.000Z",
  "created_at": "2025-06-28T12:00:00.000Z",
  "updated_at": "2025-06-28T12:00:00.000Z"
}
```

**Resposta (400):**

```json
{
  "message": "Os campos station_id, tank_id, product_type e quantity são obrigatórios"
}
```

### Criar Múltiplos Pedidos

Cria múltiplos pedidos em uma única operação.

**Requisição:**

```
POST /api/orders/bulk
```

**Payload:**

```json
[
  {
    "station_id": "station-456",
    "tank_id": "tank-789",
    "product_type": "Gasolina",
    "quantity": 5000,
    "notes": "Entrega urgente",
    "webhook_id": 2,
    "scheduled_date": "2025-07-01T10:00:00.000Z"
  },
  {
    "station_id": "station-457",
    "tank_id": "tank-790",
    "product_type": "Diesel",
    "quantity": 3000,
    "notes": "Entrega padrão",
    "webhook_id": 2,
    "scheduled_date": "2025-07-02T10:00:00.000Z"
  }
]
```

**Resposta (201):**
Array com os pedidos criados, similar ao retorno do endpoint de criação individual.

**Resposta (400):**

```json
{
  "message": "É necessário fornecer um array de pedidos"
}
```

ou

```json
{
  "message": "Todos os pedidos devem conter station_id, tank_id, product_type e quantity"
}
```

### Atualizar Pedido

Atualiza os dados de um pedido existente.

**Requisição:**

```
PUT /api/orders/{id}
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| id        | integer | ID único do pedido  |

**Payload:**
Qualquer combinação dos campos do pedido que deseja atualizar:

```json
{
  "quantity": 6000,
  "notes": "Alteração na quantidade",
  "status": "processing",
  "scheduled_date": "2025-07-02T14:00:00.000Z"
}
```

**Resposta (200):**
O pedido completo atualizado.

**Resposta (404):**

```json
{
  "message": "Pedido não encontrado ou sem permissão para acessá-lo"
}
```

### Atualizar Status do Pedido

Atualiza apenas o status de um pedido.

**Requisição:**

```
PATCH /api/orders/{id}/status
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| id        | integer | ID único do pedido  |

**Payload:**

```json
{
  "status": "completed"
}
```

**Status válidos:**
- pending
- processing
- completed
- cancelled

**Resposta (200):**
O pedido completo atualizado.

**Resposta (400):**

```json
{
  "message": "Status inválido. Use: pending, processing, completed, cancelled"
}
```

### Remover Pedido

Remove um pedido do sistema.

**Requisição:**

```
DELETE /api/orders/{id}
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| id        | integer | ID único do pedido  |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Pedido removido com sucesso"
}
```

**Resposta (404):**

```json
{
  "message": "Pedido não encontrado ou sem permissão para removê-lo"
}
```

### Vincular Pedido a Webhook

Associa um pedido existente a um webhook para envio de notificações.

**Requisição:**

```
POST /api/orders/{orderId}/webhook/{webhookId}
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| orderId   | integer | ID único do pedido  |
| webhookId | integer | ID único do webhook |

**Resposta (200):**
O pedido atualizado com o novo webhook_id.

**Resposta (404):**

```json
{
  "message": "Pedido não encontrado"
}
```

ou

```json
{
  "message": "Webhook não encontrado"
}
```

### Enviar Notificação do Pedido

Força o envio de uma notificação para um pedido através do webhook associado.

**Requisição:**

```
POST /api/orders/{id}/notify
```

**Parâmetros de URL:**

| Parâmetro | Tipo    | Descrição          |
|-----------|---------|---------------------|
| id        | integer | ID único do pedido  |

**Resposta (200):**

```json
{
  "success": true,
  "message": "Notificação enviada com sucesso"
}
```

**Resposta (400):**

```json
{
  "message": "Este pedido não possui webhook configurado"
}
```

### Obter Estatísticas de Pedidos

Retorna estatísticas agregadas dos pedidos em um período.

**Requisição:**

```
GET /api/orders/stats
```

**Parâmetros de Query:**

| Parâmetro   | Tipo   | Descrição                              |
|-------------|--------|----------------------------------------|
| start_date  | string | Data inicial no formato ISO (obrigatório) |
| end_date    | string | Data final no formato ISO (obrigatório)   |

**Resposta (200):**

```json
{
  "by_status": [
    {
      "status": "completed",
      "count": 12,
      "total_volume": 60000
    },
    {
      "status": "pending",
      "count": 5,
      "total_volume": 25000
    }
  ],
  "by_product": [
    {
      "product_type": "Gasolina",
      "count": 10,
      "total_volume": 50000
    },
    {
      "product_type": "Diesel",
      "count": 7,
      "total_volume": 35000
    }
  ],
  "by_station": [
    {
      "station_id": "station-456",
      "count": 8,
      "total_volume": 40000
    },
    {
      "station_id": "station-457",
      "count": 9,
      "total_volume": 45000
    }
  ],
  "summary": {
    "total_orders": 17,
    "total_volume": 85000,
    "total_stations": 2
  }
}
```

**Resposta (400):**

```json
{
  "message": "Os parâmetros start_date e end_date são obrigatórios"
}
```

## Códigos de Status

| Código | Descrição                                           |
|--------|-----------------------------------------------------|
| 200    | Sucesso                                             |
| 201    | Recurso criado com sucesso                          |
| 400    | Requisição inválida ou dados incompletos            |
| 401    | Não autorizado (token inválido ou ausente)          |
| 403    | Proibido (sem permissão para o recurso)             |
| 404    | Recurso não encontrado                              |
| 500    | Erro interno do servidor                            |

## Formato de Datas

Todas as datas devem ser fornecidas e são retornadas no formato ISO 8601:

```
YYYY-MM-DDTHH:MM:SS.sssZ
```

Exemplo: `2025-06-28T12:00:00.000Z`
