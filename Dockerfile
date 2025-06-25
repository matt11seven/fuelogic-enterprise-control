FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de configuração primeiro (para aproveitar o cache de layers)
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar dependências do frontend
RUN npm ci

# Instalar dependências do backend
WORKDIR /app/server
RUN npm ci

# Voltar para o diretório principal
WORKDIR /app

# Copiar todo o código fonte (ANTES do build!)
COPY . .

# Configurações de build não-sensíveis com valores padrão
ENV NODE_ENV=production
ENV PORT=3001
ENV VITE_API_BASE_URL=http://localhost:3001
ENV VITE_NODE_ENV=production

# Construir o frontend
RUN npm run build

# Instalar ferramentas necessárias
RUN npm install -g serve pm2

# Criar script de inicialização que recebe variáveis como argumentos
RUN echo '#!/bin/sh\n\
# Exportar variáveis de ambiente do arquivo .env se existir\n\
if [ -f "/app/.env" ]; then\n\
  echo "Carregando variáveis de ambiente do arquivo .env"\n\
  export $(grep -v "^#" /app/.env | xargs)\n\
fi\n\
\n\
# Iniciar o backend como um processo em segundo plano\n\
cd /app/server && NODE_ENV=$NODE_ENV \\\n\
  DB_HOST=$DB_HOST \\\n\
  DB_PORT=$DB_PORT \\\n\
  DB_NAME=$DB_NAME \\\n\
  DB_USER=$DB_USER \\\n\
  DB_PASSWORD=$DB_PASSWORD \\\n\
  JWT_SECRET=$JWT_SECRET \\\n\
  JWT_EXPIRES_IN=$JWT_EXPIRES_IN \\\n\
  MASTER_USERNAME=$MASTER_USERNAME \\\n\
  MASTER_PASSWORD=$MASTER_PASSWORD \\\n\
  MASTER_API_KEY=$MASTER_API_KEY \\\n\
  PORT=$PORT \\\n\
  pm2 start src/index.js --name backend\n\
\n\
# Iniciar o frontend\n\
cd /app && serve -s dist -l 80\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expor portas
EXPOSE 80 3001

# Comando para iniciar ambos os serviços
# Importante: As variáveis de ambiente serão lidas do arquivo .env ou definidas na execução do container
CMD ["/app/start.sh"]
