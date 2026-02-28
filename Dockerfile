# Use Node.js 18 alpine for a small, secure base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code and necessary directories
COPY src ./src
COPY scripts ./scripts
COPY server.js ./
COPY .sequelizerc ./

# Create necessary directories
RUN mkdir -p logs uploads temp

# Expose the API port
EXPOSE 5050

# Environmental defaults (can be overridden by docker-compose)
ENV NODE_ENV=production
ENV PORT=5050

# Health check to ensure the service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5050/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
