# ---- build stage: minify src/ into dist/ ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY src/ ./src/
COPY build.sh ./
RUN apk add --no-cache bash python3 \
  && npm install -g terser clean-css-cli html-minifier-terser --silent \
  && bash build.sh

# ---- serve stage: static nginx ----
FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
