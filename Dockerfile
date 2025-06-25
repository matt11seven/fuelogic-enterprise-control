FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Definir variáveis de ambiente para o build
ARG VITE_TANKS_ENDPOINT
ARG VITE_API_KEY
ENV VITE_TANKS_ENDPOINT=$VITE_TANKS_ENDPOINT
ENV VITE_API_KEY=$VITE_API_KEY

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Instalar servidor para servir conteúdo estático
RUN npm install -g serve

# Expor porta
EXPOSE 80

# Comando para iniciar a aplicação
CMD ["serve", "-s", "dist", "-l", "80"]


