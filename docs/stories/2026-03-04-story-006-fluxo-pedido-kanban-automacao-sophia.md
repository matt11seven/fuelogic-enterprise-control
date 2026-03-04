# Story 006 - Fluxo de Pedido em Kanban com Automacao e Sophia

## Status

Done

## Contexto

O fluxo atual de pedido existe, mas ainda sem quadro operacional unificado por etapas, SLAs, responsaveis, e pontos claros de automacao por regra/IA.

## Objetivo

Definir um fluxo alvo de pedido de combustivel em formato Kanban, mapear gaps, oportunidades, e plano de implantacao para reduzir trabalho manual e preparar entrada de agentes (Sophia).

## Acceptance Criteria

1. Fluxo ponta a ponta documentado com colunas Kanban e gates.
2. Etapas do processo atual mapeadas para o novo fluxo.
3. Gaps operacionais e de dados priorizados.
4. Oportunidades de automacao por etapa identificadas.
5. Pontos de entrada da Sophia definidos por fase.
6. Plano de implantacao com KPIs e criterios de pronto.

## Implementacao

1. Documento de fluxo alvo criado:
- `docs/flows/fluxo-pedido-combustivel-kanban-alvo.md`

2. Mapeamento direto dos 11 passos operacionais para estados Kanban.
3. Definicao de automacoes por tipo:
- regra deterministica
- integracao externa
- agente de IA (Sophia)

## Como validar

1. Conferir se cada passo operacional (1 a 11) aparece no fluxo alvo.
2. Conferir criterios de entrada/saida por coluna Kanban.
3. Conferir backlog de implantacao por fase (F0 a F4).
4. Conferir KPIs e riscos de governanca.

## Checklist

- [x] Story criada
- [x] Fluxo alvo em Kanban documentado
- [x] Gaps e oportunidades priorizados
- [x] Plano de implantacao por fases definido
- [x] Pontos de entrada Sophia mapeados
- [x] Checklist e file list atualizados
- [ ] `npm run lint` executado (nao aplicavel: docs only)
- [ ] `npm run typecheck` executado (nao aplicavel: docs only)
- [ ] `npm test` executado (nao aplicavel: docs only)

## File List

1. `docs/stories/2026-03-04-story-006-fluxo-pedido-kanban-automacao-sophia.md`
2. `docs/flows/fluxo-pedido-combustivel-kanban-alvo.md`
