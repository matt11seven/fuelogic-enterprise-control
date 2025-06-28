/**
 * Modelo para manipulação de contatos no banco de dados
 */
const db = require('../src/db/index');

class Contact {
  /**
   * Busca todos os contatos de um usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de contatos
   */
  static async findAll(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em
        FROM contatos 
        WHERE user_id = $1 
        AND deletado_em IS NULL
        ORDER BY nome ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      throw error;
    }
  }

  /**
   * Busca um contato pelo ID
   * @param {number} id - ID do contato
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object|null>} Contato encontrado ou null
   */
  static async findById(id, userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em
        FROM contatos 
        WHERE id = $1 AND user_id = $2 AND deletado_em IS NULL`,
        [id, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar contato por ID:', error);
      throw error;
    }
  }

  /**
   * Busca contatos por termo de pesquisa
   * @param {string} searchTerm - Termo a ser pesquisado
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de contatos
   */
  static async search(searchTerm, userId) {
    try {
      const term = `%${searchTerm.toLowerCase()}%`;
      const result = await db.query(
        `SELECT 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em
        FROM contatos 
        WHERE user_id = $1 
        AND deletado_em IS NULL
        AND (
          LOWER(nome) LIKE $2 OR 
          LOWER(nome_auxiliar) LIKE $2 OR 
          telefone LIKE $2 OR 
          LOWER(email) LIKE $2
        )
        ORDER BY nome ASC`,
        [userId, term]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao pesquisar contatos:', error);
      throw error;
    }
  }

  /**
   * Filtra contatos por tipo
   * @param {string} tipo - Tipo de contato
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} Lista de contatos
   */
  static async filterByType(tipo, userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em
        FROM contatos 
        WHERE user_id = $1 AND tipo = $2 AND deletado_em IS NULL
        ORDER BY nome ASC`,
        [userId, tipo]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao filtrar contatos por tipo:', error);
      throw error;
    }
  }

  /**
   * Cria um novo contato
   * @param {Object} contactData - Dados do contato
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Contato criado
   */
  static async create(contactData, userId) {
    try {
      const { nome, telefone, documento, email, nome_auxiliar, tipo, observacoes, status } = contactData;
      
      const result = await db.query(
        `INSERT INTO contatos (
          user_id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em`,
        [userId, nome, telefone, documento || null, email || null, 
          nome_auxiliar || null, tipo, observacoes || null, status || 'ativo']
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw error;
    }
  }

  /**
   * Atualiza um contato existente
   * @param {number} id - ID do contato
   * @param {Object} contactData - Dados do contato
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Contato atualizado
   */
  static async update(id, contactData, userId) {
    try {
      const { nome, telefone, documento, email, nome_auxiliar, tipo, observacoes, status } = contactData;
      
      const result = await db.query(
        `UPDATE contatos 
        SET 
          nome = $1,
          telefone = $2,
          documento = $3,
          email = $4,
          nome_auxiliar = $5,
          tipo = $6,
          observacoes = $7,
          status = $8,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $9 AND user_id = $10 AND deletado_em IS NULL
        RETURNING 
          id, nome, telefone, documento, email, nome_auxiliar, 
          tipo, observacoes, status, criado_em, atualizado_em`,
        [nome, telefone, documento || null, email || null, 
          nome_auxiliar || null, tipo, observacoes || null, status || 'ativo',
          id, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Contato não encontrado ou sem permissão para editar');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      throw error;
    }
  }

  /**
   * Realiza soft delete em um contato (marca como deletado)
   * @param {number} id - ID do contato
   * @param {number} userId - ID do usuário
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async delete(id, userId) {
    try {
      const result = await db.query(
        `UPDATE contatos 
        SET deletado_em = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND deletado_em IS NULL
        RETURNING id`,
        [id, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
      throw error;
    }
  }

  /**
   * Importa contatos a partir de dados CSV
   * @param {Array} contacts - Lista de contatos a serem importados
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Resultados da importação
   */
  static async importContacts(contacts, userId) {
    const client = await db.getClient();
    const results = { 
      success: 0, 
      failed: 0, 
      failures: [] 
    };
    
    try {
      await client.query('BEGIN');
      
      for (const contact of contacts) {
        try {
          const { nome, telefone, documento, email, nome_auxiliar, tipo, observacoes, status } = contact;
          
          // Validação básica
          if (!nome || !telefone || !tipo) {
            throw new Error('Campos obrigatórios ausentes');
          }
          
          await client.query(
            `INSERT INTO contatos (
              user_id, nome, telefone, documento, email, nome_auxiliar, 
              tipo, observacoes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [userId, nome, telefone, documento || null, email || null, 
              nome_auxiliar || null, tipo, observacoes || null, status || 'ativo']
          );
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.failures.push({
            contact: contact.nome,
            error: error.message
          });
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao importar contatos:', error);
      throw error;
    } finally {
      client.release();
    }
    
    return results;
  }
}

module.exports = Contact;
