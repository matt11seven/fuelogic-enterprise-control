/**
 * Patch para corrigir o problema de cadastro de webhooks da IA Sophia
 * 
 * Instruções para aplicar as alterações:
 * 1. No arquivo server/src/routes/webhooks.js, localizar a rota POST /api/webhooks
 * 2. Modificar a validação de integração para incluir 'sophia_ai'
 * 3. Modificar a validação de tipo para incluir 'sophia_ai_order'
 * 4. Adicionar validação específica para webhooks sophia_ai
 */

// ---------- Alterações necessárias ----------

// 1. Alterar a validação de integração (linha ~93) para:
// if (integration !== 'generic' && integration !== 'slingflow' && integration !== 'sophia_ai') {
//   return res.status(400).json({ message: 'Tipo de integração inválido' });
// }

// 2. Alterar a validação de tipo (linha ~97) para:
// if (type !== 'inspection_alert' && type !== 'order_placed' && type !== 'sophia' && type !== 'sophia_ai_order') {
//   return res.status(400).json({ message: 'Tipo de evento inválido' });
// }

// 3. Adicionar validação específica para webhooks sophia_ai (linha ~107, após validação do slingflow):
// if (integration === 'sophia_ai' && !url) {
//   return res.status(400).json({ message: 'URL é obrigatória para webhooks da IA Sophia' });
// }

/**
 * Também é necessário modificar o modelo Webhook (server/models/webhook.js)
 * para incluir validações específicas para webhooks sophia_ai.
 * 
 * 1. No método create(), após a validação do SlingFlow (linha ~137):
 * // Se for Sophia AI, não precisa validar contatos, mas precisa de URL
 * if (webhookData.integration === 'sophia_ai' && !webhookData.url) {
 *   throw new Error('URL é obrigatória para webhooks da IA Sophia');
 * }
 * 
 * 2. Fazer a mesma alteração no método update() também
 */
