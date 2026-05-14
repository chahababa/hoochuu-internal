# Open Items

## Production / Operations

- Finish Resend setup for inspection-completion email notifications:
  - verify `hoochuu.com.tw` in Resend
  - add DNS records
  - set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Zeabur
  - send one test inspection and confirm email delivery / audit logs
- Execute the full production smoke test in `GO_LIVE_CHECKLIST.md`.
- Create or confirm real manager and leader accounts for day-to-day use.
- Confirm backup / recovery expectations for Supabase database and storage.

## Strongly Recommended

- Add route and server-action integration tests for the most critical flows.
- Add a second round of inspection workflow tests around edit, lock, and delete.
- Review seed content with the business owner and replace any remaining placeholder operational wording.
- Update `PRODUCTION_HANDOFF_TEMPLATE.md` after the next production verification pass.

## Nice to Have

- Dashboard-style home page.
- More visual charts in reports.
- PDF export or print-friendly report format.
- LINE integration, if still needed after email notifications are enabled.
- Photo library / standard-photo browsing experience.

## Resolved / Historical

- GitHub repo creation and initial push are complete. The active repo is `chahababa/hoochuu-internal`.
- `gh` CLI is installed and authenticated on this machine; use it for PR / issue / release operations.
- Production hosting is already on Zeabur at `https://stores-checking-system.zeabur.app`.
- SCS production Supabase migration tracking was restored 2026-05-14 (PR #26 + `supabase/scripts/restore-migration-tracking.sql`). All 16 migrations are now tracked; `supabase db push` is operational.
