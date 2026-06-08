FROM node:20-alpine

WORKDIR /app

# Install SQLite build dependencies for sqlite3 npm package
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory for SQLite database (with proper permissions)
RUN mkdir -p /app/data && chmod -R 777 /app/data

# Expose agent server port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start the agent server
CMD ["node", "index.js"]
