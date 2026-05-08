### Install

```bash
# macOS
brew install aliyun-cli

# Linux (one-liner)
/bin/bash -c "$(curl -fsSL https://aliyuncli.alicdn.com/install.sh)"

# Or manually
curl -SLO https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
tar -xvzf aliyun-cli-linux-latest-amd64.tgz
mv aliyun /usr/local/bin/
```

```bash
aliyun configure set \
  --profile default \
  --mode AK \
  --region cn-hangzhou \
  --access-key-id $ALIBABA_ACCESS_KEY_ID \
  --access-key-secret $ALIBABA_ACCESS_KEY_SECRET
```

## USERS

### Limited RAM User

```bash
aliyun ram CreatePolicy \
  --PolicyName LimitedRAMAdminPolicy \
  --PolicyDocument '{
    "Version": "1",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ram:CreateUser",
          "ram:GetUser",
          "ram:ListUsers",
          "ram:DeleteUser",
          "ram:CreateAccessKey",
          "ram:DeleteAccessKey",
          "ram:UpdateAccessKey",
          "ram:ListAccessKeys",
          "ram:CreatePolicy",
          "ram:GetPolicy",
          "ram:ListPolicies",
          "ram:DeletePolicy",
          "ram:GetPolicyVersion",
          "ram:ListPolicyVersions",
          "ram:AttachPolicyToUser",
          "ram:DetachPolicyFromUser",
          "ram:ListPoliciesForUser",
          "ram:AttachPolicyToGroup",
          "ram:DetachPolicyFromGroup",
          "ram:ListPoliciesForGroup",
          "ram:CreateGroup",
          "ram:GetGroup",
          "ram:ListGroups",
          "ram:DeleteGroup",
          "ram:UpdateGroup",
          "ram:AddUserToGroup",
          "ram:RemoveUserFromGroup",
          "ram:ListGroupsForUser",
          "ram:ListUsersForGroup"
        ],
        "Resource": "*"
      }
    ]
  }' \
  --Description "Limited RAM admin — manage users, groups, and policies only"
```

### SAE Deployer USER

```bash
#!/bin/bash
set -e

echo "==> Step 1: Create RAM user"
aliyun ram CreateUser \
  --UserName sae-deployer \
  --DisplayName "SAE Deployer" \
  --Comments "CI/CD user for SAE deployments"

# Create AccessKey — save the output securely!
echo "==> Creating AccessKey for sae-deployer..."
aliyun ram CreateAccessKey --UserName sae-deployer

echo ""
echo "⚠️  Save the AccessKeyId and AccessKeySecret above — you cannot retrieve the secret again!"
echo ""

# -------------------------------------------------------

echo "==> Step 2: Create SAE deployer policy"
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

# -------------------------------------------------------

echo "==> Step 3: Create ACR read-only policy (scoped to namespace)"
aliyun ram CreatePolicy \
  --PolicyName ACRPullPolicy \
  --PolicyDocument '{
    "Version": "1",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "cr:Get*",
          "cr:List*",
          "cr:PullRepository"
        ],
        "Resource": [
          "acs:cr:*:*:repository/my-namespace/*"
        ]
      }
    ]
  }' \
  --Description "Read-only ACR access scoped to my-namespace"

# -------------------------------------------------------

echo "==> Step 4: Create VPC read-only policy"
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

# -------------------------------------------------------

echo "==> Step 5a: Create group"
aliyun ram CreateGroup \
  --GroupName sae-deployers \
  --Comments "Group for SAE CI/CD deployment users"

echo "==> Step 5b: Attach policies to group"
aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName SAEDeployerPolicy \
  --PolicyType Custom

aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName ACRPullPolicy \
  --PolicyType Custom

aliyun ram AttachPolicyToGroup \
  --GroupName sae-deployers \
  --PolicyName VPCReadOnlyForSAE \
  --PolicyType Custom

echo "==> Step 5c: Add user to group"
aliyun ram AddUserToGroup \
  --UserName sae-deployer \
  --GroupName sae-deployers

## No longer for user
# aliyun ram AttachPolicyToUser \
#   --UserName sae-deployer \
#   --PolicyName SAEDeployerPolicy \
#   --PolicyType Custom

# -------------------------------------------------------

echo ""
echo "==> Verifying setup..."

echo ""
echo "--- Policies attached to group sae-deployers ---"
aliyun ram ListPoliciesForGroup --GroupName sae-deployers

echo ""
echo "--- Groups for user sae-deployer ---"
aliyun ram ListGroupsForUser --UserName sae-deployer

# # Verify the policy content looks correct
# aliyun ram GetPolicy \
#   --PolicyName SAEDeployerPolicy \
#   --PolicyType Custom

echo ""
echo "✅ Done! sae-deployer is set up and added to sae-deployers group."
```

---

### One Time Create Application

```bash
aliyun sae POST /pop/v1/sam/app/createApplication \
  --header "Content-Type=application/json" \
  --method POST \
  --body '{
    "AppName": "my-voice-service",
    "NamespaceId": "cn-hangzhou",
    "PackageType": "Image",
    "ImageUrl": "registry.cn-hangzhou.aliyuncs.com/my-namespace/my-app:1.0.0",
    "Cpu": 1000,
    "Memory": 2048,
    "Replicas": 1,
    "VpcId": "vpc-bp1xxxxxxxxxx",
    "VSwitchId": "vsw-bp1xxxxxxxxxx",
    "Envs": "[{\"name\":\"NODE_ENV\",\"value\":\"production\"},{\"name\":\"PORT\",\"value\":\"3000\"}]",
    "Liveness": "{\"httpGet\":{\"path\":\"/health\",\"port\":3000,\"scheme\":\"HTTP\"},\"initialDelaySeconds\":10,\"periodSeconds\":30,\"timeoutSeconds\":2}"
  }'
```

```bash
# Extract AppId from response using jq
APP_ID=$(aliyun sae POST /pop/v1/sam/app/createApplication \
  --body '...' | jq -r '.Data.AppId')

echo "App ID: $APP_ID"
```

### Full Deploy Script

```bash
#!/bin/bash
set -e

REGION="cn-hangzhou"
ACR_REGISTRY="registry.${REGION}.aliyuncs.com"
ACR_NAMESPACE="my-namespace"
APP_NAME="my-voice-service"
APP_ID="7171a6ca-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # from CreateApplication
IMAGE_TAG=${GIT_SHA:-$(date +%s)}              # use git commit SHA in CI
IMAGE_URL="${ACR_REGISTRY}/${ACR_NAMESPACE}/${APP_NAME}:${IMAGE_TAG}"

echo "==> Building image..."
docker build -t $IMAGE_URL .

echo "==> Pushing to ACR..."
docker login $ACR_REGISTRY -u $ACR_USERNAME -p $ACR_PASSWORD
docker push $IMAGE_URL

echo "==> Deploying to SAE..."
RESULT=$(aliyun sae POST /pop/v1/sam/app/deployApplication \
  --header "Content-Type=application/json" \
  --method POST \
  --body "{
    \"AppId\": \"${APP_ID}\",
    \"PackageType\": \"Image\",
    \"ImageUrl\": \"${IMAGE_URL}\",
    \"UpdateStrategy\": \"{\\\"type\\\":\\\"RollingUpdate\\\",\\\"batchUpdate\\\":{\\\"batch\\\":1,\\\"releaseType\\\":\\\"auto\\\"}}\"
  }")

CHANGE_ORDER_ID=$(echo $RESULT | jq -r '.Data.ChangeOrderId')
echo "==> Deployment started. ChangeOrderId: $CHANGE_ORDER_ID"

echo "==> Waiting for deployment to complete..."
for i in $(seq 1 30); do
  STATUS=$(aliyun sae GET /pop/v1/sam/changeorder/DescribeChangeOrder \
    --method GET \
    --ChangeOrderId "$CHANGE_ORDER_ID" | jq -r '.Data.Status')
  
  echo "    Status: $STATUS"
  
  if [ "$STATUS" = "2" ]; then
    echo "✅ Deployment successful!"
    exit 0
  elif [ "$STATUS" = "3" ]; then
    echo "❌ Deployment failed!"
    exit 1
  fi
  
  sleep 10
done

echo "⚠️  Timed out waiting for deployment"
exit 1
```

### Summary of the Flow

aliyun configure          ← one-time setup
       ↓
docker build + push       ← build your image, push to ACR
       ↓
CreateApplication         ← one-time, saves AppId
       ↓
DeployApplication         ← every release, pass new ImageUrl tag
       ↓
DescribeChangeOrder       ← poll until Status=2 (success) or 3 (fail)


### SAE Management

```bash
# List all applications
aliyun sae GET /pop/v1/sam/app/listApplications --method GET

# Describe a specific app
aliyun sae GET /pop/v1/sam/app/describeApplication \
  --method GET --AppId $APP_ID

# Get app config (including current ImageUrl)
aliyun sae GET /pop/v1/sam/app/describeApplicationConfig \
  --method GET --AppId $APP_ID

# Scale instances up or down
aliyun sae PUT /pop/v1/sam/app/rescaleApplication \
  --method PUT \
  --body "{\"AppId\":\"${APP_ID}\",\"Replicas\":3}"

# Restart the app
aliyun sae PUT /pop/v1/sam/app/restartApplication \
  --method PUT \
  --body "{\"AppId\":\"${APP_ID}\"}"

# View recent change orders (deployment history)
aliyun sae GET /pop/v1/sam/changeorder/ListChangeOrders \
  --method GET --AppId $APP_ID
```