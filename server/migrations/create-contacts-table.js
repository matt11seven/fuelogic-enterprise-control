/**
 * Migração para criar a tabela de contatos
 */
const db = require('../db');

async function createContactsTable() {
  try {
    // Verifica se a tabela já existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'contatos'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      // Cria a tabela de contatos
      await db.query(`
        CREATE TABLE contatos (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          nome VARCHAR(255) NOT NULL,
          telefone VARCHAR(20) NOT NULL,
          documento VARCHAR(20),
          email VARCHAR(100),
          nome_auxiliar VARCHAR(255),
          tipo VARCHAR(50) NOT NULL,
          observacoes TEXT,
          status VARCHAR(20) DEFAULT 'ativo',
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deletado_em TIMESTAMP WITH TIME ZONE
        );
      `);
      
      // Cria índices para melhorar a performance de buscas
      await db.query(`
        CREATE INDEX idx_contatos_user_id ON contatos(user_id);
        CREATE INDEX idx_contatos_nome ON contatos(nome);
        CREATE INDEX idx_contatos_telefone ON contatos(telefone);
        CREATE INDEX idx_contatos_tipo ON contatos(tipo);
        CREATE INDEX idx_contatos_status ON contatos(status);
      `);
      
      console.log('Tabela de contatos criada com sucesso!');
    } else {
      console.log('Tabela de contatos já existe.');
    }
  } catch (error) {
    console.error('Erro ao criar tabela de contatos:', error);
    throw error;
  }
}

module.exports = { createContactsTable };
