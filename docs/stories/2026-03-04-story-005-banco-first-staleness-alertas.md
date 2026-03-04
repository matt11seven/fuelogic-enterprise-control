# Story 005 - Banco First com Staleness 2x e Alertas Operacionais

## Status

Done

## Contexto

O dashboard operacional estava em API-first. Precisamos inverter para banco-first e sinalizar claramente quando houver fallback para API (amarelo) ou falha geral de atualização (vermelho).

## Objetivo

1. Priorizar medições locais do banco na carga do dashboard.
2. Definir staleness de banco com regra `agora - ultima_medicao > 2 * intervalo_sync`.
3. Se banco desatualizado, buscar API e avisar em amarelo.
4. Se API também falhar, exibir alerta vermelho com motivo, mantendo melhor dado disponível.

## Acceptance Criteria

1. Hook de tanques lê primeiro do endpoint local.
2. Regra de staleness usa `stale_threshold_ms` vindo de `sync-status`.
3. Quando usar API por staleness/vazio local, alerta amarelo aparece com motivo.
4. Quando API falhar após tentativa de fallback, alerta vermelho aparece com motivo.
5. UI exibe medições mesmo com alerta (quando houver fonte alternativa disponível).

## Implementação

1. Backend:
- `GET /api/gasmobile/sync-status` agora retorna:
  - `interval_ms`
  - `stale_threshold_ms`
- `GET /api/gasmobile/medicoes/latest` retorna `latest_measured_at`.

2. Frontend service:
- `src/services/gasmobile-api.ts`
  - `getLatestGMMedicoes()` retorna metadados + rows.
  - `getGMSyncStatus()` adicionado.

3. Hook banco-first:
- `src/hooks/use-tank-data.ts`
  - ordem: banco -> API -> cache.
  - regra de staleness 2x.
  - estado `dataAlert` com severidade e motivo.

4. UI:
- `src/pages/Index.tsx`
  - banner amarelo/vermelho com título e motivo.

## Checklist

- [x] Story criada antes da implementação
- [x] Banco-first implementado
- [x] Regra de staleness 2x implementada
- [x] Alertas amarelo/vermelho implementados
- [x] File list atualizada
- [x] `npm run typecheck` executado
- [x] `npm test` executado
- [x] `npm run lint` executado

## File List

1. `docs/stories/2026-03-04-story-005-banco-first-staleness-alertas.md`
2. `server/src/services/gasmobile-auto-sync.js`
3. `server/src/routes/gasmobile.js`
4. `src/services/gasmobile-api.ts`
5. `src/hooks/use-tank-data.ts`
6. `src/pages/Index.tsx`

## Notas de validação

- `npm run typecheck`: OK
- `npm test`: OK (sem suíte automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo desta story
