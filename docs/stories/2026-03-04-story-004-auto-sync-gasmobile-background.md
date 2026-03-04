# Story 004 - Auto Sync GasMobile em Background

## Status

Done

## Contexto

O sync manual resolve ingestão sob demanda, mas operação contínua exige atualização periódica sem ação do usuário.

## Objetivo

Implementar scheduler backend para sync automático da GasMobile e endpoints de observabilidade/controle.

## Acceptance Criteria

1. Scheduler inicia junto com o servidor.
2. Scheduler executa ciclos periódicos por intervalo configurável.
3. Scheduler evita sobreposição de ciclos.
4. Scheduler roda por usuários elegíveis (API key configurada).
5. Scheduler encerra corretamente no shutdown.
6. Endpoint de status do scheduler disponível.

## Implementação

1. Serviço de auto sync:
- `server/src/services/gasmobile-auto-sync.js`

2. Startup/shutdown integrado no servidor:
- `server/src/index.js`

3. Endpoint novo:
- `GET /api/gasmobile/sync-status`
- arquivo: `server/src/routes/gasmobile.js`

4. Configuração por env:
- `GASMOBILE_AUTO_SYNC_ENABLED`
- `GASMOBILE_AUTO_SYNC_INTERVAL_MS`
- `GASMOBILE_AUTO_SYNC_RUN_ON_STARTUP`
- arquivo: `server/.env.example`

## Como validar

1. Subir backend e verificar log:
- `[gasmobile-auto-sync] iniciado ...`

2. Consultar status:
- `GET /api/gasmobile/sync-status`

3. Confirmar `integracao_sync_logs` atualizado no banco.

## Checklist

- [x] Story criada antes da implementação
- [x] Scheduler implementado
- [x] Startup/shutdown integrado
- [x] Endpoint de status implementado
- [x] Variáveis de ambiente documentadas
- [x] File list atualizada
- [x] `npm run lint` executado
- [x] `npm run typecheck` executado
- [x] `npm test` executado

## File List

1. `docs/stories/2026-03-04-story-004-auto-sync-gasmobile-background.md`
2. `server/src/services/gasmobile-auto-sync.js`
3. `server/src/index.js`
4. `server/src/routes/gasmobile.js`
5. `server/.env.example`

## Notas de validação

- `npm run typecheck`: OK
- `npm test`: OK (sem suíte automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo desta story
