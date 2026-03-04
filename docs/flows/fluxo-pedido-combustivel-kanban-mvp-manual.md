# Fluxo MVP - Pedido de Combustivel (Kanban Manual First)

Data de referencia: 2026-03-04

## Objetivo

Implementar visao Kanban enxuta para operacao de pedidos, mantendo processo de compra com aprovacao humana obrigatoria e cotacao manual como padrao.

## Principios operacionais

1. Human in the loop obrigatorio para decisao de compra e aprovacao.
2. Cotacao manual como modo padrao.
3. Sophia opcional apenas para apoio de cotacao (toggle em configuracoes).
4. Sem retrabalho: reutilizar status, endpoints e componentes existentes.

## Colunas Kanban (enxuto)

1. `Necessidade` (pending)
2. `Cotacao` (quoted)
3. `Decisao` (approved)
4. `Pedido` (delivering)
5. `Entrega` (delivered + cancelled)

Observacao:
- `cancelled` aparece em `Entrega` como trilha final (badge de cancelado).

## Badges de substatus no card

1. Necessidade:
- `estoque_baixo`
- `risco_ruptura`
- `aguardando_cotacao`

2. Cotacao:
- `manual`
- `cotacao_parcial`
- `cotacao_completa`
- `sophia_habilitada` (somente informativo quando toggle on)

3. Decisao:
- `em_analise_humana`
- `aprovado_humano`
- `reprovado_humano`

4. Pedido:
- `emitido`
- `confirmacao_pendente`
- `confirmado_eta`

5. Entrega:
- `em_rota`
- `entregue`
- `cancelado`

## Mapeamento do processo atual (1-11) para o MVP

1. Checar estoque por tanque/posto -> Necessidade
2. Checar media de venda -> Necessidade
3. Calcular necessidade -> Necessidade
4. Cotar distribuidoras -> Cotacao
5. Comparar preco + frete -> Cotacao (analise)
6. Definir caminhao -> Decisao
7. Definir pedido + caminhao -> Decisao
8. Emitir pedido -> Pedido
9. Aguardar confirmacao -> Pedido
10. Registrar previsao -> Pedido
11. Comunicar gerente/chefe pista -> Entrega (check operacional)

## Regras de transicao

1. Necessidade -> Cotacao:
- volume definido
- posto/produto validos

2. Cotacao -> Decisao:
- no minimo 1 cotacao registrada
- custo total por litro calculado

3. Decisao -> Pedido:
- aprovacao humana registrada
- fornecedor escolhido
- caminhao definido (quando aplicavel)

4. Pedido -> Entrega:
- confirmacao de fornecedor recebida
- ETA preenchido

5. Entrega -> Encerramento:
- entregue ou cancelado com motivo

## Sophia no MVP

1. Toggle: `usar_sophia_na_cotacao` (default false).
2. Quando false:
- fluxo 100% manual, sem chamadas automaticas para Sophia.

3. Quando true:
- Sophia pode apoiar coleta/registro de cotacoes.
- aprovacao final permanece humana.

## KPIs MVP

1. Tempo medio `Necessidade -> Decisao`.
2. Tempo medio `Decisao -> Pedido`.
3. Taxa de pedidos sem ETA.
4. Percentual de cotacao manual vs Sophia.
5. Percentual de cards por coluna fora de SLA.
