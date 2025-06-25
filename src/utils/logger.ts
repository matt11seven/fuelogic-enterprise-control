/**
 * Utilitário para gerenciar logs na aplicação
 * Só mostra logs quando VITE_NODE_ENV está definido como 'development'
 */

const isDevelopment = import.meta.env.VITE_NODE_ENV === 'development';

export const logger = {
  /**
   * Exibe uma mensagem informativa (apenas em desenvolvimento)
   * @param message Mensagem ou objeto a ser exibido
   * @param optionalParams Parâmetros adicionais
   */
  log: (message: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      console.log(message, ...optionalParams);
    }
  },

  /**
   * Exibe uma mensagem de aviso (apenas em desenvolvimento)
   * @param message Mensagem ou objeto a ser exibido
   * @param optionalParams Parâmetros adicionais 
   */
  warn: (message: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      console.warn(message, ...optionalParams);
    }
  },

  /**
   * Exibe uma mensagem de erro (sempre exibida, mesmo em produção)
   * @param message Mensagem ou objeto a ser exibido
   * @param optionalParams Parâmetros adicionais
   */
  error: (message: any, ...optionalParams: any[]) => {
    // Erros são sempre exibidos, mesmo em produção
    console.error(message, ...optionalParams);
  },

  /**
   * Exibe informações detalhadas (apenas em desenvolvimento)
   * @param message Mensagem ou objeto a ser exibido
   * @param optionalParams Parâmetros adicionais
   */
  debug: (message: any, ...optionalParams: any[]) => {
    if (isDevelopment) {
      console.debug(message, ...optionalParams);
    }
  },

  /**
   * Exibe uma tabela formatada (apenas em desenvolvimento)
   * @param data Os dados tabulares
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

export default logger;
