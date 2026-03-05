# Story 014 - Navegacao Principal para Pagina Cotacoes

## Status

Done

## Contexto

O fluxo de cotacao e decisao de compra hoje esta concentrado em modais dentro da pagina `Pedidos`.
Para operacao diaria, falta um ponto de entrada principal e explicito no menu para acessar cotacoes sem depender do Kanban.

## Objetivo

Adicionar o item de menu `Cotacoes` entre `Operacao` e `Pedidos`, com rota dedicada `/cotacoes` e pagina base carregando corretamente em desktop e mobile.

## Acceptance Criteria

1. Header exibe item `Cotacoes` entre os itens `Operacao` e `Pedidos`.
2. Item `Cotacoes` aponta para a rota `/cotacoes`.
3. Rota `/cotacoes` existe em `App.tsx` e renderiza a pagina `Cotacoes`.
4. Pagina `Cotacoes` tem estrutura inicial com titulo, descricao e area de conteudo.
5. Estado ativo do menu funciona em `\/cotacoes` (highlight consistente).
6. Navegacao atual de `Operacao`, `Pedidos`, `Sophia Ops` e `Configuracoes` nao sofre regressao.
7. `npm run typecheck` sem novos erros.
8. `npm run lint` mantem baseline atual do projeto (sem regressao nas alteracoes da story).

## Checklist

- [x] Adicionar item `Cotacoes` no `Header.tsx`
- [x] Criar pagina `src/pages/Cotacoes.tsx`
- [x] Registrar rota `\/cotacoes` em `src/App.tsx`
- [x] Ajustar estado ativo do menu para nova rota
- [x] Validar navegacao manual em desktop e mobile
- [x] `npm run typecheck`
- [x] `npm run lint` (baseline do projeto com erros preexistentes fora do escopo)
- [x] Atualizar checklist e file list ao concluir

## File List

1. `docs/stories/2026-03-05-story-014-navegacao-principal-pagina-cotacoes.md`
2. `src/components/Header.tsx` - modificado
3. `src/App.tsx` - modificado
4. `src/pages/Cotacoes.tsx` - novo

## Notas tecnicas

1. Esta story nao muda regra de negocio de cotacao, apenas navegacao e entrypoint.
2. O fluxo via modal no Kanban permanece disponivel como fallback operacional.
3. A pagina foi entregue com visao consolidada inicial (necessidades e grupos em cotacao) e acesso aos modais de decisao/gestao.
4. `npm run typecheck`: OK.
5. `npm run lint`: falha por erros preexistentes em arquivos fora do escopo (ex.: `GasMobileSync.tsx`, `fuels-api.ts`, `suppliers-api.ts`).
