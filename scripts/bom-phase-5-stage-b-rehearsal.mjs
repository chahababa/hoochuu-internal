#!/usr/bin/env node

/**
 * BOM Phase 5 Stage B local/mock rehearsal helper.
 *
 * Safety contract:
 * - Reads local repo files only.
 * - Prints env key names and present/missing status only.
 * - Never prints env values.
 * - Never connects to Supabase, Zeabur, Resend, or production services.
 * - Never deploys, schedules cron, writes DB, sends email, or edits secrets/env.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

const root = cwd();

const requiredEnvKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'BOM_BACKUP_BUCKET',
  'BOM_IMPORT_BUCKET',
  'BOM_NOTIFICATION_RECIPIENTS',
];

const requiredDocs = [
  'docs/BOM_PHASE_5_PRODUCTION_PREFLIGHT.md',
  'docs/BOM_PHASE_5_PRODUCTION_ENABLEMENT_RUNBOOK.md',
  'docs/BOM_PHASE_5_SCAFFOLD.md',
  'docs/BOM_PHASE_5_STAGE_B_REHEARSAL.md',
  'docs/sql/bom_phase_5_cron_migration_draft.sql',
];

function readText(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
}

function envKeyPresence(relativePath) {
  const text = readText(relativePath);
  if (text === null) return { exists: false, present: [], missing: requiredEnvKeys };

  const names = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [name] = line.split('=', 1);
    if (name) names.add(name.trim());
  }

  return {
    exists: true,
    present: requiredEnvKeys.filter((key) => names.has(key)),
    missing: requiredEnvKeys.filter((key) => !names.has(key)),
  };
}

function printEnvReport(relativePath) {
  const result = envKeyPresence(relativePath);
  console.log(`\n## ${relativePath}`);
  if (!result.exists) {
    console.log('file: missing');
    return result;
  }

  for (const key of requiredEnvKeys) {
    const status = result.present.includes(key) ? 'present' : 'missing';
    console.log(`${key}: ${status}`);
  }
  return result;
}

function assertNoExecutableCronSchedule() {
  const cronDraft = readText('docs/sql/bom_phase_5_cron_migration_draft.sql');
  if (cronDraft === null) return { ok: false, reason: 'cron draft missing' };

  const executableScheduleLines = cronDraft
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => /cron\.(schedule|unschedule)\s*\(/i.test(line) && !line.trimStart().startsWith('--'));

  // This draft is intentionally review-only, but it may include executable-looking SQL
  // inside docs/sql. We do not run it here. Report it so the operator knows to keep it
  // out of production until Stage D approval.
  return {
    ok: true,
    executableScheduleLines: executableScheduleLines.map(({ number }) => number),
  };
}

function printChecklist() {
  console.log('\n## Manual non-production checklist');
  console.log('- pg_cron / pg_net / cron.job: run SELECT-only SQL only on Matt-approved non-production DB.');
  console.log('- Edge Functions: use `supabase functions list` only on non-production; do not deploy/invoke side effects.');
  console.log('- Zeabur: use `zeabur auth whoami` and `zeabur project list` only; do not edit env/redeploy/restart.');
  console.log('- Resend: dashboard names-only/manual confirmation only; do not reveal API key or send test email.');
  console.log('- Production gates: merge/deploy/secrets/env/cron/DB writes/real email still require Matt explicit approval.');
}

console.log('# BOM Phase 5 Stage B local/mock rehearsal');
console.log('Safety: local files only; names-only; no network; no secrets printed; no side effects.');

let failed = false;

console.log('\n## Required docs/files');
for (const relativePath of requiredDocs) {
  const exists = existsSync(join(root, relativePath));
  console.log(`${relativePath}: ${exists ? 'present' : 'missing'}`);
  if (!exists) failed = true;
}

const example = printEnvReport('.env.example');
if (!example.exists || example.missing.length > 0) failed = true;

// Local env files are optional; report names-only status if present.
printEnvReport('.env');
printEnvReport('.env.local');

const cronSafety = assertNoExecutableCronSchedule();
console.log('\n## Cron draft safety note');
if (!cronSafety.ok) {
  console.log(`status: blocked (${cronSafety.reason})`);
  failed = true;
} else if (cronSafety.executableScheduleLines.length > 0) {
  console.log('status: review-only SQL draft contains cron.schedule/unschedule lines; keep in docs/sql and do not run before Stage D approval.');
  console.log(`lines: ${cronSafety.executableScheduleLines.join(', ')}`);
} else {
  console.log('status: no executable cron.schedule/unschedule lines detected.');
}

printChecklist();

if (failed) {
  console.log('\nResult: BLOCKED — fix missing local docs/env example names before Stage B handoff.');
  exit(1);
}

console.log('\nResult: PASS — local/mock rehearsal prerequisites are present. Manual non-production checks still required.');
