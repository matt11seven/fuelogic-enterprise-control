# Story 013 — Tela Matriz de Decisão de Compra

**Epic:** 001 — Matriz de Decisão de Compra
**Status:** Done
**Agente:** @dev

---

## Contexto

Com pedidos pendentes em "Necessidade" e cotações coletadas de fornecedores,
o operador precisa de uma tela que responda: **"De qual fornecedor comprar cada combustível?"**
considerando preço/L + custo de frete (FOB vs CIF) e o volume necessário.

Ao decidir, o sistema cria automaticamente os grupos de pedido por fornecedor
e move os orders para a coluna "Cotação" do Kanban.

---

## Objetivo

Criar o `PurchaseDecisionModal` — ponto de entrada na coluna "Necessidade" do Kanban —
que centraliza coleta de cotações, comparação de custo real/L e confirmação de compra.

---

## Acceptance Criteria

### 1. Entry point no Kanban
- Botão "Decidir Compra" aparece no header da coluna "Necessidade" quando há pedidos `pending`.
- Clicar abre `PurchaseDecisionModal` passando os pedidos pending.
- O botão "Gerar Pedido" existente é mantido (os dois coexistem no header).

### 2. Painel de Necessidades
- Mostra pedidos `pending` agrupados por `product_type`.
- Exibe: combustível, número de postos, volume total em litros.
- Exemplo: `Diesel S10 — 4 postos — 45.000 L`.

### 3. Coleta de cotações
- Tabs: [Colar texto] [Manual] [Sophia] — mesmo padrão da Story 010.
- Reutiliza `parseQuotationText` para input via texto colado.
- Cotações são armazenadas em estado local (não persistidas ainda no banco).
- Uma cotação tem: `supplier_name`, `product_type`, `unit_price`, `freight_type` (FOB/CIF), `delivery_days`.

### 4. Matriz de decisão
- Exibida abaixo das tabs assim que há ≥ 1 cotação.
- Linhas = fornecedores; colunas = combustíveis necessários.
- Cada célula exibe: preço/L + tipo de frete + **custo real/L** calculado:
  - CIF: `custo_real = unit_price`
  - FOB: `custo_real = unit_price + fornecedor.custo_frete_proprio_rl`
- Célula sem cotação para aquele combustível: `—`.
- Melhor custo real/L por coluna destacado com `★` e fundo emerald.
- Rodapé da matriz: total estimado da seleção atual = `Σ (custo_real_selecionado × volume_necessario)` por combustível.

### 5. Seleção por combustível
- Cada coluna (combustível) tem radio buttons por fornecedor.
- Sistema pré-seleciona automaticamente o fornecedor de menor `custo_real/L` por combustível.
- Operador pode trocar a seleção manualmente.
- Um fornecedor pode ser selecionado para mais de um combustível.

### 6. Confirmação de compra
- Botão "Confirmar Compra" habilitado somente quando todos os combustíveis necessários têm um fornecedor selecionado.
- Ao confirmar: chama `POST /api/orders/purchase-decision` com:
  ```json
  {
    "selections": [
      { "product_type": "Diesel S10", "supplier_name": "Petrobras", "unit_price": 5.38, "freight_type": "CIF", "delivery_days": 2 },
      { "product_type": "Gasolina Comum", "supplier_name": "Raízen", "unit_price": 6.05, "freight_type": "CIF", "delivery_days": 1 }
    ]
  }
  ```
- Backend:
  - Agrupa `pending` orders por `product_type`.
  - Por produto selecionado: cria um `group_id` único, salva cotação em `order_quotations`, atualiza orders para `status = quoted`.
  - Registra timeline: "Decisão de compra: [Supplier] R$ X/L [CIF/FOB]".
  - Retorna `{ success, groups_created, orders_updated }`.
- Frontend: toast de confirmação + `onUpdated()` + fecha modal.
- Kanban atualiza: cards saem de "Necessidade" e aparecem em "Cotação".

### 7. Qualidade
- `npm run typecheck` sem erros.
- `npm run lint` sem novos erros.

---

## Checklist

- [x] Backend: `POST /api/orders/purchase-decision` implementado
- [x] Backend: lógica de agrupamento por supplier+product_type, criação de group_id, salvamento de quotation, transição de status
- [x] `src/lib/quotation-text-parser.ts`: reutilizado sem modificação
- [x] `PurchaseDecisionModal.tsx` criado
- [x] Painel de necessidades por combustível
- [x] Tabs de coleta (paste, manual, Sophia)
- [x] Matriz comparativa com custo real/L (FOB vs CIF)
- [x] Seleção por combustível com pré-seleção automática do melhor
- [x] Total estimado da seleção
- [x] Botão "Confirmar Compra" e handler
- [x] `OrderKanbanBoard.tsx`: segundo botão no header da coluna "Necessidade"
- [x] `Pedidos.tsx`: estado + handler + render do modal
- [x] `npm run typecheck`: OK
- [x] `npm run lint`: sem novos erros
- [x] File list atualizada

---

## File List

1. `docs/stories/2026-03-05-story-013-tela-matriz-decisao-compra.md`
2. `server/src/routes/orders.js` — adicionado `POST /purchase-decision`
3. `src/components/orders/PurchaseDecisionModal.tsx` — novo
4. `src/components/orders/OrderKanbanBoard.tsx` — modificado (botão "Decidir Compra" em "Necessidade")
5. `src/pages/Pedidos.tsx` — modificado (estado + handler + render)
6. `src/services/orders-api.ts` — adicionado `purchaseDecision()` + `PurchaseDecisionSelection`

---

## Notas técnicas

### Cálculo de custo real/L
```typescript
function calcCustoReal(unitPrice: number, freightType: 'FOB' | 'CIF' | '', fornecedorFreightCost: number): number {
  if (freightType === 'FOB') return unitPrice + fornecedorFreightCost;
  return unitPrice; // CIF ou desconhecido: assume preço já inclui frete
}
```

### Agrupamento backend (POST /purchase-decision)
```
Para cada seleção (product_type + supplier):
  1. Filtrar pending orders com product_type correspondente (do user)
  2. Gerar group_id = uuid()
  3. UPDATE orders SET group_id=$1, status='quoted' WHERE id IN (...)
  4. INSERT INTO order_quotations (order_group_id, supplier_name, product_type, unit_price, delivery_days, notes)
  5. INSERT INTO order_timeline (order_id, status='quoted', description='Decisão de compra: Petrobras R$ 5,38 CIF')
```

### Dependência de Story 012
- `fornecedor.custo_frete_proprio_rl` precisa estar disponível na API de fornecedores.
- Se Story 012 não estiver implementada, usar `0` como fallback (frete próprio zero).

### Compatibilidade com Stories 010 e 011
- Esta story é o **ponto de entrada** do fluxo de cotação.
- Stories 010 e 011 operam **depois** que os orders já estão em `quoted` e `approved`.
- Não há conflito: fluxos complementares.
