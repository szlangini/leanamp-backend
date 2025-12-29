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

## Step 2 Migration

```bash
pnpm prisma:generate
pnpm prisma:migrate -- --name goal_mode_bulk_fields
```

## Step 4a Local Test

```bash
curl -X POST localhost:3001/food/templates \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"name":"Oats","kcal":150,"protein":5,"fat":3,"carbs":27,"fiber":4}'

curl -X POST localhost:3001/food/meal-groups \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","title":"Breakfast","isExpanded":true}'

curl -X POST localhost:3001/food/entries \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","name":"Oats","kcal":150,"protein":5,"fat":3,"carbs":27,"fiber":4,"type":"manual"}'

curl "localhost:3001/food/entries?date=2024-01-01" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111"

curl -X POST localhost:3001/water \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","amountMl":1200}'
```

## Step 4b Local Test

```bash
curl -X POST localhost:3001/training/plan/day \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"title":"Push","emoji":":muscle:"}'

curl -X POST localhost:3001/training/plan/exercise \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dayId":"REPLACE_DAY_ID","name":"Bench Press","workingWeight":100,"targetRepsMin":5,"targetRepsMax":8,"pinned":true}'

curl -X POST localhost:3001/training/topsets \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","dayId":"REPLACE_DAY_ID","exerciseId":"REPLACE_EXERCISE_ID","weight":100,"reps":5,"sets":3,"workSets":[{"weight":95,"reps":6},{"weight":100,"reps":5}]}'

curl -X POST localhost:3001/training/completions \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","dayId":"REPLACE_DAY_ID"}'

curl -X POST localhost:3001/training/extra-activity \
  -H "content-type: application/json" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111" \
  -d '{"dateISO":"2024-01-01","type":"walk","minutes":30,"intensity":"moderate","kcalEst":120}'

curl "localhost:3001/training/plan" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111"

curl "localhost:3001/training/topsets?from=2024-01-01&to=2024-01-31" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111"
```

## Step 4c Local Test

```bash
curl "localhost:3001/analytics/summary?range=7" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111"

curl "localhost:3001/analytics/strength-trends?range=30" \
  -H "x-dev-user: 11111111-1111-1111-1111-111111111111"
```

## OpenAPI

```bash
pnpm openapi:generate
```

OpenAPI JSON: `openapi/openapi.json`  
Swagger UI: http://localhost:3001/docs
