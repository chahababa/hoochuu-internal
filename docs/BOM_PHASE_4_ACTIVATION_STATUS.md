# BOM Phase 4 Activation Status

Last updated: 2026-05-20

## Phase 4 definition found in this repo

Repo source of truth currently defines Phase 4 as:

- BOM UI routes are mounted under `src/app/(protected)/bom/*`.
- BOM settings routes are mounted under `src/app/(protected)/settings/bom/*`.
- Both route trees are protected by server-side `can_access_bom` checks.
- AppShell exposes the `BOM 成本管理` and `BOM 設定` navigation groups only when `profile.can_access_bom` is true.
- The owner activation migration grants `can_access_bom=true` only to active owner accounts.

This matches the Phase 3+4 PR-D / PR-E entries in `CHANGELOG.md`; Phase 4 is therefore already code-complete on `main` for owner-visible BOM UI activation.

## Current safe activation state

- Safe and already present in code: route mounting, AppShell entry points, server-side access gates, owner-only idempotent grant migration.
- Newly covered by test: `src/lib/bom-phase-4-activation.test.ts` verifies the AppShell feature flag, route-tree gates, and owner-only migration guardrails.
- No secrets, env values, production data writes, deployments, service restarts, or schema changes were performed in this PR.

## What is not part of Phase 4 activation

These are later/high-risk gates and require Matt approval before execution:

- Merging this PR.
- Deploying to Zeabur or restarting services.
- Changing secrets, environment variables, or API keys.
- Running `supabase db push` or editing production data.
- Enabling Phase 5 infra: pg_cron, Vault, Edge Functions, Resend.
- Granting BOM access to non-owner roles or additional real users.

## Recommended next step

Review this PR as a low-risk guardrail/docs PR. If accepted, Matt can decide separately whether to merge it and whether the next work item should be Phase 5 readiness/scaffold or a non-owner BOM access policy decision.
