FROM eclipse-temurin:17-jdk-jammy

# Create non-root sandbox execution user
RUN useradd -m -s /bin/bash sandbox

# Install Node.js 22 LTS
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy files from the build context
COPY . .

# Universal context handler:
# If built from repository root (Root Directory was left blank on Render),
# promote java-runner files directly to /app
RUN if [ -d "java-runner" ]; then \
      cp -rf java-runner/* /app/; \
    fi

# Clean install of runtime dependencies (cors and express)
RUN npm install cors express --omit=dev --no-audit --no-fund

# Ensure sandbox user has full access to temporary execution workspaces
RUN chown -R sandbox:sandbox /tmp && chmod 777 /tmp

# Build-time assertion: verify server.js is ready at /app/server.js
RUN test -f /app/server.js || (echo "FATAL: /app/server.js missing" && exit 1)

EXPOSE 3000

CMD ["node", "server.js"]
