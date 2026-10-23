FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate --schema=prisma/schema.sqlite.prisma
COPY src ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
