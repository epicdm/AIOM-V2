# 🚀 Integration Plan: Dev → Production

**Timeline**: 3-5 days  
**Approach**: Phased implementation with minimal refactoring  
**Risk**: Low-Medium (small, safe changes only)

---

## Phase 1: Foundation & Security (Day 1 - CRITICAL)
**Goal**: Make app deployable and secure  
**Effort**: 6-8 hours  
**Risk**: Low

### Tasks

#### 1.1 Environment Configuration ⚡ BLOCKER
- **File**: `src/config/env-validator.ts` (NEW)
- **Action**: Create Zod schema to validate all required env vars at startup
- **Why**: Prevent app from starting with invalid configuration
- **Verify**: `npm run build` should fail if required vars missing

#### 1.2 Security Headers
- **File**: `vite.config.ts`
- **Action**: Add security headers middleware
- **Why**: Protect against XSS, clickjacking, MIME sniffing
- **Headers**: CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- **Verify**: Check headers with `curl -I http://localhost:3000`

#### 1.3 Enhanced Health Check
- **File**: `src/routes/api/monitoring/health-check.ts`
- **Action**: Add DB connection check, Redis check, external service checks
- **Why**: Monitor service health in production
- **Verify**: `curl http://localhost:3000/api/monitoring/health-check`

#### 1.4 Rate Limiting Fallback
- **File**: `src/lib/rate-limiter/index.ts`
- **Action**: Add in-memory fallback when Redis unavailable
- **Why**: Protect API even if Redis is down
- **Verify**: Test with Redis stopped

#### 1.5 CI/CD Pipeline ⚡ BLOCKER
- **File**: `.github/workflows/ci.yml` (NEW)
- **Action**: Create GitHub Actions workflow
- **Steps**: Install deps → Lint → Type check → Build → Test
- **Why**: Automate quality checks before merge
- **Verify**: Push to GitHub and check Actions tab

---

## Phase 2: Validation & Error Handling (Day 2)
**Goal**: Robust input validation and error tracking  
**Effort**: 6-8 hours  
**Risk**: Low

### Tasks

#### 2.1 API Input Validation
- **Files**: All `src/routes/api/**/*.ts` files (45+ files)
- **Action**: Add Zod schemas for request validation
- **Pattern**: 
  ```typescript
  const schema = z.object({ ... });
  const body = schema.parse(await request.json());
  ```
- **Priority**: Start with auth, payments, user-facing endpoints
- **Why**: Prevent invalid data, security vulnerabilities
- **Verify**: Test with invalid payloads

#### 2.2 Error Monitoring Setup
- **File**: `src/lib/error-tracking/sentry.ts` (NEW)
- **Action**: Integrate Sentry (or similar)
- **Config**: Add SENTRY_DSN to env vars
- **Why**: Track and debug production errors
- **Verify**: Trigger test error and check Sentry dashboard

#### 2.3 Structured Logging
- **File**: `src/lib/logger/index.ts` (NEW)
- **Action**: Create logger utility with levels (info, warn, error)
- **Replace**: All `console.log` with structured logger
- **Why**: Better production debugging
- **Verify**: Check log output format

#### 2.4 Global Error Boundary Enhancement
- **File**: `src/components/DefaultCatchBoundary.tsx`
- **Action**: Add error reporting to monitoring service
- **Why**: Catch and report React errors
- **Verify**: Trigger React error and check logs

---

## Phase 3: Testing & Quality (Day 3)
**Goal**: Automated testing for critical flows  
**Effort**: 6-8 hours  
**Risk**: Low

### Tasks

#### 3.1 Smoke Tests
- **File**: `tests/smoke.spec.ts` (NEW)
- **Tests**:
  - Homepage loads
  - Sign in flow works
  - Dashboard accessible after auth
  - API health check responds
- **Why**: Verify app basics work
- **Verify**: `npm run test`

#### 3.2 Auth Flow Tests
- **File**: `tests/auth.spec.ts` (NEW)
- **Tests**:
  - Sign up with email/password
  - Sign in with valid credentials
  - Sign in fails with invalid credentials
  - Protected routes redirect to sign-in
- **Why**: Auth is critical, must work
- **Verify**: `npm run test`

#### 3.3 API Integration Tests
- **File**: `tests/api/critical-endpoints.spec.ts` (NEW)
- **Tests**:
  - Health check returns 200
  - Auth endpoints work
  - Protected endpoints require auth
  - Rate limiting works
- **Why**: Ensure API contracts are stable
- **Verify**: `npm run test`

#### 3.4 Linting & Formatting
- **File**: `.eslintrc.json` (NEW)
- **Action**: Add ESLint config with React/TypeScript rules
- **Add**: Prettier config for consistent formatting
- **Why**: Code quality and consistency
- **Verify**: `npm run lint`

---

## Phase 4: Performance & Optimization (Day 4)
**Goal**: Optimize for production load  
**Effort**: 4-6 hours  
**Risk**: Low

### Tasks

#### 4.1 Database Indexes
- **File**: `drizzle/0037_add_performance_indexes.sql` (NEW)
- **Action**: Add indexes for common queries
- **Tables**: users, sessions, tenants, expenses, vouchers
- **Columns**: email, userId, tenantId, status, createdAt
- **Why**: Faster queries as data grows
- **Verify**: Check query plans with EXPLAIN

#### 4.2 Connection Pool Configuration
- **File**: `src/db/index.ts`
- **Action**: Configure Drizzle connection pool
- **Settings**: max: 20, min: 5, idleTimeout: 30000
- **Why**: Prevent connection exhaustion
- **Verify**: Monitor connections under load

#### 4.3 Redis Connection Resilience
- **File**: `src/lib/redis-cache/client.ts`
- **Action**: Add retry logic and circuit breaker
- **Why**: Graceful degradation when Redis fails
- **Verify**: Test with Redis down

#### 4.4 Code Splitting
- **File**: `vite.config.ts`
- **Action**: Configure manual chunks for large dependencies
- **Split**: Recharts, Radix UI, heavy libraries
- **Why**: Faster initial page load
- **Verify**: Check bundle sizes after build

---

## Phase 5: Deployment & Monitoring (Day 5)
**Goal**: Deploy to staging and set up monitoring  
**Effort**: 4-6 hours  
**Risk**: Medium

### Tasks

#### 5.1 Docker Configuration
- **File**: `Dockerfile` (NEW)
- **Action**: Create multi-stage Docker build
- **Stages**: deps → build → production
- **Why**: Consistent deployment environment
- **Verify**: `docker build -t aiom-v2 .`

#### 5.2 Docker Compose for Production
- **File**: `docker-compose.prod.yml` (NEW)
- **Services**: app, postgres, redis, nginx
- **Why**: Easy production deployment
- **Verify**: `docker-compose -f docker-compose.prod.yml up`

#### 5.3 Environment-Specific Configs
- **Files**: 
  - `.env.staging` (template)
  - `.env.production` (template)
- **Action**: Document required vars per environment
- **Why**: Clear separation of environments
- **Verify**: Review with team

#### 5.4 Deployment Scripts
- **File**: `scripts/deploy.sh` (NEW)
- **Steps**: Build → Run migrations → Start server → Health check
- **Why**: Automated, repeatable deployments
- **Verify**: Run on staging

#### 5.5 Monitoring Dashboard
- **Action**: Set up monitoring service (Sentry, Datadog, or custom)
- **Metrics**: Error rate, response time, active users
- **Alerts**: Error spikes, slow queries, service down
- **Why**: Proactive issue detection
- **Verify**: Trigger test alerts

#### 5.6 Backup Strategy
- **Action**: Configure automated PostgreSQL backups
- **Schedule**: Daily backups, 30-day retention
- **Test**: Perform backup and restore test
- **Why**: Data protection
- **Verify**: Restore from backup successfully

---

## Phase 6: Documentation & Launch Prep (Ongoing)
**Goal**: Team readiness and launch checklist  
**Effort**: 2-3 hours  
**Risk**: Low

### Tasks

#### 6.1 API Documentation
- **File**: `docs/API.md` (NEW)
- **Action**: Document all public API endpoints
- **Include**: Request/response schemas, auth requirements, examples
- **Why**: Enable integrations and mobile app development
- **Verify**: Team review

#### 6.2 Deployment Runbook
- **File**: `docs/DEPLOYMENT.md` (NEW)
- **Sections**: Prerequisites, deployment steps, rollback procedure, troubleshooting
- **Why**: Anyone can deploy safely
- **Verify**: Team review

#### 6.3 Go/No-Go Checklist
- **File**: `LAUNCH_CHECKLIST.md` (NEW)
- **Action**: Create comprehensive pre-launch checklist
- **Categories**: Security, performance, monitoring, backups, docs
- **Why**: Ensure nothing is missed
- **Verify**: Complete checklist before launch

---

## 📊 Effort Breakdown

| Phase | Effort | Risk | Blockers |
|-------|--------|------|----------|
| **Phase 1** | 6-8h | Low | Yes (P0) |
| **Phase 2** | 6-8h | Low | No |
| **Phase 3** | 6-8h | Low | No |
| **Phase 4** | 4-6h | Low | No |
| **Phase 5** | 4-6h | Medium | No |
| **Phase 6** | 2-3h | Low | No |
| **TOTAL** | 28-39h | Low-Medium | Phase 1 |

**Realistic Timeline**: 3-5 working days (one person) or 2-3 days (two people)

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ CI/CD pipeline runs on every PR
- ✅ App validates env vars at startup
- ✅ Security headers present on all responses
- ✅ Health check returns detailed status
- ✅ Rate limiting works with/without Redis

### Phase 2 Complete When:
- ✅ All critical API endpoints validate input
- ✅ Errors are logged to monitoring service
- ✅ Structured logging throughout codebase
- ✅ Error boundary reports to monitoring

### Phase 3 Complete When:
- ✅ Smoke tests pass on every build
- ✅ Auth flow tests cover sign up/in/out
- ✅ API tests verify critical endpoints
- ✅ Linting passes with zero errors

### Phase 4 Complete When:
- ✅ Database indexes added for common queries
- ✅ Connection pool configured with limits
- ✅ Redis resilience tested and working
- ✅ Bundle size reduced by 20%+

### Phase 5 Complete When:
- ✅ Docker build succeeds
- ✅ App deploys to staging successfully
- ✅ Monitoring dashboard shows metrics
- ✅ Backup/restore tested and working

### Phase 6 Complete When:
- ✅ API docs published
- ✅ Deployment runbook reviewed
- ✅ Launch checklist 100% complete

---

## 🚨 Rollback Plan

If issues occur after deployment:

1. **Immediate**: Revert to previous Docker image
2. **Database**: Restore from most recent backup
3. **Monitoring**: Check error logs for root cause
4. **Communication**: Notify team and users
5. **Fix**: Address issue in dev/staging before re-deploying

---

## 📝 Notes

- **No Rewrites**: All changes are additive or minimal modifications
- **Safe Changes**: Each task is isolated and reversible
- **Incremental**: Can pause after any phase
- **Tested**: Each phase includes verification steps
- **Documented**: All changes documented inline

---

**Ready to proceed with Phase 1? Approve to begin implementation.**

