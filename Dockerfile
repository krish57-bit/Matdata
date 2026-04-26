# Stage 1: Build the React app
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve the app with Express
FROM node:22-slim
WORKDIR /app

# Copy built files and server logic
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY server.js ./

# Install only production dependencies
RUN npm ci --omit=dev

# Set the port
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
