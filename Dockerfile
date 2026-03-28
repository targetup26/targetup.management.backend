FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the API port
EXPOSE 5050

# Run the backend
CMD ["node", "server.js"]
