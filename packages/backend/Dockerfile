# Estágio 1: Construção (Build)
FROM node:20-slim AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copia o código fonte e realiza o build
COPY ./src ./src
RUN npm run build

# Estágio 2: Produção (Run)
FROM node:20-slim

WORKDIR /app

# Instala apenas dependências de produção para economizar espaço
COPY package*.json ./
RUN npm install --only=production

# Copia apenas o código transpilado do estágio anterior
COPY --from=builder /app/dist ./dist

# Cria o diretório onde os arquivos grandes serão armazenados
# No Linux, o volume deve ser mapeado para cá
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

EXPOSE 1080

# Variável de ambiente para definir o diretório de storage
ENV STORAGE_PATH=/app/uploads

CMD ["node", "dist/server.js"]