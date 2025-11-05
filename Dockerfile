# Custom Dockerfile to override Nixpacks and disable cache mounts
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies WITHOUT cache
RUN npm ci --no-cache
RUN cd web && npm ci --no-cache

# Copy source
COPY . .

# Build WITHOUT cache mounts
ENV NODE_ENV=production
RUN npm run build

# Start
CMD ["node", "start-railway.js"]
