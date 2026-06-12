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
ENV PORT=10000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/next.config.js ./next.config.js

EXPOSE 10000

CMD ["npm", "run", "start"]
