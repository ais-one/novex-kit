## Workflow Secrets

|Secret|Workflow|
|------|--------|
|ACCESS_KEY_ID|deploy-bucket.yml, deploy-sae.yml|
|ACCESS_KEY_SECRET|deploy-bucket.yml, deploy-sae.yml|
|CR_USERNAME|deploy-cr.yml|
|CR_PASSWORD|deploy-cr.yml|
|NPM_AUTH_TOKEN|deploy-npm.yml|
|SYNC_TOKEN|update-template.yml|
|CODECOV_TOKEN|ci-quality-gates.yml (optional - if not set, the Codecov upload is skipped; unit tests still run)|
|GITLEAKS_LICENSE|ci-quality-gates.yml (optional - if not set, the Gitleaks secret scan is skipped; Gitleaks itself requires a license for repos owned by a GitHub organization)|
|GITHUB_TOKEN|ci-quality-gates.yml and deploy-bucket.yml (provided automatically by GitHub)|


## Workflow Variables

|Vars|Workflow|Use|
|----|--------|---|
|ENDPOINT|deploy-bucket.yml:107, deploy-bucket.yml:149|Alibaba Cloud OSS endpoint, e.g. oss-ap-southeast-1.aliyuncs.com. Used by both the ossutil job and the AWS CLI job|
|CR_HOST|deploy-cr.yml:47, deploy-sae.yml:47|Container registry host. SAE may need the -vpc registry host|
|CR_IMAGENAME|deploy-cr.yml:44, deploy-sae.yml:46|Image name. Defaults to the repo name|
|CR_NS|deploy-cr.yml:48, deploy-sae.yml:48|Container registry namespace|
|SAE_APP_ID|deploy-sae.yml:49|SAE application ID. A workflow input can override it|
|SAE_REGION|deploy-sae.yml:50|SAE region. Defaults to ap-southeast-1|
|SAE_ACR_INSTANCE_ID|deploy-sae.yml:51|ACR Enterprise instance ID. Only needed if the image is in ACR Enterprise Edition|
