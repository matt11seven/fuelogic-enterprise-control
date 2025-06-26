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

# Adicionar após WORKDIR /app e antes de copiar os arquivos
ARG VITE_TANKS_ENDPOINT
ARG VITE_API_KEY
ARG VITE_NODE_ENV=production
ARG VITE_API_BASE_URL=/api
ARG VITE_MASTER_USERNAME
ARG VITE_MASTER_PASSWORD
ARG VITE_MASTER_API_KEY
ARG PORT=3001

# E então definir como variáveis de ambiente
ENV VITE_TANKS_ENDPOINT=$VITE_TANKS_ENDPOINT
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MASTER_USERNAME=$VITE_MASTER_USERNAME
ENV VITE_MASTER_PASSWORD=$VITE_MASTER_PASSWORD
ENV VITE_MASTER_API_KEY=$VITE_MASTER_API_KEY
ENV PORT=$PORT

# Copiar todo o código fonte (ANTES do build!)
COPY . .


# Construir o frontend
RUN npm run build

# Instalar ferramentas necessárias
RUN npm install -g serve pm2

# Criar script de inicialização (método mais confiável)
RUN printf '#!/bin/sh\n\
# Iniciar o backend como um processo em segundo plano\n\
cd /app/server && pm2 start src/index.js --name backend\n\
# Iniciar o frontend\n\
cd /app && serve -s dist -l 80\n' > /app/start.sh

# Garantir permissões de execução
RUN chmod +x /app/start.sh

# Expor portas
EXPOSE 80 3001

# Verificar se o script existe e tem permissões corretas
RUN ls -la /app/start.sh

# Comando para iniciar ambos os serviços
CMD ["/bin/sh", "/app/start.sh"]
