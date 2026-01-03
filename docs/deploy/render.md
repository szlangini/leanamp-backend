# Render Deployment

## Setup

1) Create a new Web Service from GitHub.
2) Build Command:
   pnpm render:build
3) Start Command:
   sh -lc "pnpm prisma:migrate:deploy && pnpm start"
4) Health Check Path:
   /health

## Environment Variables

Required
- NODE_ENV=production
- PORT (Render sets this automatically)
- DATABASE_URL
- DIRECT_URL
- AUTH_MODE=jwt
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Optional / feature flags
- AI_ENABLED=false (set true to enable)
- GEMINI_API_KEY (required if AI_ENABLED=true)
- FOOD_CATALOG_ENABLE_USDA=false (set true to enable)
- USDA_API_KEY (required if FOOD_CATALOG_ENABLE_USDA=true)
- OPENAPI_ENABLED=false
- DEV_OTP_ECHO=false
- CORS_ENABLED=true
- ALLOWED_ORIGINS="https://your-frontend.example"

## Notes

- Use the Render Postgres internal URL for DATABASE_URL and DIRECT_URL.
- Secrets must be configured in Render, not in the repo.
