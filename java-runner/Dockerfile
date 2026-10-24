FROM eclipse-temurin:17-jdk-jammy

# Create non-root sandbox execution user
RUN useradd -m -s /bin/bash sandbox

# Install Node.js 20 and update npm to latest to avoid Arborist edgesOut bug
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Ensure sandbox user has full access to temporary workspaces
RUN chown -R sandbox:sandbox /tmp && chmod 777 /tmp

EXPOSE 3000
CMD ["node", "server.js"]
