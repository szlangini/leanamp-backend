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

- DATABASE_URL
- NODE_ENV=production
- AUTH_MODE=jwt
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- JWT_ACCESS_TTL_SECONDS
- JWT_REFRESH_TTL_SECONDS
- OTP_TTL_SECONDS
- OPENAPI_ENABLED=false
- DEV_OTP_ECHO=false

## Notes

- Use the Render Postgres internal URL for DATABASE_URL.
- Secrets must be configured in Render, not in the repo.
