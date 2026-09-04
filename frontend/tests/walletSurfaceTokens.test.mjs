import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const globalStyles = read('../app/globals.css');
const pageSource = read('../app/page.js');

test('shell chrome is built from tokens, not literal slate/blue values', () => {
  const shell = globalStyles.slice(
    globalStyles.indexOf('.wallet-shell-bg'),
    globalStyles.indexOf('.custom-scrollbar'),
  );
  assert.ok(shell.length > 0, 'wallet shell block not found');
  assert.doesNotMatch(shell, /rgba\(59,\s*130,\s*246/, 'blue-500 literal still present');
  assert.doesNotMatch(shell, /rgba\(15,\s*23,\s*42/, 'slate-900 literal still present');
  assert.doesNotMatch(shell, /rgba\(148,\s*163,\s*184/, 'slate-400 literal still present');
  assert.match(shell, /var\(--wx-line\)/);
  assert.match(shell, /var\(--wx-surface/);
});

test('the shell mounts the damped aurora', () => {
  assert.match(pageSource, /import AuroraBackground from '@\/components\/AuroraBackground'/);
  assert.match(pageSource, /<AuroraBackground[\s\S]{0,120}motion=\{1\}/);
  assert.match(pageSource, /alphaScale=\{0\.45\}/);
  assert.match(pageSource, /waves=\{false\}/);
});

test('the dashboard main no longer renders the purple star field', () => {
  const dashboardMain = pageSource.slice(
    pageSource.indexOf('wallet-shell-bg min-h-screen'),
  );
  assert.doesNotMatch(
    dashboardMain,
    /animated-bg lg:hidden/,
    'dashboard still renders the mobile star field',
  );
});

// Regression guard: Task 7 must not break the existing sidebar contract.
test('the fixed-rail layout contract still holds', () => {
  assert.match(globalStyles, /\.wallet-rail\s*\{[\s\S]*position:\s*fixed;/);
  assert.match(pageSource, /hidden lg:block lg:w-\[96px\]/);
});
