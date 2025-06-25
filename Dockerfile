FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Construir aplicação
RUN npm run build

# Instalar servidor para servir conteúdo estático
RUN npm install -g serve

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["serve", "-s", "dist", "-l", "3000"]