FROM eclipse-temurin:17-jdk-jammy

# Create non-root sandbox execution user
RUN useradd -m -s /bin/bash sandbox

# Install Node.js 22 LTS
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy ONLY package.json to completely ignore any stale or mismatched remote lockfile
COPY package.json ./

# Clean install with legacy peer deps to eliminate any ERESOLVE conflicts
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

COPY . .

# Ensure sandbox user has full access to temporary workspaces
RUN chown -R sandbox:sandbox /tmp && chmod 777 /tmp

EXPOSE 3000
CMD ["node", "server.js"]
