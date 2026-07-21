#!/usr/bin/env node
/**
 * Merge-gate evaluator: compares a candidate's measurements against baseline
 * and the thresholds in research/config.json. All gates must be green for a
 * candidate to be merge-eligible.
 *
 * Usage:
 *   node research/harness/gates.mjs \
 *     --baseline research/out/baseline.json \
 *     --candidate /path/to/candidate-metrics.json \
 *     --checks /path/to/checks.json \        # {"tests_pass":true,"tsc_clean":true,"bundle_bytes":123,"baseline_bundle_bytes":120}
 *     --diff-names /path/to/changed-files.txt \
 *     [--out /path/to/verdict.json]
 *
 * Exit code: 0 all green, 1 any gate red, 2 usage/IO error.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'config.json'), 'utf8'));

const opts = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  opts[argv[i].replace(/^--/, '')] = argv[i + 1];
}
for (const req of ['baseline', 'candidate', 'checks', 'diff-names']) {
  if (!opts[req]) {
    console.error(`missing --${req}`);
    process.exit(2);
  }
}

const baseline = JSON.parse(fs.readFileSync(opts.baseline, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(opts.candidate, 'utf8'));
const checks = JSON.parse(fs.readFileSync(opts.checks, 'utf8'));
const diffNames = fs.readFileSync(opts['diff-names'], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

const G = CONFIG.gates;
const gates = [];
const add = (id, pass, detail) => gates.push({ id, pass: Boolean(pass), detail });

add('G1-tests', checks.tests_pass === true, `vitest suite pass=${checks.tests_pass}`);
add('G2-tsc', checks.tsc_clean === true, `tsc --noEmit clean=${checks.tsc_clean}`);

const gfsDelta = candidate.totals.gfs - baseline.totals.gfs;
// GFS pools 54 mostly-healthy topics, so raw deltas are small; the honest
// scale is how much of the *remaining measured defect* a candidate removes.
const baseDefect = 100 - baseline.totals.gfs;
const candDefect = 100 - candidate.totals.gfs;
const defectReduction = baseDefect > 0 ? (baseDefect - candDefect) / baseDefect : 0;
add('G3-gfs-improves', defectReduction >= G.min_defect_reduction,
  `GFS ${baseline.totals.gfs} -> ${candidate.totals.gfs} (defect ${baseDefect.toFixed(2)} -> ${candDefect.toFixed(2)}, reduction ${(defectReduction * 100).toFixed(1)}%, need >= ${(G.min_defect_reduction * 100).toFixed(0)}%)`);

const rejectDrop = baseline.totals.reject_rate_pct / 100 - candidate.totals.reject_rate_pct / 100;
add('G4-reject-no-regress', rejectDrop <= G.max_reject_rate_drop,
  `reject-rate ${baseline.totals.reject_rate_pct}% -> ${candidate.totals.reject_rate_pct}% (drop ${(rejectDrop * 100).toFixed(2)}pp, allowed ${(G.max_reject_rate_drop * 100).toFixed(0)}pp)`);

add('G5-gen-errors', candidate.totals.gen_errors - baseline.totals.gen_errors <= G.max_gen_errors_increase,
  `gen_errors ${baseline.totals.gen_errors} -> ${candidate.totals.gen_errors}`);

const latRatio = baseline.latency.val_ms_p95 > 0
  ? candidate.latency.val_ms_p95 / baseline.latency.val_ms_p95
  : 1;
const wallRatio = baseline.latency.wall_ms > 0
  ? candidate.latency.wall_ms / baseline.latency.wall_ms
  : 1;
add('G6-latency', latRatio <= G.max_latency_ratio && wallRatio <= G.max_latency_ratio,
  `val p95 x${latRatio.toFixed(2)}, corpus wall x${wallRatio.toFixed(2)} (allowed x${G.max_latency_ratio})`);

const bundleRatio = checks.baseline_bundle_bytes > 0
  ? checks.bundle_bytes / checks.baseline_bundle_bytes
  : 1;
add('G7-bundle', bundleRatio <= G.max_bundle_ratio,
  `bundle ${checks.baseline_bundle_bytes} -> ${checks.bundle_bytes} bytes (x${bundleRatio.toFixed(4)}, allowed x${G.max_bundle_ratio})`);

const forbidden = diffNames.filter(f => CONFIG.forbidden_paths.some(p => f === p || f.startsWith(p)));
add('G8-diff-scope', forbidden.length === 0,
  forbidden.length ? `touches forbidden paths: ${forbidden.join(', ')}` : `all ${diffNames.length} changed files in allowed scope`);

const allGreen = gates.every(g => g.pass);
const verdict = {
  schema: 1,
  evaluated_at: new Date().toISOString(),
  candidate_label: candidate.label,
  baseline_label: baseline.label,
  gfs_delta: Math.round(gfsDelta * 100) / 100,
  all_green: allGreen,
  gates,
  changed_files: diffNames,
};

const outStr = JSON.stringify(verdict, null, 2);
if (opts.out) {
  const tmp = `${opts.out}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, outStr);
  fs.renameSync(tmp, opts.out);
}
console.log(outStr);
process.exit(allGreen ? 0 : 1);
