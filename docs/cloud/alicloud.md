Here's what's different compared to the AWS setup — and why.

**Key differences from AWS**

AliCloud doesn't have a first-party GitHub Actions action like `aws-actions/configure-aws-credentials`, so the workflow manually calls the STS API to exchange the GitHub JWT for temporary credentials. The flow is the same conceptually — it just takes a couple of extra explicit steps.

The state backend uses **OSS** (Object Storage Service) instead of S3, and **TableStore** (OTS) instead of DynamoDB for locking. The Terraform OSS backend is a first-class provider feature, so the `backend "oss"` block works just like `backend "s3"`.

**Things to customize**

- Replace `my-org/my-repo` in the RAM role trust policy with your actual GitHub org and repo.
- Replace `123456789012345678` with your AliCloud account ID (find it in the RAM console).
- Update the `region` to your target AliCloud region — common ones are `cn-hangzhou`, `cn-shanghai`, `ap-southeast-1` (Singapore).
- The `tablestore_endpoint` URL follows the pattern `https://<instance-name>.<region>.ots.aliyuncs.com`.
- Add your actual resource permissions to the RAM policy (ECS, VPC, etc.).

**Bootstrap note**

Like with AWS, you need to run the infrastructure Terraform (first artifact) once manually using a local AliCloud access key. After that, the pipeline is fully keyless. You can set `ALICLOUD_ACCESS_KEY_ID` and `ALICLOUD_ACCESS_KEY_SECRET` temporarily in your shell for that one bootstrap run.

Want me to show a combined multi-cloud setup that manages both AWS and AliCloud resources from a single Terraform project and pipeline?

---

That's a solid production infrastructure stack! Let me build all the AliCloud components for you.Here's a summary of the full file structure and the key decisions made.

**File structure**
```
├── versions.tf          # Terraform + provider versions, S3/OSS backend
├── variables.tf         # All input variables with sensible defaults
├── vpc.tf               # VPC, vSwitches, NAT gateway, EIP, security groups
├── oss.tf               # OSS bucket, versioning, lifecycle, CORS
├── rds.tf               # PostgreSQL, DB + account, backup policy
├── redis.tf             # ApsaraDB Redis, backup policy
├── function_compute.tf  # FC3 function, VPC binding, HTTP + OSS triggers
└── outputs.tf           # All useful endpoints and IDs
```

**Key decisions worth knowing:**

**NAT + outgoing IP** — The EIP is attached to an Enhanced NAT gateway, with SNAT rules covering every private vSwitch. Any resource in a private subnet (RDS, Redis, FC function) automatically routes outgoing internet traffic through that one static IP — no extra config needed inside the services themselves.

**Function Compute uses FC3** — FC2's service/function split is deprecated. FC3 collapses this into a single `alicloud_fcv3_function` resource and is the current standard.

**VPC binding for FC** — The function is bound to the private vSwitch and app security group, which gives it direct private connectivity to RDS and Redis without going over the public internet. Outgoing calls (e.g. to third-party APIs) still route via NAT.

**Secrets** — `pg_password` and `redis_password` are marked `sensitive = true`. Inject them via `TF_VAR_pg_password` and `TF_VAR_redis_password` environment variables in CI/CD — never hardcode them. For production, consider pulling them from Alibaba Cloud KMS or HashiCorp Vault instead.

**Things to customise before running:**
- Set `var.project`, `var.env`, and `var.region` in a `terraform.tfvars` or via CI/CD env vars
- Update the OSS code path in `function_compute.tf` to point to your actual function zip
- Adjust `instance_type` for RDS and Redis to match your load requirements
- Scope down the IAM policies on the FC role (`AliyunOSSFullAccess` → a custom least-privilege policy)

Want me to add a `terraform.tfvars.example` file, or add an ALB (Application Load Balancer) in front of the function for custom domain + SSL termination?

---

Here's the updated file structure and what changed:

**Full file structure**
```
├── versions.tf             # Terraform + provider, OSS backend
├── variables.tf            # All inputs — now includes ACR, SAE, static OSS vars
├── vpc.tf                  # VPC, vSwitches, NAT, EIP, security groups
├── oss.tf                  # App assets bucket + new static website bucket
├── acr.tf                  # ACR Enterprise instance, namespace, repos, pull role
├── rds.tf                  # PostgreSQL, DB + account, backups
├── redis.tf                # ApsaraDB Redis, backups
├── function_compute.tf     # FC3 — now pulls container image from ACR
├── sae.tf                  # SAE namespace, app, auto-scaling, ingress
└── outputs.tf              # All endpoints, bucket names, ACR image base URL
```

**What was added and why:**

**ACR Enterprise (`acr.tf`)** — a single registry instance with a shared namespace and one repo per deployable image (`app-function`, `app-sae`). A dedicated `acr-pull-role` RAM role is created with the minimum permissions needed for both FC and SAE to pull images — no broad `AliyunCRFullAccess` system policy needed.

**Static OSS bucket (`oss.tf`)** — a separate bucket from the app assets one, configured with `public-read` ACL and `alicloud_oss_bucket_website` for index/error document routing. This is what you'd point a CDN or DNS CNAME at for a static SPA or landing page. The existing app assets bucket remains private.

**SAE (`sae.tf`)** — pulls its container from ACR via the same pull role as FC. Notable inclusions: liveness + readiness probes (critical for zero-downtime deployments), CPU-based auto-scaling between `sae_replicas` and 10 instances, and an ALB ingress for public HTTPS traffic. The `ignore_changes = [image_url]` lifecycle rule is important — it lets CI/CD update the running image tag without Terraform trying to revert it on the next `plan`.

**FC updated** — switched from a zip code source to `custom_container_config` pointing at the ACR image, and updated to use the `acr-pull-role`.

**Two things to do before `terraform apply`:**
1. Push your container images to ACR first — Terraform will fail if the image tag doesn't exist when FC/SAE tries to start.
2. Replace `${var.project}.example.com` in `sae.tf` with your actual domain and add the corresponding DNS record pointing to `sae_ingress_slb_ip`.

Want me to add a CI/CD workflow that builds and pushes Docker images to ACR, then triggers a SAE rolling deployment?

---

Here's what the workflow does and the decisions behind it.

**Two-job design**

The workflow splits into `build-and-push` and `deploy-sae` deliberately. If the build fails, the deploy job never runs. The `deploy-sae` job uses `environment: production` which lets you gate it behind a manual approval in GitHub repo settings — useful for protecting production without a separate pipeline.

**Image tagging strategy**

Images are tagged with the short Git SHA (`abc12345`) for traceability. A `cache` tag is also pushed after each build so the next run can reuse Docker layer cache, significantly speeding up builds. When triggered manually via `workflow_dispatch`, you can specify an existing tag to re-deploy a previous image without rebuilding.

**Rolling deployment via SAE API**

The `deployApplication` call uses `GrayBatchUpdate` with `totalBatchCount: 2` — SAE will update half the instances, wait, then update the rest. `MinReadyInstances: 1` ensures at least one healthy instance is always serving traffic during the rollout, giving you zero-downtime deploys.

**Polling with status codes**

SAE's `DescribeChangeOrder` API returns numeric status codes. The poll loop maps them explicitly:
- `2` = success → exit 0
- `3` = failed, `6` = aborted, `10` = rolled back → exit 1 with the full response printed for debugging

The 10-minute timeout prevents the job hanging indefinitely if SAE gets stuck.

**OIDC is re-run in the deploy job** — each job is an isolated runner, so credentials from `build-and-push` aren't available. Both jobs independently exchange a fresh JWT for STS credentials.

**Things to fill in before running:**
- `ACR_INSTANCE_ID` and `ACR_REGISTRY` — get these from `terraform output acr_instance_id`
- `ROLE_ARN` and `OIDC_PROVIDER_ARN` — your account ID and the RAM role from `acr.tf`
- `SAE_APP_ID` — either hardcode from `terraform output sae_app_id` or leave blank to let the workflow look it up by name
- Enable the `production` environment in your GitHub repo under Settings → Environments if you want manual approval gates

---

Here's the complete picture of everything that was added and how it connects.

**Full file structure — final state**
```
├── .gitignore
├── terraform.tfvars.example   ← new
├── versions.tf
├── variables.tf               ← added alb_name, domain_name, alb_ssl_cert_id
├── vpc.tf
├── oss.tf                     ← app assets + static hosting buckets
├── acr.tf
├── rds.tf
├── redis.tf
├── function_compute.tf
├── sae.tf
├── alb.tf                     ← new
└── outputs.tf                 ← added ALB DNS + HTTPS endpoint
```

**How the ALB is wired**

The ALB sits in both public vSwitches for availability, terminates SSL using your certificate from AliCloud's SSL Certificates Service, then forwards traffic to Function Compute via an `Fc`-typed server group. The HTTP listener on port 80 does a hard 301 redirect to HTTPS — no plain HTTP traffic ever reaches your function. A listener rule scoped to your `domain_name` means you can add more domains/paths to the same ALB later without touching the function.

**Three steps to go live after `terraform apply`:**

1. **Upload your SSL cert** at the AliCloud SSL Certificates Service console, copy the ID, and set `alb_ssl_cert_id` in your `terraform.tfvars`.
2. **Point your DNS** — create a `CNAME` record for `api.myapp.com` pointing to the value of `terraform output alb_public_dns`. Do not use an A record; the ALB IP can change.
3. **Health check endpoint** — make sure your FC function responds with `2xx` or `3xx` at `/health`, otherwise the ALB will mark the backend unhealthy and drop traffic.

**`terraform.tfvars.example` usage**
```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with your values, then:
export TF_VAR_pg_password="..."
export TF_VAR_redis_password="..."
terraform plan
```

Want me to add a WAF (Web Application Firewall) in front of the ALB, or a CDN (AliCloud DCDN) layer in front of the static OSS bucket?

---

Here's the complete final file structure and how WAF and CDN fit into the architecture:

**Final file structure**
```
├── .gitignore
├── terraform.tfvars.example   ← updated with WAF + CDN vars
├── versions.tf
├── variables.tf               ← added waf_edition, admin_cidr, cdn_scope
├── vpc.tf
├── oss.tf                     ← app assets + static hosting buckets
├── acr.tf
├── rds.tf
├── redis.tf
├── function_compute.tf
├── sae.tf
├── alb.tf                     ← ALB + HTTPS listener + HTTP→HTTPS redirect
├── waf.tf                     ← WAF instance, ALB + CDN protection, custom rules
├── cdn.tf                     ← DCDN domain, cache rules, compression, CORS
└── outputs.tf                 ← all endpoints including WAF ID, CDN CNAME
```

**Full request flow**

```
Browser
  │
  ├─► static.api.myapp.com
  │     └─► DCDN edge ──[WAF inspects]──► OSS static bucket
  │
  └─► api.myapp.com
        └─► WAF ──► ALB (SSL termination) ──► Function Compute (VPC)
                                                    │
                                          RDS / Redis (private subnet)
```

**WAF highlights (`waf.tf`)**

- Bound to both the ALB and the DCDN domain — one WAF instance covers the entire perimeter.
- Ships with three custom rules out of the box: OWASP managed rule set, a rate limiter returning a proper 429 JSON response, and an IP allowlist for `/admin` paths scoped to your office/VPN CIDR (set `admin_cidr` in `tfvars`).
- Attack logs are retained for 180 days (configurable), access logs for 90 days — both stream to SLS for querying or alerting.

**CDN highlights (`cdn.tf`)**

- Uses **DCDN** (Dynamic CDN) rather than standard CDN — it handles both static files and API passthrough acceleration, so you can put all traffic behind one CDN tier later if needed.
- Separate TTL rules per file type: 30 days for hashed assets (`js`, `css`, fonts, images), 5 minutes for HTML — so fresh deploys are visible quickly without busting all cache.
- CORS, HTTP/2, Brotli/gzip compression, and HTTPS redirect are all configured at the edge — no round-trips to origin for these headers.
- After each frontend deploy, purge the CDN cache with:

  ```bash
  aliyun dcdn RefreshDcdnObjectCaches \
    --ObjectPath "https://static.api.myapp.com/*" \
    --ObjectType Directory
  ```

**Three DNS records to create after `terraform apply`**

| Record                       | Type  | Value                                |
| ---------------------------- | ----- | ------------------------------------ |
| `api.myapp.com`              | CNAME | `terraform output alb_public_dns`    |
| `static.api.myapp.com`       | CNAME | `terraform output cdn_static_domain` |
| _(optional)_ `www.myapp.com` | CNAME | same as CDN CNAME                    |

The SSL cert (`alb_ssl_cert_id`) needs to cover both `api.myapp.com` and `static.api.myapp.com` — use a wildcard cert (`*.myapp.com`) to keep it simple.
