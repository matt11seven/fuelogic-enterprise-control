# Mudanças de Nome de Posto por Cadastro (GasMobile)

**Data:** 2026-03-04  
**Escopo:** Integração GasMobile, cadastro de postos e dashboard de operação

## Contexto

Ao importar/sincronizar dados via GasMobile, o sistema precisava priorizar o nome já cadastrado internamente quando a unidade já existe (`id_unidade`), em vez de exibir sempre o nome vindo da API externa.

## Regra final implementada

1. Se existir posto cadastrado no banco com o mesmo `id_unidade`, o sistema usa o nome do cadastro (`postos.nome`).
2. Se `postos.nome` estiver vazio, usa `postos.cliente_gm`.
3. Se não existir cadastro para o `id_unidade`, usa o nome da API GasMobile.

## Alterações realizadas

### 1) Preview do GasMobile

Arquivo: `server/src/routes/gasmobile.js`

- Match de posto existente por `id_unidade` com comparação normalizada (`String(...)`).
- Para unidades existentes:
  - `nome` e `cliente_gm` retornam priorizando o cadastro local.
  - `nome_atual` passa a refletir o nome efetivamente resolvido.
- Mantidos campos de referência da API (`nome_gasmobile` e `cliente_gm_gasmobile`) para auditoria visual.

## 2) API de Postos (listagem/consulta)

Arquivo: `server/src/routes/postos.js`

- `GET /api/postos` e `GET /api/postos/:id` agora retornam `nome_exibicao`:
  - `COALESCE(NULLIF(TRIM(nome), ''), NULLIF(TRIM(cliente_gm), ''))`
- Filtro (`q`) e ordenação passaram a usar o mesmo critério de exibição.

## 3) Normalização no frontend de Postos

Arquivo: `src/services/stations-api.ts`

- Adicionado `normalizePosto(...)` para garantir exibição consistente no frontend:
  - Prioriza `nome`, depois `nome_exibicao`, depois `cliente_gm`.
- Aplicado em `getAllPostos`, `getPostoById`, `createPosto` e `updatePosto`.

## 4) Dashboard de Operação (Página inicial)

Arquivo: `src/hooks/use-tank-data.ts`

- Antes: nome da estação era montado direto da API (`Cliente - Unidade`).
- Agora:
  - Busca tanques + postos em paralelo.
  - Cruza por `IdUnidade` (API) x `id_unidade` (banco).
  - Usa nome do banco quando houver cadastro.
  - Fallback para nome da API quando não houver cadastro.
- Também atualiza `apiData.Unidade` com o nome resolvido para evitar divergência visual em componentes de detalhe.

## 5) Busca de postos na Sophia (tool `select`)

Arquivo: `server/src/services/sophia.js`

- Em `searchEntity(entity='postos')`, a consulta passou a usar:
  - `COALESCE(NULLIF(TRIM(p.nome), ''), NULLIF(TRIM(p.cliente_gm), ''))`
- Garante consistência entre busca textual da Sophia e nomenclatura exibida no sistema.

## Compatibilidade e impacto

- Não houve alteração de contrato breaking nos endpoints existentes.
- Foram adicionados campos opcionais no preview da GasMobile para contexto (`nome_gasmobile`, `cliente_gm_gasmobile`).
- Recomendado recarregar a tela após deploy para limpar cache local de dados de tanques.

## Validação executada

- `npm run typecheck`: OK
- `npm test`: OK (`No automated tests configured yet`)
- `npm run lint`: ainda falha por erros preexistentes em arquivos fora deste escopo

