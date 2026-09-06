# FlyHigh 2.0 — Deployment Strategy & Architecture Decision

> **Decision Date:** August 3, 2026
> **Target:** Production deployment within $15-20/month budget
> **Audience:** Development team, stakeholders

---

## 1. Executive Summary

**Recommendation:** Deploy on **Hetzner VPS + MongoDB Atlas** at **~$18/month**.

We evaluated 5 deployment options against our requirements: budget ($15-20/mo), security, performance under load, scalability, and compatibility with our existing architecture. The Hetzner + Atlas combo is the only option that satisfies ALL criteria without any code changes.

---

## 2. What We're Deploying

We have a **three-service architecture** with a shared database:

| Service | Technology | Size | Role |
|---------|-----------|------|------|
| **flyhigh-backend** | Java 21 + Spring Boot 3.2.12 | 19 services, 27 DTOs, 13 repositories | REST API, auth, payments, business logic |
| **flyhigh-signaling-server** | Node.js 22 + Socket.IO 4.8 | ~530 lines, shared JWT module | WebRTC signaling, real-time events, chat |
| **flyhigh-ui** | React 19 + TypeScript + Vite | SPA with lazy-loaded routes | Frontend, served as static files |
| **MongoDB** | Atlas (managed) | 13 collections | User data, sessions, payments, earnings |

**Key constraint:** Socket.IO requires persistent TCP connections — it does NOT work on AWS Lambda.

---

## 3. Chosen Architecture

```
                          INTERNET
                             │
                             ▼
               ┌──────────────────────────┐
               │    Cloudflare (Free)      │
               │                           │
               │  • DDoS Protection        │
               │  • Global CDN (assets)     │
               │  • SSL/TLS Termination     │
               │  • Bot / L7 Attack Filter  │
               │  • WAF (OWASP rules)       │
               └─────────────┬─────────────┘
                             │ HTTPS
                             ▼
               ┌──────────────────────────┐
               │   Hetzner CX32 ($8/mo)   │
               │   4 vCPU, 8GB, NVMe SSD  │
               │   20TB bandwidth          │
               │   1 Gbps network          │
               │                          │
               │  ┌────────────────────┐  │
               │  │   Nginx (reverse   │  │
               │  │   proxy + firewall) │  │
               │  │   • Rate limiting   │  │
               │  │   • HTTPS (L.E.)    │  │
               │  │   • Static files    │  │
               │  │   • Request logging │  │
               │  └──────┬──────┬──────┘  │
               │         │      │         │
               │         ▼      ▼         │
               │   ┌────────┐ ┌─────────┐ │
               │   │Backend │ │Signaling│ │
               │   │Java 21 │ │Node.js  │ │
               │   │:8081   │ │:5000    │ │
               │   └───┬────┘ └─────────┘ │
               └───────┼──────────────────┘
                       │ TLS
                       ▼
               ┌──────────────────────────┐
               │  MongoDB Atlas M2 ($9/mo)│
               │                           │
               │  • 2GB Dedicated RAM      │
               │  • 5GB Storage            │
               │  • Automated Daily Backups│
               │  • Monitoring Dashboard   │
               │  • Network Isolation (IP) │
               │  • Auto Patching          │
               └──────────────────────────┘
```

---

## 4. Why This Architecture?

### 4.1 Cost: $18/month (Under Budget)

| Line Item | Monthly Cost |
|-----------|-------------|
| Hetzner CX32 VPS (4 vCPU, 8GB RAM, 80GB NVMe) | $8.00 |
| MongoDB Atlas M2 (dedicated, 2GB RAM, backups) | $9.00 |
| Cloudflare CDN + WAF + DDoS | $0 (free tier) |
| Domain (estimated yearly / 12) | ~$1.00 |
| **Total** | **~$18.00/month** |

### 4.2 Security: Defense in Depth

We have **4 security layers**, not just one:

```
Layer 1: Cloudflare
  → DDoS protection, bot filtering, OWASP WAF rules
  → All traffic encrypted via Cloudflare edge SSL

Layer 2: Nginx Reverse Proxy
  → Rate limiting per IP (prevents brute force)
  → IP whitelist for admin endpoints
  → Request size limits, header validation
  → HTTPS via Let's Encrypt (free, auto-renewing)

Layer 3: Application Security (existing)
  → JWT with tokenVersion invalidation
  → BCrypt password hashing (strength 12)
  → HttpOnly + Secure + SameSite=Strict cookies
  → Method-level @PreAuthorize on all controllers
  → Input validation via Jakarta Bean Validation + Zod
  → Constant-time HMAC payment verification
  → Rate limiting per endpoint (Bucket4j)

Layer 4: Database Security
  → MongoDB Atlas network isolation (IP whitelist)
  → TLS encryption between VPS and Atlas
  → Automated security patches (managed service)
  → Daily automated backups with point-in-time recovery
```

This is **stronger than the AWS Lambda deployment** which had known issues:
- JWT tokens in API Gateway query string logs (exposed)
- Socket.IO incompatible with Lambda (broken WebSocket)
- Lambda cold starts bypass rate limiter (fresh counter per invocation)

### 4.3 Performance: No Cold Starts, Dedicated Resources

| Resource | Our Allocation | What It Handles |
|----------|---------------|-----------------|
| 4 CPU cores | 2 for Java, 1 for Node.js, 1 for Nginx/OS | Zero contention between services |
| 8GB RAM | 3GB Java heap, 1GB Node.js, 1GB Nginx+OS, 3GB file cache | Java runs GC-efficiently, OS caches static files |
| NVMe SSD | 550 MB/s read | Instant static file serving, fast log writes |
| 1 Gbps network | 20TB/month | Video call signaling never bottlenecks |
| Atlas 2GB RAM | Dedicated MongoDB | Frequent queries stay in memory |

**Comparison with alternatives:**

| Metric | Our Choice | AWS Lambda | Railway/Render |
|--------|-----------|------------|----------------|
| Cold starts | None | 5-10s Java, <1s Node | Shared CPU |
| CPU | 4 dedicated cores | Burst, throttled | Shared, burst |
| RAM | 8GB dedicated | 1024-256MB per function | 512MB-2GB shared |
| WebSocket | Native Socket.IO | NOT compatible | Native |
| Max request time | No limit | 29 seconds | Platform limited |

**Estimated capacity:** 500-1,000 daily active users at this tier before needing to scale.

### 4.4 Scalability: Vertical First, Then Horizontal

```
PHASE 1 (NOW)          PHASE 2 (GROWTH)        PHASE 3 (SCALE)
$18/month              $39/month               $80+/month

CX32 (4CPU, 8GB)  →   CX42 (8CPU, 16GB)  →   2x CX42 + Load Balancer
Atlas M2 (2GB)    →   Atlas M5 (4GB)      →   Atlas M10 (8GB, replicas)

Vertical scale only:   Add more power:          Horizontal scale:
• No code changes      • No migration needed    • Nginx → HAProxy/Envoy
• No downtime          • 5-min VPS resize       • Add monitoring stack
• One-click upgrade    • Atlas auto-upgrades    • Auto-scaling rules
```

The key insight: **we don't need horizontal scaling until thousands of concurrent users**. One properly-sized VPS handles far more than most people realize. When we DO need to scale, we can:

1. Move static assets to S3 + CloudFront ($2/mo extra)
2. Add a second VPS with load balancer
3. Add Redis cache ($5/mo) for expert search
4. Eventually migrate to ECS Fargate if revenue justifies it

---

## 5. Options Evaluated & Rejected

### Option A: AWS Serverless (Lambda + API Gateway) — $25-55/mo ❌

| Why We Considered It | Why We Rejected It |
|---------------------|-------------------|
| Already coded in CDK | **Socket.IO does NOT work on Lambda** — requires persistent TCP connections |
| Auto-scaling | **Java Lambda cold starts are 5-10 seconds** even with SnapStart |
| "Serverless" is trendy | **$25-55/month** is over budget |
| No server management | **WAF costs $8/mo alone** |
| | JWT tokens leak in API Gateway query strings |
| | Rate limiter resets on cold start — attackers exploit this |

### Option B: Railway / Render (PaaS) — $14-18/mo ❌

| Why We Considered It | Why We Rejected It |
|---------------------|-------------------|
| Easy Git-push deploy | **512MB-2GB plans can't run Java** — OOM on start |
| Zero DevOps | Shared CPU means **terrible under load** |
| | Cold starts on free/cheap tiers |
| | No control over security layers |
| | Lock-in to platform-specific config |

### Option C: Single VPS with Local MongoDB — $4-8/mo ❌

| Why We Considered It | Why We Rejected It |
|---------------------|-------------------|
| Cheapest possible | **You manage backups yourself** — one mistake = data loss |
| Simple | **No automated failover** — if disk fails, DB is gone |
| | **Security patches are your responsibility** |
| | MongoDB competes with app for RAM |

### Option D: Hybrid (Java on ECS, Node on Lambda) — $30-50/mo ❌

| Why We Considered It | Why We Rejected It |
|---------------------|-------------------|
| Best AWS-native option | Over budget |
| | More complex — two deployment targets |
| | ECS minimum costs are high |

### ✅ Option E: Hetzner VPS + MongoDB Atlas — $18/mo

| Why We Chose It |
|-----------------|
| Under $20/month budget |
| All 3 services run unchanged — **zero code modifications** |
| Socket.IO works natively |
| No cold starts — instant response |
| Dedicated CPU cores, not shared |
| MongoDB is managed (backups, patching, monitoring included) |
| Cloudflare adds enterprise-grade security for free |
| Scale vertically with one click (no migration) |
| Linux, not proprietary — can migrate anytime |

---

## 6. Resource Allocation on the VPS

```
┌──────────────────────────────────────────┐
│          8GB RAM Allocation               │
├──────────────────────────────────────────┤
│  Java Backend JVM    ████████████  3GB   │
│  Node.js Signaling   ████          1GB   │
│  Nginx + OS          ████          1GB   │
│  File System Cache   ████████████  3GB   │
│  (caches static files, logs, temp)       │
├──────────────────────────────────────────┤
│          4 CPU Core Assignment            │
├──────────────────────────────────────────┤
│  Core 1-2: Java Backend (primary)        │
│  Core 3:   Node.js Signaling             │
│  Core 4:   Nginx + OS processes          │
└──────────────────────────────────────────┘
```

**Why 8GB and not 4GB?**
- Java Spring Boot baseline: 1.5-2GB (class loading, connection pools)
- MongoDB driver connection pool (50 connections): ~200MB
- We want 3GB free for OS file cache (dramatically speeds up static file serving)
- 4GB would work but leave zero headroom for traffic spikes

---

## 7. Migration Path to AWS (When Revenue Justifies It)

The beauty of this approach: **we're not locked in**. When we have paying customers and can afford $50-100/month:

```
Current (Hetzner)          Future (AWS ECS)
─────────────────         ─────────────────
VPS → ECS Fargate         (container, same Dockerfile)
Nginx → ALB               (managed load balancer)
Local SSL → ACM           (managed certificates)
Cloudflare → CloudFront    (better AWS integration)
Atlas → Atlas              (no change — MongoDB stays managed)
```

Everything runs in Docker. Same images, different host. Zero code changes.

---

## 8. Deployment Plan Summary

| Day | Task | Who | Duration |
|-----|------|-----|----------|
| **Day 1** | Purchase domain, provision Hetzner VPS | DevOps | 1 hour |
| **Day 1** | Set up MongoDB Atlas M2 cluster | DevOps | 30 min |
| **Day 2** | Install Docker + docker-compose on VPS | DevOps | 2 hours |
| **Day 2** | Configure environment variables (.env) | DevOps | 30 min |
| **Day 2** | Build & push Docker images | DevOps | 1 hour |
| **Day 3** | Configure Nginx reverse proxy + SSL | DevOps | 2 hours |
| **Day 3** | Configure Cloudflare DNS + CDN | DevOps | 1 hour |
| **Day 3** | Set up firewall (UFW) + SSH hardening | DevOps | 1 hour |
| **Day 4** | Deploy application, run smoke tests | Team | 2 hours |
| **Day 4** | Full user flow testing (signup → call → pay) | QA | 3 hours |
| **Day 4** | Monitor logs, verify backups | DevOps | 1 hour |

**Total time to production:** ~4 days (part-time, parallel work)

---

## 9. Key Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| VPS provider outage | Low (Hetzner 99.9% SLA) | Site down | Atlas is separate, Cloudflare serves cached pages |
| VPS runs out of resources | Low (8GB is plenty initially) | Slow responses | Monitoring alerts at 70% usage; vertical scale is one click |
| DDoS attack | Medium | Site down | Cloudflare free tier absorbs it; Nginx rate limiting as backup |
| Database corruption | Low | Data loss | Atlas automated daily backups + point-in-time recovery |
| SSL certificate expiry | Low | Browser warnings | Let's Encrypt auto-renews via certbot cron job |
| Deployment breaks something | Medium | Downtime | Docker rollback: `docker-compose down && docker-compose up -d` (previous image) |

---

## 10. Monthly Checklist

Once deployed, these tasks take ~30 minutes total per month:

- [ ] Review Cloudflare analytics (traffic, threats blocked)
- [ ] Verify MongoDB Atlas backup succeeded
- [ ] Check VPS disk usage + memory (monitoring alerts should catch this)
- [ ] Run `docker-compose pull && docker-compose up -d` for updates
- [ ] Review application logs for ERROR entries
- [ ] Verify SSL certificate auto-renewal

---

## 11. Comparison at a Glance

```
                    Monthly  Cold     WebSocket   Dedicated  Managed  Security
                    Cost     Starts   Works?      CPU        DB       Layers
──────────────────  ───────  ───────  ──────────  ─────────  ───────  ────────
OUR CHOICE           $18      None     ✅ Yes      4 cores    Yes      4 layers
──────────────────  ───────  ───────  ──────────  ─────────  ───────  ────────
AWS Serverless       $25-55  5-10s    ❌ Broken   Shared     Yes      3 layers
Railway/Render       $14-18  Present  ✅ Yes      Shared     No*      2 layers
Single VPS only      $4-8    None     ✅ Yes      2-4 cores  No       2 layers
──────────────────  ───────  ───────  ──────────  ─────────  ───────  ────────
*Atlas free tier is too limited for production use
```

---

## 12. Decision

**We are deploying on Hetzner CX32 + MongoDB Atlas M2 + Cloudflare at ~$18/month.**

This gives us:
- ✅ Under $20/month budget
- ✅ Zero code changes — our existing docker-compose.yml works
- ✅ 4-layer security (Cloudflare → Nginx → App → Atlas)
- ✅ Dedicated CPU + RAM — no cold starts, no noisy neighbors
- ✅ Managed database with automated daily backups
- ✅ Native Socket.IO support (call signaling works)
- ✅ One-click vertical scaling when we grow
- ✅ No vendor lock-in — Docker containers run anywhere

---

*Prepared for team review. Questions? Let's discuss.*
