# Dockerfile para la API de UGEL Talara
FROM node:18-alpine

# Instalar dependencias del sistema necesarias para algunas librerías nativas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    wget

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para uploads si no existe
RUN mkdir -p uploads/anexos uploads/profiles uploads/curriculum

# Exponer puerto
EXPOSE 9000

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]

