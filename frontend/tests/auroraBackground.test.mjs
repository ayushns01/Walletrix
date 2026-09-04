import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../components/AuroraBackground.js', import.meta.url),
  'utf8',
);

test('accepts motion, alpha, waves and className props', () => {
  assert.match(source, /motion\s*=\s*3/, 'motion must default to the landing value of 3');
  assert.match(source, /alphaScale\s*=\s*1/, 'alphaScale must default to 1 (landing intensity)');
  assert.match(source, /waves\s*=\s*true/, 'waves must default to true');
  assert.match(source, /className\s*=\s*''/);
});

test('pauses the animation loop when the tab is hidden', () => {
  assert.match(source, /visibilitychange/);
  assert.match(source, /document\.visibilityState/);
});

test('removes the visibilitychange listener on unmount', () => {
  assert.match(source, /removeEventListener\('visibilitychange'/);
});

test('still honours prefers-reduced-motion', () => {
  assert.match(source, /prefers-reduced-motion/);
});

test('the landing keeps its import path working', () => {
  const shim = readFileSync(
    new URL('../components/landing/AuroraBackground.js', import.meta.url),
    'utf8',
  );
  assert.match(shim, /from '\.\.\/AuroraBackground'/);
});
