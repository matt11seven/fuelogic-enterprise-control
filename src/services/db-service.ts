import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

/**
 * Serviço para interagir com o banco de dados PostgreSQL
 */
class DbService {
  private pool: Pool | null = null;
  private isConnected = false;
  
  /**
   * Inicializa a conexão com o banco de dados
   */
  async connect() {
    if (this.isConnected) return;
    
    try {
      this.pool = new Pool({
        host: import.meta.env.DB_HOST || 'localhost',
        port: parseInt(import.meta.env.DB_PORT || '5432'),
        database: import.meta.env.DB_NAME || 'fuelogic_enterprise',
        user: import.meta.env.DB_USER || 'postgres',
        password: import.meta.env.DB_PASSWORD,
        ssl: false, // Ative se necessário para conexões externas
      });
      
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
    }
  }
  
  /**
   * Autentica um usuário e retorna seus dados
   */
  async authenticateUser(username: string, password: string): Promise<{
    id: string;
    username: string;
    email: string | null;
    role: string;
    apiKey: string | null;
  } | null> {
    if (!this.pool) await this.connect();
    
    try {
      const query = `
        SELECT u.id, u.username, u.email, u.password_hash, u.api_key, r.name as role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = $1 AND u.is_active = true
      `;
      
      const result = await this.pool!.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null; // Usuário não encontrado
      }
      
      const user = result.rows[0];
      
      // Comparar senha (na aplicação real, use bcrypt.compare)
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return null; // Senha incorreta
      }
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        apiKey: user.api_key
      };
    } catch (error) {
      console.error('Erro ao autenticar usuário:', error);
      throw new Error('Falha na autenticação');
    }
  }
  
  /**
   * Busca a API key do usuário master
   */
  async getMasterApiKey(): Promise<string | null> {
    if (!this.pool) await this.connect();
    
    try {
      const masterUsername = import.meta.env.MASTER_USERNAME || 'admin';
      
      const query = `
        SELECT api_key FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE username = $1 AND roles.name = 'admin' AND is_active = true
      `;
      
      const result = await this.pool!.query(query, [masterUsername]);
      
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
  async logAccess(userId: string, action: string, ipAddress?: string, userAgent?: string) {
    if (!this.pool) await this.connect();
    
    try {
      const query = `
        INSERT INTO access_logs (user_id, action, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `;
      
      await this.pool!.query(query, [userId, action, ipAddress || null, userAgent || null]);
    } catch (error) {
      console.error('Erro ao registrar log de acesso:', error);
    }
  }
}

// Exporta uma instância única do serviço de banco
export const dbService = new DbService();
