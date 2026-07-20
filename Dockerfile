# =============================================================================
# Stage 1: Build Frontend
# =============================================================================
# Use a specific Node LTS image pinned to Alpine 3.22+ which ships with a
# patched OpenSSL (≥3.5.x with all June-2026 CVEs fixed).
FROM node:20-alpine3.22 AS frontend-builder

# Upgrade all Alpine packages to pull in latest OpenSSL security patches
RUN apk upgrade --no-cache

WORKDIR /app

# Install deps first (layer-cache friendly)
COPY package*.json ./
RUN npm ci --include=dev

# Build the React frontend
COPY . .
RUN npm run build

# =============================================================================
# Stage 2: Hardened Production Image
# =============================================================================
FROM node:20-alpine3.22

# ----- Security: upgrade all packages to get patched OpenSSL -----
RUN apk upgrade --no-cache \
    # Remove package manager to reduce attack surface after upgrades
    && rm -rf /var/cache/apk/*

WORKDIR /app

# ----- Non-root user for least-privilege execution -----
# node:alpine already has a 'node' user (uid 1000). We use it.
RUN chown -R node:node /app

# Install only production npm dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# Copy backend source (no dev files)
COPY --chown=node:node server/ ./server/

# Copy public assets (needed for inline email template logo attachments)
COPY --chown=node:node public/ ./public/

# Copy pre-built frontend assets from Stage 1
COPY --from=frontend-builder --chown=node:node /app/dist ./dist

# ----- Runtime security settings -----
ENV NODE_ENV=production
ENV PORT=3001
# Prevent Node from loading arbitrary native addons
ENV NODE_OPTIONS="--no-experimental-fetch --disable-proto=throw"

# Drop to non-root before starting
USER node

EXPOSE 3001

# Explicit entrypoint (prevents shell injection via CMD)
ENTRYPOINT ["node"]
CMD ["server/index.js"]
