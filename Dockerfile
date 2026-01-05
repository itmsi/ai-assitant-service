FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs public storages

# Expose port (sesuaikan dengan APP_PORT di environment variable)
# Default 9565 untuk production, bisa diubah via environment variable
EXPOSE 9587

# Start application
CMD ["node", "src/server.js"]

