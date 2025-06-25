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
