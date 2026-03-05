# Story 015 - Pagina Cotacoes com Visao Consolidada e Decisao de Compra

## Status

Done

## Contexto

A Story 013 implementou a matriz de decisao em modal dentro do Kanban.
Para ganho de produtividade e visao operacional completa, precisamos de uma pagina dedicada `Cotacoes` que concentre necessidades, coleta e comparacao de fornecedores em um unico contexto.

## Objetivo

Implementar na pagina `Cotacoes` uma visao consolidada de compra com matriz por fornecedor x combustivel, selecao por combustivel e confirmacao de compra usando o endpoint existente `POST /api/orders/purchase-decision`.

## Acceptance Criteria

1. Pagina `\/cotacoes` lista necessidades `pending` agrupadas por `product_type` com total de postos e volume.
2. Pagina oferece coleta de cotacoes com tabs: `Colar texto`, `Manual`, `Sophia` (reuso do padrao da Story 013).
3. Cotacoes ficam em estado local ate confirmacao.
4. Matriz exibe linhas por fornecedor e colunas por combustivel necessario.
5. Cada celula exibe `unit_price`, `freight_type` e `custo_real_l`.
6. Regra de custo real/L:
   - CIF: `custo_real_l = unit_price`
   - FOB: `custo_real_l = unit_price + custo_frete_proprio_rl` do fornecedor
7. Melhor custo real/L por combustivel fica destacado.
8. Sistema pre-seleciona automaticamente o melhor fornecedor por combustivel.
9. Usuario pode alterar selecao manualmente por combustivel.
10. Botao `Confirmar Compra` habilita somente quando todos os combustiveis necessarios tiverem fornecedor selecionado.
11. Ao confirmar, frontend chama `POST /api/orders/purchase-decision` e atualiza tela com toast de sucesso e reload dos dados.
12. Fluxo nao quebra o uso atual do `PurchaseDecisionModal` na pagina `Pedidos`.
13. `npm run typecheck` sem novos erros.
14. `npm run lint` mantem baseline atual do projeto (sem regressao nas alteracoes da story).

## Checklist

- [x] Criar container funcional da matriz em `Cotacoes.tsx` (ou componente dedicado)
- [x] Reusar parser de texto de cotacao (`quotation-text-parser.ts`)
- [x] Integrar coleta manual e tab Sophia
- [x] Implementar calculo de `custo_real_l` com regra FOB/CIF
- [x] Implementar pre-selecao automatica de menor custo
- [x] Implementar selecao manual por combustivel
- [x] Implementar total estimado geral
- [x] Integrar confirmacao com `ordersApiService.purchaseDecision`
- [x] Atualizar dados da tela apos confirmacao
- [x] Validar nao regressao de `Pedidos` e modais existentes
- [x] `npm run typecheck`
- [x] `npm run lint` (baseline do projeto com erros preexistentes fora do escopo)
- [x] `npm test` (projeto sem suite automatizada no momento)
- [x] Atualizar checklist e file list ao concluir

## File List

1. `docs/stories/2026-03-05-story-015-pagina-cotacoes-visao-consolidada-decisao-compra.md`
2. `src/pages/Cotacoes.tsx` - modificado
3. `src/services/orders-api.ts` - reuso de `purchaseDecision()`
4. `src/services/suppliers-api.ts` - reuso para `custo_frete_proprio_rl`
5. `src/lib/quotation-text-parser.ts` - reuso

## Notas tecnicas

1. Priorizar reuso de logica da Story 013 para evitar duplicacao.
2. Caso necessario, extrair funcoes puras de calculo/selecao para `src/lib`.
3. Nao introduzir nova regra de negocio em backend nesta story; usar endpoint ja existente.
4. `npm run typecheck`: OK.
5. `npm run lint`: falha por erros preexistentes em arquivos fora do escopo (ex.: `GasMobileSync.tsx`, `fuels-api.ts`, `suppliers-api.ts`).
6. `npm test`: ambiente retorna mensagem de que ainda nao ha testes automatizados configurados.
