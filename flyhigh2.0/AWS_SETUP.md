# FlyHigh — AWS Account Setup Guide

**For:** First-time deployers (no prior AWS experience assumed)
**Time:** ~2 hours for initial setup
**Cost:** Most resources are free tier eligible or cost pennies in dev

---

## Overview

You'll create these AWS resources (one-time, never changes):

```
AWS Account
├── IAM OIDC Provider (GitHub → AWS trust)
├── IAM Role: github-actions-cdk (deployment permissions)
├── Secrets Manager: flyhigh/staging/credentials
├── Secrets Manager: flyhigh/production/credentials
├── ACM Certificates: *.flyhigh.com, api.*, ws.* (optional, for custom domains)
└── Route53 Hosted Zone (optional, if domain is in AWS)
```

---

## Step 1: Create an AWS Account (Skip if you have one)

1. Go to https://aws.amazon.com → "Create an AWS Account"
2. Enter email, password, account name (e.g., "FlyHigh")
3. Add credit card (required for identity verification; free tier is generous)
4. Complete phone verification
5. Choose "Basic" support plan (free)

**After account creation:**
- Go to IAM → Enable "IAM Identity Center" if prompted
- Create an IAM admin user (don't use root account daily)
- Install AWS CLI: https://aws.amazon.com/cli/

---

## Step 2: Install Prerequisites

### AWS CLI (Command Line)
```powershell
# Windows (PowerShell as Administrator)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

```bash
# Mac
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

### Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: [from IAM user you created]
# AWS Secret Access Key: [from IAM user you created]
# Default region name: us-east-1
# Default output format: json
```

Verify:
```bash
aws sts get-caller-identity
# Should return your account ID and ARN
```

---

## Step 3: Set Up OIDC (GitHub → AWS Trust)

This lets GitHub Actions deploy to AWS **without storing AWS credentials in GitHub Secrets**. GitHub gets a short-lived token by proving its identity.

### 3a: Create the OIDC Provider

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

### 3b: Create the IAM Role for GitHub Actions

Create a file called `github-actions-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/flyhigh:*"
        }
      }
    }
  ]
}
```

Replace:
- `ACCOUNT_ID` with your AWS account ID
- `YOUR_GITHUB_USERNAME` with your GitHub username or org name

Create the role:
```bash
aws iam create-role \
  --role-name github-actions-cdk \
  --assume-role-policy-document file://github-actions-trust-policy.json
```

### 3c: Attach Permissions to the Role

Create `github-actions-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigatewayv2:*",
        "apigateway:*",
        "cloudfront:*",
        "dynamodb:*",
        "secretsmanager:*",
        "cloudwatch:*",
        "logs:*",
        "iam:PassRole",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy",
        "wafv2:*",
        "sns:*",
        "acm:*",
        "route53:*",
        "ecr:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Apply it:
```bash
aws iam put-role-policy \
  --role-name github-actions-cdk \
  --policy-name cdk-deploy \
  --policy-document file://github-actions-policy.json
```

Also attach AWS managed policies:
```bash
aws iam attach-role-policy \
  --role-name github-actions-cdk \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-role-policy \
  --role-name github-actions-cdk \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name github-actions-cdk \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess
```

### 3d: Add AWS Account ID to GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `AWS_ACCOUNT_ID`
4. Value: Your 12-digit AWS account ID (`aws sts get-caller-identity --query Account --output text`)

---

## Step 4: Populate AWS Secrets Manager

The CDK `PlatformStack` creates empty secrets. You must populate them before the first Lambda deploy.

### Staging Secrets

```bash
# Generate a JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Your JWT_SECRET: $JWT_SECRET"  # Save this!

aws secretsmanager put-secret-value \
  --secret-id flyhigh/staging/credentials \
  --secret-string "{
    \"MONGODB_URI\": \"mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net/flyhigh2?retryWrites=true&w=majority\",
    \"JWT_SECRET\": \"$JWT_SECRET\",
    \"GOOGLE_CLIENT_ID\": \"YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com\",
    \"GOOGLE_CLIENT_SECRET\": \"YOUR_GOOGLE_CLIENT_SECRET\",
    \"RAZORPAY_KEY_ID\": \"rzp_test_YOUR_TEST_KEY\",
    \"RAZORPAY_KEY_SECRET\": \"YOUR_RAZORPAY_SECRET\",
    \"RAZORPAY_WEBHOOK_SECRET\": \"YOUR_WEBHOOK_SECRET\",
    \"MAIL_USERNAME\": \"your-app@gmail.com\",
    \"MAIL_PASSWORD\": \"YOUR_GMAIL_APP_PASSWORD\"
  }"
```

### Production Secrets

```bash
JWT_SECRET_PROD=$(openssl rand -base64 32)
echo "Your PROD JWT_SECRET: $JWT_SECRET_PROD"  # Save this! Different from staging!

aws secretsmanager put-secret-value \
  --secret-id flyhigh/production/credentials \
  --secret-string "{
    \"MONGODB_URI\": \"mongodb+srv://YOUR_PROD_USER:YOUR_PROD_PASS@YOUR_PROD_CLUSTER.mongodb.net/flyhigh_prod?retryWrites=true&w=majority\",
    \"JWT_SECRET\": \"$JWT_SECRET_PROD\",
    \"GOOGLE_CLIENT_ID\": \"YOUR_PROD_GOOGLE_CLIENT_ID.apps.googleusercontent.com\",
    \"GOOGLE_CLIENT_SECRET\": \"YOUR_PROD_GOOGLE_CLIENT_SECRET\",
    \"RAZORPAY_KEY_ID\": \"rzp_live_YOUR_LIVE_KEY\",
    \"RAZORPAY_KEY_SECRET\": \"YOUR_PROD_RAZORPAY_SECRET\",
    \"RAZORPAY_WEBHOOK_SECRET\": \"YOUR_PROD_WEBHOOK_SECRET\",
    \"MAIL_USERNAME\": \"your-prod-app@gmail.com\",
    \"MAIL_PASSWORD\": \"YOUR_PROD_GMAIL_APP_PASSWORD\"
  }"
```

**Important:** Staging and production MUST use different secrets (different MongoDB databases, different JWT secrets, different API keys).

---

## Step 5: MongoDB Atlas Setup

If you don't have a MongoDB Atlas cluster yet:

1. Go to https://cloud.mongodb.com → Sign up (free tier = 512MB, enough for dev)
2. Create a "Shared" cluster (FREE)
3. Choose AWS, us-east-1 region
4. Click "Create Cluster" (takes 2-3 minutes)

### Create Database Users

1. Go to Database Access → "Add New Database User"
2. Username: `flyhigh-staging` / Password: [generate strong password]
3. Privileges: "Read and write to any database"
4. Repeat for `flyhigh-production` (different password!)

### Network Access

1. Go to Network Access → "Add IP Address"
2. Click "Allow Access from Anywhere" (or add your specific IP for security)
3. Confirm

### Get Connection String

1. Go to Databases → "Connect" → "Drivers"
2. Select Java, version 4.3 or later
3. Copy the connection string
4. Replace `<password>` with your database user's password
5. Use this as `MONGODB_URI` in Secrets Manager (Step 4)

---

## Step 6: Google OAuth Setup

1. Go to https://console.cloud.google.com → Create a project (e.g., "FlyHigh")
2. APIs & Services → OAuth consent screen
   - Choose "External"
   - Fill in app name, contact email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your email)
3. APIs & Services → Credentials → "Create Credentials" → "OAuth Client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (local dev)
     - `https://staging.flyhigh.com` (staging)
     - `https://flyhigh.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:5173` (local dev)
     - `https://staging.flyhigh.com` (staging)
     - `https://flyhigh.com` (production)
4. Copy the Client ID and Client Secret → add to Secrets Manager

**GitHub Secret:** Add `VITE_GOOGLE_CLIENT_ID` to GitHub repo secrets (same as the web client ID above).

---

## Step 7: Razorpay Setup

1. Go to https://dashboard.razorpay.com → Sign up
2. Settings → API Keys
   - Test mode (for staging): `rzp_test_*`
   - Live mode (for production): `rzp_live_*` (requires business verification)
3. Settings → Webhooks
   - URL: `https://api.flyhigh.com/api/webhooks/razorpay` (production)
   - URL: `https://api.staging.flyhigh.com/api/webhooks/razorpay` (staging)
   - Events: `payment.captured`
   - Copy the Webhook Secret → add to Secrets Manager

---

## Step 8: Gmail App Password (for OTP Emails)

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (required for app passwords)
3. Go to App Passwords → "Generate"
4. Select "Mail" + "Other (FlyHigh)"
5. Copy the 16-character password → add to Secrets Manager as `MAIL_PASSWORD`

---

## Step 9: Custom Domains & SSL (Optional — Skip If Just Testing)

If you want `flyhigh.com` (and subdomains) to work:

### 9a: Request SSL Certificates (AWS Certificate Manager)

```bash
# Must be in us-east-1 for CloudFront!
aws acm request-certificate \
  --domain-name flyhigh.com \
  --subject-alternative-names "*.flyhigh.com" "api.flyhigh.com" "ws.flyhigh.com" "staging.flyhigh.com" \
  --validation-method DNS \
  --region us-east-1
```

This outputs a certificate ARN. Add DNS validation records in your domain registrar.

### 9b: Update cdk.json

Edit `infra/cdk.json` — replace `"PLACEHOLDER"` with the actual certificate ARN:

```json
"staging": {
  "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```

### 9c: If Domain Is in Route53

Import your hosted zone and the CDK can auto-create DNS records:

```bash
# Find your hosted zone ID
aws route53 list-hosted-zones

# The CDK will create A/AAAA alias records pointing to CloudFront/API Gateway
# (Add Route53 alias records in app-stack.ts if needed)
```

### 9d: If Domain Is Elsewhere (GoDaddy, Namecheap, etc.)

After CDK deploys, you'll need to manually create CNAME/A records:
- `flyhigh.com` → CloudFront distribution domain (`d123.cloudfront.net`)
- `api.flyhigh.com` → API Gateway domain (`d-xxx.execute-api.us-east-1.amazonaws.com`)
- `ws.flyhigh.com` → WebSocket API domain
- `staging.flyhigh.com` → Staging CloudFront distribution

Get these values from `cdk deploy` output or CloudFormation console.

---

## Step 10: Subscribe to SNS Alarm Topic

After first CDK deploy (Phase 5), the SNS alarm topic needs your email:

1. Go to AWS SNS → Topics
2. Find `flyhigh-staging-alarms` or `flyhigh-production-alarms`
3. Create Subscription → Protocol: Email → Enter your email
4. Confirm the subscription via email link
5. Now you'll get emails when your app has 5+ errors in 5 minutes

---

## Verification Checklist

Before moving to Phase 5 (deployment), verify:

- [ ] `aws sts get-caller-identity` returns your account ID
- [ ] OIDC provider exists: `aws iam list-open-id-connect-providers`
- [ ] IAM role exists: `aws iam get-role --role-name github-actions-cdk`
- [ ] GitHub secret `AWS_ACCOUNT_ID` is set
- [ ] GitHub secret `VITE_GOOGLE_CLIENT_ID` is set
- [ ] Staging secrets populated: `aws secretsmanager get-secret-value --secret-id flyhigh/staging/credentials`
- [ ] Production secrets populated: `aws secretsmanager get-secret-value --secret-id flyhigh/production/credentials`
- [ ] MongoDB Atlas cluster is running (check cloud.mongodb.com)
- [ ] MongoDB network access allows connections from anywhere (or AWS IPs)
- [ ] Google OAuth credentials created and authorized origins set
- [ ] Razorpay test keys work in test mode
- [ ] Gmail app password generated and tested
- [ ] `infra/cdk.json` certificate ARN updated (or left as PLACEHOLDER if skipping custom domains)
- [ ] Can run `cd infra && npm ci && npx cdk synth --all --context env=staging` without errors

---

## What Everything Costs (Rough Estimate)

| Service | Staging (monthly) | Production (monthly) |
|---------|-------------------|---------------------|
| Lambda (backend) | ~$0-5 (free tier) | ~$20-50 |
| Lambda (signaling) | ~$0-2 (free tier) | ~$5-15 |
| API Gateway | ~$0-3 | ~$10-30 |
| DynamoDB | ~$0 (free tier) | ~$5-10 |
| S3 + CloudFront | ~$1-3 | ~$10-50 |
| Secrets Manager | ~$0.80 ($0.40/secret) | ~$0.80 |
| WAF | ~$8 (WebACL $5 + rules $1 each) | ~$8 |
| SNS (alarms) | ~$0 | ~$0 |
| **Total** | **~$10-20/month** | **~$60-160/month** |

Free tier covers most of staging costs. Production costs scale with traffic.

---

## Next: Phase 5 — First Deployment

Once everything above is verified, proceed to deploy:
1. Push to `main` branch (first deploy is automatic for staging)
2. Watch the GitHub Actions run
3. After staging is live and verified, trigger production deploy
4. Subscribe to SNS alarm notifications
