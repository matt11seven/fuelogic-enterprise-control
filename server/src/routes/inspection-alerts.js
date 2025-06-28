const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');
const db = require('../db');

// Funções auxiliares para lidar com webhooks (mesma implementação de webhooks.js)
const getWebhooksByType = async (type) => {
  try {
    const result = await db.query(
      `SELECT 
        id, type, name, url, integration, selected_contacts,
        user_id, created_at, updated_at
      FROM webhooks 
      WHERE type = $1
      ORDER BY name ASC`,
      [type]
    );
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar webhooks por tipo:', error);
    return [];
  }
};

// Função para aceitar qualquer status HTTP como válido (não lançar erro)
const validateStatus = (status) => {
  return true; // Aceitar qualquer status para poder mostrar no log
};

// Função para obter contatos do banco de dados com base nos IDs
const getSelectedContacts = async (contactIds) => {
  try {
    // Validação básica
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      console.log('getSelectedContacts: contactIds inválido ou vazio:', contactIds);
      return [];
    }
    
    // Verificar se há IDs inválidos
    const validIds = contactIds.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length === 0) {
      console.log('getSelectedContacts: nenhum ID válido encontrado em:', contactIds);
      return [];
    }
    
    console.log('getSelectedContacts: Buscando contatos com IDs:', validIds);
    
    // Construir a query com placeholders
    const placeholders = validIds.map((_, idx) => `$${idx + 1}`).join(',');
    const query = `
      SELECT id, nome, email, telefone, tipo
      FROM contatos 
      WHERE id IN (${placeholders}) 
      AND deleted_at IS NULL
      ORDER BY nome ASC
    `;
    
    console.log('getSelectedContacts: Query gerada:', query);
    console.log('getSelectedContacts: Parâmetros:', validIds);
    
    // Executar a query
    const result = await db.query(query, validIds);
    
    console.log(`getSelectedContacts: ${result.rows.length} contatos encontrados:`, 
      result.rows.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone })));
    
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar contatos selecionados:', error);
    return [];
  }
};

// Função para entregar webhook inspection_alert
const deliverInspectionAlertWebhook = async (webhook, tanquesComAgua) => {
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV !== 'production';

  try {
    // Preparar payload de alerta de inspeção
    const payload = {
      inspection: {
        id: Math.floor(Math.random() * 10000) + 1000,
        report_id: `INS-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        inspector: "Sistema de Monitoramento FueLogic",
        description: `Foi detectada água em ${tanquesComAgua.length} tanque(s) que requerem atenção imediata`,
        severity: "high",
        alerta_tipo: "agua_no_tanque",
        alertas: tanquesComAgua.map(tanque => ({
          cliente: tanque.Cliente,
          unidade: tanque.Unidade,
          tanque: tanque.Tanque,
          produto: tanque.Produto,
          quantidade_agua: tanque.QuantidadeDeAgua.toFixed(1) + 'L',
          data_medicao: new Date(tanque.DataMedicao).toLocaleDateString('pt-BR')
        }))
      }
    };

    // Verificar o tipo de integração
    if (webhook.integration === 'generic') {
      // Webhook genérico: envia para URL diretamente
      if (!webhook.url) {
        if (isDevelopment) console.log(`ERRO: Webhook ${webhook.id} não possui URL configurada`);
        return {
          success: false,
          error: 'Webhook não possui URL configurada'
        };
      }

      if (isDevelopment) {
        console.log(`Enviando alerta para webhook ${webhook.id} - ${webhook.name} (generic):`);
        console.log(JSON.stringify(payload, null, 2));
      }
      
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FueLogic-Webhook-Inspection'
        },
        timeout: 10000, // Timeout de 10 segundos
        validateStatus // Usar a função definida acima
      });
      
      // Log detalhado em ambiente de desenvolvimento
      if (isDevelopment) {
        console.log('=== RESPOSTA DO WEBHOOK ===');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Headers:', response.headers);
        console.log('Body:', response.data);
        console.log('=== FIM DA RESPOSTA ===');
      }
      
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
    } 
    // SlingFlow - precisa enviar para cada contato individualmente
    else if (webhook.integration === 'slingflow') {
      let selected_contacts = [];
      
      // Verificar se há contatos selecionados
      if (webhook.selected_contacts) {
        try {
          // Processar de acordo com o formato recebido
          let rawContacts = typeof webhook.selected_contacts === 'string' 
            ? JSON.parse(webhook.selected_contacts)
            : webhook.selected_contacts;
          
          // Extrair IDs de contatos
          let contactIds = [];
          
          if (Array.isArray(rawContacts)) {
            // Formato de array: [1, 2, 3, 4]
            contactIds = rawContacts;
          } else if (typeof rawContacts === 'object' && rawContacts !== null) {
            // Formato de objeto: { '1': true, '4': true }
            contactIds = Object.keys(rawContacts)
              .filter(key => rawContacts[key] === true)
              .map(id => parseInt(id, 10)); // Converter chaves para números
          }
          
          if (isDevelopment) {
            console.log(`Webhook ${webhook.id} - formato original:`, rawContacts);
            console.log(`Webhook ${webhook.id} - IDs de contatos extraídos:`, contactIds);
          }
          
          // Buscar detalhes dos contatos
          if (contactIds.length > 0) {
            selected_contacts = await getSelectedContacts(contactIds);
            
            if (isDevelopment) {
              console.log(`Obteve ${selected_contacts.length} contatos do banco:`, 
                selected_contacts.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone })));
            }
          } else {
            if (isDevelopment) {
              console.log(`Nenhum ID de contato válido encontrado em:`, rawContacts);
            }
          }
        } catch (error) {
          console.error('Erro ao processar contatos selecionados:', error);
        }
      }
      
      // Se não há contatos, retornar erro
      if (!selected_contacts || selected_contacts.length === 0) {
        return {
          success: false,
          error: 'Nenhum contato selecionado para este webhook SlingFlow'
        };
      }
      
      const allResponses = [];
      
      // Enviar para cada contato individualmente
      for (const contato of selected_contacts) {
        if (!contato.telefone) {
          allResponses.push({
            contact_id: contato.id,
            contact_name: contato.nome,
            success: false,
            error: 'Contato não possui número de telefone'
          });
          continue;
        }
        
        try {
          // Payload completo para SlingFlow com este contato, incluindo detalhes dos tanques
          const slingPayload = {
            numero: contato.telefone,
            mensagem: `ALERTA FUELOGIC: Água detectada em ${tanquesComAgua.length} tanque(s). Detalhes a seguir:`,
            alertas: tanquesComAgua.map(tanque => ({
              cliente: tanque.Cliente,
              unidade: tanque.Unidade,
              tanque: tanque.Tanque,
              produto: tanque.Produto,
              quantidade_agua: tanque.QuantidadeDeAgua.toFixed(1) + 'L',
              data_medicao: new Date(tanque.DataMedicao).toLocaleDateString('pt-BR')
            }))
          };
          
          if (isDevelopment) {
            console.log(`Enviando alerta SlingFlow para ${contato.nome} (${contato.telefone}):`);
            console.log(slingPayload);
          }
          
          // Enviar requisição POST para o URL do webhook
          const response = await axios.post(
            webhook.url,
            slingPayload,
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
              validateStatus
            }
          );
          
          allResponses.push({
            contact_id: contato.id,
            contact_name: contato.nome,
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            data: response.data
          });
        } catch (error) {
          allResponses.push({
            contact_id: contato.id,
            contact_name: contato.nome,
            success: false,
            error: error.message
          });
        }
      }
      
      // Calcular resultado geral baseado nas entregas individuais
      const sucessos = allResponses.filter(r => r.success).length;
      
      return {
        success: sucessos > 0,
        type: 'slingflow_multi',
        message: `${sucessos} de ${allResponses.length} contatos notificados com sucesso`,
        contacts: allResponses
      };
    } 
    // Tipo de integração desconhecido
    else {
      return {
        success: false,
        error: `Tipo de integração desconhecido: ${webhook.integration}`
      };
    }
  } catch (error) {
    if (isDevelopment) {
      console.error(`Erro ao entregar webhook ${webhook.id}:`, error);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Enviar alerta de inspeção para todos os webhooks configurados do tipo 'inspection_alert'
router.post('/send', authenticateToken, async (req, res) => {
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  try {
    if (isDevelopment) {
      console.log('=== REQUISIÇÃO DE ALERTA DE INSPEÇÃO RECEBIDA ===');
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    
    // Verificar se há dados de tanque no corpo da requisição
    const { tankData } = req.body;
    
    if (!tankData || !Array.isArray(tankData) || tankData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados de tanque inválidos ou não fornecidos'
      });
    }

    // Filtrar tanques com água detectada (quantidade de água > 0)
    const tanquesComAgua = tankData.filter(tanque => {
      const quantidade = parseFloat(tanque.QuantidadeDeAgua);
      return !isNaN(quantidade) && quantidade > 0;
    });

    if (isDevelopment) {
      console.log(`Tanques filtrados com água: ${tanquesComAgua.length} de ${tankData.length}`);
    }

    if (tanquesComAgua.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum tanque com água detectada para enviar alerta',
        resultados: []
      });
    }

    // Buscar webhooks do tipo 'inspection_alert'
    const webhooks = await getWebhooksByType('inspection_alert');
    
    if (isDevelopment) {
      console.log(`Webhooks encontrados: ${webhooks.length}`);
      console.log(webhooks.map(w => ({ id: w.id, name: w.name })));
    }
    
    if (!webhooks || webhooks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum webhook de alerta de inspeção configurado'
      });
    }

    // Processar todos os webhooks de alerta de inspeção encontrados
    const resultadosPromises = webhooks.map(async (webhook) => {
      console.log(`Processando webhook ${webhook.id} - ${webhook.name}`);
      console.log('Dados completos do webhook:', { 
        id: webhook.id, 
        name: webhook.name,
        url: webhook.url,
        integration: webhook.integration,
        selected_contacts_raw: webhook.selected_contacts,
        selected_contacts_type: typeof webhook.selected_contacts,
        selected_contacts_isArray: Array.isArray(webhook.selected_contacts),
      });
      
      // Se selected_contacts for uma string, tentar serializar
      if (typeof webhook.selected_contacts === 'string') {
        try {
          console.log('selected_contacts (parsed):', JSON.parse(webhook.selected_contacts));
        } catch (e) {
          console.log('Não foi possível fazer parse de selected_contacts');
        }
      }
      
      try {
        const resultado = await deliverInspectionAlertWebhook(webhook, tanquesComAgua);
        
        return {
          webhook_id: webhook.id,
          name: webhook.name,
          success: resultado.success,
          ...(!resultado.success && { error: resultado.error || 'Erro desconhecido' }),
          ...(resultado.contacts && { contacts: resultado.contacts.length })
        };
      } catch (error) {
        return {
          webhook_id: webhook.id,
          name: webhook.name,
          success: false,
          error: error.message || 'Erro desconhecido'
        };
      }
    });

    const resultados = await Promise.all(resultadosPromises);

    // Retornar os resultados das entregas
    return res.json({
      success: true,
      message: `Alertas enviados para ${resultados.filter(r => r.success).length} de ${resultados.length} webhooks configurados`,
      resultados
    });
    
  } catch (error) {
    console.error('Erro ao processar alerta de inspeção:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
