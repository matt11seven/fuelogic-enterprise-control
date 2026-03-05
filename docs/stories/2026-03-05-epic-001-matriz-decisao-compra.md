# Epic 001 - Matriz de Decisao de Compra

**Data:** 2026-03-05
**Status:** Planejado
**PM:** Morgan

---

## Problema

O operador hoje nao tem uma tela que responda a pergunta central da compra:
> "Para os combustiveis que preciso comprar hoje, de qual fornecedor vem o menor custo real por litro, considerando preco + frete?"

O fluxo atual exige coleta de cotacoes fora do sistema, decisao manual e registro posterior. Falta comparacao visual automatica, normalizacao de frete FOB e rastreabilidade da decisao.

---

## Visao

Uma experiencia de decisao de compra que:
1. Mostra necessidades pendentes (`pending`) por combustivel e volume total.
2. Coleta cotacoes de fornecedores (texto, manual, Sophia).
3. Calcula custo real/L = `preco/L + custo_frete_proprio` (FOB) ou `preco/L` (CIF).
4. Apresenta matriz comparativa: **Fornecedor x Combustivel x Custo real/L**.
5. Permite selecionar fornecedor por combustivel.
6. Ao confirmar, cria grupos de pedido por fornecedor e move pedidos para `quoted`.
7. Disponibiliza pagina dedicada `Cotacoes` como entrada principal do fluxo.

---

## Fluxo Alvo

```text
Menu principal
  -> Cotacoes
      -> Visao consolidada de necessidades e cotacoes
      -> Matriz de decisao por combustivel
      -> Confirmar compra

Atalho operacional (continua valido)
  Pedidos -> Kanban -> Modal Decidir Compra
```

---

## Stories do Epic

| Story | Escopo | Dependencia |
|---|---|---|
| **012** | Campo `custo_frete_proprio_rl` no cadastro de fornecedor | Nenhuma |
| **013** | Matriz de decisao de compra (modal + backend) | Story 012 |
| **014** | Navegacao principal com pagina `Cotacoes` | Story 013 |
| **015** | Pagina `Cotacoes` com visao consolidada de decisao | Stories 012-014 |

---

## Impacto nas Stories Existentes

| Story | Impacto |
|---|---|
| 009 - KanbanBoard | Mantem botoes no header da coluna `Necessidade` |
| 010 - QuotationDecisionModal | Continua valida para grupos ja em `quoted` |
| 011 - OrderEmissionModal | Continua valida para emissao apos aprovacao |
| 013 - PurchaseDecisionModal | Permanece como atalho rapido, nao unico ponto de entrada |

---

## Premissas

1. `custo_frete_proprio_rl` e mantido no cadastro de fornecedor.
2. CIF: `custo_real_l = unit_price`.
3. FOB: `custo_real_l = unit_price + custo_frete_proprio_rl`.
4. Confirmacao de compra cria grupos e transiciona pedidos de `pending` para `quoted`.
5. Parser de cotacao por texto sera reaproveitado.
6. A pagina `Cotacoes` nao remove o fluxo atual de `Pedidos`; apenas organiza o acesso.

---

## KPIs de Sucesso

1. Reducao do tempo entre criacao do pedido e decisao de compra.
2. 100% das decisoes com fornecedor registrado e auditavel.
3. Melhor visibilidade de custo medio por combustivel.
4. Maior uso do fluxo de cotacao sem dependencia de atalhos no Kanban.

---

## Fora de Escopo (MVP)

1. Tendencia historica de precos por fornecedor.
2. Score de confiabilidade de fornecedor.
3. Alertas automaticos de variacao de preco.
4. Integracao direta com portal de distribuidoras.
