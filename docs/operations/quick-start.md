# Badminton SaaS Platform - Quick Start Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 22+
- pnpm 10+

## Development Setup

1. Clone the repository:
```bash
git clone git@github.com:6634284/badminton-system-mimo.git
cd badminton-system-mimo
```

2. Start infrastructure:
```bash
docker compose up -d
```

3. Setup backend:
```bash
cd server
pnpm install
npx prisma generate
npx prisma db push
npx prisma db seed
pnpm run start:dev
```

4. Setup admin panel:
```bash
cd admin-web
pnpm install
pnpm run dev
```

5. Setup client (H5):
```bash
cd client-taro
pnpm install
npx taro build --type h5 --watch
```

## Production Deployment

1. Configure environment:
```bash
cp .env.example .env
# Edit .env with production values
```

2. Deploy with Docker Compose:
```bash
docker compose -f docker-compose.prod.yml up -d
```

3. Run database migrations:
```bash
docker compose -f docker-compose.prod.yml exec admin-api npx prisma migrate deploy
```

## Default Credentials
- Admin: admin / admin123
- Test Tenant: tenant1 / tenant123

## API Documentation
- Client API: http://localhost:3000/docs
- Admin API: http://localhost:3001/docs

## Key URLs
- Admin Panel: http://localhost:8080
- Client H5: http://localhost:4001
