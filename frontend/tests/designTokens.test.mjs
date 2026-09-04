import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = readFileSync(new URL('../app/tokens.css', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

const REQUIRED_TOKENS = [
  '--wx-bg',
  '--wx-surface',
  '--wx-surface-strong',
  '--wx-ink',
  '--wx-dim',
  '--wx-line',
  '--wx-line-strong',
  '--wx-accent',
  '--wx-accent-soft',
  '--wx-green',
  '--wx-red',
  '--wx-amber',
  '--wx-font-display',
  '--wx-font-mono',
];

test('every design token is declared on :root', () => {
  for (const token of REQUIRED_TOKENS) {
    assert.match(
      tokens,
      new RegExp(`${token}\\s*:`),
      `missing token ${token} in app/tokens.css`,
    );
  }
});

test('accent matches the landing page cyan', () => {
  assert.match(tokens, /--wx-accent:\s*#67d1ef/);
});

test('ground matches the landing page near-black', () => {
  assert.match(tokens, /--wx-bg:\s*#04050a/);
});

test('globals.css imports the token layer before anything else', () => {
  const firstImport = globalStyles.indexOf('@import');
  const firstTailwind = globalStyles.indexOf('@tailwind');
  assert.ok(firstImport !== -1, 'globals.css must @import the token layer');
  assert.match(globalStyles.slice(firstImport, firstImport + 60), /tokens\.css/);
  assert.ok(
    firstImport < firstTailwind,
    '@import must precede @tailwind directives (CSS requires @import first)',
  );
});

const landingStyles = readFileSync(
  new URL('../components/landing/landing.css', import.meta.url),
  'utf8',
);

test('.lp4 aliases the shared tokens instead of redefining literals', () => {
  assert.match(landingStyles, /--lp4-accent:\s*var\(--wx-accent\)/);
  assert.match(landingStyles, /--lp4-bg:\s*var\(--wx-bg\)/);
  assert.match(landingStyles, /--lp4-ink:\s*var\(--wx-ink\)/);
  assert.match(landingStyles, /--lp4-dim:\s*var\(--wx-dim\)/);
  assert.match(landingStyles, /--lp4-line:\s*var\(--wx-line\)/);
  assert.match(landingStyles, /--lp4-line-strong:\s*var\(--wx-line-strong\)/);
  assert.match(landingStyles, /--lp4-green:\s*var\(--wx-green\)/);
  assert.match(landingStyles, /--lp4-red:\s*var\(--wx-red\)/);
});

test('.lp4 no longer hardcodes the accent hex', () => {
  assert.doesNotMatch(landingStyles, /--lp4-accent:\s*#67d1ef/);
});
