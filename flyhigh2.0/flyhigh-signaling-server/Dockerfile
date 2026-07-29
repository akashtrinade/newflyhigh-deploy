# ── Signaling Server Dockerfile (local dev only) ──
# This targets server.js with Socket.IO for local development.
# For AWS Lambda production deployment, use lambda.js instead
# (deployed via CDK in ../infra/, not this Dockerfile).
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1
CMD ["node", "server.js"]
