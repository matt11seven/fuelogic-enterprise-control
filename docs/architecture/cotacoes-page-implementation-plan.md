# Plano de Implementacao - Pagina Cotacoes (AIOS)

Data de referencia: 2026-03-05
Escopo: criar entrada de navegacao principal para `Cotacoes` e uma pagina dedicada para consolidar coleta, comparacao e decisao de compra.

## 1) Objetivo

Mover o fluxo de decisao de compra de um ponto apenas contextual (modal no Kanban) para um ponto estrutural da operacao diaria:
1. botao no menu principal entre `Operacao` e `Pedidos`.
2. pagina dedicada `Cotacoes` com visao ampla de necessidades e precos.

## 2) Principios AIOS

1. CLI first: consolidar regras de backend e contratos antes de expandir UI.
2. Observability second: registrar eventos de abertura da tela, cotacao inserida e compra confirmada.
3. UI third: evoluir interface em camadas sem quebrar fluxo atual do Kanban.
4. Story-driven: executar por historias pequenas e verificaveis.

## 3) Estado atual

1. Existe `PurchaseDecisionModal` no Kanban para pedidos `pending`.
2. Existe `QuotationDecisionModal` para grupos `quoted`.
3. Nao existe rota/pagina principal `Cotacoes` no header.
4. Nao existe visao consolidada de todos os combustiveis e fornecedores em tela dedicada.

## 4) Estrategia de entrega

Fase 1 (navegacao e landing):
1. adicionar item `Cotacoes` no menu principal.
2. criar rota `/cotacoes` e pagina base.
3. manter modais existentes funcionando sem regressao.

Fase 2 (visao consolidada):
1. levar a matriz de decisao para pagina dedicada.
2. exibir necessidades `pending` por combustivel com totais.
3. consolidar cotacoes e selecao por combustivel.
4. permitir confirmar compra com `POST /api/orders/purchase-decision`.

Fase 3 (operacao assistida):
1. filtros por periodo, combustivel e fornecedor.
2. resumo de impacto financeiro da selecao.
3. observabilidade de decisao para auditoria.

## 5) Stories vinculadas

1. Story 014 - Navegacao principal e rota `Cotacoes`.
2. Story 015 - Pagina `Cotacoes` com matriz de decisao de compra.

## 6) Contratos e componentes alvo

Backend:
1. Reuso de `GET /api/orders`, `GET /api/orders/stats` e `POST /api/orders/purchase-decision`.
2. Sem novas migrations no MVP da pagina.

Frontend:
1. `src/components/Header.tsx` para novo item de menu.
2. `src/App.tsx` para rota `\/cotacoes`.
3. `src/pages/Cotacoes.tsx` (nova) como shell da visao.
4. Reuso incremental de `PurchaseDecisionModal` e parser de cotacoes.

## 7) Riscos e mitigacoes

1. Risco: duplicar fluxo de decisao entre modal e pagina.
Mitigacao: pagina vira fluxo principal; modal permanece como atalho rapido.

2. Risco: divergencia de regra de negocio entre Kanban e pagina.
Mitigacao: centralizar calculo e submissao no mesmo service (`orders-api.ts`).

3. Risco: regressao de navegacao.
Mitigacao: manter ordem visual e testes manuais de rotas principais.

## 8) Quality Gates

Para cada story:
1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. atualizar checklist da story
5. atualizar file list da story

## 9) Criterio de pronto do plano

1. Usuario acessa `Cotacoes` direto pelo menu principal.
2. Tela `Cotacoes` permite visualizar e decidir compra sem depender do drawer do pedido.
3. Fluxo atual de `Pedidos` continua funcional.
