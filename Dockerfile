FROM node:18-slim

WORKDIR /usr/src/app

# Set environment variables
ENV PROJECT_ID=civil-forge-403609

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . ./

EXPOSE 8080

# Use node directly to ensure proper signal handling
CMD [ "node", "src/server.js" ]