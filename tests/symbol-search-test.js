const assert = require('node:assert/strict');
const catalog = require('../symbol-catalog');
const netlifyCatalog = require('../netlify/lib/fallback-symbols');

function firstSymbol(query) {
  const results = catalog.searchFallback(query, 5);
  assert.ok(results.length > 0, `Expected at least one result for "${query}"`);
  return results[0].symbol;
}

assert.strictEqual(netlifyCatalog.FALLBACK_SYMBOLS, catalog.FALLBACK_SYMBOLS);
assert.equal(firstSymbol('Tesla'), 'TSLA');
assert.equal(firstSymbol('Strategy'), 'MSTR');
assert.equal(firstSymbol('MicroStrategy'), 'MSTR');
assert.equal(firstSymbol('TSMC'), 'TSM');
assert.equal(firstSymbol('Taiwan Semiconductor'), 'TSM');

console.log('Symbol search fallback tests passed');
