# leanamp-backend

Leanamp backend API (Fastify + TypeScript + Prisma).

## Tech Stack 🧰

- Runtime: Node.js
- API: Fastify
- Language: TypeScript
- DB: Postgres
- ORM: Prisma
- Validation: Zod
- Tests: Vitest
- Auth: Email OTP + JWT (access + refresh)
- Docs: OpenAPI + Swagger UI
- Catalog: Internal food DB + Open Food Facts + optional USDA FDC

## Architecture 🔗

- `src/app.ts` wires modules: auth, profile, food, water, training, analytics.
- `src/plugins/auth.ts` attaches `request.user` (JWT in prod, dev header in dev).
- Prisma models live in `prisma/schema.prisma`, DB access via `src/db/prisma.ts`.
- OpenAPI is generated from Zod schemas into `openapi/openapi.json`.
- Food catalog searches DB first, then Open Food Facts (cache on miss).

## Local Run 🚀

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

## API Docs 📚

- Swagger UI: http://localhost:3001/docs (set `OPENAPI_ENABLED=true`)
- JSON: http://localhost:3001/openapi.json
- Generate spec: `pnpm openapi:generate`

## Auth 🔐

- Dev mode (default): `AUTH_MODE=dev`
  - Uses `x-dev-user` or `x-user-id` header, or `AUTH_DEV_DEFAULT_EMAIL`.
- JWT mode: `AUTH_MODE=jwt`
  - `/auth/email/start` → `/auth/email/verify` → `Authorization: Bearer <token>`

## Smoke Tests ✅

```bash
# health
curl localhost:3001/health

# dev auth profile
curl localhost:3001/profile \
  -H "x-dev-user: dev@local"

# jwt auth flow (DEV_OTP_ECHO=true)
curl -X POST localhost:3001/auth/email/start \
  -H "content-type: application/json" \
  -d '{"email":"a@a.de"}'

curl -X POST localhost:3001/auth/email/verify \
  -H "content-type: application/json" \
  -d '{"email":"a@a.de","code":"REPLACE_CODE"}'

curl localhost:3001/profile \
  -H "authorization: Bearer REPLACE_ACCESS_TOKEN"

# food catalog search (dev auth)
pnpm db:seed
curl "localhost:3001/food/catalog/search?q=chicken&limit=5" \
  -H "x-dev-user: dev@local"

# USDA (optional, requires API key)
# set FOOD_CATALOG_ENABLE_USDA=true and USDA_API_KEY in .env (never commit secrets)

# scripted smoke (uses AUTH_MODE + DEV_OTP_ECHO settings)
pnpm smoke
```

## AI (Gemini) 🤖

- Enable: set `AI_ENABLED=true` and `GEMINI_API_KEY` in `.env` (never commit secrets).
- Endpoints: `/ai/insights`, `/ai/activity/estimate`, `/ai/food/describe`, `/ai/voice-to-meal`.
- No raw prompts/outputs stored; only minimal call logs.

```bash
# insights (dev auth)
curl -X POST localhost:3001/ai/insights \\
  -H "content-type: application/json" \\
  -H "x-dev-user: dev@local" \\
  -d '{"calories":{"intakeAvg":2100,"targetKcal":2200,"balanceAvg":-100},"macros":{"proteinG":140,"fatG":70,"carbsG":220,"fiberG":25},"water":{"litersAvg":2.3,"adherence":0.8},"movement":{"stepsAvg":8000,"exerciseCount":3,"strengthTrend":"up"},"weight":{"rateKgPerWeek":0.2,"volatility":0.3}}'

# activity estimate
curl -X POST localhost:3001/ai/activity/estimate \\
  -H "content-type: application/json" \\
  -H "x-dev-user: dev@local" \\
  -d '{"type":"cycling","minutes":45,"intensity":"moderate","weightKg":80}'

# voice-to-meal (text transcript)
curl -X POST localhost:3001/ai/voice-to-meal \\
  -H "content-type: application/json" \\
  -H "x-dev-user: dev@local" \\
  -d '{"text":"ate a bowl of oatmeal with banana and peanut butter","locale":"en"}'
```

## Deployment 🌍

- Render steps: `docs/deploy/render.md`
- Build: `pnpm render:build`
- Start: `sh -lc "pnpm prisma:migrate:deploy && pnpm start"`

## Notes

- Do not commit `.env` (only `.env.example`).
