# STAGE 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency catalogs
COPY package*.json tsconfig.json ./

# Install all development and production dependencies
RUN npm ci

# Copy the TypeScript source tree
COPY src ./src

# Compile TypeScript into JavaScript (output usually targetted to /dist)
RUN npm run build

# STAGE 2: Production Runtime Stage
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy catalog files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript outputs from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose backend port
EXPOSE 5000

# Run the backend using node
CMD ["node", "dist/app.js"]
