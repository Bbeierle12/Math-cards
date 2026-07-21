#!/usr/bin/env node
/**
 * Atomic status-file manager for the overnight autoresearch loop.
 *
 * research/status.json is the single source of truth for resuming the run
 * after a context limit, process kill, or container restart. Every write is
 * tmp-file + rename, so a kill at any instant leaves either the old or the
 * new file — never a torn one.
 *
 * Usage:
 *   node research/harness/status.mjs get
 *   node research/harness/status.mjs set phase=T2 phase_status=running next_action="..."
 *   node research/harness/status.mjs merge '{"artifacts":{"baseline":"research/out/baseline.json"}}'
 *   node research/harness/status.mjs event "T0 complete: GFS 71.3"
 *   node research/harness/status.mjs killcheck   # exit 3 if research/KILL exists
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const STATUS = path.join(ROOT, 'research', 'status.json');
const LOG = path.join(ROOT, 'research', 'log.md');
const KILL = path.join(ROOT, 'research', 'KILL');

const now = () => new Date().toISOString();

function read() {
  try {
    return JSON.parse(fs.readFileSync(STATUS, 'utf8'));
  } catch {
    return { schema: 1, run_id: 'uninitialized', phase: null, events: [] };
  }
}

function writeAtomic(obj) {
  obj.updated_at = now();
  const tmp = `${STATUS}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, STATUS);
}

function appendLog(line) {
  fs.appendFileSync(LOG, `- \`${now()}\` ${line}\n`);
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'get': {
    process.stdout.write(JSON.stringify(read(), null, 2) + '\n');
    break;
  }
  case 'set': {
    const s = read();
    for (const arg of args) {
      const eq = arg.indexOf('=');
      if (eq === -1) continue;
      s[arg.slice(0, eq)] = arg.slice(eq + 1);
    }
    writeAtomic(s);
    break;
  }
  case 'merge': {
    const s = read();
    Object.assign(s, JSON.parse(args[0] ?? '{}'));
    writeAtomic(s);
    break;
  }
  case 'event': {
    const s = read();
    const msg = args.join(' ');
    s.events = [...(s.events ?? []), { ts: now(), msg }];
    writeAtomic(s);
    appendLog(msg);
    break;
  }
  case 'killcheck': {
    if (fs.existsSync(KILL)) {
      const s = read();
      s.phase_status = 'aborted-by-kill-switch';
      s.events = [...(s.events ?? []), { ts: now(), msg: 'KILL switch detected — aborting at phase boundary' }];
      writeAtomic(s);
      appendLog('KILL switch detected — run aborted at phase boundary');
      console.error('KILL switch present at research/KILL — aborting.');
      process.exit(3);
    }
    break;
  }
  default:
    console.error('usage: status.mjs get|set k=v...|merge <json>|event <msg>|killcheck');
    process.exit(2);
}
