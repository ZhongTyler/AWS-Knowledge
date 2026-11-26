import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resolveSourceClippings, clippingPaths} from './source-clipping.mjs';

const inventory = ['Clippings/a.md', 'Clippings/nested/b.md', 'Clippings/v1.2.md', 'Clippings/a,b.md'];
const document = field => '\uFEFF---\r\n' + field.replaceAll('\n', '\r\n') + '\r\n---\r\n# Raw';

test('source_clipping resolves scalar, block/inline lists, basename, aliases and anchors', () => {
  for (const field of ['source_clipping: "[[Clippings/a|Alias]]"', "source_clipping: '[[a#Heading|Alias]]'", 'source_clipping: Clippings/a.md']) {
    assert.deepEqual(resolveSourceClippings(document(field), inventory), {paths: ['Clippings/a.md'], unavailable: []});
  }
  const expected = ['Clippings/a.md', 'Clippings/nested/b.md', 'Clippings/v1.2.md', 'Clippings/a,b.md'];
  for (const field of [
    'source_clipping:\n  - "[[a]]"\n  - Clippings/nested/b\n  - "[[v1.2]]"\n  - "[[a,b]]"',
    'source_clipping: ["[[a]]", [[b]], "[[v1.2]]", "[[a,b]]", "[[a]]"]'
  ]) assert.deepEqual(resolveSourceClippings(document(field), inventory), {paths: expected, unavailable: []});
});

test('provenance is frontmatter-only and rejects duplicate declarations and ambiguous basenames', () => {
  assert.deepEqual(resolveSourceClippings('# Raw\nsource_clipping: [[a]]\n[[Clippings/a]]', inventory).paths, []);
  assert.deepEqual(resolveSourceClippings(document('other: "[[Clippings/a]]"'), inventory).paths, []);
  assert.deepEqual(resolveSourceClippings(document('source_clipping: a\nsource_clipping: b'), inventory).unavailable, ['ambiguous_source_clipping']);
  const duplicates = [...inventory, 'Clippings/private/a.md'];
  assert.deepEqual(resolveSourceClippings(document('source_clipping: a'), duplicates), {paths: [], unavailable: ['ambiguous_source_clipping']});
  assert.deepEqual(resolveSourceClippings(document('source_clipping: Clippings/a'), duplicates).paths, ['Clippings/a.md']);
  assert.deepEqual(resolveSourceClippings(document('source_clipping: missing'), inventory).unavailable, ['source_clipping_missing']);
});

test('invalid links cannot traverse or smuggle encoded paths into provenance', () => {
  for (const target of ['../Clippings/a', 'Clippings/../a', '/Clippings/a', 'C:/Clippings/a', 'Clippings\\a', 'Clippings/%2e%2e/a', 'Clippings/%252e%252e/a', 'Clippings//a']) {
    const result = resolveSourceClippings(document('source_clipping: ' + JSON.stringify('[[' + target + ']]')), inventory);
    assert.deepEqual(result, {paths: [], unavailable: ['invalid_source_clipping']}, target);
  }
  assert.deepEqual(resolveSourceClippings(document('source_clipping: ["unterminated]'), inventory).unavailable, ['invalid_source_clipping']);
  assert.deepEqual(resolveSourceClippings(document('source_clipping: "[[a]]" trailing'), inventory), {paths: [], unavailable: ['invalid_source_clipping']});
  assert.deepEqual(resolveSourceClippings(document('source_clipping: a'), ['Clippings/../a.md']), {paths: [], unavailable: ['invalid_source_clipping']});
});

test('real compound scalars and literal percent names remain exact; external sources stay unavailable', () => {
  const paths = [...inventory, 'Clippings/90%的功能.md'];
  for (const separator of ['; ', ' + ']) {
    assert.deepEqual(resolveSourceClippings(document('source_clipping: ' + JSON.stringify('[[Clippings/a]]' + separator + '[[90%的功能]]')), paths),
      {paths: ['Clippings/a.md', 'Clippings/90%的功能.md'], unavailable: []});
  }
  assert.deepEqual(resolveSourceClippings(document('source_clipping:\n- a\n- https://external.invalid/article'), paths),
    {paths: ['Clippings/a.md'], unavailable: ['external_source_unavailable']});
  assert.deepEqual(resolveSourceClippings(document('source_clipping: a'), () => { throw Error('EACCES'); }),
    {paths: [], unavailable: ['source_clipping_inventory_unavailable']});
});

test('filesystem inventory reads names only and excludes symlinks', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-clipping-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'Clippings/nested'), {recursive: true});
  fs.writeFileSync(path.join(root, 'Clippings/nested/a.md'), 'BODY');
  assert.deepEqual(clippingPaths(root), ['Clippings/nested/a.md']);
  if (process.platform !== 'win32') {
    fs.symlinkSync(path.join(root, 'Clippings/nested/a.md'), path.join(root, 'Clippings/alias.md'));
    fs.symlinkSync(root, path.join(root, 'Clippings/escape'));
    assert.deepEqual(clippingPaths(root), ['Clippings/nested/a.md']);
  }
  let listed = false;
  assert.deepEqual(resolveSourceClippings('# Raw', () => { listed = true; return inventory; }).paths, []);
  assert.equal(listed, false);
});
