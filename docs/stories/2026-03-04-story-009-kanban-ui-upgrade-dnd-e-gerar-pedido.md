# Story 009 - Upgrade de UI Kanban com DnD e Gerar Pedido

## Status

Done

## Contexto

O Kanban inicial foi funcional, mas a experiencia visual e operacional ficou aquem. Precisamos:
1. usar biblioteca robusta de Kanban com drag-and-drop,
2. compactar cards para maior densidade visual,
3. adicionar acao de gerar pedido na coluna Necessidade reaproveitando regras existentes.

## Objetivo

Melhorar UX/UI do Kanban de pedidos sem recriar regras de negocio ja existentes.

## Acceptance Criteria

1. Kanban usa biblioteca dedicada de drag-and-drop.
2. Cards compactos exibem mais itens por coluna.
3. Coluna `Necessidade` possui acao de `Gerar Pedido` com regras ja usadas na outra pagina.
4. Movimentacao de card entre colunas atualiza status do pedido.
5. Fluxo atual continua funcionando em paralelo com visualizacao tabela.

## Checklist

- [x] Dependencia instalada
- [x] Board DnD implementado
- [x] Cards compactos aplicados
- [x] Botao de gerar pedido na coluna Necessidade
- [x] Validacoes executadas (`typecheck`, `test`, `lint`)
- [x] File list atualizada

## File List

1. `docs/stories/2026-03-04-story-009-kanban-ui-upgrade-dnd-e-gerar-pedido.md`
2. `package.json`
3. `package-lock.json`
4. `src/components/orders/OrderKanbanBoard.tsx`
5. `src/pages/Pedidos.tsx`
6. `src/components/PurchaseSuggestionModal.tsx`

## Notas de validacao

- `npm run typecheck`: OK
- `npm test`: OK (sem suite automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo
