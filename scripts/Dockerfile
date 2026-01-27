# TrustWave Song Importer - Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the script
COPY import-songs-background.js ./

# Create checkpoint directory
RUN mkdir -p /app/data

# Run the script
CMD ["node", "import-songs-background.js"]
