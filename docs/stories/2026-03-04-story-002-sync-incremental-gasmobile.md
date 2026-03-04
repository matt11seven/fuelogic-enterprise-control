# Story 002 - Sync Incremental de Medicoes GasMobile (API + CLI)

## Status

Done

## Contexto

Com o schema canônico criado na Story 001, precisamos operacionalizar a ingestão de medições da GasMobile com idempotência e rastreabilidade.

## Objetivo

Entregar execução de sync incremental de medições por:

1. endpoint autenticado (operação via API)
2. CLI (operação sem UI)

## Acceptance Criteria

1. Existe serviço backend reutilizável para sincronizar medições GasMobile.
2. Serviço registra execução em `integracao_sync_logs`.
3. Serviço atualiza/garante fonte em `integracao_fontes`.
4. Serviço cria/atualiza mapeamentos em `integracao_mapeamentos`.
5. Serviço persiste snapshots em `medicoes_tanque` com idempotência.
6. Serviço atualiza os campos de medição atuais em `tanques`.
7. Endpoint autenticado disponível.
8. CLI disponível para execução manual por `user_id`.

## Implementação

1. Serviço criado:
- `server/src/services/gasmobile-sync.js`

2. Endpoint criado:
- `POST /api/gasmobile/sync-medicoes`
- arquivo: `server/src/routes/gasmobile.js`

3. CLI criada:
- `bin/sync-gasmobile-medicoes.cjs`
- script npm: `sync:gasmobile:medicoes`

## Como usar

## API

`POST /api/gasmobile/sync-medicoes` (autenticado)

Resposta esperada:
```json
{
  "success": true,
  "source_system": "gasmobile",
  "summary": {
    "records_read": 100,
    "records_created": 80,
    "records_updated": 10,
    "records_skipped": 10,
    "records_failed": 0
  },
  "sync_log_id": 123
}
```

## CLI

```bash
npm run sync:gasmobile:medicoes -- --user-id <uuid>
```

Opcional:
```bash
npm run sync:gasmobile:medicoes -- --user-id <uuid> --api-key <chave>
```

## Checklist

- [x] Story criada antes da implementação
- [x] Serviço de sync incremental implementado
- [x] Endpoint de execução manual implementado
- [x] CLI implementada (CLI First)
- [x] Logs de sync implementados
- [x] Mapeamentos externos implementados
- [x] Persistência idempotente de medições implementada
- [x] Atualização de `tanques` com última medição implementada
- [ ] Teste em ambiente com API real GasMobile
- [x] File list atualizada
- [x] `npm run lint` executado
- [x] `npm run typecheck` executado
- [x] `npm test` executado

## File List

1. `docs/stories/2026-03-04-story-002-sync-incremental-gasmobile.md`
2. `server/src/services/gasmobile-sync.js`
3. `server/src/routes/gasmobile.js`
4. `bin/sync-gasmobile-medicoes.cjs`
5. `package.json`

## Notas de validação

- `npm run typecheck`: OK
- `npm test`: OK (sem suíte automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo desta story
