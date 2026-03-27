FROM node:20-slim AS builder

WORKDIR /app
COPY package.json ./
COPY packages/frontend/package.json packages/frontend/
RUN npm install --workspace=packages/frontend

COPY packages/frontend/ packages/frontend/
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN cd packages/frontend && npm run build

FROM node:20-slim
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/packages/frontend/dist ./dist

EXPOSE 3000
CMD ["serve", "dist", "-s", "-l", "3000"]
