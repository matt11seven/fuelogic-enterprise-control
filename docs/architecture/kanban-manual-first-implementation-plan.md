# Plano de Implementacao - Kanban Manual First (AIOS)

Data de referencia: 2026-03-04
Escopo: Pedido de combustivel com board Kanban enxuto, aprovacao humana e Sophia opcional somente em cotacao.

## 1) O que fazer agora (AIOS)

Sequencia recomendada pela Constitution:
1. Story-driven: criar/refinar stories antes de codar.
2. CLI first: garantir regras e servicos no backend antes de depender da UI.
3. Observability second: instrumentar eventos e estados.
4. UI third: implementar board Kanban consumindo regras existentes.

## 2) Revisao cruzada por papeis (agentes)

PO (escopo/prioridade):
1. MVP precisa de poucos quadros e transicoes claras.
2. Aprovacao de compra permanece 100% humana.
3. Sophia entra apenas como opcao de cotacao, desligada por padrao.

Architect (arquitetura):
1. Reaproveitar status atuais de pedidos para mapear colunas.
2. Evitar nova entidade de card no MVP; usar `orders` + `group_id`.
3. Implementar badges de substatus sem quebrar status principal.

Dev (entrega incremental):
1. Reusar `Pedidos.tsx`, `OrderStatusBadge`, `OrderDetailsDrawer`, `OrderFilters`.
2. Reusar endpoints existentes de pedidos/cotacoes.
3. Introduzir somente as extensoes minimas (toggle Sophia + board view).

QA (gates):
1. Validar transicoes permitidas por coluna.
2. Validar toggle Sophia off/on sem regressao.
3. Validar trilha de aprovacao humana obrigatoria.

## 3) Inventario de reuso (nao reinventar)

Backend ja pronto:
1. `GET /api/orders` com filtros por status.
2. `GET /api/orders/stats`.
3. `POST /api/orders/bulk`.
4. `PATCH /api/orders/:id/status`.
5. `PATCH /api/orders/:id/truck`.
6. `PATCH /api/orders/:id/delivery-estimate`.
7. `POST /api/orders/:id/notes`.
8. `POST /api/orders/group/:groupId/quotations` (entrada manual de cotacao).
9. `POST /api/sophia/orders/process` (modo interno).
10. `GET/PUT /api/configurations/sophia`.

Frontend ja pronto:
1. Tela de pedidos: `src/pages/Pedidos.tsx`.
2. Badges: `src/components/orders/OrderStatusBadge.tsx`.
3. Drawer com cotacao, caminhao, ETA e notas: `OrderDetailsDrawer.tsx`.
4. Painel de cotacoes: `QuotationsPanel.tsx`.
5. Filtros por status: `OrderFilters.tsx`.
6. Config Sophia: `SophiaConfiguration.tsx`.

## 4) Gaps para fechar no MVP

1. Falta visual Kanban (hoje principal e tabela).
2. Falta substatus/badges operacionais por etapa.
3. Falta toggle funcional "usar Sophia na cotacao" no modelo de config.
4. Falta gate explicito de aprovacao humana para avancar fluxo.
5. Falta formulario manual de cotacao no fluxo principal (sem depender de callback).

## 5) Plano de execucao autonomo (stories)

## Story A - Fundacao de fluxo e feature flags

Objetivo:
1. Definir mapeamento oficial de status->coluna.
2. Adicionar flag `usar_sophia_na_cotacao` em configuracao Sophia.

Entregas:
1. Migration para coluna/parametro de toggle.
2. GET/PUT configuracoes Sophia retornando o toggle.
3. Front de configuracao exibindo toggle.

## Story B - Kanban View (sem quebrar tabela)

Objetivo:
1. Criar visual de board com 5 colunas.
2. Reusar `orders` existentes como cards.

Entregas:
1. Novo componente `OrderKanbanBoard`.
2. Toggle de visualizacao `Tabela | Kanban` na pagina Pedidos.
3. Cards com badges principais e infos minimas (posto, produto, litros, data).

## Story C - Substatus e acao manual de cotacao

Objetivo:
1. Permitir registrar cotacao manual diretamente no fluxo.
2. Exibir badge de substatus por etapa.

Entregas:
1. Formulario manual de cotacao por `group_id` usando endpoint existente.
2. Atualizacao de card apos insercao.
3. Badges de substatus no card/drawer.

## Story D - Gate de aprovacao humana e transicoes

Objetivo:
1. Impor regra de aprovacao humana antes de avancar para Pedido.

Entregas:
1. Validacao backend para transicao sensivel.
2. Timeline obrigatoria com `created_by=operador` nas aprovacoes.
3. Mensagens de erro amigaveis na UI quando gate nao atender.

## Story E - Sophia opcional na cotacao

Objetivo:
1. Quando toggle off: nao disparar envio Sophia.
2. Quando toggle on: permitir fluxo assistido.

Entregas:
1. Condicionar chamadas de `sophia-ops-api` no frontend.
2. Badge informativo "Sophia ativa" somente em Cotacao.
3. Sem alterar aprovacao humana.

## 6) Criticos de arquitetura

1. Nao criar nova tabela de Kanban no MVP.
2. Nao duplicar status principal; usar substatus apenas para UX.
3. Nao acoplar logica de decisao no frontend sem validacao backend.
4. Manter compatibilidade com status legados (`toDbStatus/fromDbStatus`).

## 7) Observabilidade minima (antes de escalar IA)

1. Evento: card entrou em coluna.
2. Evento: cotacao manual registrada.
3. Evento: aprovacao humana registrada.
4. Evento: Sophia acionada (on/off + sucesso/erro).

## 8) Quality Gates por story

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. checklist da story atualizado
5. file list da story atualizado

Nota:
- `lint` hoje tem erros preexistentes; tratar no plano como baseline tecnica para nao mascarar regressao.

## 9) Riscos e mitigacoes

1. Risco: regressao no fluxo atual de pedidos.
- Mitigacao: manter tabela atual e adicionar Kanban em paralelo (toggle de visualizacao).

2. Risco: ambiguidade entre status e substatus.
- Mitigacao: documentar dicionario oficial de badges por coluna.

3. Risco: uso acidental de Sophia quando deveria estar off.
- Mitigacao: condicao unica centralizada no service de operacoes.

4. Risco: sem trilha de aprovacao.
- Mitigacao: timeline obrigatoria e validacao de backend para avancar status.

## 10) Ordem de execucao recomendada

1. Story A
2. Story B
3. Story C
4. Story D
5. Story E

Essa ordem minimiza retrabalho e permite entrega incremental utilizavel desde a Story B.
