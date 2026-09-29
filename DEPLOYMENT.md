# Production Deployment Guide

## 1. Docker Compose (Turnkey Production Deployment)

The repository provides a turnkey Docker Compose configuration (`docker-compose.yml`) containing:
- Next.js 16 Web Application (multi-stage build)
- PostgreSQL 16 (persistent volume, healthchecked)
- Redis 7 (in-memory cache & job broker)

### Deployment Steps:
```bash
# 1. Clone repository
git clone <repository_url>
cd "SE PR"

# 2. Configure production environment
cp .env.example .env.production
# Edit JWT_SECRET and production variables

# 3. Launch stack
docker-compose up -d --build

# 4. Run database seed (initial launch only)
docker-compose exec app npm run seed
```

---

## 2. Vercel & Managed Cloud Services

### A. Database
- Provision a managed PostgreSQL instance (Neon, Supabase, AWS RDS, or Render).
- Copy the connection string to `DATABASE_URL`.

### B. Redis (Optional)
- Provision Upstash Redis or AWS ElastiCache.
- Set `REDIS_URL`. If omitted, the internal in-memory engine handles session caches and rate limiting.

### C. Vercel Deployment
```bash
vercel --prod
```
Set environment variables in the Vercel dashboard:
- `DATABASE_URL`
- `JWT_SECRET`
- `PAYMENT_PROVIDER` (e.g., `STRIPE` or `DEV_SANDBOX`)
- `STRIPE_SECRET_KEY` (if using Stripe)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (if using Razorpay)
