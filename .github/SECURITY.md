# Security Policy

## Supported Versions

This repository is maintained as a monorepo template. Security fixes are applied to the latest supported code on the default branch.

| Version               | Supported          |
| --------------------- | ------------------ |
| `main`                | :white_check_mark: |
| Latest tagged release | :white_check_mark: |
| Older tags and forks  | :x:                |

If a vulnerability affects an older tag, upgrade to the current `main` branch or the latest tagged release before requesting a fix.

## Reporting a Vulnerability

Do not open public GitHub issues for suspected security vulnerabilities.

Use one of these private channels instead:

1. GitHub Security Advisories / private vulnerability reporting for this repository, if enabled.
2. Email the maintainer at `aaronjxz@gmail.com`.

Include enough detail for the issue to be reproduced and triaged:

- A clear description of the vulnerability and impact.
- The affected package, app, file path, or workflow.
- Reproduction steps, proof of concept, or minimal test case.
- Any required configuration, environment variables, or deployment assumptions.
- Your assessment of severity and any suggested remediation.

## What To Expect

- Initial acknowledgement target: within 5 business days.
- Triage and severity assessment: as capacity allows after acknowledgement.
- Fixes are normally prepared against the latest supported branch only.
- Public disclosure should wait until a fix or mitigation is available.

## Scope Notes

This repository contains template code, sample applications, shared utilities, and demo integrations. Some examples are designed to be starting points rather than production-ready defaults.

Please report vulnerabilities that affect:

- Shared libraries under `common/`.
- Example backend or frontend applications under `apps/`.
- Build, release, CI/CD, or deployment workflows.
- Security-relevant documentation or configuration that could lead to unsafe deployments.

## Deployment Guidance

When using this template in production:

- Keep secrets out of committed JSON config and store them in environment variables or a secret manager.
- Review authentication, session, CORS, CSP, and file-upload settings before release.
- Run dependency updates and security audits regularly.
- Treat sample credentials, demo routes, and development defaults as non-production configuration.
