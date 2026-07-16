#!/usr/bin/env node
/**
 * Regenerates research/dashboard.html from research/status.json and
 * research/out/*.json. Self-contained (inline CSS, no external assets),
 * theme-aware (prefers-color-scheme + data-theme override), safe to open
 * locally or publish as an artifact.
 *
 * Usage: node research/harness/dashboard.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const rd = (p) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; }
};

const status = rd('research/status.json') ?? {};
const baseline = rd('research/out/baseline.json');
const config = rd('research/config.json') ?? {};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d).replace(/\.00$/, '') : '—');

const PHASES = ['T0', 'T1', 'T2', 'T3', 'T4'];
const phaseState = (p) => (status.phases ?? {})[p] ?? 'pending';
const STATE_GLYPH = { done: '✓', running: '▶', pending: '·', failed: '✗', skipped: '–', 'aborted': '✗' };

const experiments = status.experiments ?? [];
const events = (status.events ?? []).slice(-30).reverse();

// worst topics by GFS from baseline metrics (magnitude -> single sequential hue)
const worstTopics = baseline
  ? Object.entries(baseline.per_topic)
      .map(([t, v]) => ({ topic: t, gfs: v.gfs }))
      .sort((a, b) => a.gfs - b.gfs)
      .slice(0, 12)
  : [];

const bestExp = experiments
  .filter((e) => typeof e.gfs === 'number')
  .sort((a, b) => b.gfs - a.gfs)[0];

const tile = (label, value, sub = '', delta = null) => `
  <div class="tile">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value">${esc(value)}${delta !== null ? `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${esc(fmt(Math.abs(delta)))}</span>` : ''}</div>
    ${sub ? `<div class="tile-sub">${esc(sub)}</div>` : ''}
  </div>`;

const gateChip = (g) => `<span class="chip ${g.pass ? 'chip-good' : 'chip-bad'}" title="${esc(g.detail)}">${g.pass ? '✓' : '✗'} ${esc(g.id)}</span>`;

const expRow = (e) => `
  <tr>
    <td><code>${esc(e.id)}</code></td>
    <td>${esc(e.title)}</td>
    <td class="num">${fmt(e.gfs)}</td>
    <td class="num">${e.gfs_delta != null ? (e.gfs_delta >= 0 ? '+' : '') + fmt(e.gfs_delta) : '—'}</td>
    <td>${e.gates ? e.gates.map(gateChip).join(' ') : `<span class="muted">${esc(e.state ?? 'pending')}</span>`}</td>
    <td>${esc(e.verdict ?? '')}</td>
  </tr>`;

const barRow = (t, maxGfs) => `
  <div class="bar-row">
    <div class="bar-label" title="${esc(t.topic)}">${esc(t.topic)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (t.gfs / 100) * 100)}%"></div></div>
    <div class="bar-value">${fmt(t.gfs)}</div>
  </div>`;

const html = `<title>Math-cards autoresearch — ${esc(status.run_id ?? 'run')}</title>
<style>
  .aral { color-scheme: light;
    --surface-1:#fcfcfb; --plane:#f9f9f7; --ink:#0b0b0b; --ink-2:#52514e; --muted:#898781;
    --grid:#e1e0d9; --baseline:#c3c2b7; --ring:rgba(11,11,11,0.10);
    --seq:#2a78d6; --good:#0ca30c; --good-text:#006300; --critical:#d03b3b;
    font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink);
    background: var(--plane); padding: 24px; max-width: 1080px; margin: 0 auto; }
  @media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) .aral {
    color-scheme: dark; --surface-1:#1a1a19; --plane:#0d0d0d; --ink:#ffffff; --ink-2:#c3c2b7;
    --grid:#2c2c2a; --baseline:#383835; --ring:rgba(255,255,255,0.10); --seq:#3987e5;
    --good-text:#0ca30c; } }
  :root[data-theme="dark"] .aral { color-scheme: dark; --surface-1:#1a1a19; --plane:#0d0d0d;
    --ink:#ffffff; --ink-2:#c3c2b7; --grid:#2c2c2a; --baseline:#383835;
    --ring:rgba(255,255,255,0.10); --seq:#3987e5; --good-text:#0ca30c; }
  .aral h1 { font-size: 20px; margin: 0 0 4px; }
  .aral h2 { font-size: 15px; margin: 28px 0 10px; }
  .aral .sub { color: var(--ink-2); margin-bottom: 20px; }
  .aral .rail { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 20px; }
  .aral .ph { border: 1px solid var(--ring); background: var(--surface-1); border-radius: 8px;
    padding: 6px 12px; color: var(--ink-2); }
  .aral .ph b { color: var(--ink); }
  .aral .ph.done { border-color: var(--good); }
  .aral .ph.running { border-color: var(--seq); color: var(--ink); }
  .aral .ph.failed, .aral .ph.aborted { border-color: var(--critical); }
  .aral .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .aral .tile { background: var(--surface-1); border: 1px solid var(--ring); border-radius: 10px; padding: 12px 14px; }
  .aral .tile-label { color: var(--muted); font-size: 12px; }
  .aral .tile-value { font-size: 26px; font-weight: 600; margin-top: 2px; }
  .aral .tile-sub { color: var(--ink-2); font-size: 12px; margin-top: 2px; }
  .aral .delta { font-size: 13px; font-weight: 600; margin-left: 8px; }
  .aral .delta.up { color: var(--good-text); }
  .aral .delta.down { color: var(--critical); }
  .aral table { width: 100%; border-collapse: collapse; background: var(--surface-1);
    border: 1px solid var(--ring); border-radius: 10px; overflow: hidden; }
  .aral th { text-align: left; color: var(--muted); font-weight: 500; font-size: 12px; }
  .aral th, .aral td { padding: 8px 12px; border-bottom: 1px solid var(--grid); vertical-align: top; }
  .aral tr:last-child td { border-bottom: none; }
  .aral td.num, .aral th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .aral .chip { display: inline-block; font-size: 11px; border: 1px solid var(--ring);
    border-radius: 999px; padding: 1px 8px; margin: 1px 0; white-space: nowrap; }
  .aral .chip-good { color: var(--good-text); border-color: var(--good); }
  .aral .chip-bad { color: var(--critical); border-color: var(--critical); }
  .aral .muted { color: var(--muted); }
  .aral .bars { background: var(--surface-1); border: 1px solid var(--ring); border-radius: 10px; padding: 14px; }
  .aral .bar-row { display: grid; grid-template-columns: 220px 1fr 48px; gap: 10px; align-items: center; padding: 3px 0; }
  .aral .bar-label { color: var(--ink-2); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .aral .bar-track { background: transparent; border-left: 2px solid var(--baseline); height: 14px; }
  .aral .bar-fill { background: var(--seq); height: 100%; border-radius: 0 4px 4px 0; }
  .aral .bar-value { font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
  .aral .log { background: var(--surface-1); border: 1px solid var(--ring); border-radius: 10px;
    padding: 10px 14px; max-height: 340px; overflow-y: auto; }
  .aral .log div { padding: 3px 0; border-bottom: 1px solid var(--grid); font-size: 12.5px; }
  .aral .log div:last-child { border-bottom: none; }
  .aral .log .ts { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 8px; }
  .aral .foot { color: var(--muted); font-size: 12px; margin-top: 24px; }
  .aral code { font-size: 12px; }
  @media (max-width: 640px) { .aral .bar-row { grid-template-columns: 120px 1fr 42px; } }
</style>
<div class="aral">
  <h1>Overnight autoresearch — Math-cards</h1>
  <div class="sub">${esc(config.objective ?? '')}<br>
    run <code>${esc(status.run_id ?? '—')}</code> · phase <b>${esc(status.phase ?? '—')}</b> (${esc(status.phase_status ?? '—')}) · updated ${esc(status.updated_at ?? '—')}</div>

  <div class="rail">
    ${PHASES.map((p) => `<div class="ph ${esc(phaseState(p))}"><b>${p}</b> ${esc(STATE_GLYPH[phaseState(p)] ?? '·')} ${esc(phaseState(p))}</div>`).join('')}
  </div>

  <div class="tiles">
    ${tile('Baseline GFS', baseline ? fmt(baseline.totals.gfs) : '—', baseline ? `accept ${fmt(baseline.totals.accept_rate_pct)}% · reject ${fmt(baseline.totals.reject_rate_pct)}%` : 'pending T0')}
    ${tile('Best candidate GFS', bestExp ? fmt(bestExp.gfs) : '—', bestExp ? bestExp.id : 'pending T3', bestExp && baseline ? bestExp.gfs - baseline.totals.gfs : null)}
    ${tile('Experiments', String(experiments.length), experiments.length ? `${experiments.filter((e) => e.verdict === 'green').length} all-green` : 'pending T2')}
    ${tile('Test suite', status.tests_baseline ?? '—', 'vitest, baseline')}
    ${tile('Winner', status.winner ?? '—', status.winner_state ?? '')}
  </div>

  <h2>Experiments</h2>
  ${experiments.length ? `<table>
    <thead><tr><th>id</th><th>hypothesis</th><th class="num">GFS</th><th class="num">Δ</th><th>gates</th><th>verdict</th></tr></thead>
    <tbody>${experiments.map(expRow).join('')}</tbody>
  </table>` : '<div class="muted">No experiments yet — waiting for T1/T2.</div>'}

  <h2>Baseline: 12 lowest-fidelity topics (GFS per topic, 0–100)</h2>
  ${worstTopics.length ? `<div class="bars">${worstTopics.map((t) => barRow(t)).join('')}</div>` : '<div class="muted">Pending T0 baseline.</div>'}

  <h2>Event log</h2>
  <div class="log">${events.map((e) => `<div><span class="ts">${esc(e.ts)}</span>${esc(e.msg)}</div>`).join('') || '<div class="muted">No events.</div>'}</div>

  <div class="foot">
    Kill switch: <code>touch research/KILL</code> stops the loop at the next phase boundary.
    Resume protocol: see <code>research/RUNBOOK.md</code> — state lives in <code>research/status.json</code>.
  </div>
</div>
`;

const out = path.join(ROOT, 'research', 'dashboard.html');
const tmp = `${out}.tmp-${process.pid}`;
fs.writeFileSync(tmp, html);
fs.renameSync(tmp, out);
console.log(`dashboard -> ${out}`);
