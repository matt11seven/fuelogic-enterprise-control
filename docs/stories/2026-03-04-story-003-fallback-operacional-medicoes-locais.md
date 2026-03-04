# Story 003 - Fallback Operacional para Medicoes Locais

## Status

Done

## Contexto

Mesmo com integração ativa, a operação pode sofrer quando a API externa da GasMobile estiver indisponível. Precisamos de fallback de leitura via dados já persistidos no banco.

## Objetivo

1. Expor endpoint com últimas medições locais por tanque.
2. Fazer dashboard operacional usar esse endpoint como fallback antes do cache local.

## Acceptance Criteria

1. Endpoint autenticado retorna última medição local por tanque.
2. Payload do endpoint é compatível com o formato de `TankData` usado na UI.
3. Hook de dados do dashboard consulta fallback local quando API externa falha.
4. Se fallback local também falhar, fluxo segue com cache local atual.

## Implementação

1. Endpoint:
- `GET /api/gasmobile/medicoes/latest`
- arquivo: `server/src/routes/gasmobile.js`

2. Serviço frontend:
- `getLatestGMMedicoes()` em `src/services/gasmobile-api.ts`

3. Hook operacional:
- `src/hooks/use-tank-data.ts`
- ordem de fallback:
  1) API externa
  2) medições locais no banco
  3) cache localStorage

## Checklist

- [x] Story criada antes da implementação
- [x] Endpoint local de fallback implementado
- [x] Serviço frontend para fallback implementado
- [x] Hook operacional atualizado
- [x] File list atualizada
- [x] `npm run lint` executado
- [x] `npm run typecheck` executado
- [x] `npm test` executado

## File List

1. `docs/stories/2026-03-04-story-003-fallback-operacional-medicoes-locais.md`
2. `server/src/routes/gasmobile.js`
3. `src/services/gasmobile-api.ts`
4. `src/hooks/use-tank-data.ts`

## Notas de validação

- `npm run typecheck`: OK
- `npm test`: OK (sem suíte automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo desta story
