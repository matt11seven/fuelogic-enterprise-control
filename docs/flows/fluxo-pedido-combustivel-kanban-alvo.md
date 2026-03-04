# Fluxo Alvo de Pedido de Combustivel em Kanban

Data de referencia: 2026-03-04

## Objetivo

Padronizar o processo de pedido de combustivel ponta a ponta com visibilidade operacional, trilha de auditoria e base para automacao progressiva (regras + Sophia).

## Quadro Kanban Proposto

1. `Monitoramento`
2. `Necessidade Detectada`
3. `Cotacao em Andamento`
4. `Comparativo e Decisao`
5. `Logistica Planejada`
6. `Pedido Emitido`
7. `Aguardando Confirmacao`
8. `Confirmado com ETA`
9. `Comunicado a Unidade`
10. `Recebido e Conciliado`
11. `Encerrado`

## WIP e SLA por coluna (inicial)

1. `Monitoramento`: continuo, sem WIP.
2. `Necessidade Detectada`: max 20 itens abertos, SLA 30 min.
3. `Cotacao em Andamento`: max 15 itens, SLA 90 min.
4. `Comparativo e Decisao`: max 10 itens, SLA 30 min.
5. `Logistica Planejada`: max 10 itens, SLA 20 min.
6. `Pedido Emitido`: max 10 itens, SLA 20 min.
7. `Aguardando Confirmacao`: max 20 itens, SLA por fornecedor.
8. `Confirmado com ETA`: max 20 itens, SLA 10 min para atualizar ETA.
9. `Comunicado a Unidade`: max 20 itens, SLA 10 min apos confirmacao.
10. `Recebido e Conciliado`: max 20 itens, SLA 24h.
11. `Encerrado`: historico e auditoria.

## Mapeamento dos 11 passos operacionais para Kanban

1. Checar estoque atual por tanque e posto -> `Monitoramento`
2. Checar media de venda -> `Monitoramento`
3. Calcular necessidade com estoque minimo -> `Necessidade Detectada`
4. Fazer cotacao nas distribuidoras -> `Cotacao em Andamento`
5. Melhor compra (preco + frete) -> `Comparativo e Decisao`
6. Definir caminhao interno/externo -> `Logistica Planejada`
7. Definir pedido e caminhao -> `Logistica Planejada`
8. Emitir pedido fornecedor/portal/WhatsApp -> `Pedido Emitido`
9. Aguardar confirmacao -> `Aguardando Confirmacao`
10. Confirmar e inserir previsao -> `Confirmado com ETA`
11. Informar gerente e chefe de pista -> `Comunicado a Unidade`

## Gates de qualidade por coluna

1. `Necessidade Detectada` so entra com:
- leitura valida por tanque
- estoque minimo por produto definido
- consumo medio diario disponivel

2. `Comparativo e Decisao` so entra com:
- minimo 2 cotacoes (ou justificativa de fonte unica)
- frete normalizado em centavos/litro
- custo total por produto e por pedido

3. `Pedido Emitido` so entra com:
- fornecedor escolhido
- janela de entrega
- caminhao atribuido
- responsavel pela aprovacao registrado

4. `Confirmado com ETA` so entra com:
- protocolo/numero de confirmacao
- ETA com data/hora
- status de risco (no prazo, risco, atraso)

5. `Encerrado` so entra com:
- recebimento registrado
- divergencia de volume/preco conciliada
- custos finais confirmados

## Gaps atuais (prioridade)

Alta:
1. Falta score unico de compra (produto + frete + prazo + confiabilidade).
2. Cotacao via WhatsApp sem estrutura de dados padrao e rastreabilidade fraca.
3. Ausencia de workflow unico para aprovacao e emissao.
4. Falta de idempotencia forte para evitar duplicidade de pedido.

Media:
1. Falta SLA visivel por etapa com alertas automativos.
2. Planejamento de frota sem otimizacao de rota/capacidade.
3. Confirmacoes de fornecedor sem parser estruturado por canal.

Baixa:
1. Falta benchmarking historico por base e fornecedor.
2. Falta simulador de cenarios (preco sobe, atraso, indisponibilidade).

## Oportunidades de automacao (regra x IA)

Automacao por regra (primeiro):
1. Disparar `Necessidade Detectada` automaticamente por limite dinamico.
2. Ranking de cotacao por custo total entregue (R$/L + frete + taxa).
3. Sugerir caminhao por capacidade, disponibilidade e custo.
4. SLA watchdog por coluna (alertas de atraso).

Automacao por integracao:
1. Portal Vibra BR: leitura e envio estruturado (quando API/robot disponivel).
2. WhatsApp: inbox unificado com parser de mensagens.
3. ERP (Emsys e futuros): cadastro mestre, pedido, recebimento, fiscal.

Automacao por Sophia (IA):
1. Copiloto de cotacao:
- extrai propostas de mensagens
- normaliza unidades e condicoes
- pede dados faltantes

2. Copiloto de decisao:
- explica recomendacao de compra com criterios
- sinaliza risco de ruptura e risco de atraso

3. Copiloto de comunicacao:
- envia previsao para gerente/chefe de pista
- confirma recebimento de mensagem e faz follow-up

## Fluxo de decisao recomendado (deterministico)

1. Calcular `NeedLiters` por tanque:
- `NeedLiters = max(0, EstoqueAlvo - EstoqueAtual)`
- `EstoqueAlvo = max(EstoqueMinimo, DiasCobertura * ConsumoMedioDiario)`

2. Agrupar por posto/produto.
3. Coletar cotacoes e normalizar para:
- `PrecoBase`
- `FreteCentLitro`
- `PrazoEntrega`
- `ConfiabilidadeFornecedor`

4. Calcular score:
- `CustoTotalLitro = PrecoBase + FreteCentLitro/100`
- `Score = w1*CustoTotalLitro + w2*RiscoPrazo + w3*RiscoFornecedor`

5. Selecionar melhor opcao com regra de contingencia:
- se risco alto de prazo, escolher 2a melhor com ETA menor.

## Modelo de card Kanban (campos minimos)

1. `card_id`, `group_id`, `status_kanban`, `prioridade`
2. `posto_id`, `produto`, `volume_litros`
3. `estoque_atual`, `estoque_minimo`, `dias_cobertura`
4. `fornecedor_sugerido`, `custo_total_litro`, `frete_cent_litro`
5. `caminhao_id`, `tipo_frota` (interno/externo)
6. `canal_pedido` (portal, whatsapp, email, api)
7. `eta`, `confirmacao_codigo`
8. `owner`, `aprovador`, `auditoria_eventos`

## Plano de implantacao (fases)

F0 - Visibilidade (1-2 semanas):
1. Criar board Kanban no sistema com status oficiais.
2. Criar card padrao com campos obrigatorios.
3. Exibir SLA por coluna.

F1 - Motor de necessidade (1-2 semanas):
1. Automatizar calculo de necessidade por tanque/produto.
2. Gerar cards automaticamente em `Necessidade Detectada`.

F2 - Cotacao estruturada (2-4 semanas):
1. Entrada unica de cotacao (portal + WhatsApp parser).
2. Comparativo automatico com score e explicabilidade.

F3 - Logistica e emissao (2-3 semanas):
1. Sugerir alocacao de caminhao.
2. Fluxo unico para emissao de pedido e confirmacao.

F4 - Sophia agente operacional (3-6 semanas):
1. Assistente para coleta e saneamento de cotacoes.
2. Assistente para recomendacao e comunicacao automatica.
3. Human-in-the-loop com aprovacao obrigatoria nas etapas criticas.

## KPIs de sucesso

1. Tempo medio `Necessidade Detectada -> Pedido Emitido`.
2. Tempo medio `Pedido Emitido -> Confirmado com ETA`.
3. Taxa de ruptura evitada por previsao.
4. Economia media (R$/L) vs baseline.
5. Percentual de etapas com toque manual.
6. Percentual de cards no SLA por coluna.

## Riscos e mitigacoes

1. Risco: recomendacao incorreta por dado incompleto.
- Mitigacao: gate de qualidade e bloqueio sem campos obrigatorios.

2. Risco: automacao sem trilha de auditoria.
- Mitigacao: log de decisao com entrada, regra, output e aprovador.

3. Risco: dependencia de canal nao estruturado (WhatsApp).
- Mitigacao: parser com score de confianca + revisao humana quando baixa confianca.

4. Risco: rejeicao operacional.
- Mitigacao: implantacao por fases com pilotos por 1-2 unidades.

## Decisoes arquiteturais recomendadas

1. Manter motor de regras no backend (nao no frontend).
2. Tratar Sophia como camada de orquestracao/assistencia, nao fonte unica da verdade.
3. Usar modelo canonico de integracoes para ERPs (Emsys e futuros).
4. Criar eventos de dominio por transicao Kanban para observabilidade.
