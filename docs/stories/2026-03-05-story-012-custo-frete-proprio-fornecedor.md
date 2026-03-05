# Story 012 — Custo de Frete Próprio no Cadastro de Fornecedor

**Epic:** 001 — Matriz de Decisão de Compra
**Status:** Done
**Agente:** @dev

---

## Contexto

Para calcular o custo real por litro em compras com frete FOB (o operador paga o transporte),
o sistema precisa saber o custo de transporte próprio em R$/L cadastrado por fornecedor.
Hoje esse campo não existe na tabela `fornecedores`.

---

## Objetivo

Adicionar o campo `custo_frete_proprio_rl` ao cadastro de fornecedor, expondo-o no formulário
e persistindo no banco, de forma que a Story 013 possa usá-lo no cálculo do custo real/L.

---

## Acceptance Criteria

1. Campo `custo_frete_proprio_rl NUMERIC(10,4) DEFAULT 0` existe na tabela `fornecedores`.
2. Migration SQL criada em `server/src/migrations/` ou instrução de `ALTER TABLE` documentada.
3. `GET /api/fornecedores` e `GET /api/fornecedores/:id` retornam o campo.
4. `POST /api/fornecedores` e `PUT /api/fornecedores/:id` persistem o campo.
5. Interface `Fornecedor` em `suppliers-api.ts` inclui `custo_frete_proprio_rl?: number`.
6. `SupplierForm.tsx` exibe campo "Custo Frete Próprio (R$/L)" visível apenas quando frete padrão for FOB, com tooltip explicando: "Custo do seu transporte por litro. Usado no cálculo do custo real quando o fornecedor pratica FOB."
7. `SuppliersManager.tsx` exibe coluna "Frete próprio R$/L" na tabela de listagem.
8. `npm run typecheck && npm run lint` sem novos erros.

---

## Checklist

- [x] Migration / ALTER TABLE documentado (`server/src/migrations/add_custo_frete_proprio_fornecedor.sql`)
- [x] Backend: campo incluído nas queries GET/POST/PUT de fornecedores
- [x] `Fornecedor` interface atualizada em `suppliers-api.ts`
- [x] `SupplierForm.tsx`: campo adicionado com label e tooltip
- [x] `SuppliersManager.tsx`: coluna exibida na listagem
- [x] `npm run typecheck`: OK
- [x] `npm run lint`: sem novos erros
- [x] File list atualizada

---

## File List

1. `docs/stories/2026-03-05-story-012-custo-frete-proprio-fornecedor.md`
2. `server/src/migrations/add_custo_frete_proprio_fornecedor.sql` — novo
3. `server/src/routes/fornecedores.js` — modificado
4. `src/services/suppliers-api.ts` — modificado (`custo_frete_proprio_rl?: number`)
5. `src/components/suppliers/SupplierForm.tsx` — modificado (campo + tooltip)
6. `src/components/suppliers/SuppliersManager.tsx` — modificado (coluna)

---

## Notas técnicas

- Campo opcional: `DEFAULT 0` no banco, `undefined` aceitável no frontend.
- Não requer migration complexa: `ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS custo_frete_proprio_rl NUMERIC(10,4) DEFAULT 0`.
- Verificar se existe arquivo de migrations ou se o padrão do projeto é executar DDL direto.
