/**
 * Modelo para manipulação de webhooks no banco de dados
 */
const db = require('../src/db/index');

class Webhook {
  /**
   * Busca todos os webhooks de um usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de webhooks
   */
  static async findAll(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, type, name, url, integration, selected_contacts,
          user_id, created_at, updated_at
        FROM webhooks 
        WHERE user_id = $1 
        ORDER BY name ASC, created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar webhooks:', error);
      throw error;
    }
  }

  /**
   * Busca todos os webhooks ativos de um tipo
   * @param {string} type - Tipo de webhook
   * @returns {Promise<Array>} Lista de webhooks
   */
  static async findActiveByType(type) {
    try {
      const result = await db.query(
        `SELECT 
          id, type, name, url, integration, selected_contacts, user_id
        FROM webhooks 
        WHERE type = $1 
        AND is_active = true`,
        [type]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar webhooks ativos por tipo:', error);
      throw error;
    }
  }

  /**
   * Busca um webhook por ID
   * @param {number} id - ID do webhook
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object|null>} Webhook encontrado ou null
   */
  static async findById(id, userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, type, name, url, integration, selected_contacts,
          user_id, created_at, updated_at
        FROM webhooks 
        WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar webhook por ID:', error);
      throw error;
    }
  }

  /**
   * Busca webhooks por evento
   * @param {string} event - Tipo de evento ('inspecao' ou 'pedido')
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de webhooks
   */
  static async findByType(type, userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, type, name, url, integration, selected_contacts,
          user_id, created_at, updated_at
        FROM webhooks
        WHERE type = $1 AND user_id = $2
        ORDER BY created_at DESC`,
        [type, userId]
      );
      return result.rows;
    } catch (error) {
      console.error(`Erro ao buscar webhooks por tipo ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Busca contatos internos disponíveis para o SlingFlow
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de contatos internos
   */
  static async getInternalContacts(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, nome, telefone, email, tipo
        FROM contatos 
        WHERE user_id = $1 
        AND tipo = 'interno'
        AND deleted_at IS NULL
        ORDER BY nome ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar contatos internos:', error);
      throw error;
    }
  }

  /**
   * Cria um novo webhook
   * @param {Object} webhookData - Dados do webhook
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Webhook criado
   */
  static async create(webhookData, userId) {
    try {
      // Validação para integração SlingFlow
      if (webhookData.integration === 'slingflow' && (!webhookData.selected_contacts || Object.keys(webhookData.selected_contacts).length === 0)) {
        throw new Error('É necessário selecionar pelo menos um contato interno para o SlingFlow');
      }

      // Se for SlingFlow, garantir que todos os contatos são internos
      if (webhookData.integration === 'slingflow' && webhookData.selected_contacts && Object.keys(webhookData.selected_contacts).length > 0) {
        // Aqui você implementaria uma validação para os contatos selecionados
        // como a estrutura mudou para usar selected_contacts como JSONB
      }
      
      const result = await db.query(
        `INSERT INTO webhooks 
          (type, name, url, integration, selected_contacts, user_id, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING 
          id, type, name, url, integration, selected_contacts, 
          user_id, created_at, updated_at`,
        [
          webhookData.type, 
          webhookData.name,
          webhookData.url || '', 
          webhookData.integration,
          webhookData.selected_contacts ? JSON.stringify(webhookData.selected_contacts) : null,
          userId
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar webhook:', error);
      throw error;
    }
  }

  /**
   * Atualiza um webhook existente
   * @param {number} id - ID do webhook
   * @param {Object} webhookData - Dados do webhook
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Webhook atualizado
   */
  static async update(id, webhookData, userId) {
    try {
      // Validação para integração SlingFlow
      if (webhookData.integration === 'slingflow' && (!webhookData.selected_contacts || Object.keys(webhookData.selected_contacts).length === 0)) {
        throw new Error('É necessário selecionar pelo menos um contato interno para o SlingFlow');
      }

      // Se for SlingFlow, garantir que todos os contatos são internos
      if (webhookData.integration === 'slingflow' && webhookData.selected_contacts && Object.keys(webhookData.selected_contacts).length > 0) {
        // Aqui você implementaria uma validação para os contatos selecionados
        // como a estrutura mudou para usar selected_contacts como JSONB
      }

      const result = await db.query(
        `UPDATE webhooks 
        SET 
          type = $1,
          name = $2,
          url = $3,
          integration = $4,
          selected_contacts = $5,
          updated_at = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING 
          id, type, name, url, integration, selected_contacts,
          user_id, created_at, updated_at`,
        [
          webhookData.type, 
          webhookData.name,
          webhookData.url || '', 
          webhookData.integration,
          webhookData.selected_contacts ? JSON.stringify(webhookData.selected_contacts) : null,
          id,
          userId
        ]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Webhook não encontrado ou não pertence ao usuário');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Erro ao atualizar webhook ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deleta um webhook
   * @param {number} id - ID do webhook
   * @param {number} userId - ID do usuário
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async delete(id, userId) {
    try {
      // Real delete since there is no deleted_at column
      const result = await db.query(
        `DELETE FROM webhooks 
        WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao deletar webhook:', error);
      throw error;
    }
  }

  /**
   * Busca contatos internos para seleção no SlingFlow
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de contatos internos
   */
  static async getInternalContacts(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, nome, telefone, email, tipo
        FROM contatos 
        WHERE user_id = $1 
        AND status = 'ativo'
        AND deleted_at IS NULL
        AND (classificacao = 'interno' OR classificacao IS NULL)
        ORDER BY nome ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar contatos internos:', error);
      throw error;
    }
  }
}

module.exports = Webhook;
