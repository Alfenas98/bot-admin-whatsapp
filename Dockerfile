FROM node:20-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install yt-dlp --break-system-packages

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências Node.js
RUN npm ci --only=production

# Copiar o resto do projeto
COPY . .

# Porta do servidor HTTP (painel)
EXPOSE 8080

# Comando de início
CMD ["node", "index.js"]
