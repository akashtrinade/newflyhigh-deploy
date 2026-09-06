# FlyHigh 2.0 — India Deployment Strategy & Architecture Decision

> **Decision Date:** August 7, 2026
> **Target:** Production deployment for Indian users, minimum budget at launch, scaling with growth
> **Audience:** Development team, stakeholders

---

## 1. Executive Summary

**Recommendation:** Deploy on **Vultr Mumbai at ~$48/month** for launch, then migrate to **DigitalOcean Bengaluru at ~$116/month** as users grow.

We evaluated 5 cloud providers with proven India data centers against our specific stack (Spring Boot + Node.js/Socket.IO + React + MongoDB). The overriding constraint: **latency to Indian users must be under 20ms for viable WebRTC video calls.** This immediately ruled out providers without Indian data centers (Hetzner, and the original DEPLOYMENT_STRATEGY.md recommendation).

This document replaces `DEPLOYMENT_STRATEGY.md` (August 3, 2026) which recommended Hetzner (Germany) — a non-viable choice for Indian users.

---

## 2. Why India Data Centers Are Non-Negotiable

FlyHigh's core product is real-time video consultation. WebRTC signaling latency directly impacts:

- **Call setup time** — ICE candidate exchange must be fast
- **Chat responsiveness** — Socket.IO messages feel instant or feel broken
- **User retention** — Indian users will abandon a laggy platform

| Server Location | Typical Latency to Mumbai | WebRTC Experience |
|----------------|--------------------------|-------------------|
| **Mumbai/Bengaluru** | 5-20ms | Excellent |
| Singapore | 60-80ms | Acceptable but not great |
| Frankfurt (Hetzner) | 150-200ms | Unusable for real-time video |

---

## 3. What We're Deploying

| Service | Technology | Size | Role |
|---------|-----------|------|------|
| **flyhigh-backend** | Java 21 + Spring Boot 3.2.12 | 19 services, 27 DTOs, 13 repositories | REST API, auth, payments, business logic |
| **flyhigh-signaling-server** | Node.js 22 + Socket.IO 4.8 | ~530 lines, shared JWT module | WebRTC signaling, real-time events, chat |
| **flyhigh-ui** | React 19 + TypeScript + Vite | SPA with lazy-loaded routes | Frontend, served as static files |
| **MongoDB** | Self-hosted → Managed | 13 collections | User data, sessions, payments, earnings |

**Key constraint:** Socket.IO requires persistent TCP connections — it does NOT work on AWS Lambda.

---

## 4. Phased Deployment Plan

### 4.1 Phase 1: Launch (0-100 users, <20 concurrent calls)

**Budget: ~$48/month**

```
                         INTERNET
                            │
                            ▼
              ┌──────────────────────────┐
              │   Cloudflare (Free)       │
              │   • DDoS Protection       │
              │   • Global CDN (assets)   │
              │   • SSL/TLS Termination   │
              │   • WAF (OWASP rules)     │
              └─────────────┬─────────────┘
                            │ HTTPS
                            ▼
              ┌──────────────────────────┐
              │   Vultr Mumbai ($48/mo)  │
              │   4 vCPU, 8GB, 160GB NVMe│
              │   5TB bandwidth           │
              │                          │
              │  ┌────────────────────┐  │
              │  │   Nginx (reverse   │  │
              │  │   proxy + static)   │  │
              │  │   • Rate limiting   │  │
              │  │   • HTTPS (L.E.)    │  │
              │  │   • Static files    │  │
              │  └──────┬──────┬──────┘  │
              │         │      │         │
              │         ▼      ▼         │
              │   ┌────────┐ ┌─────────┐ │
              │   │Backend │ │Signaling│ │
              │   │Java 21 │ │Node.js  │ │
              │   │:8081   │ │:5000    │ │
              │   └───┬────┘ └─────────┘ │
              │       │                  │
              │       ▼                  │
              │   ┌──────────────┐       │
              │   │   MongoDB    │       │
              │   │ (self-hosted)│       │
              │   │   2GB RAM    │       │
              │   └──────────────┘       │
              └──────────────────────────┘
```

| Line Item | Monthly Cost |
|-----------|-------------|
| Vultr Cloud Compute (4 vCPU, 8GB RAM, 160GB NVMe, 5TB BW) | $48.00 |
| Cloudflare CDN + WAF + DDoS | $0 (free tier) |
| Domain (estimated yearly / 12) | ~$1.00 |
| **Total** | **~$49.00/month** |

**Resource allocation on the single VPS:**

```
┌──────────────────────────────────────────┐
│          8GB RAM Allocation               │
├──────────────────────────────────────────┤
│  Java Backend JVM    ████████████  3GB   │
│  MongoDB             ████████      2GB   │
│  Node.js Signaling   ████          1GB   │
│  Nginx + OS          ████          1GB   │
│  File System Cache   ████          1GB   │
├──────────────────────────────────────────┤
│          4 CPU Core Assignment            │
├──────────────────────────────────────────┤
│  Core 1-2: Java Backend (primary)        │
│  Core 3:   Node.js Signaling + MongoDB   │
│  Core 4:   Nginx + OS processes          │
└──────────────────────────────────────────┘
```

**Why this works at launch:**
- Mumbai data center = sub-20ms latency to Indian users
- 4 vCPU / 8GB handles your stack comfortably at low concurrency
- NVMe SSD (550+ MB/s) means fast DB reads and instant static file serving
- Self-hosted MongoDB on NVMe is fast and costs nothing extra
- Cloudflare gives you enterprise-grade security for free
- Socket.IO works natively (no Lambda limitations)

**What you give up vs. higher tiers:**
- You manage MongoDB yourself (backups, updates, monitoring)
- Single point of failure (if VPS goes down, everything goes down)
- No auto-scaling (but you don't need it at <20 concurrent calls)

---

### 4.2 Phase 2: Growth (100-500 users, 20-100 concurrent calls)

**Budget: ~$72-116/month**

**Trigger to move to Phase 2:** Backend CPU hits 60-70% consistently, or MongoDB working set outgrows 3GB.

#### Option A: Vultr Mumbai — Split Services ($72/month)

| Line Item | Monthly Cost |
|-----------|-------------|
| Vultr Cloud Compute (2 vCPU, 4GB) — Backend + Signaling | $24.00 |
| Vultr Cloud Compute (2 vCPU, 8GB, 100GB) — MongoDB dedicated | $48.00 |
| Cloudflare CDN + WAF + DDoS | $0 |
| **Total** | **~$72.00/month** |

#### Option B: DigitalOcean Bengaluru — Managed MongoDB ($101-116/month)

| Line Item | Monthly Cost |
|-----------|-------------|
| DigitalOcean Basic Droplets 2x (2 vCPU, 4GB each) — Backend + Signaling | $24.00 |
| DigitalOcean Managed MongoDB (2 vCPU, 8GB, 60GB) | $60-75.00 |
| DigitalOcean Load Balancer | $12.00 |
| DigitalOcean Spaces CDN — React SPA static files | $5.00 |
| Cloudflare WAF + DDoS | $0 |
| **Total** | **~$101-116.00/month** |

**Why Option B is the sweet spot:**
- Managed MongoDB = automated daily backups, point-in-time recovery, zero DBA work
- Independent storage scaling (add storage without upgrading compute)
- Zero egress costs — backend ↔ database traffic stays within BLR1
- Load balancer = add a second backend instance later with zero downtime
- Simple, predictable billing — no per-GB load balancer charges

---

### 4.3 Phase 3: Scale (500-2000+ users, 100-500 concurrent calls)

**Budget: ~$190-240/month**

**Trigger to move to Phase 3:** 100+ concurrent calls, need for multi-instance backend, or HA requirements.

#### Option A: DigitalOcean Bengaluru with Multi-Instance ($207-237/month)

| Line Item | Monthly Cost |
|-----------|-------------|
| DigitalOcean CPU-Optimized Droplets 3x (2 vCPU, 4GB) — 2 backend + 1 signaling | $60.00 |
| DigitalOcean Managed MongoDB (4 vCPU, 16GB, 120GB) | $130-160.00 |
| DigitalOcean Load Balancer | $12.00 |
| DigitalOcean Spaces CDN | $5.00 |
| Cloudflare WAF + DDoS | $0 |
| **Total** | **~$207-237.00/month** |

#### Option B: Google Cloud Mumbai with GKE ($189-220/month)

| Line Item | Monthly Cost |
|-----------|-------------|
| GKE worker nodes 2x e2-standard-2 (2 vCPU, 8GB each) | ~$50.00 |
| MongoDB Atlas M10 in asia-south1 (2 vCPU, 8GB) | ~$114.00 |
| GCP Cloud CDN — static files | $0-5.00 |
| GCP Load Balancer (GCLB) | ~$20.00 |
| Cloudflare WAF + DDoS | $0 |
| **Total** | **~$189-220.00/month** |

**GCP advantage:** GKE control plane is FREE (AWS charges $73/month for EKS), GST-compliant INR billing, two India regions (Mumbai + Delhi NCR).

---

## 5. Full Phased Roadmap

```
PHASE 1 (NOW)          PHASE 2 (3-6 months)     PHASE 3 (6-12+ months)
$48/month              $72-116/month            $190-240/month

┌──────────────┐      ┌──────┐ ┌──────┐       ┌──────┐ ┌──────┐ ┌──────┐
│  1 Vultr VM  │      │Backend│ │  DB  │       │  LB  │ │Backend│ │  DB  │
│  Everything  │  →   │  +    │ │ MGMT │   →   │      │ │  x2  │ │  x3  │
│  on one box  │      │ Signal│ │      │       │ CDN  │ │Signal │ │ repl.│
│              │      │       │ │      │       │      │ │       │ │      │
└──────────────┘      └──────┘ └──────┘       └──────┘ └──────┘ └──────┘

Self-hosted DB        Managed DB             Full HA
Single point OK       Redundancy             Multi-AZ ready
No DBA costs          Auto-backups           Horizontal scale
```

---

## 6. Security Architecture

We maintain 4 security layers across all phases:

```
Layer 1: Cloudflare (Free — all phases)
  → DDoS protection, bot filtering, OWASP WAF rules
  → All traffic encrypted via Cloudflare edge SSL
  → Full (strict) SSL mode

Layer 2: Nginx Reverse Proxy
  → Rate limiting per IP (prevents brute force)
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
  → UFW firewall (only ports 22, 80, 443 from Cloudflare IPs)
  → TLS encryption between services
  → Daily automated backups (mongodump cron → managed service)
  → SSH key-only auth, non-standard port, Fail2Ban
```

---

## 7. Providers Evaluated & Compared

### 7.1 Providers with Verified India Data Centers

| Provider | India Locations | Managed MongoDB | Monthly (Basic) | GST Invoice |
|----------|----------------|-----------------|-----------------|-------------|
| **AWS** | Mumbai (2016) + Hyderabad (2022) | Atlas or DocumentDB | $195-310 | Yes |
| **GCP** | Mumbai (2017) + Delhi NCR (2021) | Atlas only | $186-290 | Yes |
| **DigitalOcean** | Bengaluru BLR1 (2016) | Native (best value) | $101-134 | No (USD) |
| **Vultr** | Mumbai (2022) + Bangalore + Delhi NCR | Self-host only | $87-104* | No (USD) |

### 7.2 Cost Comparison Table (Basic Production Setup)

| Component | AWS Mumbai | GCP Mumbai | DO BLR1 | Vultr Mumbai |
|-----------|-----------|-----------|---------|-------------|
| Backend (2 vCPU/4GB) | $25-31 | $24-30 | $12-24 | $12-24 |
| Signaling (2 vCPU/2GB) | $19-25 | $18-24 | $12-18 | $12 |
| Managed MongoDB (2vCPU/8GB) | $114 (Atlas M10) | $114 (Atlas M10) | $60-75 (Managed) | $48* (self-host) |
| Load Balancer | $22-25 | $18-22 | $12 | $10 |
| CDN / Static Hosting | $0-5 | $0-5 | $5 | $5-10 |
| Data Transfer (1-2 TB) | $15-30 | $12-25 | $0 (included) | $0 (included) |
| **MONTHLY TOTAL** | **$195-310** | **$186-290** | **$101-134** | **$87-104*** |

*\* Vultr: MongoDB self-hosted. With Atlas M10, Vultr total is ~$170-200/month.*\
*Prices as of August 2026. 1-year committed/reserved pricing used for AWS/GCP.*

### 7.3 Recommendation Matrix

| Dimension | AWS | GCP | DigitalOcean | Vultr |
|-----------|-----|-----|-------------|-------|
| India DC Presence | ★★★★★ (2 regions) | ★★★★☆ (2 regions) | ★★★☆☆ (1 DC) | ★★★★☆ (3 locations) |
| Managed MongoDB | ★★★★☆ | ★★★☆☆ | ★★★★★ (best value) | ★☆☆☆☆ (self-host) |
| Monthly Cost (basic) | ★★☆☆☆ ($195-310) | ★★☆☆☆ ($186-290) | ★★★★☆ ($101-134) | ★★★★★ ($87-104*) |
| Simplicity | ★★☆☆☆ (complex) | ★★★☆☆ (moderate) | ★★★★★ (simple) | ★★★★★ (very simple) |
| K8s Quality | ★★★★☆ (EKS, $73/mo) | ★★★★★ (GKE, free CP) | ★★★☆☆ (DOKS, $12/mo) | ★☆☆☆☆ (none) |
| GST Invoicing | Yes | Yes | No (USD only) | No (USD only) |
| Egress Cost Risk | High | High | Low (within BLR1) | Low (included) |
| Best For | Enterprises | K8s-native teams | Startups, simplicity | Budget, simplicity |

---

## 8. India-Native Providers: Not Ready Yet

We investigated Indian cloud providers (CtrlS, CloudPe, E2E Networks, Jio Cloud, NxtGen, Tata Communications). **None had verifiable, production-ready offerings for our stack as of August 2026:**

- Public documentation and pricing transparency are insufficient for confident recommendation
- Managed MongoDB offerings are either non-existent or unverified
- Independent third-party coverage and reviews are scarce

This will change — the Indian cloud market is the fastest-growing in the world. Revisit in 12 months.

---

## 9. Hidden Costs to Watch

### Data Transfer (Egress)
Public cloud providers charge for data leaving their network. **MongoDB Atlas egress is the #1 bill-shock source** — documented cases of $700-$1,200/month in unexpected charges.

**Mitigation:** Keep all services in the same data center. Backend-to-MongoDB traffic should never leave the building.

### GST and Billing Currency
- AWS and GCP offer INR billing through Indian entities with GST-compliant invoices
- DigitalOcean and Vultr bill in USD from US entities — no GST invoicing
- Effective ~18% forex markup on credit card payments for USD-only providers

### Load Balancer Data Processing
- AWS ALB and GCP GCLB charge per GB processed — can add up for WebSocket-heavy apps
- DigitalOcean Load Balancer: flat $12/month, no per-GB fees
- Vultr Load Balancer: flat $10/month

### Idle Resources
Cloud instances run 24/7 whether users are active or not. At India-only usage with predictable daytime patterns, your 3 AM traffic is near zero but you still pay. Auto-scaling to zero is not an option for Socket.IO.

---

## 10. MongoDB: Managed vs. Self-Hosted Decision

This is the single biggest cost variable in your architecture.

| | MongoDB Atlas (M10) | DO Managed MongoDB | Self-Hosted MongoDB |
|---|---|---|---|
| **Monthly Cost** | ~$114 | ~$60-75 | ~$24-48 (instance only) |
| **Backups** | Automated, PITR | Automated, 7-day retention | You manage (cron + scripts) |
| **Updates** | Auto-patched | Auto-patched | You manage |
| **Monitoring** | Built-in dashboard | Built-in dashboard | You set up |
| **Egress Risk** | HIGH (monitor closely) | None (within BLR1) | None (local) |
| **Vendor Lock-in** | Atlas proprietary APIs | Standard MongoDB | None |
| **Best For** | Teams wanting fully managed | Best value managed | Teams with DevOps skills |

**Recommendation:** Start self-hosted in Phase 1 ($0 extra), move to DO Managed MongoDB in Phase 2 ($60-75/month).

---

## 11. Deployment Timeline

### Phase 1: Launch (2 weeks, part-time)

| Day | Task | Duration |
|-----|------|----------|
| **Day 1** | Provision Vultr Mumbai VM, configure SSH, set hostname | 1 hour |
| **Day 1** | Install Docker + docker-compose, pull base images | 1 hour |
| **Day 2** | Configure Cloudflare DNS, set SSL to Full (strict) | 1 hour |
| **Day 2** | Set up Nginx reverse proxy with rate limiting + security headers | 2 hours |
| **Day 2** | Configure environment variables (.env file, chmod 600) | 30 min |
| **Day 3** | Build & deploy Docker images for all 3 services | 2 hours |
| **Day 3** | Set up UFW firewall (ports 22, 80, 443 from Cloudflare IPs only) | 30 min |
| **Day 3** | SSH hardening (key-only, non-standard port) + Fail2Ban | 1 hour |
| **Day 4** | MongoDB backup cron job + restore test | 1 hour |
| **Day 4** | Certbot SSL auto-renewal setup | 30 min |
| **Day 4** | Set up UptimeRobot monitoring (free tier) | 30 min |
| **Day 5** | Full user flow testing: signup → search → call → pay | 3 hours |
| **Day 5** | Monitor logs, verify all services healthy | 1 hour |

**Total time: ~2 weeks (part-time, ~14 hours total)**

---

## 12. Key Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| VPS provider outage | Low (Vultr 99.99% SLA) | Site down | Cloudflare serves cached pages; UptimeRobot alerts |
| MongoDB data loss | Low (NVMe + backups) | Data loss | Daily mongodump to external location; test restore monthly |
| VPS runs out of resources | Low (8GB is plenty initially) | Slow responses | Monitoring alerts at 70% CPU/RAM; trigger Phase 2 |
| DDoS attack | Medium | Site down | Cloudflare free tier absorbs it; Nginx rate limiting as backup |
| SSL certificate expiry | Low | Browser warnings | Let's Encrypt auto-renews via certbot cron job |
| Deployment breaks something | Medium | Downtime | Docker rollback: `docker-compose down && docker-compose up -d` |
| Atlas egress bill shock | Phase 2+ only | Budget overrun | Billing alerts at $20; prefer DO Managed MongoDB |

---

## 13. Monthly Checklist (30 min/month)

- [ ] Review Cloudflare analytics (traffic, threats blocked)
- [ ] Verify MongoDB backup succeeded (check latest dump file size)
- [ ] Check VPS disk usage + memory (`df -h`, `free -m`)
- [ ] Run `docker-compose pull && docker-compose up -d` for updates
- [ ] Review application logs for ERROR entries
- [ ] Verify SSL certificate auto-renewal (`certbot certificates`)
- [ ] Test restore from latest MongoDB backup (quarterly)

---

## 14. Migration Paths

### Phase 1 → Phase 2 (Vultr → Vultr split)
1. Provision new MongoDB-only Vultr instance
2. mongodump from old instance, mongorestore to new
3. Update backend MONGODB_URI to point to new instance
4. Restart backend, verify

### Phase 1/2 → DigitalOcean
1. Provision DO droplets + Managed MongoDB
2. mongodump/mongorestore to DO Managed MongoDB
3. Deploy Docker images to DO droplets
4. Update Cloudflare DNS to DO Load Balancer IP
5. Smoke test, cut over

### Vultr → GCP (if you want GST invoicing + GKE)
1. Provision GKE cluster with 2 nodes
2. Deploy to GKE via kubectl
3. mongodump/mongorestore to Atlas in asia-south1
4. Update Cloudflare DNS to GCLB IP

**Key:** Everything runs in Docker. Same images, different host. Zero code changes.

---

## 15. Decision

**We are deploying on Vultr Mumbai at ~$48/month for Phase 1 (launch).**

This gives us:
- ✅ Under $50/month — lowest viable budget for India deployment
- ✅ Mumbai data center — sub-20ms latency to Indian users
- ✅ Zero code changes — our existing docker-compose.yml works
- ✅ All 3 services (Java, Node.js, React) running on dedicated CPU
- ✅ Native Socket.IO support (call signaling works)
- ✅ Cloudflare enterprise-grade security for free
- ✅ Daily automated MongoDB backups via cron
- ✅ Clean migration path to DigitalOcean or GCP when we grow
- ✅ No vendor lock-in — Docker containers run anywhere

**Phase 2 target (~$101-116/month on DigitalOcean BLR1):**
- When users exceed 100 or concurrent calls exceed 20
- Managed MongoDB replaces self-hosted
- Separate droplets for backend and signaling
- Load balancer enables horizontal scaling

---

## 16. Comparison With Original DEPLOYMENT_STRATEGY.md

| Factor | Original (Hetzner, Germany) | This Strategy (India) |
|--------|---------------------------|----------------------|
| **Monthly Cost (launch)** | ~$18 | ~$48 |
| **India Latency** | 150-200ms ❌ | 5-20ms ✅ |
| **WebRTC Viability** | Unusable | Excellent |
| **Phase 2 Cost** | $39 (CX42 upgrade) | $72-116 (split services) |
| **Phase 3 Cost** | $80+ (2x CX42) | $190-240 (multi-instance) |
| **Managed DB Available** | Atlas M2 ($9, undersized) | DO Managed ($60-75, proper) |
| **Security** | 4-layer | 4-layer (same model) |
| **Scaling Model** | Vertical only | Vertical → Horizontal |
| **Docker Compatible** | Yes | Yes (same images) |

The original strategy's fatal flaw: it prioritized an $18/month budget over the fundamental reality that a real-time video platform needs its servers close to its users. The $30/month difference between Hetzner and Vultr Mumbai is the cost of a viable product.

---

*Prepared for team review. Questions? Let's discuss.*
