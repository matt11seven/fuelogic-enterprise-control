# Story 011 - Emissão de Pedido — Decisão → Pedido

## Status

Done

## Contexto

Após a Story 010 aprovar grupos de cotação, os pedidos ficavam na coluna "Decisão" (approved) sem um fluxo dedicado para o próximo passo: confirmar o fornecedor escolhido, vincular caminhão, definir ETA e emitir o pedido ao fornecedor. A única forma era arrastar o card para "Pedido" via DnD, o que bloqueava com erro de ETA ausente e nao registrava o fornecedor escolhido.

## Objetivo

Criar o modal de emissão de pedido acessado pelo header da coluna "Decisão", que permite ao operador confirmar fornecedor, vincular caminhão, definir ETA e emitir o grupo inteiro para a coluna "Pedido" (delivering) em um único fluxo.

## Acceptance Criteria

1. Botão `"{N}g"` aparece no header da coluna "Decisão" somente quando há grupos aprovados.
2. Clicar abre `OrderEmissionModal`.
3. Painel esquerdo lista grupos aprovados com postos, combustíveis, volume.
4. Selecionar grupo carrega detalhes + cotações via `GET /api/orders/group/:groupId`.
5. Tabela de cotações exibe fornecedores com destaque (⭐) no menor preço; clique em "Selec." pré-preenche o campo "Fornecedor escolhido".
6. Formulário: Fornecedor escolhido, Caminhão (lista de ativos), ETA* (obrigatório), Observações.
7. Botão "Emitir Pedido" chama `PATCH /api/orders/group/:groupId/emit`.
8. Backend valida: ETA obrigatório; registra timeline com fornecedor, caminhão e ETA.
9. Todos os pedidos `approved` do grupo vão para `delivering`.
10. `npm run typecheck` sem erros.

## Checklist

- [x] Rota `PATCH /api/orders/group/:groupId/emit` implementada no backend
- [x] Interface `EmitGroupInput` e função `emitGroup` adicionadas em `orders-api.ts`
- [x] `OrderEmissionModal.tsx` criado com painel duplo + tabela de cotações + formulário
- [x] Prop `onEmitOrders` adicionada ao `OrderKanbanBoard`
- [x] `decisionGroupCount` calculado via `useMemo`; botão no header da coluna "Decisão"
- [x] `COL_STYLE.decision.actionBtn` preenchido (azul)
- [x] Estado, handler e render do modal adicionados em `Pedidos.tsx`
- [x] `npm run typecheck`: OK
- [x] File list atualizada

## File List

1. `docs/stories/2026-03-05-story-011-emissao-pedido-decisao-para-pedido.md`
2. `src/components/orders/OrderEmissionModal.tsx` — novo
3. `src/components/orders/OrderKanbanBoard.tsx` — modificado
4. `src/pages/Pedidos.tsx` — modificado
5. `src/services/orders-api.ts` — modificado
6. `server/src/routes/orders.js` — modificado

## Decisoes de Design

- **ETA obrigatório** no backend (consistente com a validação existente de `/:id/status`).
- **Fornecedor escolhido** pré-preenchido automaticamente com o fornecedor de menor preço das cotações.
- **Caminhão opcional** — alguns grupos podem usar caminhão de terceiros confirmado depois.
- **Timeline descritiva** — registra "Pedido emitido | Fornecedor: X | ETA: Y | notas" para rastreabilidade.

## Notas de Validacao

- `npm run typecheck`: OK
- `npm run lint`: falha apenas pelos 5 erros preexistentes fora do escopo
