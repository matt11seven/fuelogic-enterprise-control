const { Pool } = require('pg');

/**
 * Serviço para interagir com o banco de dados PostgreSQL
 */
class DbService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Inicializa a conexão com o banco de dados
   */
  async connect() {
    if (this.isConnected) return;
    
    try {
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'fuelogic_enterprise',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? true : false,
      };

      // Log de conexão apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Tentando conectar ao banco com configuração:', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          ssl: dbConfig.ssl
          // Omitindo senha por segurança
        });
      }
      
      this.pool = new Pool(dbConfig);
      
      // Testar conexão
      const client = await this.pool.connect();
      client.release();
      
      this.isConnected = true;
      console.log('Conectado ao PostgreSQL com sucesso!');
    } catch (error) {
      console.error('Erro ao conectar ao PostgreSQL:', error);
      throw new Error('Falha na conexão com o banco de dados');
    }
  }
  
  /**
   * Fecha a conexão com o pool
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
      console.log('Conexão com PostgreSQL encerrada');
    }
  }
  
  /**
   * Executa uma consulta SQL
   */
  async query(text, params) {
    if (!this.pool) await this.connect();
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Erro ao executar query:', error);
      throw error;
    }
  }

  /**
   * Autentica um usuário e retorna seus dados
   */
  async authenticateUser(username, password) {
    try {
      const query = `
        SELECT u.id, u.username, u.email, u.password_hash, u.api_key, r.name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = $1 AND u.is_active = true
      `;
      
      // Log apenas em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Executando autenticação para usuário: ${username}`);
        console.log('[DEBUG] Query SQL:', query.replace(/\s+/g, ' ').trim());
      }
      
      const result = await this.query(query, [username]);
      
      if (result.rows.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Usuário ${username} não encontrado no banco`);
        }
        return null; // Usuário não encontrado
      }
      
      // Em desenvolvimento, verificar se api_key está presente
      if (process.env.NODE_ENV === 'development') {
        const user = result.rows[0];
        console.log(`[DEBUG] Usuário ${username} encontrado. Dados retornados:`, {
          colunas: Object.keys(user),
          temApiKey: !!user.api_key
        });
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao autenticar usuário:', error);
      throw new Error('Falha na autenticação');
    }
  }
  
  /**
   * Busca a API key do usuário master
   */
  async getMasterApiKey() {
    try {
      const masterUsername = process.env.MASTER_USERNAME || 'admin';
      
      const query = `
        SELECT api_key FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE username = $1 AND roles.name = 'admin' AND is_active = true
      `;
      
      const result = await this.query(query, [masterUsername]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].api_key;
    } catch (error) {
      console.error('Erro ao buscar API key master:', error);
      return null;
    }
  }
  
  /**
   * Registra um acesso no log
   */
  async logAccess(userId, action, ipAddress, userAgent) {
    try {
      const query = `
        INSERT INTO access_logs (user_id, action, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `;
      
      await this.query(query, [userId, action, ipAddress || null, userAgent || null]);
    } catch (error) {
      console.error('Erro ao registrar log de acesso:', error);
    }
  }
}

// Exporta uma instância única do serviço de banco
module.exports = new DbService();
