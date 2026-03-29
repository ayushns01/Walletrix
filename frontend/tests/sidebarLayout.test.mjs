import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../app/page.js', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('desktop wallet rail uses fixed positioning instead of sticky', () => {
  assert.match(globalStyles, /\.wallet-rail\s*\{[\s\S]*position:\s*fixed;/);
  assert.doesNotMatch(globalStyles, /\.wallet-rail\s*\{[\s\S]*position:\s*sticky;/);
});

test('desktop shell reserves width for the fixed rail', () => {
  assert.match(pageSource, /hidden lg:block lg:w-\[96px\]/);
  assert.match(pageSource, /className="wallet-rail hidden lg:fixed[\s\S]*lg:w-\[96px\]/);
});
