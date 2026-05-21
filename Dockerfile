# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Setup Production Environment
FROM node:20-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./server/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3001

# Expose the API and Web Server port
EXPOSE 3001

# Start the application
CMD ["node", "server/index.js"]
