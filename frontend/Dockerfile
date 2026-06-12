# STAGE 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# STAGE 2: Production Execution Stage
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors and install production-only dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled NextJS distribution and static assets from builder stage
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public

EXPOSE 3000

# Start Next.js server in production mode
CMD ["npm", "run", "start"]
