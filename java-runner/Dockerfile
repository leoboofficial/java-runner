FROM eclipse-temurin:17-jdk-jammy

# Create non-root sandbox execution user
RUN useradd -m -s /bin/bash sandbox

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Set execution sandbox permissions
RUN chown -R sandbox:sandbox /tmp

EXPOSE 3000
CMD ["node", "server.js"]
