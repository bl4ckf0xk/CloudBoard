# CloudBoard — AWS Production Deployment & CloudFront Guide

This guide details the steps to deploy the CloudBoard frontend to AWS using **Amazon S3** (Static Website / Private Bucket) and **Amazon CloudFront** (Global CDN + SSL + Security Headers).

---

## Architecture Overview

```
[ End User Browser ]
        │  HTTPS (TLS 1.3)
        ▼
[ Amazon CloudFront Distribution ]
   ├── Custom Response Headers Policy (CSP, HSTS, X-Frame-Options)
   ├── CloudFront Origin Access Control (OAC)
   └── Custom Error Responses (403/404 → /index.html with HTTP 200)
        │
        ▼
[ Private Amazon S3 Bucket ] (Static export files: HTML, JS, CSS, Media)
```

---

## Step 1: Create Amazon S3 Bucket

1. Create a private bucket in your target AWS region (e.g. `ap-south-1`):
   ```bash
   aws s3 mb s3://cloudboard-frontend-prod --region ap-south-1
   ```
2. Enable **Block Public Access** on the bucket (CloudFront will access files via OAC).

---

## Step 2: Create CloudFront Response Headers Policy (Security Headers)

Create a CloudFront Response Headers Policy with the following security headers:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS |
| `X-Frame-Options` | `DENY` | Prevents Clickjacking |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects navigation privacy |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts privileged APIs |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.amazonaws.com https://cognito-idp.*.amazonaws.com https://*.execute-api.*.amazonaws.com; img-src 'self' data: https:; frame-ancestors 'none';` | Protects from XSS & data injection |

---

## Step 3: Configure CloudFront Distribution

1. **Origin Domain**: Select the S3 bucket created in Step 1.
2. **Origin Access**: Choose **Origin Access Control (OAC)** and create a new OAC profile.
3. **Viewer Protocol Policy**: **Redirect HTTP to HTTPS**.
4. **Allowed HTTP Methods**: `GET, HEAD, OPTIONS`.
5. **Default Root Object**: `index.html`.
6. **Response Headers Policy**: Attach the policy created in Step 2.
7. **Custom Error Responses** (Single Page App Routing):
   - **HTTP Error Code**: `403` → **Response Page Path**: `/index.html` → **HTTP Response Code**: `200`
   - **HTTP Error Code**: `404` → **Response Page Path**: `/index.html` → **HTTP Response Code**: `200`

---

## Step 4: S3 Bucket Policy (OAC Grant)

Apply this policy to your S3 bucket (replace `ACCOUNT_ID`, `DISTRIBUTION_ID`, and `BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cloudboard-frontend-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

---

## Step 5: Build & Deploy Commands

Set your environment variables in `.env.local` or CI/CD secrets:

```bash
export NEXT_PUBLIC_DATA_SOURCE="aws"
export NEXT_PUBLIC_AWS_REGION="ap-south-1"
export NEXT_PUBLIC_API_GATEWAY_URL="https://your-api.execute-api.ap-south-1.amazonaws.com/prod"
export NEXT_PUBLIC_COGNITO_USER_POOL_ID="ap-south-1_xxxxxxxxx"
export NEXT_PUBLIC_COGNITO_CLIENT_ID="your-cognito-client-id"
export CLOUDBOARD_S3_BUCKET="cloudboard-frontend-prod"
export CLOUDBOARD_CLOUDFRONT_DIST_ID="E1234567890EXAMPLE"
```

Then run:

```bash
# 1. Build optimized static export
npm run build

# 2. Deploy to S3 with cache-control headers
npm run deploy:s3

# 3. Invalidate CloudFront CDN cache
npm run deploy:invalidate
```
