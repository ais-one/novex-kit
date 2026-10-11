# Cloud

## Services & Platforms

Supported Cloud Platforms
- Aliyun
- AWS
- DigitalOcean

|Type|Alicloud|AWS|Digital Ocean|
|----|--------|---|-------------|
|IAM|RAM|IAM| ? |
|Simplified container deployment|SAE|App Runner|app platform|
|Serverless Function|Function Compute|Lambda|functions|
|Object Storage|oss|s3|spaces|
|Static Pages|oss|s3|app platform|
|API Gateway|yes|yes|no|
|Content delivery network|CloudFront|CDN / DCDN|spaces?|
|Managed Redis|ElastiCache (Redis)|Tair / ApsaraDB for Redis| ? |
|Managed relational DB|RDS (MySQL/PG)|RDS| ? |
|Load Balancers|SLB|ALB / NLB / CLB| ? |
|NAT Gateway for outgoing|NAT|NAT| ? |
|Docker image registry|ACR|ECR|DOCR|

## Install CLI

- Aliyun
  - tbd
- AWS
  - AWS-cli
- Others
  - kubectl (for kubernetes)
  - openshift
  - etc.

## IAM and Role Policy and Service Keys

Associate appropriate policy and/or role to IAM user. WIP

## Minimal Permissions And Components Used

- Object Storage
  - Storage Admin
  - Storage Object Admin
- Cloud Run
  - Service Account User
  - Cloud Run Admin
- Cloud Function
- ECI instance (aliyun)
- Container Registy
- Load Balancer
- Resource Group
- VPC + VSwitch, Elastic IP, Security Group
- Logger

## Hosting Static Website on Aliyun OSS

TBD

## Deploy And Run on SAE / Function Compute

TBD

**Notes:**

How to check if app is updated
- Need to check if service deployed properly
- Clean up
  - service revisions
  - container images

## Doppler

Manage Secrets

## Cloudflare

1. Use Full SSL

https://serverfault.com/questions/995010/putting-google-cloud-platform-cloud-run-behind-cloud-flare

2. Set SSL Edge Certificate Flag (Not Really Needed)

https://cloud.google.com/run/docs/mapping-custom-domains#dns_update

3. Firewall -> Tools -> Rate Limiting

Set filter for login API

https://community.cloudflare.com/t/same-type-of-harmful-requests-slow-the-server/188520/4
