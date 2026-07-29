# FlyHigh — Required Secrets

This documents every secret, API key, and credential needed to deploy and run FlyHigh.

---

## GitHub Secrets (set in repo Settings > Secrets and variables > Actions)

| Secret | Purpose | Format |
|--------|---------|--------|
| `AWS_ACCOUNT_ID` | AWS account ID for OIDC role assumption | 12-digit number (e.g., `123456789012`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID embedded in SPA builds | `*.apps.googleusercontent.com` |

---

## AWS Secrets Manager (`flyhigh/{env}/credentials`)

Populate manually before first deploy via AWS Console or CLI.

### Required for all environments

| Key | Purpose | Format |
|-----|---------|--------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/flyhigh2?retryWrites=true&w=majority` |
| `JWT_SECRET` | HMAC-SHA256 signing key for JWT tokens | Base64-encoded 256-bit random value. Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (backend-side verification) | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console → APIs & Services → Credentials |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | `rzp_live_*` for production, `rzp_test_*` for staging |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret | From Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification secret | Custom secret you set in Razorpay Dashboard → Webhooks |

### Required for email (OTP, password reset)

| Key | Purpose | Format |
|-----|---------|--------|
| `MAIL_USERNAME` | Gmail address for sending OTP emails | `your-app@gmail.com` |
| `MAIL_PASSWORD` | Gmail App Password (not your regular password) | 16-char app password from Google Account → Security → App Passwords |

---

## Populating Secrets Manager

### Via AWS CLI

```bash
aws secretsmanager put-secret-value \
  --secret-id flyhigh/staging/credentials \
  --secret-string '{
    "MONGODB_URI": "mongodb+srv://...",
    "JWT_SECRET": "'$(openssl rand -base64 32)'",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "...",
    "RAZORPAY_KEY_ID": "rzp_test_...",
    "RAZORPAY_KEY_SECRET": "...",
    "RAZORPAY_WEBHOOK_SECRET": "...",
    "MAIL_USERNAME": "...",
    "MAIL_PASSWORD": "..."
  }'

aws secretsmanager put-secret-value \
  --secret-id flyhigh/production/credentials \
  --secret-string '{
    "MONGODB_URI": "mongodb+srv://...",
    "JWT_SECRET": "'$(openssl rand -base64 32)'",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "...",
    "RAZORPAY_KEY_ID": "rzp_live_...",
    "RAZORPAY_KEY_SECRET": "...",
    "RAZORPAY_WEBHOOK_SECRET": "...",
    "MAIL_USERNAME": "...",
    "MAIL_PASSWORD": "..."
  }'
```

### Via AWS Console

1. Go to AWS Secrets Manager → Secrets
2. Find `flyhigh/staging/credentials` or `flyhigh/production/credentials`
3. Click "Retrieve secret value" → "Edit"
4. Add the key-value pairs listed above
5. Save

---

## Certificate ARNs (for custom domains)

Set in `infra/cdk.json` under each environment's `certificateArn` field. Use `"PLACEHOLDER"` if you don't have certificates yet (custom domains will be skipped).

Request certificates in **AWS Certificate Manager (us-east-1)** for:
- `flyhigh.com`
- `*.flyhigh.com`
- `api.flyhigh.com`
- `ws.flyhigh.com`
- `staging.flyhigh.com`

---

## GitHub Environment Protection Rules

After first deploy, configure these in repo Settings > Environments:

### Staging
- No required reviewers (auto-deploy on push to main)

### Production
- Required reviewers: at least 1
- Wait timer: 5 minutes (optional, allows for abort window)
- Deployment branches: `main` only

---

## Rollback Procedure

If a production deployment fails:

### Automatic (CloudFormation)
CloudFormation automatically rolls back on stack update failure. No manual intervention needed for CDK/CloudFormation errors.

### Manual SPA Rollback
```bash
# List S3 bucket versions to find the previous deployment
aws s3api list-object-versions \
  --bucket flyhigh-production-spa \
  --prefix index.html

# Restore previous version
aws s3api copy-object \
  --bucket flyhigh-production-spa \
  --copy-source flyhigh-production-spa/index.html?versionId=PREVIOUS_VERSION_ID \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### If all else fails
```bash
# Re-deploy from a known-good commit
git checkout <known-good-sha>
# Then trigger deploy-production workflow manually
```
