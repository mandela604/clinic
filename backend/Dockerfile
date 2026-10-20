FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY backend/ ./backend/
COPY public/ ./public/
COPY services/ ./services/
COPY data/ ./data/
WORKDIR /app/backend
EXPOSE 5001
CMD ["node", "server.js"]
