```bash
#!/bin/bash
set -e

# ============================================================
# CONFIGURATION — update these before running
# ============================================================
ACR_NAMESPACE="my-namespace"          # your ACR namespace
ACR_INSTANCE_ID="cri-xxxxxxxxxx"      # your ACR Enterprise Edition instance ID
REGION="cn-hangzhou"                  # your region

echo "================================================================"
echo " Setting up RAM groups, policies, and users for ACR + SAE"
echo "================================================================"
echo ""


# ============================================================
# STEP 1 — Create RAM users
# ============================================================

echo "==> Step 1: Creating RAM users..."

aliyun ram CreateUser \
  --UserName acr-deployer \
  --DisplayName "ACR Deployer" \
  --Comments "CI/CD user for building and pushing images to ACR"

aliyun ram CreateUser \
  --UserName sae-deployer \
  --DisplayName "SAE Deployer" \
  --Comments "CI/CD user for deploying and managing SAE applications"

echo ""
echo "==> Creating AccessKeys — SAVE THESE SECURELY..."
echo ""
echo "--- ACR Deployer AccessKey ---"
aliyun ram CreateAccessKey --UserName acr-deployer

echo ""
echo "--- SAE Deployer AccessKey ---"
aliyun ram CreateAccessKey --UserName sae-deployer

echo ""
echo "⚠️  Save both AccessKeyId + AccessKeySecret above."
echo "    You cannot retrieve the secrets again!"
echo ""


# ============================================================
# STEP 2 — Create ACR policies
# ============================================================

echo "==> Step 2a: Creating ACR push/pull/cleanup policy (for acr-deployers)..."

# Full ACR deployer: push, pull, delete tags, manage repos
# cr:GetAuthorizationToken is required for docker login via temporary token
aliyun ram CreatePolicy \
  --PolicyName ACRDeployerPolicy \
  --PolicyDocument "{
    \"Version\": \"1\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"cr:GetAuthorizationToken\",
          \"cr:ListInstance*\",
          \"cr:GetInstance*\"
        ],
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"cr:Get*\",
          \"cr:List*\",
          \"cr:PullRepository\",
          \"cr:PushRepository\",
          \"cr:DeleteRepository\",
          \"cr:UpdateRepository\",
          \"cr:CreateRepository\",
          \"cr:DeleteTag\",
          \"cr:ListTag*\",
          \"cr:GetTag*\"
        ],
        \"Resource\": [
          \"acs:cr:*:*:repository/${ACR_INSTANCE_ID}/${ACR_NAMESPACE}/*\",
          \"acs:cr:*:*:repository/${ACR_INSTANCE_ID}/${ACR_NAMESPACE}\"
        ]
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"cr:List*\"
        ],
        \"Resource\": [
          \"acs:cr:*:*:repository/${ACR_INSTANCE_ID}/*\",
          \"acs:cr:*:*:repository/${ACR_INSTANCE_ID}/*/*\"
        ]
      }
    ]
  }" \
  --Description "ACR deployer: push, pull, delete tags, manage repos in ${ACR_NAMESPACE}"

echo "==> Step 2b: Creating ACR read-only pull policy (for sae-deployers)..."

# SAE only needs to pull — scoped to namespace
aliyun ram CreatePolicy \
  --PolicyName ACRPullOnlyPolicy \
  --PolicyDocument "{
    \"Version\": \"1\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"cr:GetAuthorizationToken\",
          \"cr:ListInstance*\",
          \"cr:GetInstance*\"
        ],
        \"Resource\": \"*\"
      },
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"cr:Get*\",
          \"cr:List*\",
          \"cr:PullRepository\"
        ],
        \"Resource\": [
          \"acs:cr:*:*:repository/${ACR_INSTANCE_ID}/${ACR_NAMESPACE}/*\"
        ]
      }
    ]
  }" \
  --Description "ACR read-only pull access scoped to ${ACR_NAMESPACE}"


# ============================================================
# STEP 3 — Create SAE policy
# ============================================================

echo "==> Step 3: Creating SAE deployer policy..."

aliyun ram CreatePolicy \
  --PolicyName SAEDeployerPolicy \
  --PolicyDocument '{
    "Version": "1",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "sae:CreateApplication",
          "sae:DeployApplication",
          "sae:DescribeApplication",
          "sae:DescribeApplicationConfig",
          "sae:ListApplications",
          "sae:RestartApplication",
          "sae:RescaleApplication",
          "sae:StopApplication",
          "sae:StartApplication",
          "sae:DeleteApplication",
          "sae:DescribeChangeOrder",
          "sae:ListChangeOrders",
          "sae:AbortChangeOrder",
          "sae:DescribeNamespace",
          "sae:ListNamespaces",
          "sae:DescribeApplicationGroups",
          "sae:DescribeApplicationInstances",
          "sae:DescribeApplicationInstancesLogs"
        ],
        "Resource": "*"
      }
    ]
  }' \
  --Description "Minimal SAE deploy and management permissions"


# ============================================================
# STEP 4 — Create VPC read-only policy
# ============================================================

echo "==> Step 4: Creating VPC read-only policy..."

aliyun ram CreatePolicy \
  --PolicyName VPCReadOnlyForSAE \
  --PolicyDocument '{
    "Version": "1",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "vpc:DescribeVpcs",
          "vpc:DescribeVSwitches",
          "vpc:DescribeVpcAttribute"
        ],
        "Resource": "*"
      }
    ]
  }' \
  --Description "Read-only VPC access needed by SAE"


# ============================================================
# STEP 5 — Create groups, attach policies, add users
# ============================================================

echo "==> Step 5a: Creating groups..."

aliyun ram CreateGroup \
  --GroupName acr-deployers \
  --Comments "CI/CD users with ACR push, pull, and image cleanup permissions"

aliyun ram CreateGroup \
  --GroupName sae-deployers \
  --Comments "CI/CD users with SAE deploy and management permissions"

# -------------------------------------------------------

echo "==> Step 5b: Attaching policies to acr-deployers group..."

aliyun ram AttachPolicyToGroup \
  --GroupName acr-deployers \
  --PolicyName ACRDeployerPolicy \
  --PolicyType Custom

# -------------------------------------------------------

echo "==> Step 5c: Attaching policies to sae-deployers group..."

aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName SAEDeployerPolicy \
  --PolicyType Custom

aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName ACRPullOnlyPolicy \
  --PolicyType Custom

aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName VPCReadOnlyForSAE \
  --PolicyType Custom

# -------------------------------------------------------

echo "==> Step 5d: Adding users to groups..."

aliyun ram AddUserToGroup \
  --UserName acr-deployer \
  --GroupName acr-deployers

aliyun ram AddUserToGroup \
  --UserName sae-deployer \
  --GroupName sae-deployers


# ============================================================
# VERIFICATION
# ============================================================

echo ""
echo "================================================================"
echo " Verification"
echo "================================================================"

echo ""
echo "--- Policies on acr-deployers group ---"
aliyun ram ListPoliciesForGroup --GroupName acr-deployers

echo ""
echo "--- Policies on sae-deployers group ---"
aliyun ram ListPoliciesForGroup --GroupName sae-deployers

echo ""
echo "--- Groups for acr-deployer user ---"
aliyun ram ListGroupsForUser --UserName acr-deployer

echo ""
echo "--- Groups for sae-deployer user ---"
aliyun ram ListGroupsForUser --UserName sae-deployer

echo ""
echo "✅ All done!"
echo ""
echo "Summary:"
echo "  acr-deployer  → acr-deployers group (push, pull, delete tags)"
echo "  sae-deployer  → sae-deployers group (deploy SAE, pull-only ACR)"
```