# Story 008 - Implementacao Kanban Manual First

## Status

Done

## Contexto

Executar o plano do Kanban manual-first:
1. Fluxo de pedidos com visao em quadros (menos colunas).
2. Cotacao manual como padrao operacional.
3. Aprovacao de compra com human-in-the-loop.
4. Sophia opcional apenas em cotacao, controlada por configuracao.

## Objetivo

Implementar o MVP funcional reaproveitando a estrutura ja existente de pedidos, sem criar um fluxo paralelo.

## Acceptance Criteria

1. Toggle de Sophia para cotacao existe em configuracao e default = false.
2. Tela de pedidos suporta visualizacao Kanban enxuta.
3. Cotacao manual pode ser registrada no detalhe do pedido.
4. Regras de transicao reforcam aprovacao humana e consistencia do fluxo.
5. Fluxo continua operando mesmo com Sophia desligada.

## Implementacao

1. Backend configuracao Sophia:
- `server/src/routes/configurations.js`
- `server/migrations/20260304_add_sophia_quote_toggle.sql`

2. Backend pedidos:
- `server/src/routes/orders.js`
- regras de transicao de status
- validacao de aprovacao com cotacao previa
- timeline diferenciando origem manual/sophia

3. Frontend configuracao:
- `src/services/configuration-api.ts`
- `src/components/configuration/SophiaConfiguration.tsx`

4. Frontend pedidos:
- `src/pages/Pedidos.tsx` (toggle Tabela/Kanban)
- `src/components/orders/OrderKanbanBoard.tsx`
- `src/components/orders/OrderDetailsDrawer.tsx`
- `src/components/orders/QuotationsPanel.tsx`
- `src/services/orders-api.ts`

5. Fluxo de envio Sophia condicionado a configuracao:
- `src/components/OrderProcessModal.tsx`
- `src/components/PurchaseSuggestionModal.tsx`

## Como validar

1. Configuracoes > Integracoes APIs:
- verificar toggle "Usar Sophia na cotacao" desligado por padrao.

2. Pedidos:
- alternar entre `Kanban` e `Tabela`.
- verificar 5 colunas no Kanban: Necessidade, Cotacao, Decisao, Pedido, Entrega.

3. Cotacao manual:
- abrir pedido no drawer.
- adicionar cotacao manual.
- confirmar mudanca para status `quoted` e timeline de operador.

4. Regras de transicao:
- tentar aprovar sem cotacao (deve bloquear).
- tentar iniciar entrega sem ETA (deve bloquear).

5. Sophia desligada:
- botoes de envio para Sophia ficam desabilitados e mostram orientacao.

## Checklist

- [x] Story criada
- [x] Toggle Sophia implementado no backend e frontend
- [x] Kanban implementado na tela de pedidos
- [x] Cotacao manual implementada no drawer
- [x] Regras de transicao reforcadas no backend
- [x] `npm run typecheck` executado
- [x] `npm test` executado
- [x] `npm run lint` executado
- [x] File list atualizada

## File List

1. `docs/stories/2026-03-04-story-008-kanban-manual-first-implementacao.md`
2. `server/migrations/20260304_add_sophia_quote_toggle.sql`
3. `server/src/routes/configurations.js`
4. `server/src/routes/orders.js`
5. `src/services/configuration-api.ts`
6. `src/components/configuration/SophiaConfiguration.tsx`
7. `src/pages/Pedidos.tsx`
8. `src/components/orders/OrderKanbanBoard.tsx`
9. `src/components/orders/OrderDetailsDrawer.tsx`
10. `src/components/orders/QuotationsPanel.tsx`
11. `src/services/orders-api.ts`
12. `src/components/OrderProcessModal.tsx`
13. `src/components/PurchaseSuggestionModal.tsx`

## Notas de validacao

- `npm run typecheck`: OK
- `npm test`: OK (sem suite automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo
