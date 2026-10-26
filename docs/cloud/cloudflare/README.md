Here's the complete Cloudflare layer and how it connects to either cloud backend.

**Cloudflare file structure**
```
cloudflare/
├── terraform.tfvars.example
├── versions.tf        # Cloudflare provider, shared S3/OSS backend
├── variables.tf       # All inputs — cloud-agnostic
├── data.tf            # Zone lookup (for nameserver output)
├── dns.tf             # CNAME records: api → ALB, static → S3/OSS
├── ssl.tf             # TLS strict mode, HSTS, HTTP/2+3, managed cert
├── cache.tf           # Cache rules (bypass API, long/short TTL for static)
├── waf.tf             # Custom rules, rate limiting, managed OWASP ruleset
├── workers.tf         # SPA fallback Worker + cache purge helper
└── outputs.tf
```

**How it replaces AliCloud DCDN and AWS CloudFront**

| Feature          | DCDN / CloudFront               | Cloudflare                                           |
| ---------------- | ------------------------------- | ---------------------------------------------------- |
| CDN              | Edge caching via ruleset        | Edge caching via Cache Rules                         |
| SSL              | ACM cert (AWS) / CAS cert (Ali) | Free auto-issued cert, zero config                   |
| WAF              | WAFv2 / WAF v3                  | Custom rules + Managed CRS + Bot Management          |
| Security headers | Response headers policy         | Transform Rules                                      |
| SPA fallback     | Custom error response config    | Cloudflare Worker                                    |
| Cache purge      | CLI / API                       | API call in CI/CD (`purge_cache`)                    |
| Origin auth      | OAC (AWS) / signed URL          | Keep origin private; Cloudflare IPs allowlist on ALB |

**Key advantages of the Cloudflare approach**

The biggest practical win is that **no ACM or CAS certificate management is needed** — Cloudflare auto-provisions and renews certs for free. You also get a single WAF and CDN layer that works identically whether your backend is on AWS, AliCloud, or both — making future cloud migrations painless.

**Four GitHub secrets to add**
```
CF_ZONE_ID       → from Cloudflare zone overview page
CF_API_TOKEN     → scoped token with Zone:DNS:Edit + Zone:WAF:Edit
ROOT_DOMAIN      → myapp.com
```

**Origin security — important**

With Cloudflare proxying your ALB, you should restrict your ALB security group to accept traffic **only from Cloudflare IP ranges** (published at `https://cloudflare.com/ips`). This prevents attackers from bypassing WAF by hitting the ALB directly. Add this to your `vpc.tf` / `waf.tf` in the cloud stack once Cloudflare is in front.
