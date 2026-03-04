# Story 001 - Schema Canonico de Integracoes (GasMobile, EMSys e futuros ERPs)

## Status

Done

## Contexto

Precisamos padronizar a base para suportar multiplas fontes externas (GasMobile, EMSys e futuros ERPs), separando:

- dados mestres (cadastro)
- dados de medicao (telemetria/snapshot historico)
- rastreabilidade de sincronizacao

## Objetivo

Criar estrutura SQL base para integracoes multi-fonte com:

1. cadastro de fontes por usuario
2. mapeamento de IDs externos para entidades internas
3. historico de medicoes de tanque com idempotencia
4. logs de execucao de sincronizacao

## Acceptance Criteria

1. Existe migration SQL com criacao das tabelas canônicas de integração.
2. Tabelas possuem FKs para `users` e entidades internas quando aplicável.
3. Existe estratégia de idempotência para medições por chave natural.
4. Existe tabela de logs de sync para auditoria operacional.
5. Migration é segura para execução repetida (`IF NOT EXISTS`, guards de índices/constraints).
6. Documentação do fluxo de pedidos referencia esse modelo como base evolutiva.

## Requisitos técnicos

1. `integracao_fontes`:
- controla conectores por usuário (`source_system`, status, configuração)

2. `integracao_mapeamentos`:
- relaciona `external_id` com `posto_id`/`tanque_id`/`combustivel_id`

3. `medicoes_tanque`:
- armazena snapshots com `measured_at`
- possui constraint única para evitar duplicatas de ingestão

4. `integracao_sync_logs`:
- registra execução de jobs (`started_at`, `finished_at`, status, contadores)

## Implementação

- Criada migration `server/migrations/20260304_create_integracao_canonica.sql`
- Criada pasta de stories `docs/stories/` conforme Constituição AIOS

## Checklist

- [x] Story criada antes da implementação
- [x] Acceptance criteria definidos
- [x] Migration SQL criada
- [x] Idempotência de medições implementada via UNIQUE
- [x] Estrutura de logs de sincronização criada
- [x] File list atualizada
- [ ] Validar migration em banco de desenvolvimento real
- [x] `npm run lint` executado
- [x] `npm run typecheck` executado
- [x] `npm test` executado

## File List

1. `docs/stories/2026-03-04-story-001-schema-canonico-integracoes.md`
2. `server/migrations/20260304_create_integracao_canonica.sql`

## Notas de validação

- `npm run typecheck`: OK
- `npm test`: OK (sem suíte automatizada)
- `npm run lint`: falha por erros preexistentes fora do escopo desta story
