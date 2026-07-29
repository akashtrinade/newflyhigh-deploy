# FlyHigh 2.0 -- Phase 5 First Deployment Guide

> **Audience:** First-time deployers. No prior AWS or CI/CD experience assumed.
> **Estimated time:** 2 hours for AWS setup (one-time) + 30 minutes for first deploy + 1 hour for full verification.
> **Cost:** Staging runs approximately $10-20/month (mostly free tier). Production runs $60-160/month.

---

## Table of Contents

1. [Pre-flight Checklist](#1-pre-flight-checklist)
2. [First Deploy to Staging -- Step by Step](#2-first-deploy-to-staging----step-by-step)
3. [What to Expect During First Deploy](#3-what-to-expect-during-first-deploy)
4. [How to Watch GitHub Actions Logs](#4-how-to-watch-github-actions-logs)
5. [Post-deploy Verification](#5-post-deploy-verification)
6. [Full User Flow Testing](#6-full-user-flow-testing)
7. [Production Deployment with Approval Gate](#7-production-deployment-with-approval-gate)
8. [Common Issues and Troubleshooting](#8-common-issues-and-troubleshooting)
9. [How to Read CloudWatch Logs](#9-how-to-read-cloudwatch-logs)
10. [How to Rollback](#10-how-to-rollback)

---

## 1. Pre-flight Checklist

Before you push to `main` for the first time, verify every item below. Each one takes 1-5 minutes. Skipping any item will cause the first deploy to fail.

### 1.1 AWS Account and CLI

Open a terminal and run:

```bash
aws sts get-caller-identity
```

You should see something like:

```json
{
    "Account": "123456789012",
    "UserId": "AIDA...",
    "Arn": "arn:aws:iam::123456789012:user/admin"
}
```

If you get an error, run `aws configure` and enter your IAM user's access key, secret key, and region (`us-east-1`).

**Check:** The account ID shown here. Write it down -- you will need it several times.
`123456789012` is just an example. Your real account ID is different.

### 1.2 GitHub OIDC Trust (GitHub Actions can talk to AWS)

This is the mechanism that lets GitHub Actions deploy to AWS without storing AWS credentials in GitHub Secrets. GitHub proves its identity and gets a short-lived token.

Run this to verify the OIDC provider exists:

```bash
aws iam list-open-id-connect-providers
```

Look for a line containing `token.actions.githubusercontent.com`. If it is not there, you need to create it:

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
```

Now verify the IAM role exists:

```bash
aws iam get-role --role-name github-actions-cdk
```

If the role is missing, follow the complete setup in `AWS_SETUP.md` Step 3. The role must trust your specific GitHub repository (`repo:YOUR_GITHUB_USERNAME/flyhigh:*`). If it trusts a different repo, the deploy will fail with an access-denied error.

### 1.3 GitHub Repository Secrets

Go to your GitHub repository on github.com, then:

```
Settings → Secrets and variables → Actions → Repository secrets
```

Verify these two secrets exist:

| Secret Name | What It Is | How to Check |
|-------------|-----------|--------------|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account number | Must match the output of `aws sts get-caller-identity --query Account --output text` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for the SPA | Format: `*.apps.googleusercontent.com`. Used to build the React app with the correct Google Sign-In button. |

**Check:** Open each secret and verify the value is correct. A typo in `AWS_ACCOUNT_ID` means GitHub Actions cannot assume the role, and the deploy fails immediately.

### 1.4 AWS Secrets Manager -- Staging Credentials

Verify the staging secrets exist and contain valid values:

```bash
aws secretsmanager get-secret-value \
  --secret-id flyhigh/staging/credentials \
  --query SecretString --output text
```

You should see a JSON object with these keys:

| Key | Example Value | Notes |
|-----|---------------|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/flyhigh2?retryWrites=true&w=majority` | Must start with `mongodb+srv://`. The database name at the end should be `flyhigh2` for staging. |
| `JWT_SECRET` | A long base64 string | Generate with: `openssl rand -base64 32`. Must be different from production. |
| `GOOGLE_CLIENT_ID` | `*.apps.googleusercontent.com` | From Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | A string from Google Cloud Console | From the same OAuth credential. |
| `RAZORPAY_KEY_ID` | `rzp_test_*` | Razorpay test mode key. Never use a `rzp_live_*` key here. |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | Corresponds to the test key above. |
| `RAZORPAY_WEBHOOK_SECRET` | A string you set in Razorpay Dashboard | Used to verify webhook signatures. |
| `MAIL_USERNAME` | `your-app@gmail.com` | Gmail address for sending OTP emails. |
| `MAIL_PASSWORD` | 16-character app password | NOT your regular Gmail password. Generated from Google Account → Security → App Passwords. |

If the secret is empty or missing, populate it now:

```bash
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT_SECRET: $JWT_SECRET  <-- save this!"

aws secretsmanager put-secret-value \
  --secret-id flyhigh/staging/credentials \
  --secret-string '{
    "MONGODB_URI": "mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net/flyhigh2?retryWrites=true&w=majority",
    "JWT_SECRET": "'"$JWT_SECRET"'",
    "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "YOUR_GOOGLE_SECRET",
    "RAZORPAY_KEY_ID": "rzp_test_YOUR_KEY",
    "RAZORPAY_KEY_SECRET": "YOUR_RAZORPAY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET": "YOUR_WEBHOOK_SECRET",
    "MAIL_USERNAME": "your-app@gmail.com",
    "MAIL_PASSWORD": "YOUR_GMAIL_APP_PASSWORD"
  }'
```

### 1.5 MongoDB Atlas -- Network Access

The Lambda functions run from AWS IP addresses. If your MongoDB Atlas cluster only allows specific IPs, the backend will fail to connect.

1. Go to https://cloud.mongodb.com
2. Navigate to your cluster → Network Access
3. Either add `0.0.0.0/0` (allow from anywhere -- simple, less secure) or add the specific IP ranges for your AWS region
4. Click Confirm

**Check:** The cluster status in MongoDB Atlas shows "Active" and your database user has read/write access.

### 1.6 Google OAuth -- Authorized Origins

Your staging domain must be listed as an authorized JavaScript origin in Google Cloud Console. Without this, Google Sign-In will show an error.

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Click your OAuth 2.0 Client ID
3. Under "Authorized JavaScript origins", verify these are present:
   - `http://localhost:5173` (local dev)
   - `https://staging.flyhigh.com` (staging -- or whatever your staging domain is)
4. Under "Authorized redirect URIs", verify the same URLs are listed
5. Click Save

### 1.7 CDK Can Synthesize Without Errors

This verifies your CDK code compiles and can generate CloudFormation templates:

```bash
cd /d/akshay/flyhigh/flyhigh2.0/infra
npm ci
npx cdk synth --all --context env=staging
```

The command should complete without errors. It will output a lot of YAML/JSON -- that is the CloudFormation template. As long as it finishes without `Error:` or `FAILED`, you are good.

**Check:** The output should mention `flyhigh-platform-staging` and `flyhigh-app-staging` stack names.

### 1.8 Local Dev Still Works

Make sure nothing is broken before deploying:

```bash
cd /d/akshay/flyhigh/flyhigh2.0

# Backend compiles
cd flyhigh-backend && ./mvnw compile --quiet && cd ..

# Frontend type-checks
cd flyhigh-ui && npx tsc -b && cd ..

# Signaling server starts (Ctrl+C after it prints "Server running")
cd flyhigh-signaling-server && timeout 5 node server.js 2>&1 || true && cd ..
```

### Pre-flight Summary

All of these must be true before you deploy:

- [ ] `aws sts get-caller-identity` returns your account ID
- [ ] `aws iam get-role --role-name github-actions-cdk` succeeds
- [ ] GitHub secret `AWS_ACCOUNT_ID` is set and is correct
- [ ] GitHub secret `VITE_GOOGLE_CLIENT_ID` is set
- [ ] `flyhigh/staging/credentials` in Secrets Manager has all 9 keys with valid values
- [ ] MongoDB Atlas allows connections from AWS/AWS IPs
- [ ] Google OAuth authorized origins include your staging domain
- [ ] `npx cdk synth --all --context env=staging` succeeds
- [ ] Backend compiles, frontend type-checks, signaling server starts

---

## 2. First Deploy to Staging -- Step by Step

### How Deployment Works

When you push to the `main` branch, GitHub Actions automatically:

1. **Builds and tests** all three services in parallel (frontend, backend, signaling)
2. **Deploys the CDK stacks** to AWS -- this creates or updates all infrastructure
3. **Uploads the React SPA** to S3
4. **Invalidates the CloudFront cache** so users see the new version immediately
5. **Runs a smoke test** -- visits the staging URL and verifies it returns HTTP 200

Staging deploys automatically on every push to `main`. No manual approval needed.

Production deploys after staging succeeds, but waits for a human reviewer to approve it (the "approval gate").

### Step 2.1: Make Sure You Are on `main`

```bash
cd /d/akshay/flyhigh/flyhigh2.0
git branch
# Should show * main
```

If you are on a different branch, switch:

```bash
git checkout main
git pull origin main
```

### Step 2.2: Push to `main`

```bash
git push origin main
```

That is it. The deploy starts automatically. You do not need to click anything in the GitHub UI (for staging).

### Step 2.3: Where to Watch

1. Go to your GitHub repository on github.com
2. Click the **Actions** tab at the top
3. You will see a workflow run titled something like "Deploy FlyHigh" with a yellow spinning circle
4. Click it to see the live logs

The workflow has these jobs running in sequence:

```
build-and-test (3 parallel jobs)
    │
    ├── frontend ── npm ci → npm run build → typecheck ── about 2-3 min
    ├── backend  ── mvnw package → mvnw test      ── about 4-6 min
    └── signaling ── npm ci → syntax check         ── about 30 seconds
         │
         ▼
deploy-staging ── cdk deploy → S3 upload → CloudFront invalidation → smoke test
         │         about 10-20 min for first deploy, 3-5 min for subsequent
         ▼
deploy-production ── same as staging, but waits for approval
                     (you'll approve this later, in Section 7)
```

### Step 2.4: Wait for Build and Test

The three build-and-test jobs run in parallel. Watch the logs for errors:

- **Frontend:** Should show `✓ built in ...` and no TypeScript errors
- **Backend:** Should show `BUILD SUCCESS` and all tests passing
- **Signaling:** Should show `OK: lambda.js exports handler function`

If any of these fail, the pipeline stops. Fix the error on your branch, push again.

### Step 2.5: Wait for CDK Deploy

This is the longest step. The first deploy creates all AWS resources from scratch. Subsequent deploys are faster because CloudFormation only updates what changed.

The `deploy-staging` job does these things in order:

1. Downloads the backend JAR (built in the previous step)
2. Assumes the AWS IAM role via OIDC
3. Runs `cdk deploy --all --context env=staging`
4. This triggers CloudFormation to create two stacks:

   **Platform Stack** (`flyhigh-platform-staging`) -- deploys first:
   - DynamoDB `connections` table (with 2 GSIs)
   - DynamoDB `rooms` table
   - Secrets Manager secret
   - 2 CloudWatch Log Groups

   **App Stack** (`flyhigh-app-staging`) -- deploys second:
   - Backend Lambda function (Java 21, SnapStart)
   - Signaling Lambda function (Node.js 22)
   - HTTP API Gateway → Backend Lambda
   - WebSocket API Gateway → Signaling Lambda
   - S3 bucket for the SPA
   - CloudFront distribution
   - WAF WebACL (AWS managed rules)
   - SNS alarm topic
   - 2 CloudWatch alarms

5. After CDK finishes, it uploads the React SPA build to S3
6. Invalidates the CloudFront cache
7. Runs a smoke test against the staging URL

### Step 2.6: Did It Succeed?

If the workflow shows a green checkmark, staging is live.

You will also see in the deploy-staging logs:

```
SMOKE TEST PASSED: CloudFront returns HTTP 200
```

If you see this, your app is publicly accessible.

**Note about custom domains:** If you have not set up a custom domain (certificate ARN is `PLACEHOLDER` in `cdk.json`), the smoke test will fail because `https://staging.flyhigh.com` does not exist. This is expected. In that case, find your CloudFront URL in the AWS Console (CloudFront → Distributions → Domain name, looks like `d123.cloudfront.net`). Use that URL for testing. The HTTP API endpoint is available at the URL shown in CloudFormation stack outputs under `HttpApiUrl` (looks like `https://abc123.execute-api.us-east-1.amazonaws.com`).

---

## 3. What to Expect During First Deploy

### Timeline

| Phase | Duration | What Is Happening |
|-------|----------|-------------------|
| Build & Test (3 parallel) | 4-6 min | Compiling Java, building React, running tests |
| CDK Deploy -- Platform Stack | 2-3 min | CloudFormation creates DynamoDB tables, Secrets Manager, Log Groups |
| CDK Deploy -- App Stack | 8-15 min | CloudFormation creates Lambda, API Gateway, S3, CloudFront, WAF, SNS, CloudWatch alarms |
| S3 Upload + CloudFront Invalidation | 1-2 min | Uploading the React build, telling CloudFront to refresh |
| Smoke Test | 30 seconds | Curling the staging URL to verify it responds |

**Total first deploy:** approximately 15-25 minutes.
**Subsequent deploys:** approximately 5-8 minutes (CloudFormation updates are faster than creates).

### Resources Created (approximately 30)

The two CloudFormation stacks together create about 30 AWS resources. Here is what each one is:

**Platform Stack (~12 resources):**

| Resource | Purpose |
|----------|---------|
| DynamoDB: ConnectionsTable | Tracks active WebSocket connections (connectionId, email, userId, role) |
| DynamoDB: ConnectionsTable GSI (email-index) | Look up connections by email |
| DynamoDB: ConnectionsTable GSI (userId-index) | Look up connections by userId |
| DynamoDB: RoomsTable | Tracks active WebRTC rooms (roomId, participants, TTL) |
| Secrets Manager: flyhigh/staging/credentials | MongoDB URI, JWT secret, API keys |
| CloudWatch Log Group: Backend | Captures backend Lambda stdout/stderr |
| CloudWatch Log Group: Signaling | Captures signaling Lambda stdout/stderr |
| + IAM roles, policies, CDK metadata (~5 more) | Permissions glue |

**App Stack (~20 resources):**

| Resource | Purpose |
|----------|---------|
| Lambda: Backend (Java 21, 1024MB, SnapStart) | Runs the Spring Boot REST API |
| Lambda: Signaling (Node.js 22, 256MB) | Handles WebSocket connect/disconnect/message |
| API Gateway: HTTP API | Routes HTTP requests to backend Lambda |
| API Gateway: HTTP API Stage | Throttling, access logging |
| API Gateway: WebSocket API | Routes WebSocket traffic to signaling Lambda |
| API Gateway: WebSocket Stage | Throttling, access logging |
| S3: SPA Bucket (versioned) | Stores the React build files |
| CloudFront Distribution | CDN for the SPA |
| WAF WebACL | AWS managed SQL injection + common rule sets |
| SNS Topic | Alarm notifications |
| CloudWatch Alarm: Backend 5xx | Triggers if backend has >5 errors in 5 minutes |
| CloudWatch Alarm: Signaling 5xx | Triggers if signaling has >5 errors in 5 minutes |
| + IAM roles, policies, CDK metadata (~8 more) | Permissions glue |

### What SnapStart Does (and Why the First Deploy Takes Longer)

The backend Lambda uses **SnapStart**. When Lambda first publishes a version, it:

1. Starts a new Java JVM
2. Loads Spring Boot (which scans all classes, connects to MongoDB, initializes security filters -- this takes 5-10 seconds)
3. Takes a snapshot of the fully-initialized JVM
4. Saves that snapshot

On subsequent cold starts, Lambda resumes from the snapshot instead of re-initializing Spring Boot. This reduces cold start latency from 5-10 seconds to under 1 second.

The snapshotting process adds 2-3 minutes to the first CDK deploy (but only once per new Lambda code -- subsequent deploys of unchanged Lambda code skip it).

### What You Will See in the GitHub Actions Log During CDK Deploy

The CDK deploy output looks like this. Every `CREATE_COMPLETE` or `UPDATE_COMPLETE` means one resource is done:

```
flyhigh-platform-staging
flyhigh-platform-staging: creating CloudFormation changeset...
flyhigh-platform-staging: deploying...
 ✅  flyhigh-platform-staging

flyhigh-app-staging
flyhigh-app-staging: creating CloudFormation changeset...
flyhigh-app-staging: deploying...
  CREATE_COMPLETE  AWS::Lambda::Function        BackendLambda
  CREATE_COMPLETE  AWS::Lambda::Function        SignalingLambda
  CREATE_COMPLETE  AWS::ApiGatewayV2::Api       HttpApi
  CREATE_COMPLETE  AWS::ApiGatewayV2::Api       WebSocketApi
  CREATE_COMPLETE  AWS::S3::Bucket              SpaBucket
  CREATE_COMPLETE  AWS::CloudFront::Distribution SpaDistribution
  ... (more resources)
 ✅  flyhigh-app-staging
```

If you see `CREATE_FAILED` or `UPDATE_FAILED`, CloudFormation will automatically roll back to the previous state. Do not panic. Read the error message in the log (it tells you exactly what resource failed and why), fix the issue, and push again.

---

## 4. How to Watch GitHub Actions Logs

### Where to Find the Logs

1. Go to `https://github.com/YOUR_USERNAME/flyhigh/actions`
2. Click the topmost workflow run (the one with the yellow circle or green checkmark)
3. You will see a visual graph of jobs. Click any job box to see its logs.
4. The "Deploy Staging" job is the most interesting one -- it shows the CDK output.

### Understanding the Job Graph

```
┌─────────────────────────────────────────────────────┐
│  build-and-test                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ frontend │  │ backend  │  │signaling │  3 jobs  │
│  │ 2m 34s   │  │ 5m 12s   │  │ 0m 28s   │  parallel│
│  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  deploy-staging  (waits for build-and-test)         │
│  ┌──────────────────────────────────────────────┐   │
│  │ CDK Deploy → S3 Upload → Invalidate → Smoke  │   │
│  │ 12m 45s                                      │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  deploy-production  (waits for deploy-staging)      │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⏸ Waiting for approval...                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### What to Look For

**Normal, healthy log lines:**

```
Run npm ci
✓ built in 12.34s
BUILD SUCCESS
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
OK: lambda.js exports handler function
CREATE_COMPLETE  AWS::DynamoDB::Table  ConnectionsTable
CREATE_COMPLETE  AWS::Lambda::Function  BackendLambda
✅  flyhigh-app-staging
upload: dist/index.html to s3://flyhigh-staging-spa/index.html
Invalidation created: IXXXXXXXXXXXX
SMOKE TEST PASSED: CloudFront returns HTTP 200
```

**Log lines that indicate a problem (and what to do):**

| Log Line | What It Means | What to Do |
|----------|---------------|------------|
| `Error: Could not find a package.json` | npm install failed -- wrong directory | Check that the repo was cloned fully |
| `BUILD FAILURE` | Maven compilation error | Read the error above it in the log. Usually a Java compile error. |
| `npm ERR! code E404` | A package is not found | Check `package.json` for typos |
| `AccessDenied` | IAM role does not have permission | The `github-actions-cdk` role is missing policies. See Section 8. |
| `ResourceAlreadyExistsException` | A resource with that name already exists | Someone manually created it in AWS. Delete it or rename in CDK. |
| `CREATE_FAILED` | CloudFormation could not create a resource | Read the status reason in the log. Common causes: exceeded account limits, missing permissions, naming conflicts. |
| `UPDATE_ROLLBACK_FAILED` | CloudFormation is stuck | This is serious. See Section 8 under "Rollback failures." |
| `SMOKE TEST FAILED: CloudFront returned HTTP 503` | CloudFront has not propagated yet | Wait 2-3 more minutes and check manually. If persistent, CloudFront origin may be misconfigured. |

### Getting More Detail

If a step fails and the default log is not enough, you can:

1. Click the gear icon next to the step name -- it expands to show raw timestamps
2. Look at the "Raw log" link at the top of the log viewer
3. For CDK deploy failures, scroll up from the failure message -- the actual error is often 20-50 lines above the final "failed" line

---

## 5. Post-deploy Verification

After the GitHub Actions workflow completes with a green checkmark, verify everything works in AWS.

### 5.1 Check CloudFormation Stacks

```bash
aws cloudformation describe-stacks --stack-name flyhigh-platform-staging --query "Stacks[0].StackStatus"
# Should show: CREATE_COMPLETE or UPDATE_COMPLETE

aws cloudformation describe-stacks --stack-name flyhigh-app-staging --query "Stacks[0].StackStatus"
# Should show: CREATE_COMPLETE or UPDATE_COMPLETE
```

If either shows `ROLLBACK_COMPLETE`, the deploy failed and rolled back. Check the CloudFormation Events tab in the AWS Console for the specific error.

### 5.2 Check Lambda Functions

```bash
# Backend Lambda
aws lambda get-function --function-name flyhigh-backend-staging --query "Configuration.{Runtime:Runtime, Memory:MemorySize, State:State, LastModified:LastModified}"

# Signaling Lambda
aws lambda get-function --function-name flyhigh-signaling-staging --query "Configuration.{Runtime:Runtime, Memory:MemorySize, State:State, LastModified:LastModified}"
```

Both should show `State: Active`. The backend should show `Runtime: java21` and the signaling should show `Runtime: nodejs22.x`.

### 5.3 Check DynamoDB Tables

```bash
# List tables matching the staging pattern
aws dynamodb list-tables --query "TableNames[?contains(@, 'staging')]"
```

You should see two tables:
- `flyhigh-staging-connections`
- `flyhigh-staging-rooms`

Both should be empty right now (no WebSocket connections yet). That is fine.

### 5.4 Check the HTTP API (Backend)

Find your HTTP API endpoint:

```bash
aws cloudformation describe-stacks \
  --stack-name flyhigh-app-staging \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text
```

This outputs something like `https://abc123.execute-api.us-east-1.amazonaws.com`.

Test it:

```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name flyhigh-app-staging \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text)

# Health check (the backend might not have a dedicated /health endpoint --
# try a public endpoint like the login page or a GET that doesn't need auth)
curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/auth/login"
```

- **HTTP 405 (Method Not Allowed):** This is GOOD. It means the API is reachable. `/api/auth/login` is a POST endpoint, so a GET returns 405 -- but the API Gateway is routing correctly.
- **HTTP 200:** Also good -- means the endpoint responded.
- **HTTP 5xx:** Bad. The backend Lambda is erroring. Check CloudWatch logs.
- **No response / timeout:** The API Gateway or Lambda is not configured correctly.

### 5.5 Check the WebSocket API

Find your WebSocket API endpoint:

```bash
aws cloudformation describe-stacks \
  --stack-name flyhigh-app-staging \
  --query "Stacks[0].Outputs[?OutputKey=='WsApiUrl'].OutputValue" \
  --output text
```

This outputs something like `wss://xyz456.execute-api.us-east-1.amazonaws.com/staging`.

You can test it with `wscat`:

```bash
npm install -g wscat
wscat -c "wss://xyz456.execute-api.us-east-1.amazonaws.com/staging"
# You should see: Connected (press Ctrl+C to exit)
```

If it connects, the WebSocket API is working. After connecting, check DynamoDB:

```bash
aws dynamodb scan --table-name flyhigh-staging-connections --max-items 5
```

You should see one item with your `connectionId`. After a few seconds, disconnect `wscat` and the item will be removed (the disconnect route deletes it).

### 5.6 Check CloudFront (Frontend)

Find your CloudFront domain:

```bash
aws cloudformation describe-stacks \
  --stack-name flyhigh-app-staging \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
  --output text
```

This outputs something like `d123.cloudfront.net`.

Open it in a browser: `https://d123.cloudfront.net`

You should see the FlyHigh landing page. If you see an S3 access denied error or XML, CloudFront Origin Access Control may not be set up correctly. If you see a blank page, check the browser console for JavaScript errors.

**Check the CloudFront cache header:**

```bash
curl -I https://d123.cloudfront.net 2>&1 | grep -i "x-cache\|http/"
```

You should see:
```
HTTP/2 200
x-cache: Hit from cloudfront     (or "Miss from cloudfront" on first request)
```

### 5.7 Subscribe to SNS Alarm Notifications

The CDK creates an SNS topic for CloudWatch alarms, but nobody is subscribed to it yet. If your backend has 5 errors in 5 minutes, the alarm fires -- but you will not know unless you subscribe.

```bash
# Find the SNS topic ARN
aws sns list-topics --query "Topics[?contains(TopicArn, 'flyhigh-staging-alarms')].TopicArn" --output text

# Subscribe your email
aws sns subscribe \
  --topic-arn "arn:aws:sns:us-east-1:YOUR_ACCOUNT:flyhigh-staging-alarms" \
  --protocol email \
  --notification-endpoint "your-email@gmail.com"
```

You will get a confirmation email. Click the link to confirm. Now you will get emails if your app has a spike of errors.

---

## 6. Full User Flow Testing

Once the infrastructure is verified, test the full user journey. This is the most important verification step -- infrastructure can be green but the app can still be broken.

### 6.1 Sign Up (New User Registration)

1. Open the staging URL in a browser (CloudFront domain or custom domain)
2. Click "Sign Up" or navigate to `/signup`
3. Fill in: email, password, name, role (pick "Client" for this test)
4. Submit the form

**What should happen:**
- You see a message: "Check your email for a verification code"
- You receive an OTP email at the address you provided (check spam folder)
- If no OTP email arrives: the Gmail SMTP credentials in Secrets Manager may be wrong. Check `MAIL_USERNAME` and `MAIL_PASSWORD` in `flyhigh/staging/credentials`.

5. Enter the OTP code from the email
6. Click "Verify"

**What should happen:**
- You are redirected to the login page
- You can now log in with the email and password you just created

### 6.2 Login

1. Go to `/login`
2. Enter the email and password from signup
3. Click "Log In"

**What should happen:**
- You are redirected to the client dashboard (`/client/dashboard`)
- The browser DevTools Application tab shows `access_token` and `refresh_token` cookies (httpOnly, Secure, SameSite=Strict)
- The dashboard shows your name and role

**Google OAuth Login (optional, but test if you set it up):**
1. Click "Continue with Google"
2. Complete the Google sign-in flow
3. You should be logged in and redirected to the dashboard

**Check the API call:**
Open browser DevTools → Network tab → filter by "Fetch/XHR". You should see calls to `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me` with HTTP 200 responses.

### 6.3 Expert Search and Browse

1. From the client dashboard, navigate to "Search Experts" or `/client/search`
2. You should see a grid of expert cards (if there are experts in the database)
3. Try filtering by category, language, or price range
4. Try searching by keyword

**What should happen:**
- The API call to `/api/experts` returns a list of experts
- Filters update the results
- Expert cards show name, category, hourly rate, rating

**If the page is empty:** The staging database may not have seed data. The dev seeder runs in the `dev` profile, but staging uses its own profile. You may need to manually create expert profiles through the app (sign up as an expert, complete your profile). Or connect to the staging database and run a seed script.

### 6.4 Request a Video Call (Client Side)

Testing this requires at least one expert to be online and available.

1. Search for an expert who shows as "Online" (green dot)
2. Click on the expert's card to view their profile
3. Click "Request Call" or "Call Now"

**What should happen:**
- A POST to `/api/video-call/request` creates a call request
- You see a "Waiting for expert to accept..." screen
- A WebSocket message is sent to the expert via the signaling server
- The expert (if online and connected) sees an incoming call popup

**If the call request fails:** Check that the expert has a `userId` that matches what the signaling server expects. The frontend must also connect to the WebSocket API at the correct URL (`VITE_WEBSOCKET_URL` must point to the WebSocket API Gateway endpoint).

### 6.5 Accept a Call and Start Video (Expert Side)

For this test, you need two browser windows (or two devices):
- Window 1: Logged in as a Client
- Window 2: Logged in as an Expert

1. In Window 2 (Expert), you should see an incoming call popup when the client requests a call
2. Click "Accept"
3. Both browsers navigate to `/video-call`

**What should happen:**
- Both browsers show the video call UI
- Browser prompts for camera/microphone permission (allow it)
- You see your own video preview
- WebRTC connects (peer connection established)
- You see the other person's video (if WebRTC negotiation succeeds)

**WebRTC debugging:** Open `chrome://webrtc-internals` in Chrome. Look for:
- `iceConnectionState: connected` -- ICE negotiation succeeded
- `iceConnectionState: failed` -- ICE negotiation failed. The STUN server may be unreachable, or both peers are behind symmetric NATs. This codebase uses Google's public STUN server and no TURN server -- calls between users behind restrictive firewalls will fail.
- `signalingState: stable` -- WebRTC signaling is complete

### 6.6 Chat During a Call

1. In either browser, type a message in the chat panel
2. Click send

**What should happen:**
- The message appears in both browsers almost instantly
- Messages flow through the WebSocket API Gateway to the signaling Lambda and back

**Check DynamoDB:** The room should be tracked in the `flyhigh-staging-rooms` table:

```bash
aws dynamodb scan --table-name flyhigh-staging-rooms --max-items 5
```

### 6.7 End the Call and Rate

1. Click "End Call" in either browser
2. Both browsers should show the call has ended
3. The client should see a rating prompt (1-5 stars + optional review)

**What should happen:**
- POST to `/api/video-call/end` marks the call as completed
- POST to `/api/video-call/rating` saves the rating and review
- Both users are redirected to their respective dashboards

### 6.8 Payment Flow (If Razorpay Is Configured)

1. Start a new call as a client (the call must complete for payment to trigger)
2. After the call ends, the payment flow triggers:
   - The backend calculates the session cost (duration x hourly rate)
   - A Razorpay order is created
   - The Razorpay checkout UI appears in the browser
   - Complete the payment with test card details (from Razorpay test mode docs)
   - The backend verifies the payment via Razorpay API
   - The session is marked as paid

**Test card for Razorpay test mode:**
- Card number: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

### 6.9 Verification Checklist Summary

After testing, you should have verified:

- [ ] User can sign up and receive OTP email
- [ ] User can log in with email/password
- [ ] Google OAuth login works (if configured)
- [ ] JWT cookies are set (httpOnly, Secure, SameSite)
- [ ] Expert search returns results
- [ ] Call request creates and routes to expert via WebSocket
- [ ] Video call connects (WebRTC ICE negotiation succeeds)
- [ ] Chat messages flow bidirectionally
- [ ] Call ends gracefully and redirects to dashboards
- [ ] Rating submission works
- [ ] Payment flow completes (if Razorpay is configured)
- [ ] CloudWatch logs show normal activity (no ERROR-level messages)
- [ ] DynamoDB connections table cleans up after WebSocket disconnect

---

## 7. Production Deployment with Approval Gate

Once staging is verified and you are confident the build is good, deploy to production.

### 7.1 How the Approval Gate Works

The GitHub Actions workflow uses **GitHub Environments** with protection rules. The `deploy-production` job is gated behind an environment called `production`. By default, this environment requires at least one human reviewer to approve before the job runs.

When the `deploy-staging` job completes successfully on `main`, the `deploy-production` job pauses and shows:

```
⏸ Waiting for approval...
```

### 7.2 Set Up Production Environment Protection

Before your first production deploy, configure the protection rules:

1. Go to your GitHub repository → **Settings** → **Environments**
2. Click **production** (create it if it does not exist)
3. Under "Deployment protection rules":
   - **Required reviewers:** Add at least 1 person (yourself and/or a teammate)
   - **Wait timer:** Optional -- set to 5 minutes to allow an abort window
4. Under "Deployment branches": Select **Selected branches** and add `main`
5. Click **Save protection rules**

Without these rules, the production deploy runs immediately after staging with no approval. Set them up now.

### 7.3 Production Secrets -- Double Check Before Deploying

Production MUST use different credentials than staging. Verify:

```bash
aws secretsmanager get-secret-value \
  --secret-id flyhigh/production/credentials \
  --query SecretString --output text
```

Check that:
- `MONGODB_URI` points to a DIFFERENT database than staging (e.g., `flyhigh_prod` not `flyhigh2`)
- `JWT_SECRET` is DIFFERENT from staging (regenerate if needed: `openssl rand -base64 32`)
- `RAZORPAY_KEY_ID` starts with `rzp_live_` (NOT `rzp_test_`)
- `MAIL_USERNAME` and `MAIL_PASSWORD` are production email credentials
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` match production OAuth credentials

If production secrets are not yet populated, populate them now:

```bash
JWT_SECRET_PROD=$(openssl rand -base64 32)
echo "PRODUCTION JWT_SECRET: $JWT_SECRET_PROD  <-- save this somewhere safe!"

aws secretsmanager put-secret-value \
  --secret-id flyhigh/production/credentials \
  --secret-string '{
    "MONGODB_URI": "mongodb+srv://YOUR_PROD_USER:YOUR_PROD_PASS@YOUR_CLUSTER.mongodb.net/flyhigh_prod?retryWrites=true&w=majority",
    "JWT_SECRET": "'"$JWT_SECRET_PROD"'",
    "GOOGLE_CLIENT_ID": "YOUR_PROD_CLIENT_ID.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "YOUR_PROD_SECRET",
    "RAZORPAY_KEY_ID": "rzp_live_YOUR_LIVE_KEY",
    "RAZORPAY_KEY_SECRET": "YOUR_PROD_RAZORPAY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET": "YOUR_PROD_WEBHOOK_SECRET",
    "MAIL_USERNAME": "your-prod-app@gmail.com",
    "MAIL_PASSWORD": "YOUR_PROD_GMAIL_APP_PASSWORD"
  }'
```

**Critical:** The production MongoDB URI must connect to a production database at MongoDB Atlas. Never share a database between staging and production.

### 7.4 Approve and Deploy

1. Go to the GitHub Actions run for your push to `main`
2. The workflow graph will show `deploy-production` with a yellow "waiting" indicator
3. Click the `deploy-production` job
4. Click the **"Review deployments"** button (or it may appear as a yellow banner)
5. Select the production environment checkbox
6. Optionally add a comment (e.g., "Staging verified -- all user flow tests passed")
7. Click **"Approve and deploy"**

The deploy starts immediately. It follows the exact same steps as staging:
- `cdk deploy --all --context env=production`
- S3 upload with production-specific env vars (`VITE_API_BASE=https://api.flyhigh.com/api`)
- CloudFront invalidation
- Smoke test against `https://flyhigh.com`

### 7.5 Post-Production Verification

Run the same verification steps from Section 5, replacing `staging` with `production`:

```bash
# Check production stacks
aws cloudformation describe-stacks --stack-name flyhigh-platform-production --query "Stacks[0].StackStatus"
aws cloudformation describe-stacks --stack-name flyhigh-app-production --query "Stacks[0].StackStatus"

# Check production Lambdas
aws lambda get-function --function-name flyhigh-backend-production
aws lambda get-function --function-name flyhigh-signaling-production

# Check production DynamoDB tables
aws dynamodb list-tables --query "TableNames[?contains(@, 'production')]"

# Subscribe to production SNS alarms
aws sns subscribe \
  --topic-arn "arn:aws:sns:us-east-1:YOUR_ACCOUNT:flyhigh-production-alarms" \
  --protocol email \
  --notification-endpoint "your-email@gmail.com"
```

Then run the full user flow (Section 6) on the production URL. Pay special attention to the payment flow -- use a real test transaction in Razorpay test mode (not `rzp_live_*`).

### 7.6 Production vs Staging Differences

The CDK deploys production with these different settings (from `infra/cdk.json`):

| Setting | Staging | Production |
|---------|---------|------------|
| Backend Lambda memory | 1024 MB | 2048 MB |
| Signaling Lambda memory | 256 MB | 512 MB |
| Provisioned concurrency | 1 | 5 |
| Log level | INFO | WARN |
| S3 bucket removal policy | DESTROY | RETAIN |
| S3 auto-delete objects | YES | NO |
| Reserved concurrency (backend) | 10 | 50 |
| Reserved concurrency (signaling) | 10 | 20 |
| HTTP API throttle burst | 50 | 500 |
| HTTP API throttle rate | 100 | 1000 |
| WebSocket throttle burst | 30 | 200 |
| WebSocket throttle rate | 50 | 500 |
| CloudFront price class | PRICE_CLASS_100 | PRICE_CLASS_100 |

These are configurable in `infra/cdk.json`. Adjust before deploying if needed.

---

## 8. Common Issues and Troubleshooting

### 8.1 "AccessDenied" During CDK Deploy

**Symptom:** The CDK deploy step fails with `AccessDenied` when trying to create a resource.

**Cause:** The `github-actions-cdk` IAM role is missing permissions for that resource type.

**Fix:** Add the missing action to the role's policy:

```bash
# Edit the inline policy
aws iam put-role-policy \
  --role-name github-actions-cdk \
  --policy-name cdk-deploy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
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
    }]
  }'
```

Then re-run the failed job (click "Re-run jobs" in the GitHub Actions UI).

### 8.2 "ResourceAlreadyExistsException"

**Symptom:** CloudFormation says a resource with that name already exists.

**Cause:** A resource was manually created in AWS (via console or CLI) with the same name that CDK is trying to use.

**Fix:** Either:
- Delete the manually-created resource in the AWS Console, then re-run the deploy
- Or rename the resource in the CDK code (change the `id` parameter in the Construct constructor)

### 8.3 Backend Lambda Times Out (29 seconds)

**Symptom:** API calls return 504 Gateway Timeout after 29 seconds. CloudWatch logs show the Lambda was killed.

**Cause:** API Gateway has a 29-second maximum timeout. The backend Lambda is taking too long to respond (cold start, slow MongoDB query, infinite loop).

**Fix:**
- Check if SnapStart is enabled (`aws lambda get-function --function-name flyhigh-backend-staging --query "Configuration.SnapStart"`)
- Increase Lambda memory (in `cdk.json` under `backendMemory`) -- more memory = more CPU = faster cold starts
- Check MongoDB Atlas connection -- if the cluster is paused or throttled, connections take seconds to establish
- Enable provisioned concurrency to eliminate cold starts entirely

### 8.4 Signaling Lambda Cannot Connect to DynamoDB

**Symptom:** WebSocket connections succeed briefly but fail on message routing. CloudWatch shows `ResourceNotFoundException` for DynamoDB.

**Cause:** The signaling Lambda is looking for DynamoDB tables that do not exist (wrong table name) or it does not have permission.

**Fix:**
- Verify the table name in the Lambda environment variable matches the actual table:
  ```bash
  aws lambda get-function-configuration --function-name flyhigh-signaling-staging \
    --query "Environment.Variables.CONNECTIONS_TABLE"
  ```
- Verify the DynamoDB table exists:
  ```bash
  aws dynamodb describe-table --table-name flyhigh-staging-connections
  ```
- Verify the Lambda has `dynamodb:Query`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:UpdateItem` on the table

### 8.5 Frontend Shows Blank Page

**Symptom:** Visiting the CloudFront URL shows a blank white page.

**Cause:** Usually a JavaScript error in the React app, or CloudFront is not serving the SPA correctly.

**Fix:**
1. Open browser DevTools → Console. Look for JavaScript errors.
2. Open DevTools → Network. Look for 404s on JS/CSS assets.
3. Check that the S3 bucket has files:
   ```bash
   aws s3 ls s3://flyhigh-staging-spa/ --recursive | head -20
   ```
   You should see `index.html`, `assets/index-*.js`, `assets/index-*.css`.
4. Check that CloudFront is configured correctly:
   ```bash
   aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID \
     --query "Distribution.DistributionConfig.Origins.Items[0]"
   ```
5. If using a custom domain, verify the DNS record points to the CloudFront distribution.
6. Hard-refresh the browser (Ctrl+Shift+R) to bypass cache.

### 8.6 WebSocket Connection Fails

**Symptom:** The frontend cannot connect to the WebSocket API. Browser console shows `WebSocket connection failed`.

**Cause:** Wrong WebSocket URL, or the WebSocket API is not deployed, or CORS issue.

**Fix:**
1. Check the `VITE_WEBSOCKET_URL` env var used during the SPA build. It should be `wss://<api-id>.execute-api.us-east-1.amazonaws.com/staging` (not `ws://localhost:5000`).
2. If using a custom domain, it should be `wss://ws.staging.flyhigh.com`.
3. Verify the WebSocket API exists:
   ```bash
   aws apigatewayv2 get-apis --query "Items[?contains(Name, 'flyhigh-ws-staging')]"
   ```
4. Check the WebSocket stage is deployed:
   ```bash
   aws apigatewayv2 get-stages --api-id YOUR_WS_API_ID
   ```

### 8.7 401 Unauthorized on API Calls

**Symptom:** Every API call returns 401.

**Cause:** JWT cookies are not being sent, or JWT validation is failing.

**Fix:**
1. Check that the frontend is sending cookies. In DevTools → Network, click an API request. Under "Request Headers", you should see `Cookie: access_token=...`. If not there, the cookie was not set (login may have failed silently).
2. Check that CORS is configured correctly. The `AllowCredentials` must be `true` and `AllowOrigins` must not be `*` when credentials are used.
3. Check that the JWT secret in Secrets Manager matches the one used to sign the token. If you changed `JWT_SECRET` after the user logged in, existing tokens are invalid.
4. Clear browser cookies and re-login.
5. Check CloudWatch logs for the backend Lambda -- look for JWT validation errors.

### 8.8 CloudFormation Rollback Stuck

**Symptom:** A stack shows `UPDATE_ROLLBACK_FAILED` status and new deploys fail.

**Cause:** CloudFormation tried to roll back a failed update but the rollback itself failed. This is a known CloudFormation edge case.

**Fix:**
1. Go to AWS Console → CloudFormation → click the stuck stack
2. Go to "Stack actions" → "Continue update rollback"
3. If that does not work, go to "Stack actions" → "Delete stack" (only if this is a non-production stack with `RemovalPolicy: DESTROY`)
4. If the stack must be kept, you may need AWS Support to manually fix the stuck resource

To prevent this, the GitHub Actions workflow sets `concurrency: group: deploy-${{ github.ref }}, cancel-in-progress: false` -- this prevents two deploys from running at the same time, which is the most common cause of rollback failures.

### 8.9 MongoDB Connection Refused

**Symptom:** Backend Lambda logs show `MongoSocketException` or `MongoTimeoutException`.

**Cause:** The Lambda cannot reach MongoDB Atlas.

**Fix:**
1. Check the `MONGODB_URI` in Secrets Manager is correct
2. Check MongoDB Atlas Network Access allows `0.0.0.0/0` (or AWS Lambda IPs)
3. Check the MongoDB Atlas cluster is running (not paused)
4. Check the database user has correct permissions
5. Try connecting from your local machine with the same URI to isolate whether it is a network issue or a credentials issue

---

## 9. How to Read CloudWatch Logs

CloudWatch Logs is where all your Lambda output goes. Every `console.log`, `System.out.println`, exception, and error appears here.

### 9.1 Finding Your Logs

**Via AWS Console (easier for beginners):**

1. Go to https://console.aws.amazon.com/cloudwatch
2. In the left sidebar, under **Logs**, click **Log groups**
3. You will see these log groups:
   - `/aws/lambda/flyhigh-backend-staging` -- backend REST API logs
   - `/aws/lambda/flyhigh-signaling-staging` -- WebSocket signaling logs
   - `/aws/apigateway/flyhigh-http-staging` -- HTTP API access logs
   - `/aws/apigateway/flyhigh-ws-staging` -- WebSocket API access logs
4. Click a log group, then click a log stream (newest is at the top)

**Via AWS CLI:**

```bash
# List log groups
aws logs describe-log-groups --query "logGroups[?contains(logGroupName, 'flyhigh')].logGroupName"

# List log streams (newest first)
aws logs describe-log-streams \
  --log-group-name /aws/lambda/flyhigh-backend-staging \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Get log events from a specific stream
aws logs get-log-events \
  --log-group-name /aws/lambda/flyhigh-backend-staging \
  --log-stream-name "2026/07/21/[$LATEST]abc123" \
  --limit 50
```

### 9.2 Understanding Log Structure

Each Lambda invocation produces one log stream (or appends to an existing one if the Lambda container is reused). A log stream looks like this:

```
START RequestId: a1b2c3d4-e5f6-7890-abcd-ef1234567890 Version: $LATEST
2026-07-21T10:15:30.123Z  INFO 1 --- [main] c.f.backend.FlyhighBackendApplication : Starting FlyhighBackendApplication...
2026-07-21T10:15:32.456Z  INFO 1 --- [main] c.f.backend.config.AwsSecretsConfig : Loaded 9 secrets from flyhigh/staging/credentials
2026-07-21T10:15:34.789Z  INFO 1 --- [main] c.f.backend.security.JwtUtils : JWT secret loaded successfully
2026-07-21T10:15:35.012Z  INFO 1 --- [main] o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port 8080
2026-07-21T10:15:35.345Z  INFO 1 --- [main] c.f.backend.FlyhighBackendApplication : Started in 5.2 seconds
END RequestId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
REPORT RequestId: a1b2c3d4-e5f6-7890-abcd-ef1234567890 Duration: 5234.12 ms Billed Duration: 5235 ms Memory Size: 1024 MB Max Memory Used: 342 MB
```

**Key lines to look for:**

| Line | What It Tells You |
|------|-------------------|
| `START RequestId: ...` | A new invocation began. Note the RequestId -- use it to trace this request across logs. |
| `END RequestId: ...` | The invocation ended normally. |
| `REPORT RequestId: ... Duration: ...` | Performance summary. Shows duration, memory used, billed duration. |
| `Started FlyhighBackendApplication...` | Spring Boot is initializing. This takes 3-6 seconds (cold start) or <1 second (SnapStart warm). |
| `Started in X.X seconds` | Total initialization time. Under 1 second = SnapStart warm start. |
| `ERROR` or `WARN` | Something went wrong. Read the stack trace. |

### 9.3 Searching Logs with CloudWatch Logs Insights

CloudWatch Logs Insights lets you query logs with a SQL-like language. This is much faster than scrolling through log streams.

1. In the CloudWatch console, go to **Logs Insights** (left sidebar)
2. Select the log group (e.g., `/aws/lambda/flyhigh-backend-staging`)
3. Set the time range (e.g., "Last 1 hour")
4. Enter a query and click "Run query"

**Useful queries:**

```sql
-- Find all errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR|Exception|error/
| sort @timestamp desc
| limit 100

-- Find the 10 slowest requests
fields @timestamp, @message
| filter @message like /Duration/
| parse @message /Duration: (?<duration>\d+\.\d+) ms/
| sort duration desc
| limit 10

-- Count requests by HTTP status code (from API Gateway access logs)
fields @timestamp, status
| stats count(*) by status
| sort count desc

-- Find requests from a specific IP
fields @timestamp, @message
| filter ip = "203.0.113.42"
| sort @timestamp desc
| limit 50

-- Check for cold starts (long initialization times)
fields @timestamp, @message
| filter @message like /Started in/
| parse @message /Started in (?<startupTime>\d+\.\d+) seconds/
| filter startupTime > 3
| sort @timestamp desc
```

### 9.4 API Gateway Access Logs

The HTTP API access logs show every request before it reaches your Lambda:

```json
{
  "requestId": "a1b2c3d4",
  "ip": "203.0.113.42",
  "requestTime": "21/Jul/2026:10:15:30 +0000",
  "httpMethod": "POST",
  "routeKey": "POST /api/auth/login",
  "status": 200,
  "protocol": "HTTP/1.1",
  "responseLength": 1234
}
```

Use these to debug:
- Requests that never reach your Lambda (status 403, 429, 500 from API Gateway itself)
- Latency issues (compare `requestTime` across multiple requests)
- Throttling (status 429 = rate limited)
- IP-based issues

### 9.5 Setting Up Log Alerts (Extra Safety)

You can create metric filters that scan logs and trigger alarms:

```bash
# Create a metric filter that counts ERROR log lines
aws logs put-metric-filter \
  --log-group-name /aws/lambda/flyhigh-backend-staging \
  --filter-name "BackendErrors" \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=BackendErrorCount,metricNamespace=FlyHigh,metricValue=1
```

Then create an alarm on that metric (similar to the existing 5xx alarms). This is optional but recommended for production.

---

## 10. How to Rollback

### 10.1 Understanding What "Rollback" Means for Each Component

FlyHigh has four independently deployable components. Each rolls back differently:

| Component | Deploy Method | Rollback Method |
|-----------|---------------|-----------------|
| **CDK Infrastructure** (Lambda, API Gateway, DynamoDB) | CloudFormation via CDK | CloudFormation automatic rollback on failure, or re-deploy previous CDK code |
| **Backend JAR** (Spring Boot) | Embedded in Lambda via CDK | Re-deploy previous CDK code (the JAR is part of the CDK stack) |
| **Signaling Code** (Node.js) | Embedded in Lambda via CDK | Re-deploy previous CDK code |
| **Frontend SPA** (React) | S3 upload + CloudFront invalidation | S3 versioning restore (instant) |

**Key insight:** The CDK code and the application code are deployed together in one CloudFormation update. Rolling back the CDK stack rolls back everything except the SPA.

### 10.2 Automatic Rollback (CloudFormation)

If a CDK deploy fails mid-way, CloudFormation automatically rolls back to the last known-good state. You do not need to do anything -- just wait for the rollback to complete, fix the issue, and push again.

### 10.3 Rolling Back the CDK Stack (Infrastructure + Backend + Signaling)

If a deploy succeeds but you discover a bug later, re-deploy from the last known-good git commit:

```bash
# Find the last known-good commit SHA
git log --oneline -10

# Option A: Revert the bad commit(s) on main
git revert <bad-commit-sha>
git push origin main
# This triggers a new deploy with the reverted code

# Option B: Re-deploy from a specific commit
git checkout <good-commit-sha>
cd infra
npm ci
npx cdk deploy --all --context env=staging --require-approval never
# Then push the reverted code to main
```

CloudFormation compares the new template to the deployed template and updates only what changed. This usually takes 3-5 minutes.

### 10.4 Rolling Back the Frontend SPA (Instant via S3 Versioning)

The SPA bucket has versioning enabled. Every upload creates a new version of each file. You can restore the previous version in seconds:

```bash
# Set your bucket name and distribution ID
BUCKET="flyhigh-staging-spa"
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name flyhigh-app-staging \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

# Step 1: List versions of index.html (newest first)
aws s3api list-object-versions \
  --bucket $BUCKET \
  --prefix index.html \
  --query "Versions[0:3].{VersionId:VersionId,LastModified:LastModified}" \
  --output table

# Step 2: Copy the previous version over the current one
# Replace PREVIOUS_VERSION_ID with the second version in the list (the one before the latest)
aws s3api copy-object \
  --bucket $BUCKET \
  --copy-source "$BUCKET/index.html?versionId=PREVIOUS_VERSION_ID" \
  --key index.html

# Step 3: Repeat for all changed files, or use a script:
# Get the second-most-recent version for each file that changed in the last deploy
aws s3api list-object-versions \
  --bucket $BUCKET \
  --query "Versions[?IsLatest==\`true\`]" \
  --output json > current-versions.json
# (Manually copy the previous version for each changed file)

# Step 4: Invalidate CloudFront to serve the restored files
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

The CloudFront invalidation takes 1-2 minutes to propagate globally. After that, users see the rolled-back SPA.

**Simpler alternative -- just re-deploy:** If you are not in a rush, the simplest rollback is to revert the bad commit on `main` and push. The entire pipeline re-runs and deploys the previous version. This takes 15-20 minutes but is foolproof.

### 10.5 Rolling Back Production

Production rollback follows the same steps as staging but with extra caution:

1. **Check if users are affected.** Look at CloudWatch metrics for error rates. If only a few users are impacted, consider a forward fix instead of a rollback.

2. **If rollback is needed:**
   ```bash
   # Revert the bad commit
   git revert <bad-commit-sha>
   git push origin main
   ```

3. **The pipeline auto-deploys staging first.** Wait for staging to pass (this tests that the rollback works).

4. **Approve the production deployment** when prompted (the approval gate).

5. **Verify production** after the rollback completes:
   ```bash
   # Quick health check
   curl -s -o /dev/null -w "%{http_code}" https://flyhigh.com/
   ```

6. **Communicate.** If the rollback was due to a user-facing bug, let your team know what happened and when it was fixed.

### 10.6 If Everything Is Broken -- Nuclear Option

If CloudFormation is stuck, the console is unresponsive, and nothing else works:

```bash
# Delete the app stack (not the platform stack -- the platform stack has stateful data)
aws cloudformation delete-stack --stack-name flyhigh-app-staging

# Wait for deletion to complete (5-10 minutes)
aws cloudformation wait stack-delete-complete --stack-name flyhigh-app-staging

# Re-deploy from a known-good commit
git checkout <known-good-commit-sha>
cd infra
npm ci
npx cdk deploy --all --context env=staging --require-approval never
```

**Do NOT delete the platform stack** (`flyhigh-platform-staging`) unless you are sure you want to destroy the DynamoDB tables and Secrets Manager secrets. The platform stack contains your data and credentials. The app stack is safe to delete and recreate -- it contains only stateless compute resources.

---

## Quick Reference Card

### Key AWS Resources (Staging)

| Resource | Name Pattern | Console Path |
|----------|-------------|--------------|
| CloudFormation Stack | `flyhigh-platform-staging` | CloudFormation → Stacks |
| CloudFormation Stack | `flyhigh-app-staging` | CloudFormation → Stacks |
| Backend Lambda | `flyhigh-backend-staging` | Lambda → Functions |
| Signaling Lambda | `flyhigh-signaling-staging` | Lambda → Functions |
| HTTP API | `flyhigh-http-staging` | API Gateway → HTTP APIs |
| WebSocket API | `flyhigh-ws-staging` | API Gateway → WebSocket APIs |
| SPA S3 Bucket | `flyhigh-staging-spa` | S3 → Buckets |
| CloudFront Distribution | (find in CloudFormation outputs) | CloudFront → Distributions |
| Connections DynamoDB | `flyhigh-staging-connections` | DynamoDB → Tables |
| Rooms DynamoDB | `flyhigh-staging-rooms` | DynamoDB → Tables |
| Secrets Manager | `flyhigh/staging/credentials` | Secrets Manager → Secrets |
| SNS Alarm Topic | `flyhigh-staging-alarms` | SNS → Topics |
| Backend Logs | `/aws/lambda/flyhigh-backend-staging` | CloudWatch → Log groups |
| Signaling Logs | `/aws/lambda/flyhigh-signaling-staging` | CloudWatch → Log groups |
| HTTP API Logs | `/aws/apigateway/flyhigh-http-staging` | CloudWatch → Log groups |
| WebSocket API Logs | `/aws/apigateway/flyhigh-ws-staging` | CloudWatch → Log groups |

### Useful One-Liners

```bash
# Check deploy status
aws cloudformation describe-stacks --stack-name flyhigh-app-staging --query "Stacks[0].StackStatus"

# Get API URL
aws cloudformation describe-stacks --stack-name flyhigh-app-staging --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text

# Get CloudFront URL
aws cloudformation describe-stacks --stack-name flyhigh-app-staging --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text

# Tail backend logs (last 50 lines)
aws logs get-log-events --log-group-name /aws/lambda/flyhigh-backend-staging --log-stream-name $(aws logs describe-log-streams --log-group-name /aws/lambda/flyhigh-backend-staging --order-by LastEventTime --descending --max-items 1 --query "logStreams[0].logStreamName" --output text) --limit 50

# Count active WebSocket connections
aws dynamodb scan --table-name flyhigh-staging-connections --select COUNT --query "Count"

# Invalidate CloudFront (after manual S3 upload)
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Check Lambda errors in the last hour
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=flyhigh-backend-staging --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --period 3600 --statistics Sum
```

---

## Next Steps After Successful Deploy

Once staging and production are live and verified:

1. **Subscribe to production SNS alarms** (Section 5.7)
2. **Configure custom domains** if you have not already (update `cdk.json` with real certificate ARNs)
3. **Set up a monitoring dashboard** in CloudWatch with widgets for Lambda errors, API latency, DynamoDB consumed capacity, and CloudFront cache hit ratio
4. **Review the TODO.md issues** -- 58 issues were identified in the deployment audit. Prioritize critical and high-severity items before heavy production use
5. **Set up a staging database with test data** so the expert search page is not empty when testing
6. **Configure production environment protection rules** if not already done (Section 7.2)
7. **Document the production URL, API URL, and WebSocket URL** in your team's shared documentation

---

*See also:*
- [AWS_SETUP.md](AWS_SETUP.md) -- One-time AWS account configuration
- [SECRETS.md](SECRETS.md) -- Complete secrets reference
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) -- Development reference
- [TODO.md](TODO.md) -- Known issues and deployment readiness checklist
