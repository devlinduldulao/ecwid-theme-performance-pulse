FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 3000

CMD ["node", "src/server/index.js"]
