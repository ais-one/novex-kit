---

name: example-app-skill
description: Template for an app-specific Claude Code skill under apps/ — copy this folder, rename it and rewrite this description to say when the skill should be used. Not a real skill; never auto-invoked.
disable-model-invocation: true
---

# Example app skill

This is a starting point for skills that belong to the apps in this repo rather than to the template.

## Where app skills live

| Location                                    | Scope                   | Listed as           |
| ------------------------------------------- | ----------------------- | ------------------- |
| `apps/.claude/skills/<name>/SKILL.md`       | every app under `apps/` | `apps:<name>`       |
| `apps/<app>/.claude/skills/<name>/SKILL.md` | one app only            | `apps/<app>:<name>` |

Claude Code picks these up when it works on files under that folder. They live under `apps/**`, which the upstream template sync never overwrites (see [docs/github.md](../../../../docs/github.md#sync-upstream-template)), so they survive template updates. The root `.claude/skills/` is template-owned and gets replaced on sync. Don't put downstream-only skills there.

## Making a new skill

1. Copy this folder to `apps/.claude/skills/<name>/` or `apps/<app>/.claude/skills/<name>/`.
2. Set `name` to the folder name. Rewrite `description` to say what the skill covers and when to use it, because Claude decides whether to load a skill from its description.
3. Remove `disable-model-invocation: true` so Claude can load the skill on its own. Keep it if the skill should run only when someone types `/<name>`.
4. Replace this body with the instructions. Put long reference material in separate files next to `SKILL.md` and link to them.

CI's SkillSpector job (`.github/workflows/ci-quality.yml`) scans these folders the same way it scans the root skills.
