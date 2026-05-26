# Production Deployment Checklist

## Pre-Deploy

### Infrastructure
- [ ] PostgreSQL 16 provisioned with replication
- [ ] Redis 7 provisioned with persistence (AOF + RDB)
- [ ] MinIO/S3 bucket created for file storage
- [ ] DNS configured for api.example.com, admin.example.com, m.example.com
- [ ] TLS certificates issued (Let's Encrypt or cloud-managed)
- [ ] K8s cluster ready (3+ nodes, autoscaling enabled)

### Secrets & Config
- [ ] `JWT_SECRET` - 64+ char random string
- [ ] `JWT_REFRESH_SECRET` - different 64+ char random string
- [ ] `DATABASE_URL` - production PG connection string with SSL
- [ ] `REDIS_URL` - production Redis URL with password
- [ ] `ENCRYPTION_KEY` - 32-byte hex for AES-GCM
- [ ] `WECHAT_APP_ID` / `WECHAT_APP_SECRET` - approved mini-program
- [ ] `WECHAT_MCH_ID` / `WECHAT_API_V3_KEY` / `WECHAT_SERIAL_NO` / `WECHAT_PRIVATE_KEY` - merchant account
- [ ] `MINIO_*` credentials configured
- [ ] All secrets stored in K8s Secrets (not ConfigMaps)

### Database
- [ ] `pnpm prisma migrate deploy` run against production PG
- [ ] `pnpm prisma db seed` run (permissions, roles, system data)
- [ ] Indexes verified for hot queries (activity, registration, wallet)
- [ ] Connection pool sized: `connection_limit=20` per runtime

### Security
- [ ] CORS restricted to known origins
- [ ] Rate limiting configured (global + per-user + per-tenant)
- [ ] Brute force guard active on login endpoints
- [ ] WeChat Pay callback signature verification enabled
- [ ] Sensitive data (real_name, id_card, phone) encrypted at rest
- [ ] API responses masked (phone/idCard/realName auto-masked)
- [ ] No secrets in git history or Docker images

## Deploy

### Build & Push
- [ ] `docker build` all images with version tag
- [ ] Images pushed to container registry
- [ ] Image scan for critical CVEs (trivy/grype)

### K8s Apply
- [ ] ConfigMaps updated with production values
- [ ] Secrets created/updated
- [ ] Deployments applied with rolling update strategy
- [ ] HPA configured (CPU target 70%, min 2 replicas)
- [ ] PodDisruptionBudget set (minAvailable: 1)
- [ ] Ingress configured with TLS termination

### Verify
- [ ] All pods in Running state
- [ ] Health endpoints responding (`/api/admin/v1/health`, `/api/client/v1/health`)
- [ ] Swagger docs accessible at `/api/admin/v1/docs`
- [ ] Login flow works (admin + client)
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] BullMQ queues processing

## Post-Deploy

### Smoke Tests
- [ ] Admin: create activity -> publish -> view in client
- [ ] Client: register for activity -> check seat count decremented
- [ ] Admin: cancel registration -> check seat released
- [ ] Payment: test WeChat Pay sandbox transaction
- [ ] Wallet: test recharge -> credit -> debit flow

### Monitoring
- [ ] Prometheus scraping all runtimes (`/metrics`)
- [ ] Grafana dashboards imported
- [ ] Alert rules loaded (alerts.yml)
- [ ] PagerDuty/Slack alert channel configured
- [ ] Key alerts verified:
  - HighErrorRate fires on 5xx spike
  - RegistrationOverselling fires on seat anomaly
  - PaymentCallbackFailures fires on callback errors
  - ServiceDown fires on pod crash

### Observability
- [ ] Structured JSON logging (pino) -> log aggregation
- [ ] Distributed tracing (OpenTelemetry) -> Jaeger/Tempo
- [ ] Error tracking (Sentry) configured for backend + frontend
- [ ] Business metrics dashboard:
  - GMV (daily/weekly/monthly)
  - Active members
  - Registration conversion rate
  - Payment success rate

## Rollback Plan

### Immediate (< 5min)
```bash
kubectl rollout undo deployment/client-api
kubectl rollout undo deployment/admin-api
kubectl rollout undo deployment/open-api
kubectl rollout undo deployment/worker
kubectl rollout undo deployment/scheduler
```

### Database Rollback
- Prisma migrations are forward-only
- If migration causes issues: deploy previous code version that's compatible
- Critical: always test migrations on staging with production-like data

### Communication
- [ ] Incident channel created
- [ ] Status page updated
- [ ] Affected users notified (if data impact)
