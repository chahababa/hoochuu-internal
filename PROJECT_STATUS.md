# Project Status

## Current Stage

This repo is `hoochuu-internal` (formerly `Stores Checking System`), currently in **production** on Zeabur. All four 好初早餐 stores use it daily. A larger merge project is in progress to absorb the BOM cost-management system into this repo — see `CLAUDE.md` for phase status.

- GitHub repo: `chahababa/hoochuu-internal`
- Default branch: `main`
- Production URL: `https://stores-checking-system.zeabur.app`
- Current production behavior: unauthenticated `/` requests redirect to `/login`, and `/login` responds successfully.

The repo already includes:

- Next.js App Router + TypeScript + Tailwind foundation
- Supabase SSR auth with Google OAuth callback flow
- Role-based access for `owner`, `manager`, `leader`
- Settings modules for users, staff, items, focus items, stores, workstations, and QA cleanup
- Inspection create, edit, detail, history, lock, and delete flows
- Photo compression, upload, standard-photo toggle, and delete
- Improvement tracking workflow
- Monthly report page and CSV exports
- Audit log page and audit CSV export
- In-app notification center
- Optional Resend email notification code for completed inspections
- Deployment and handoff documentation
- Unit and Playwright test setup

## Latest Verified Checks

The documented quality gate remains:

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Run the full gate before merging code changes or deploying manually.

## Data / Seed Status

- `supabase/seed.sql` is localized and currently seeds Chinese store, category, and item names.
- Seeded owner account is `chahababa@gmail.com`.
- Current migration set has 16 files (14-digit standard format), from `20260408000001_mvp_schema.sql` through `20260513000016_create_bom_schema.sql`. All 16 are tracked in `supabase_migrations.schema_migrations` (restored 2026-05-14 via PR #26 — see `supabase/scripts/restore-migration-tracking.sql`).

## Current External / Operational Notes

- GitHub repo and `origin/main` are configured; the old "restore gh auth and push repo" blocker is resolved.
- `gh` CLI is installed and authenticated; use it for PR / issue / release operations.
- The production Zeabur app is reachable at `https://stores-checking-system.zeabur.app`.
- Resend inspection-completion email is implemented in code but remains disabled until `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured in Zeabur. See `TODO_RESEND_SETUP.md`.
- Local Supabase CLI is linked to SCS production (project ref `owogsszmolouoqsgmwik`) — see `supabase/.temp/project-ref`. `supabase db push` is operational after the 2026-05-14 tracking restore (PR #26).

## Recommended Next Phase

Active roadmap is the BOM merge project — see `CLAUDE.md` "下一步（Phase 1+）" and the source-of-truth plan at https://github.com/chahababa/hoochuu-internal-docs.

Immediate next phase: **Phase 1 — unified notification center** (`public.notifications` table + bell UI, SCS-only first, then shared once BOM is ported in Phases 2-4).

SCS-only carry-over items (not blocking the merge):

1. Finish Resend domain/API-key setup if email notifications should go live (see `TODO_RESEND_SETUP.md`).
2. Run the full smoke test in `GO_LIVE_CHECKLIST.md` against production after each phase.
3. Add more route/server-action integration tests for critical flows.
4. Decide whether LINE integration is still desired after email notifications are enabled.
