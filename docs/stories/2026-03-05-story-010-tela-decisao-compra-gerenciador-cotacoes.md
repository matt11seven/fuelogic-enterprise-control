# Story 010 - Tela de Decisão de Compra — Gerenciador de Cotações

## Status

Done

## Contexto

Pedidos em status `quoted` na coluna "Cotação" do Kanban nao tinham uma tela dedicada para inserir, comparar e decidir cotacoes antes de aprovar a compra. O operador precisava de um ponto central para:
- colar texto de WhatsApp e ter as cotacoes interpretadas automaticamente,
- inserir cotacoes manualmente,
- acionar a Sophia para cotacao automatica,
- comparar fornecedores lado a lado e aprovar o grupo inteiro com um clique.

## Objetivo

Criar um modal de decisao de compra acessado pelo header da coluna "Cotacao" do Kanban, centralizando o ciclo completo de cotacao ate aprovacao por grupo de pedidos.

## Acceptance Criteria

1. Botao `"{N} grupo(s)"` aparece no header da coluna Cotacao somente quando ha pedidos quoted.
2. Clicar no botao abre `QuotationDecisionModal`.
3. Painel esquerdo lista grupos com postos, combustiveis e volume.
4. Selecionar grupo carrega detalhes via `GET /api/orders/group/:groupId`.
5. Tab "Colar texto": colar texto no formato linha ou bloco chave:valor -> interpretar -> preview editavel -> salvar.
6. Tab "Manual": formulario com Fornecedor, Produto, Preco/L, Frete, Prazo, Obs -> adicionar cotacao.
7. Tab "Sophia": acionar Sophia se habilitada; mostrar badge "Sophia acionada" se ja enviado.
8. Tabela comparativa exibe todas as cotacoes do grupo com melhor preco destacado com estrela e fundo emerald.
9. Total estimado calculado como `unit_price × volume total do grupo`.
10. Botao "Aprovar grupo" chama `PATCH /api/orders/group/:groupId/approve` e move todos os pedidos para status `approved`.
11. Aprovacao requer ao menos 1 cotacao registrada (validado no backend).
12. `npm run typecheck` sem erros. Lint sem novos erros.

## Checklist

- [x] Parser regex `quotation-text-parser.ts` criado (linha e bloco chave:valor)
- [x] Rota `GET /api/orders/group/:groupId` implementada no backend
- [x] Rota `PATCH /api/orders/group/:groupId/approve` implementada no backend
- [x] Interface `GroupDetail` e funcoes `getGroupDetail`, `approveGroup` adicionadas em `orders-api.ts`
- [x] `QuotationDecisionModal` criado com dois paineis e tres tabs
- [x] Tabela comparativa com destaque do melhor preco
- [x] Botao no header da coluna Cotacao no `OrderKanbanBoard`
- [x] Estado e handler em `Pedidos.tsx` para abrir o modal
- [x] `npm run typecheck`: OK
- [x] `npm run lint`: sem novos erros (5 erros preexistentes fora do escopo)
- [x] File list atualizada

## File List

1. `docs/stories/2026-03-05-story-010-tela-decisao-compra-gerenciador-cotacoes.md`
2. `src/lib/quotation-text-parser.ts` — novo
3. `src/components/orders/QuotationDecisionModal.tsx` — novo
4. `src/components/orders/OrderKanbanBoard.tsx` — modificado
5. `src/pages/Pedidos.tsx` — modificado
6. `src/services/orders-api.ts` — modificado
7. `server/src/routes/orders.js` — modificado

## Decisoes de Design

- **Entry point**: botao no header da coluna Cotacao (nao em card individual).
- **Parse texto**: regex local, sem API externa (instantaneo, sem custo).
- **Aprovacao**: grupo inteiro de uma vez (todos os pedidos do `group_id`).
- **Frete na tabela**: armazenado como prefixo `[CIF]` / `[FOB]` no campo `notes` (sem migracao de schema).
- **Sophia**: reutiliza `sophiaOpsApi.processOrderBatch` e `markGroupSophiaSent` ja existentes.

## Notas de Validacao

- `npm run typecheck`: OK
- `npm run lint`: falha por 5 erros preexistentes fora do escopo (GasMobileSync.tsx, fuels-api.ts, suppliers-api.ts)
