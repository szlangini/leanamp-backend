# leanamp-backend

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev
curl localhost:3001/health
```

## DB Smoke Test

```bash
pnpm db:up
cp .env.example .env
pnpm prisma:generate
pnpm prisma:studio
```
