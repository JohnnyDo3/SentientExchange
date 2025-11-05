# Custom Dockerfile to override Nixpacks and disable cache mounts
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install ALL dependencies including devDependencies (needed for build)
RUN npm ci --include=dev
RUN cd web && npm ci --include=dev

# Copy source
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production
RUN cd web && npm prune --production

# Start
CMD ["node", "start-railway.js"]
