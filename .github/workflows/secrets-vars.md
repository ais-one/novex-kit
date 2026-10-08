## Environment Workflow Secrets
|Secret|Workflow|Note|
|------|--------|----|
|DOPPLER_TOKEN|*tbd*||
|ACCESS_KEY_ID|deploy-bucket,deploy-sae|Alibaba Cloud RAM user with SAE deploy + OSS write permission (AWS key if using the s3 provider)|
|ACCESS_KEY_SECRET|deploy-bucket,deploy-sae|secret for ACCESS_KEY_ID|

## Repository Workflow Secrets

|Secret|Workflow|Note|
|------|--------|----|
|CR_USERNAME|deploy-cr||
|CR_PASSWORD|deploy-cr||
|NPM_AUTH_TOKEN|deploy-npm||
|SYNC_TOKEN|update-template||
|CODECOV_TOKEN|ci-quality-gates|optional - if not set, the Codecov upload is skipped; unit tests still run|
|GITLEAKS_LICENSE|ci-quality-gates|optional - if not set, the Gitleaks secret scan is skipped; Gitleaks itself requires a license for repos owned by a GitHub organization|
|GITHUB_TOKEN|ci-quality-gates,deploy-bucket|provided automatically by GitHub|

## Repository Workflow Variables

|Vars|Workflow|Use|
|----|--------|---|
|ENDPOINT|deploy-bucket|Alibaba Cloud OSS endpoint, e.g. oss-ap-southeast-1.aliyuncs.com. Used by both the ossutil job and the AWS CLI job|
|CR_HOST|deploy-cr|Container registry host.|
|CR_HOST_VPC|deploy-sae|Container registry host VPC.|
|CR_IMAGENAME|deploy-cr,deploy-sae|Image name. Defaults to the repo name|
|CR_NAMESPACE|deploy-cr,deploy-sae|Container registry namespace|
|SAE_APP_ID|deploy-sae|SAE application ID. A workflow input can override it|
|SAE_REGION|deploy-sae|SAE region. Defaults to ap-southeast-1|
|SAE_ACR_INSTANCE_ID|deploy-sae|ACR Enterprise instance ID. Only needed if the image is in ACR Enterprise Edition|
