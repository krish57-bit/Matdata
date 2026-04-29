# Stage 1: Build
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# Debug (IMPORTANT)
RUN ls -la /app
RUN ls -la /app/dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]