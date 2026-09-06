# FlyHigh 2.0 — Complete Deployment Security Guide

> **Target Architecture:** Hetzner VPS + MongoDB Atlas + Cloudflare
> **Monthly Cost:** ~$18/month
> **Last Updated:** August 5, 2026

---

## Table of Contents

1. [VPS / Host Security](#1-vps--host-security)
2. [Cloudflare Security](#2-cloudflare-security-free-tier)
3. [Nginx Reverse Proxy Security](#3-nginx-reverse-proxy-security)
4. [Application Security](#4-application-security)
5. [Payment Security (Razorpay)](#5-payment-security-razorpay)
6. [Video Call / WebRTC Security](#6-video-call--webrtc-security)
7. [MongoDB Atlas Security](#7-mongodb-atlas-security)
8. [Docker Security](#8-docker-security)
9. [Monitoring & Alerts](#9-monitoring--alerts)
10. [Security Checklist Summary](#10-security-checklist-summary)
11. [Architecture Security Diagram](#11-architecture-security-diagram)

---

## 1. VPS / Host Security

### 1.1 Firewall (UFW)

```bash
# Install & configure
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing

# Allow only what's needed
ufw allow 22/tcp          # SSH
ufw allow 80/tcp          # HTTP (for Let's Encrypt)
ufw allow 443/tcp         # HTTPS

ufw enable
ufw status verbose
```

### 1.2 SSH Hardening

Edit `/etc/ssh/sshd_config`:
```ini
PermitRootLogin no                    # Never allow root SSH
PasswordAuthentication no             # Key-only auth
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy                     # Only your deploy user
Port 2222                             # Non-standard port (optional)
```

Then `systemctl restart sshd`.

### 1.3 Automatic Security Updates

```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### 1.4 Fail2Ban (brute-force protection)

```bash
apt install fail2ban -y
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
maxretry = 5
bantime = 600
EOF
systemctl restart fail2ban
```

---

## 2. Cloudflare Security (Free Tier)

```
Internet → Cloudflare (Edge) → Hetzner VPS
```

### 2.1 SSL/TLS

```
SSL/TLS Mode: Full (strict)
  - Cloudflare ↔ Origin: HTTPS with valid Let's Encrypt cert
  - Always Use HTTPS: ON
  - Minimum TLS Version: 1.2
  - Opportunistic Encryption: ON
```

### 2.2 WAF (Web Application Firewall) Rules

| Rule | Action |
|------|--------|
| Cloudflare Managed Ruleset | Block |
| OWASP Core Ruleset | Block |
| SQL Injection (SQLi) | Block |
| Cross-Site Scripting (XSS) | Block |
| File Inclusion | Block |

### 2.3 DDoS Protection

```
- Under Attack Mode: Enable during attacks
- Rate Limiting: 100 requests/10s per IP on /api/auth/login
- Bot Fight Mode: ON
- Challenge Passage: 30 minutes
```

### 2.4 DNS & Network

```
- Proxy status:  (orange cloud) for all A/AAAA records
- DNSSEC: Enable on your domain registrar
- CAA Record: issue "letsencrypt.org" only
```

### 2.5 Page Rules

| URL Pattern | Setting | Value |
|-------------|---------|-------|
| `flyhigh.com/api/*` | Cache Level | Bypass |
| `flyhigh.com/*.js` | Browser Cache TTL | 1 month |
| `flyhigh.com/*.css` | Browser Cache TTL | 1 month |

---

## 3. Nginx Reverse Proxy Security

### 3.1 Full Configuration (`/etc/nginx/nginx.conf`)

```nginx
user www-data;
worker_processes auto;

http {
    # ── Limits ──
    client_max_body_size 10m;
    client_body_timeout 12s;
    client_header_timeout 12s;

    # ── Rate Limiting Zones ──
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=signup:10m rate=3r/m;

    # ── Security Headers ──
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), display-capture=(self)" always;

    # ── Gzip ──
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    # ── Server blocks ──
    include /etc/nginx/sites-enabled/*;
}
```

### 3.2 Site Configuration (`/etc/nginx/sites-available/flyhigh`)

```nginx
server {
    listen 80;
    server_name flyhigh.com www.flyhigh.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name flyhigh.com www.flyhigh.com;

    # ── SSL (Let's Encrypt) ──
    ssl_certificate     /etc/letsencrypt/live/flyhigh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/flyhigh.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # ── CSP Header ──
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com;
        frame-src https://api.razorpay.com https://checkout.razorpay.com https://accounts.google.com;
        connect-src 'self' wss://flyhigh.com https://api.razorpay.com https://accounts.google.com;
        img-src 'self' data: https:;
        style-src 'self' 'unsafe-inline';
        media-src 'self' blob:;
    " always;

    # ── Static SPA ──
    root /var/www/flyhigh;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # ── API proxy (Spring Boot backend) ──
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;

        # Never cache API responses
        expires -1;
        add_header Cache-Control "no-store";
    }

    # ── Stricter rate limits for auth endpoints ──
    location /api/auth/login {
        limit_req zone=login burst=2 nodelay;
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/signup {
        limit_req zone=signup burst=1 nodelay;
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── WebSocket proxy (signaling server) ──
    location /ws/ {
        limit_req zone=api burst=10;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;

        # Deny non-WebSocket requests
        if ($http_upgrade != "websocket") {
            return 426;
        }
    }

    # ── Deny hidden files ──
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 3.3 TLS Certificate (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d flyhigh.com -d www.flyhigh.com
# Auto-renewal: certbot adds a cron job automatically
# Verify: systemctl status certbot.timer
```

---

## 4. Application Security

### 4.1 JWT Configuration (`application-prod.properties`)

```properties
JWT_SECRET=<base64-256bit-random>    # Generate: openssl rand -base64 32
JWT_ACCESS_EXPIRY=900000             # 15 minutes
JWT_REFRESH_EXPIRY=604800000         # 7 days
COOKIE_SECURE=true                   # HTTPS only — critical for production
```

### 4.2 CORS (Production Only)

```properties
CORS_ORIGINS=https://flyhigh.com,https://www.flyhigh.com
# NEVER use "*" in production — the SecurityConfig rejects wildcard when credentials=true
```

### 4.3 Environment Variables (`.env` on VPS)

```bash
# /opt/flyhigh/.env — chmod 600, owned by deploy user
# NEVER commit this file to version control

SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=mongodb+srv://flyhigh-prod:<STRONG_PASSWORD>@cluster.mongodb.net/flyhigh_prod?retryWrites=true&w=majority
JWT_SECRET=<generated-base64>
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<google-oauth-secret>
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=<razorpay-live-secret>
RAZORPAY_WEBHOOK_SECRET=<razorpay-webhook-secret>
MAIL_USERNAME=noreply@flyhigh.com
MAIL_PASSWORD=<gmail-app-password>
ADMIN_EMAIL=admin@flyhigh.com
ADMIN_PASSWORD=<strong-random-admin-password>
VITE_API_BASE=https://flyhigh.com/api
VITE_WEBSOCKET_URL=wss://flyhigh.com/ws
VITE_GOOGLE_CLIENT_ID=<same-as-above>
```

```bash
# Secure the env file
chmod 600 /opt/flyhigh/.env
chown deploy:deploy /opt/flyhigh/.env
```

---

## 5. Payment Security (Razorpay)

### 5.1 How Payments Are Protected

```
Client Browser            FlyHigh Backend              Razorpay
─────────────            ────────────────              ────────
  1. POST /create-order ──► Creates order via Razorpay API
                              ◄── orderId + amount
  2. Razorpay Checkout    (card details go directly to Razorpay)
                           FlyHigh NEVER sees card numbers
  3. Razorpay POSTs back ──► HMAC-SHA256 signature verification
                              ┌─ Match  → Payment VERIFIED
                              └─ No match → REJECTED (fraud attempt)
  4. Webhook (POST)       ←── Razorpay server-to-server confirmation
                              HMAC verified with separate webhook secret
```

### 5.2 PCI Compliance

FlyHigh **never handles card data** → automatically qualifies for SAQ-A (simplest PCI level).

| Requirement | Status |
|-------------|--------|
| Card data enters FlyHigh servers | ❌ No — Razorpay Checkout handles it client-side |
| SSL/TLS for payment pages | ✅ Yes — Cloudflare Full (strict) + Nginx TLS 1.2+ |
| Never store CVV / full PAN | ✅ N/A — we never receive them |
| Access control to payment dashboard | ✅ Admin-only with strong passwords |
| Signature verification on all payments | ✅ HMAC-SHA256 constant-time comparison |
| Webhook defense-in-depth | ✅ Separate webhook secret, server-to-server only |

### 5.3 Razorpay Webhook IP Whitelist

In Razorpay Dashboard → Settings → Webhooks → Security:
```
Allowed IPs: Razorpay's published IP ranges only
Webhook URL: https://flyhigh.com/api/webhooks/razorpay
Events: payment.captured
```

---

## 6. Video Call / WebRTC Security

### 6.1 Encryption Layers

| Layer | Encryption | Details |
|-------|-----------|---------|
| **Signaling** (WebSocket) | WSS (TLS 1.2+) | Nginx terminates TLS, proxies to Node.js |
| **Media** (WebRTC) | DTLS-SRTP | End-to-end encrypted between browsers |
| **Data Channel** | DTLS | Same encryption as media |

### 6.2 WebSocket Authentication

The signaling server (`server.js`) verifies JWT on every connection:

```javascript
// JWT verification flow:
// 1. Reads accessToken from httpOnly cookie in Socket.IO handshake
// 2. Falls back to token in register-user event payload
// 3. HMAC-SHA256 signature verification with shared JWT_SECRET
// 4. In production (JWT_SECRET set): unauthenticated connections REJECTED
```

### 6.3 Nginx WebSocket Protections

```nginx
location /ws/ {
    limit_req zone=api burst=10;       # Prevent WebSocket connection floods
    proxy_read_timeout 86400s;          # Long timeout for active call connections
    if ($http_upgrade != "websocket") {
        return 426;                     # Only allow WebSocket upgrades
    }
}
```

---

## 7. MongoDB Atlas Security

### 7.1 Network Isolation

```
MongoDB Atlas Network Access:
  ├── Hetzner VPS IP           (x.x.x.x/32)  ← Application
  ├── Office/Home IP           (y.y.y.y/32)  ← Admin access
  └── NEVER use 0.0.0.0/0 in production
```

### 7.2 Authentication & Encryption

| Setting | Value |
|---------|-------|
| Auth mechanism | SCRAM (username + strong password) |
| TLS in transit | Enforced — connection string uses `mongodb+srv://` |
| Encryption at rest | Enabled (Atlas default for all tiers) |

### 7.3 Database User (Least Privilege)

```javascript
// Create a dedicated application user — NEVER use the Atlas admin account
db.createUser({
  user: "flyhigh-prod",
  pwd: "<strong-random-password>",
  roles: [{ role: "readWrite", db: "flyhigh_prod" }]
})
```

### 7.4 Backup Strategy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Automated snapshot | Daily | 7 days (M2 tier) |
| Point-in-time restore | Continuous | 24 hours |
| On-demand snapshot | Manual | Before major deploys |

---

## 8. Docker Security

### 8.1 Dockerfile Best Practices

```dockerfile
# Backend Dockerfile
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S flyhigh && adduser -S flyhigh -G flyhigh
USER flyhigh:flyhigh                    # Run as non-root
COPY --chown=flyhigh:flyhigh app.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 8.2 docker-compose.yml Security

```yaml
services:
  backend:
    user: "1000:1000"                   # Non-root user
    read_only: true                     # Immutable filesystem
    tmpfs:
      - /tmp:noexec,nosuid
    env_file:
      - /opt/flyhigh/.env               # chmod 600, not in version control
    networks:
      - internal
    ports:
      - "127.0.0.1:8081:8081"           # Bind to localhost only — Nginx proxies

  signaling:
    user: "1000:1000"
    read_only: true
    networks:
      - internal
    ports:
      - "127.0.0.1:5000:5000"           # Bind to localhost only

networks:
  internal:
    driver: bridge
    internal: true                       # No external internet access from containers
```

### 8.3 Docker Daemon Security

```bash
# /etc/docker/daemon.json
{
  "icc": false,               # Disable inter-container communication
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "userns-remap": "default"   # User namespace remapping
}
```

---

## 9. Monitoring & Alerts

### 9.1 Uptime Monitoring (Free Services)

```
UptimeRobot or HetrixTools:
  - https://flyhigh.com              (every 1 minute)
  - https://flyhigh.com/api/experts/filters  (every 5 minutes)
  - Alert channel: Email + Push notification
```

### 9.2 Log Monitoring

```bash
# Watch for suspicious patterns
tail -f /var/log/nginx/access.log | grep -E " 403 | 404 | 429 | 50[0-9] "

# Count failed login attempts (add to hourly cron)
grep "POST /api/auth/login" /var/log/nginx/access.log \
  | grep " 401 " \
  | wc -l
```

### 9.3 Resource Alerts (VPS Cron Jobs)

```bash
# Disk usage alert (> 80%)
0 * * * * df -h / | awk 'NR==2 {pct=substr($5,1,length($5)-1); if(pct>80) print "DISK WARNING: "pct"%"}' \
  | mail -s "Disk Alert — FlyHigh VPS" admin@flyhigh.com

# Memory alert (> 85%)
0 * * * * free | awk '/Mem:/ {pct=int($3/$2*100); if(pct>85) print "MEMORY WARNING: "pct"%"}' \
  | mail -s "Memory Alert — FlyHigh VPS" admin@flyhigh.com

# Docker container health check
*/5 * * * * docker ps --filter "status=exited" --format "{{.Names}}" \
  | grep -q . && echo "Container(s) down" | mail -s "Docker Alert — FlyHigh" admin@flyhigh.com
```

### 9.4 Application Logs

```bash
# Backend logs (via Docker)
docker logs flyhigh-backend-1 --tail 100 -f

# Check for ERROR-level events
docker logs flyhigh-backend-1 2>&1 | grep -c "ERROR"

# Signaling logs
docker logs flyhigh-signaling-1 --tail 100 -f
```

---

## 10. Security Checklist Summary

| # | Layer | Item | Priority |
|---|-------|------|----------|
| 1 | Cloudflare | SSL/TLS Full (strict) mode | **CRITICAL** |
| 2 | Cloudflare | WAF: OWASP + SQLi + XSS rule sets enabled | **CRITICAL** |
| 3 | VPS | UFW firewall: only ports 22, 80, 443 open | **CRITICAL** |
| 4 | VPS | SSH: key-only authentication, root login disabled | **CRITICAL** |
| 5 | VPS | Fail2Ban active for SSH + Nginx | **CRITICAL** |
| 6 | MongoDB | IP whitelist: VPS only (no `0.0.0.0/0`) | **CRITICAL** |
| 7 | MongoDB | Strong database password, SCRAM authentication | **CRITICAL** |
| 8 | MongoDB | Automated daily backups enabled | **CRITICAL** |
| 9 | Nginx | Rate limiting on `/api/auth/login` and `/api/auth/signup` | **HIGH** |
| 10 | Nginx | CSP header restricting script/frame/connect sources | **HIGH** |
| 11 | Nginx | HSTS via SSL configuration | **HIGH** |
| 12 | App | `JWT_SECRET` unique per environment | **HIGH** |
| 13 | App | `COOKIE_SECURE=true` (HTTPS-only cookies) | **HIGH** |
| 14 | App | CORS restricted to `flyhigh.com` (no wildcard) | **HIGH** |
| 15 | App | Razorpay payment signature verified (HMAC-SHA256) | **HIGH** |
| 16 | App | Razorpay webhook signature verified (separate secret) | **HIGH** |
| 17 | Docker | Containers run as non-root user | **MEDIUM** |
| 18 | Docker | Read-only filesystem + tmpfs for temp | **MEDIUM** |
| 19 | Docker | Internal Docker network, ports bound to localhost | **MEDIUM** |
| 20 | Monitoring | UptimeRobot on homepage + API health check | **MEDIUM** |
| 21 | Monitoring | Disk/memory/container health alert cron jobs | **MEDIUM** |
| 22 | VPS | `unattended-upgrades` for automatic security patches | **MEDIUM** |
| 23 | DNS | DNSSEC enabled on domain registrar | **LOW** |
| 24 | DNS | CAA record restricting certificate authorities | **LOW** |
| 25 | Payments | Razorpay webhook IP whitelist configured | **MEDIUM** |
| 26 | Payments | PCI SAQ-A compliance (card data never touches FlyHigh) | **CRITICAL** |
| 27 | WebSocket | WSS only, JWT-authenticated, rate-limited | **HIGH** |
| 28 | WebRTC | DTLS-SRTP end-to-end encryption for media | **BUILT-IN** |

---

## 11. Architecture Security Diagram

```
                          INTERNET
                             │
                    ┌────────┴────────┐
                    │   Cloudflare     │  ← DDoS protection, WAF (OWASP + SQLi + XSS)
                    │   (Free tier)    │  ← Bot filter, SSL/TLS termination (Full strict)
                    │                  │  ← Rate limiting, page rules
                    └────────┬────────┘
                             │ HTTPS (TLS 1.2+)
                             ▼
                    ┌────────┴────────┐
                    │  Hetzner CX32    │
                    │  (4 vCPU, 8GB)   │
                    │                  │
                    │  UFW Firewall    │  ← Only 22, 80, 443 open
                    │  Fail2Ban        │  ← SSH + HTTP brute-force protection
                    │  unattended-     │  ← Automatic security patches
                    │  upgrades        │
                    │                  │
                    │  ┌────────────┐  │
                    │  │   Nginx     │  │  ← Rate limiting (login: 5/min, signup: 3/min)
                    │  │   :443      │  │  ← CSP, HSTS, X-Frame-Options, XSS protection
                    │  │             │  │  ← SSL termination (Let's Encrypt, auto-renew)
                    │  │  /api/* →   │  │  ← API: 30 req/s burst 20
                    │  │  127.0.0.1  │  │  ← WS: JWT auth, long timeout
                    │  │  :8081      │  │
                    │  │  /ws/*  →   │  │
                    │  │  127.0.0.1  │  │
                    │  │  :5000      │  │
                    │  └──┬──────┬──┘  │
                    │     │      │     │
                    │     ▼      ▼     │
                    │  ┌──────┐ ┌────┐ │
                    │  │ Java │ │Node│ │  ← JWT tokenVersion invalidation
                    │  │21    │ │22  │ │  ← BCrypt strength 12
                    │  │:8081 │ │:5000│  ← Input validation (Jakarta + Zod)
                    │  │      │ │    │ │  ← Atomic payment state transitions
                    │  │ Non- │ │Non-│ │  ← Constant-time HMAC comparison
                    │  │ root │ │root│ │
                    │  │ R/O  │ │R/O │ │
                    │  └──┬───┘ └────┘ │
                    └─────┼────────────┘
                          │ TLS 1.2+ (SCRAM-SHA-256)
                          ▼
                 ┌──────────────────┐
                 │  MongoDB Atlas    │  ← IP whitelist: VPS + admin IPs only
                 │  M2 (dedicated)  │  ← Encryption at rest (always-on)
                 │  2GB RAM, 5GB    │  ← Automated daily snapshots (7-day retention)
                 │                  │  ← Point-in-time recovery (24h window)
                 │  User: flyhigh-  │  ← Least-privilege DB user (readWrite only)
                 │  prod (readWrite)│
                 └──────────────────┘

  ═══════════════════════════════════════════════════════════════

  Payment Security Flow:
  ┌─────────┐     ┌──────────────┐     ┌──────────┐
  │  Client  │────▶│  FlyHigh     │────▶│ Razorpay │
  │ Browser  │     │  Backend     │     │   API    │
  └─────────┘     └──────────────┘     └──────────┘
       │                                      │
       │  Razorpay Checkout (client-side)     │
       │  Card data → Razorpay directly       │
       │  FlyHigh NEVER sees card numbers     │
       │                                      │
       └──────────────────────────────────────┘
                    │
       ┌────────────┴────────────┐
       │  HMAC-SHA256 signature  │  ← FlyHigh verifies
       │  Constant-time compare  │  ← Timing-attack safe
       │  Atomic findAndModify   │  ← Race-condition proof
       │  Idempotency keys       │  ← Duplicate-payment protection
       │  Webhook defense-in-    │  ← Server-to-server confirmation
       │  depth                  │
       └─────────────────────────┘

  ═══════════════════════════════════════════════════════════════

  Video Call Security Flow:
  ┌──────────┐                              ┌──────────┐
  │  Client   │◄────── WebRTC DTLS-SRTP ────▶│  Expert   │
  │  Browser  │     (end-to-end encrypted)   │  Browser  │
  └────┬─────┘                              └─────┬─────┘
       │                                          │
       │  WSS (TLS 1.2+)                          │  WSS (TLS 1.2+)
       │  JWT httpOnly cookie                     │  JWT httpOnly cookie
       ▼                                          ▼
  ┌─────────────────────────────────────────────────────┐
  │              Signaling Server (Node.js)              │
  │  • JWT verification on every WebSocket connection   │
  │  • Rate limited: 30 events/10s per socket           │
  │  • Helmet security headers                          │
  │  • Graceful shutdown (SIGTERM/SIGINT)               │
  └─────────────────────────────────────────────────────┘
```

---

> **Next Step:** After deploying, run through the checklist in Section 10 and confirm every CRITICAL item before processing real payments or user data.

*See also:*
- [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) — Architecture decision & deployment plan
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — AWS deployment guide
- [SECRETS.md](SECRETS.md) — Secrets reference
- [AWS_SETUP.md](AWS_SETUP.md) — AWS account setup
