# Multi-stage build para Next.js
FROM node:18-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild do código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de build - precisam ser declarados ANTES de serem usados
# O browser sempre fala com /api (mesma origem). BACKEND_URL é o destino real do
# rewrite e fica só no servidor — precisa existir no BUILD porque rewrites() é
# avaliado em build time e gravado no routes-manifest.
ARG NEXT_PUBLIC_API_URL=/api
ARG BACKEND_URL=http://localhost:8080

# Definir variáveis de ambiente ANTES do build
# NEXT_PUBLIC_* são embutidas no bundle durante o build, não em runtime
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Fazer build da aplicação
RUN npm run build

# Imagem de produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Definir permissões corretas para cache pré-renderizado
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar arquivos de build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para executar a aplicação
CMD ["node", "server.js"]