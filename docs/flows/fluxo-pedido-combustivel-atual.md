# Fluxo Atual de Pedido de Combustivel

Data de referencia: 2026-03-04

## Objetivo

Documentar o fluxo ponta a ponta de pedido de combustivel como ele funciona hoje, para servir de base de melhoria tecnica e operacional.

## Escopo do fluxo

- Origem dos dados de tanque no dashboard operacional
- Selecao manual de tanques e quantidades
- Sugestao automatica de compra
- Persistencia de pedidos em lote
- Envio para Sophia (modo interno atual)
- Acompanhamento na tela de pedidos (status, timeline, cotacoes, atribuicoes)

## Mapa rapido (visao macro)

1. Dashboard (`/`) carrega tanques da API externa + nomes de posto do banco.
2. Operador escolhe quantidades manualmente (OrderProcessModal) ou usa sugestao (PurchaseSuggestionModal).
3. Frontend gera `group_id` e cria lote via `POST /api/orders/bulk`.
4. Frontend envia lote para Sophia via `POST /api/sophia/orders/process`.
5. Frontend marca lote como enviado para Sophia via `PATCH /api/orders/group/:groupId/sophia-sent`.
6. Tela `/pedidos` acompanha ciclo: `pending -> quoted -> approved -> delivering -> delivered` (ou `cancelled`).
7. Cotacoes podem chegar por callback `POST /api/sophia/quotation-callback` (ou endpoint de cotacoes por grupo).

## Etapas detalhadas

## Etapa 1 - Carga operacional de tanques

Frontend:
- `src/hooks/use-tank-data.ts`
- `src/pages/Index.tsx`

Regras atuais:
- Busca tanques na API de medicao (`fetchTankData`).
- Busca postos do banco (`getAllPostos`).
- Faz match por `IdUnidade` (API) x `id_unidade` (banco).
- Nome exibido:
  1) nome do cadastro local
  2) fallback para nome vindo da API (cliente/unidade)

Saida:
- Lista de estacoes com tanques e dados para decisao de pedido.

## Etapa 1.1 - Sync incremental de medicoes (canônico)

Backend:
- `server/src/services/gasmobile-sync.js`
- `POST /api/gasmobile/sync-medicoes`

CLI:
- `npm run sync:gasmobile:medicoes -- --user-id <uuid>`
- Script: `bin/sync-gasmobile-medicoes.cjs`

Regras atuais:
- Busca medicoes da GasMobile via API key do usuario.
- Garante fonte em `integracao_fontes`.
- Registra execucao em `integracao_sync_logs`.
- Upsert de mapeamentos em `integracao_mapeamentos` para posto/tanque.
- Insert idempotente em `medicoes_tanque` por chave natural.
- Atualiza colunas de ultima medicao em `tanques`.

## Etapa 1.2 - Fallback de leitura local no dashboard

Backend:
- `GET /api/gasmobile/medicoes/latest`

Frontend:
- `src/services/gasmobile-api.ts` (`getLatestGMMedicoes`)
- `src/hooks/use-tank-data.ts`

Ordem de leitura operacional:
1. API externa de medicao
2. ultimo snapshot local no banco
3. cache localStorage

## Etapa 1.3 - Auto sync em background

Backend:
- Serviço: `server/src/services/gasmobile-auto-sync.js`
- Startup: `server/src/index.js`

Configuração:
- `GASMOBILE_AUTO_SYNC_ENABLED=true|false`
- `GASMOBILE_AUTO_SYNC_INTERVAL_MS=<millis>`
- `GASMOBILE_AUTO_SYNC_RUN_ON_STARTUP=true|false`

Observabilidade/controle:
- `GET /api/gasmobile/sync-status`

## Etapa 2 - Selecao manual de pedido

Frontend:
- `src/components/StationContainer.tsx`
- `src/components/OrderButton.tsx`
- `src/components/OrderProcessModal.tsx`

Regras atuais:
- Operador marca tanques e define quantidade por tanque.
- Modal monta texto de pedido e payload agrupado por posto/combustivel.
- Quantidade final usa valor inteiro (`Math.floor`).

Risco atual:
- Parse de IDs por regex no formato `station-<id>-tank-<id>` torna o fluxo fragil se o padrao de chave mudar.

## Etapa 3 - Sugestao automatica de compra

Frontend:
- `src/components/PurchaseSuggestionModal.tsx`

Regras atuais:
- Usa thresholds configurados para classificar prioridade:
  - critical
  - warning
  - normal
- Calcula sugestao em multiplos de 5000 L.
- Pode considerar capacidade total de caminhoes selecionados.
- Pode copiar sugestao textual e/ou enviar para Sophia.

Riscos atuais:
- Algoritmo de distribuicao e validacoes estao concentrados no frontend (dificil auditar/versao unica).
- Tipagem possui `any` em pontos criticos.

## Etapa 4 - Persistencia de pedidos em lote

Frontend:
- `src/services/orders-api.ts` (`createBulkOrders`)

Backend:
- `server/src/routes/orders.js` (`POST /api/orders/bulk`)

Regras atuais:
- Front gera `group_id` (UUID) por lote.
- Cada item inclui:
  - `station_id`
  - `station_name`
  - `tank_id`
  - `product_type`
  - `quantity`
- Backend cria registros em `orders` com status inicial `pending`.
- Backend cria timeline inicial (`Pedido criado`).

Gap atual:
- Nao ha idempotencia por `group_id` (reenvio acidental pode duplicar lote).

## Etapa 5 - Envio do lote para Sophia

Frontend:
- `src/services/sophia-ops-api.ts` (`processOrderBatch`)
- Chamado por:
  - `OrderProcessModal`
  - `PurchaseSuggestionModal`

Backend:
- `server/src/routes/sophia.js` (`POST /api/sophia/orders/process`)

Comportamento atual:
- Endpoint registra evento de entrada/saida em observabilidade (`sophia_conversas`).
- Retorna ACK interno.
- Nao dispara cotacao externa automaticamente neste endpoint (modo interno de workflow).

Observacao:
- O envio efetivo para canal externo depende de outras rotas/configs da Sophia.

## Etapa 6 - Marcacao de envio para Sophia

Frontend:
- `ordersApiService.markGroupSophiaSent(groupId)`

Backend:
- `PATCH /api/orders/group/:groupId/sophia-sent`

Efeito:
- Atualiza `sophia_sent_at` no grupo.
- Adiciona evento na timeline por pedido.

## Etapa 7 - Retorno de cotacoes

Entradas possiveis:
1. `POST /api/sophia/quotation-callback`
2. `POST /api/orders/group/:groupId/quotations`

Efeito:
- Salva registros em `order_quotations`.
- Atualiza pedidos do grupo para `quoted`.
- Registra timeline de cotacao recebida.

## Etapa 8 - Gestao operacional dos pedidos

Frontend:
- `src/pages/Pedidos.tsx`
- `src/components/orders/*`

Capacidades atuais:
- Lista com filtros por status e busca.
- Detalhe com timeline e cotacoes.
- Acoes:
  - Aprovar (`quoted -> approved`)
  - Colocar em entrega (`approved -> delivering`)
  - Marcar entregue (`delivering -> delivered`)
  - Cancelar
  - Vincular caminhao
  - Definir previsao de entrega
  - Adicionar notas

## Etapa 9 - Mapeamento de status

Backend (`orders.js`) trata compatibilidade de status em banco:
- API padrao: `pending, quoted, approved, delivering, delivered, cancelled`
- Banco legado pode usar: `pendente, processando, concluido, cancelado`
- Conversao acontece em `toDbStatus`/`fromDbStatus`.

## Contratos principais (resumo)

## Payload de criacao em lote

`POST /api/orders/bulk`

```json
{
  "group_id": "uuid-do-lote",
  "orders": [
    {
      "station_id": "station-123",
      "station_name": "Posto Centro",
      "tank_id": "tank-999",
      "product_type": "Diesel S10",
      "quantity": 5000
    }
  ]
}
```

## Payload de processamento Sophia (interno atual)

`POST /api/sophia/orders/process`

```json
{
  "group_id": "uuid-do-lote",
  "timestamp": "2026-03-04T12:00:00.000Z",
  "postos": [
    {
      "nome": "Posto Centro",
      "combustiveis": {
        "Diesel S10": { "quantidade": 5000, "unidade": "litros" }
      }
    }
  ],
  "resumo": {
    "Diesel S10": 5000
  }
}
```

## Principais gargalos atuais

1. Duplicidade de logica entre `OrderProcessModal` e `PurchaseSuggestionModal` para montar payload/lote.
2. Regra critica de negocio (calculo, agrupamento, parse de IDs) concentrada no frontend.
3. Falta de idempotencia por `group_id` no backend.
4. Falta de validacao forte de payload no backend (schema formal).
5. `docs/order-api.md` nao representa fielmente os endpoints atuais.
6. Cobertura automatizada insuficiente (sem testes do fluxo de pedido).

## Plano de melhoria recomendado

## Fase 1 - Rapida (baixo risco)

1. Criar servico unico no frontend para montar lote/payload (reuso entre modais).
2. Padronizar parse de IDs em helper unico (evitar regex duplicada).
3. Atualizar e manter documentacao oficial de endpoints de pedido.
4. Adicionar telemetria minima:
   - lote criado
   - lote enviado
   - lote cotado
   - tempo entre etapas

## Fase 2 - Estrutural (medio risco)

1. Mover regras de montagem/validacao do pedido para backend (`/api/orders/prepare`).
2. Adotar validacao de schema (Zod/Joi) para payloads de pedido e Sophia.
3. Implementar idempotencia por `group_id` + hash do payload.
4. Criar endpoint transacional unico:
   - cria lote
   - envia para Sophia
   - marca `sophia_sent_at`
   (com rollback/estado de erro claro)

## Fase 3 - Escala e governanca

1. Orquestrar fluxo por fila/evento (job queue) para desacoplar UI.
2. Dead-letter para callbacks de cotacao com retry.
3. SLA operacional por status com alertas.
4. Trilha de auditoria por actor (sistema, operador, sophia, webhook).

## Checklist de melhoria continua

1. Tempo medio `pending -> quoted`.
2. Taxa de lotes duplicados por dia.
3. Taxa de erro em envio Sophia por endpoint.
4. Percentual de pedidos sem caminhao/previsao apos aprovacao.
5. Percentual de pedidos criados por sugestao vs manual.

## Arquivos de referencia

- `src/hooks/use-tank-data.ts`
- `src/components/OrderProcessModal.tsx`
- `src/components/PurchaseSuggestionModal.tsx`
- `src/services/orders-api.ts`
- `src/services/sophia-ops-api.ts`
- `src/pages/Pedidos.tsx`
- `server/src/routes/orders.js`
- `server/src/routes/sophia.js`
