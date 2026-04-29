#!/bin/bash
set -e

# ============================================================
# CONFIGURATION — update these before running
# ============================================================
OSS_BUCKET="my-app-bucket"     # your OSS bucket name
REGION="cn-hangzhou"

# ============================================================
# STEP 1 — Create OSS deployer user
# ============================================================

echo "==> Creating OSS deployer user..."

aliyun ram CreateUser \
  --UserName oss-deployer \
  --DisplayName "OSS Deployer" \
  --Comments "CI/CD user for deploying files to OSS buckets"

echo ""
echo "--- OSS Deployer AccessKey ---"
aliyun ram CreateAccessKey --UserName oss-deployer
echo "⚠️  Save the AccessKeyId and AccessKeySecret above!"
echo ""

# ============================================================
# STEP 2 — Create OSS deployer policy
# ============================================================

# OSS RAM policies require three separate statements because
# actions apply at different resource levels:
# - Service level  → acs:oss:*:*:*          (ListBuckets etc.)
# - Bucket level   → acs:oss:*:*:bucketname  (ListObjects etc.)
# - Object level   → acs:oss:*:*:bucketname/* (PutObject etc.)

echo "==> Creating OSS deployer policy..."

aliyun ram CreatePolicy \
  --PolicyName OSSDeployerPolicy \
  --PolicyDocument "{
    \"Version\": \"1\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Comment\": \"Service-level: allow listing buckets so the user can find the target bucket\",
        \"Action\": [
          \"oss:ListBuckets\",
          \"oss:GetBucketStat\",
          \"oss:GetBucketInfo\",
          \"oss:GetBucketAcl\",
          \"oss:GetBucketTagging\",
          \"oss:GetBucketVersioning\",
          \"oss:GetBucketLifecycle\"
        ],
        \"Resource\": \"acs:oss:*:*:*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Comment\": \"Bucket-level: list and inspect the specific bucket\",
        \"Action\": [
          \"oss:ListObjects\",
          \"oss:ListObjectVersions\",
          \"oss:GetBucketAcl\",
          \"oss:GetBucketInfo\",
          \"oss:GetBucketStat\"
        ],
        \"Resource\": \"acs:oss:*:*:${OSS_BUCKET}\"
      },
      {
        \"Effect\": \"Allow\",
        \"Comment\": \"Object-level: upload, download, delete objects in the bucket\",
        \"Action\": [
          \"oss:PutObject\",
          \"oss:GetObject\",
          \"oss:GetObjectAcl\",
          \"oss:PutObjectAcl\",
          \"oss:DeleteObject\",
          \"oss:DeleteObjectVersion\",
          \"oss:ListParts\",
          \"oss:AbortMultipartUpload\",
          \"oss:GetObjectVersion\",
          \"oss:GetObjectVersionAcl\",
          \"oss:RestoreObject\"
        ],
        \"Resource\": \"acs:oss:*:*:${OSS_BUCKET}/*\"
      }
    ]
  }" \
  --Description "Deploy, download, and clean up objects in ${OSS_BUCKET}"

# ============================================================
# STEP 3 — Create group, attach policy, add user
# ============================================================

echo "==> Creating oss-deployers group..."

aliyun ram CreateGroup \
  --GroupName oss-deployers \
  --Comments "CI/CD users with OSS upload, download, and cleanup permissions"

echo "==> Attaching OSSDeployerPolicy to oss-deployers group..."

aliyun ram AttachPolicyToGroup \
  --GroupName oss-deployers \
  --PolicyName OSSDeployerPolicy \
  --PolicyType Custom

echo "==> Adding oss-deployer user to oss-deployers group..."

aliyun ram AddUserToGroup \
  --UserName oss-deployer \
  --GroupName oss-deployers

# ============================================================
# VERIFICATION
# ============================================================

echo ""
echo "--- Policies on oss-deployers group ---"
aliyun ram ListPoliciesForGroup --GroupName oss-deployers

echo ""
echo "--- Groups for oss-deployer user ---"
aliyun ram ListGroupsForUser --UserName oss-deployer

echo ""
echo "✅ OSS deployer group setup complete!"
