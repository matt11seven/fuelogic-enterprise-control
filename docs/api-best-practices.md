# Boas Práticas para Desenvolvimento de APIs no Fuelogic Enterprise

Este documento foi criado com base nas experiências e lições aprendidas durante o desenvolvimento da API de configurações de thresholds. Ele serve como um guia para futuras implementações de APIs no sistema, visando reduzir problemas de integração entre frontend e backend.

## Estrutura do Backend

### 1. Migrations SQL

- **Padrão de nomenclatura**: Use `create_tabela_name.sql` para novas tabelas e `update_tabela_name.sql` para modificações.
- **Validações**: Inclua validações de dados (CHECK constraints) diretamente no SQL.
- **Relações**: Defina foreign keys com `ON DELETE` e `ON UPDATE` explícitos.
- **Comentários**: Adicione comentários explicativos em cada coluna e tabela com `COMMENT ON TABLE/COLUMN`.
- **Timestamps**: Sempre inclua colunas `created_at` e `updated_at` com triggers para atualização automática.
- **Vínculo com usuário**: Para tabelas de configuração, sempre vincule ao usuário com uma coluna `user_id`.

```sql
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    threshold_critico NUMERIC NOT NULL CHECK (threshold_critico >= 0 AND threshold_critico <= 100),
    threshold_atencao NUMERIC NOT NULL CHECK (threshold_atencao >= 0 AND threshold_atencao <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT valid_thresholds CHECK (threshold_critico < threshold_atencao)
);
```

### 2. Rotas Express

- **Nomenclatura**: Use substantivos no plural para as rotas (`/configurations` ao invés de `/config`).
- **Middleware de autenticação**: Defina como constante `authenticateToken` e importe corretamente.
- **Handlers**: Utilize funções assíncronas com try/catch em todas as rotas.
- **Validações**: Valide dados de entrada logo no início da função handler.
- **Respostas de erro**: Padronize códigos HTTP e formato das mensagens de erro.
- **Logs**: Adicione logs para facilitar o diagnóstico em produção.

```javascript
/**
 * @route GET /api/configurations
 * @desc Obter as configurações do usuário atual
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Código da rota
  } catch (error) {
    console.error('Erro em /configurations:', error);
    return res.status(500).json({ error: 'Mensagem padronizada' });
  }
});
```

## Estrutura do Frontend

### 1. Serviços de API

- **Instância Axios**: Crie uma instância separada para cada domínio de API.
- **Base URL**: Use variáveis de ambiente para a URL base e evite duplicação de prefixos.
- **Interceptores**: Configure interceptores para adicionar token em todas as requisições.
- **Tratamento de erros**: Implemente tratamento de erro consistente com fallbacks.
- **Valores padrão**: Defina constantes para valores padrão em caso de falha na API.

```typescript
// Evite duplicação de prefixos na URL
const configApi = axios.create({
  baseURL: `${BASE_URL}/configurations`, // ao invés de `${BASE_URL}/api/configurations`
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para token JWT
configApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Tratamento de erro com fallback
const getConfigurations = async (): Promise<ConfigurationSettings> => {
  try {
    const response = await configApi.get('/');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    return DEFAULT_THRESHOLDS; // Valores padrão
  }
};
```

### 2. Contextos React

- **Autenticação**: Garanta que o token JWT seja persistido separadamente no localStorage.
- **Estado global**: Use contextos para compartilhar dados entre componentes.
- **Loading states**: Implemente estados de carregamento para melhor experiência do usuário.
- **Notificações**: Use toasts para informar sucesso ou falha nas operações de API.
- **Resiliente a erros**: Implemente fallbacks para quando a API falhar.

```typescript
// Salvar token JWT separadamente
if (userData.token) {
  localStorage.setItem('token', userData.token);
}

// Tratamento de erro com notificação
try {
  // Operação de API
  toast({ title: "Sucesso", description: "Operação realizada" });
} catch (error) {
  console.error("Erro:", error);
  toast({
    title: "Erro",
    description: "Falha na operação",
    variant: "destructive"
  });
}
```

## Autenticação e Segurança

1. **JWT**: 
   - Armazene o token separadamente no localStorage.
   - Configure o middleware corretamente no backend.
   - Envie o token em todas as requisições autenticadas.

2. **Validações**:
   - Valide os dados tanto no frontend quanto no backend.
   - Implemente validações específicas para cada tipo de dado.

3. **Erros**:
   - Use códigos HTTP adequados (401 para não autenticado, 403 para não autorizado, etc).
   - Forneça mensagens de erro úteis mas sem expor detalhes sensíveis do sistema.

## Padrões de Comunicação

1. **Respostas de sucesso**:
   - Retorne o objeto completo após operações POST/PUT.
   - Use HTTP 200 para GET/PUT/PATCH e HTTP 201 para POST.

2. **Respostas de erro**:
   - Estrutura consistente: `{ error: 'Mensagem de erro' }`
   - Logs detalhados no servidor, mensagens amigáveis para o usuário.

3. **Fallbacks**:
   - Defina comportamentos padrão quando a API falhar.
   - Utilize constantes para valores padrão.

## Principais Erros a Evitar

1. **Middleware incorreto**: Verifique a nomenclatura do middleware de autenticação (`authenticateToken` vs `checkAuth`).

2. **URL duplicada**: Evite duplicar prefixos como `/api/` na URL base do serviço.

3. **Token JWT não persistido**: Armazene o token separadamente no localStorage, não apenas dentro do objeto usuário.

4. **Rotas sem try/catch**: Sempre utilize blocos try/catch em rotas assíncronas.

5. **Falta de validação**: Valide os dados de entrada antes de processá-los.

6. **Ausência de fallbacks**: Sempre defina comportamentos padrão para quando a API falhar.

7. **Erro 401 persistente**: Verifique se o token está sendo enviado corretamente nas requisições autenticadas.

## Checklist para Novas APIs

- [ ] Tabela criada com validações e constraints adequados
- [ ] Rotas utilizam o middleware de autenticação correto
- [ ] Serviço de frontend configurado com instância axios e interceptores
- [ ] Token JWT armazenado e recuperado corretamente
- [ ] Tratamento de erro implementado com fallbacks
- [ ] Notificações de sucesso e erro para o usuário
- [ ] Testes das rotas de API com Postman ou similar
