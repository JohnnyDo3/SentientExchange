# Custom Dockerfile to override Nixpacks and disable cache mounts
FROM node:22-alpine

WORKDIR /app

# Force cache bust - change this number to force rebuild: 10
RUN echo "Cache bust: 10"

# Copy package files AND packages directory (needed for local tarball)
COPY package*.json ./
COPY web/package*.json ./web/
COPY packages/ ./packages/

# Install ALL dependencies including devDependencies (needed for build)
RUN npm ci --include=dev
RUN cd web && npm ci --include=dev

# Copy source
COPY . .

# Debug - check if types directory exists
RUN echo "=== Checking src/types directory ===" && ls -la src/types/ && echo "=== Content of errors.ts ===" && head -30 src/types/errors.ts && echo "=== tsconfig.json ===" && cat tsconfig.json

# Build the application
RUN npm run build

# Debug - check if dist was created
RUN echo "=== Checking dist directory ===" && ls -la dist/ && echo "=== Checking dist/server ===" && ls -la dist/server/

# Remove devDependencies after build to reduce image size
RUN npm prune --production
RUN cd web && npm prune --production

# Start
CMD ["node", "start-railway.js"]
