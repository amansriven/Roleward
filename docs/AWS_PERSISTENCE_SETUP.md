# AWS persistence setup

Backstage stores each authenticated user's structured workspace in DynamoDB and uploads private resume/recording files directly to S3 with five-minute presigned URLs. Every API derives ownership from the server-side Auth.js/Cognito session; clients never submit a user ID.

## DynamoDB

Create a table in `us-east-2`:

- Table name: `sweetplus-workspaces`
- Partition key: `pk` (String)
- Sort key: `sk` (String)
- Capacity mode: On-demand
- Point-in-time recovery: enable before production launch
- Encryption: AWS owned key is sufficient for development; use a customer-managed KMS key if policy requires it

The current item shape is `pk=USER#<Cognito sub>`, `sk=WORKSPACE`. Writes use a numeric version condition to prevent silent cross-device overwrites.

## S3

Create a private general-purpose bucket in `us-east-2` with:

- Block all public access: on
- Object ownership: bucket owner enforced
- Default encryption: SSE-S3 (or SSE-KMS if required)
- Versioning: on
- Lifecycle: abort incomplete multipart uploads after 7 days

Add this CORS configuration, replacing the production origin after a custom domain is connected:

```json
[
  {
    "AllowedHeaders": ["content-type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["http://localhost:3000", "https://sweetplus.vercel.app"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 300
  }
]
```

## Least-privilege IAM principal

Create a dedicated deploy identity for Backstage and restrict it to the table and bucket. Replace the account ID and bucket name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WorkspaceItems",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-2:ACCOUNT_ID:table/sweetplus-workspaces"
    },
    {
      "Sid": "PrivateUploads",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/private/*"
    }
  ]
}
```

For the first deployment, create an access key for that dedicated identity. Do not use root credentials and do not commit keys. A future hardening step can replace static keys with Vercel OIDC federation.

## Environment variables

Add locally and to Vercel Production/Preview/Development:

```env
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DYNAMODB_TABLE=sweetplus-workspaces
AWS_UPLOAD_BUCKET=
```

After saving the variables, deploy again. The dashboard badge changes from **This device** to **Synced**. Existing browser data is migrated into the authenticated user's empty cloud workspace on first load.

## Verification

1. Sign in and open `/dashboard`; confirm the badge says **Synced**.
2. Complete onboarding or add an application.
3. Confirm one DynamoDB item exists for the Cognito user subject.
4. Open the app in a private browser, sign in with the same account, and confirm the workspace appears.
5. Upload a test resume and verify that its S3 object key starts with `private/<Cognito sub>/resume/`.
6. Confirm the S3 object is not publicly accessible.
