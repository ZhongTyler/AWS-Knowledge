import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {discover, discoverLegacy, normalizeRequest, readSource} from './query-evidence.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'query-domain-group-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const put = (relative, text) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
    fs.writeFileSync(path.join(root, relative), text);
    return text;
  };
  const request = {need: {question: 'unmatched-query'}, domain_groups: ['design'], retrieval: {mode: 'legacy'}};
  return {root, put, request, find: extra => discover({...request, ...extra}, root)};
}
const group = (id, status = 'active', approval = 'approved') =>
  `---\nid: ${id}\nname: Design navigation\naliases: [设计入口]\nstatus: ${status}\napproval_status: ${approval}\ncandidate_members: [domains/speculative.md]\n---\n# Group\n`;

test('DomainGroup expands real Domain members for id, alias and stable ref without reading evidence', t => {
  const f = fixture(t);
  const definition = f.put('domain-groups/design.md', group('design'));
  const domain = f.put('domains/设计.md', '---\ndomain_groups:\n  - design\n  - design\n---\n# 设计\nDOMAIN BODY\n[Wiki](../wiki/core.md)\n');
  f.put('domains/speculative.md', '# Speculative');
  f.put('domains/body-only.md', '# Body\ndomain_groups: [design]');
  f.put('domains/nested/hidden.md', '---\ndomain_groups: [design]\n---\n# Nested');
  f.put('wiki/core.md', '# Core\nWIKI BODY');
  for (const selection of ['design', '设计入口', 'knowledge:domain-group:design']) {
    const found = f.find({domain_groups: [selection, selection]});
    assert.deepEqual(found.candidates.map(row => row.ref), ['knowledge:domain:设计']);
    const candidate = found.candidates[0];
    assert.equal(candidate.path, 'domains/设计.md');
    assert.equal(candidate.source_sha256, hash(domain));
    assert.deepEqual(candidate.discovery_signals, ['domain-group:design']);
    assert.equal(candidate.content_read, false);
    assert.equal(candidate.claim_support, 'not_verified');
    assert.equal(found.domain_group_signals[0].ref, 'knowledge:domain-group:design');
    assert.equal(found.domain_group_signals[0].source_sha256, hash(definition));
    assert.equal(found.domain_group_signals[0].content_read, false);
    assert.equal(found.metrics.source_content_returns, 0);
    assert.doesNotMatch(JSON.stringify(found), /DOMAIN BODY|WIKI BODY/);
  }
  const read = readSource({request: f.request, ref: 'knowledge:domain:设计'}, f.root);
  assert.equal(read.status, 'source_read');
  assert.ok(read.content.includes('DOMAIN BODY'));
  const next = f.find({domain_groups: [], domains: ['设计']});
  assert.deepEqual(next.candidates.map(row => row.ref), ['knowledge:wiki:core']);
});

test('inactive, unapproved, mismatched, body-only and Wiki Group definitions cannot expand Domains', t => {
  const f = fixture(t);
  f.put('domains/Design.md', '---\ndomain_groups: [design]\n---\n# Domain');
  f.put('groups/design.md', group('design'));
  assert.equal(f.find().candidates.length, 0);
  for (const definition of [group('design', 'inactive'), group('design', 'active', 'pending'), group('other'), '# Body\nid: design\nstatus: active\napproval_status: approved']) {
    f.put('domain-groups/design.md', definition);
    assert.equal(f.find().candidates.length, 0);
  }
  f.put('domain-groups/design.md', group('other'));
  const mismatch = f.find({domain_groups: ['other']});
  assert.ok(mismatch.unavailable.some(row => row.reason === 'domain_group_identity_mismatch'));
});

test('DomainGroup expansion respects permissions, budgets, normalization and existing Wiki Groups', t => {
  const f = fixture(t);
  f.put('domain-groups/design.md', group('design'));
  f.put('domains/Design.md', '---\ndomain_groups: [design]\n---\n# Domain');
  f.put('groups/design.md', group('design'));
  f.put('wiki/member.md', '---\ngroups: [design]\n---\n# Member');
  assert.deepEqual(normalizeRequest({...f.request, domain_groups: ['design', 'design']}).domain_groups, ['design']);
  assert.throws(() => normalizeRequest({...f.request, domain_groups: [null]}), /invalid domain_groups/);
  assert.equal(f.find({sources: {domain: false}}).candidates.length, 0);
  assert.equal(f.find({sources: {wiki: false}}).candidates[0].ref, 'knowledge:domain:Design');
  assert.equal(f.find({sources: {knowledge: false}}).metrics.file_reads, 0);
  const limited = f.find({budget: {max_candidates: 0}});
  assert.equal(limited.status, 'budget_exhausted');
  assert.equal(limited.discovery_scope.candidates_not_returned, 1);
  const wiki = f.find({domain_groups: [], groups: ['design']});
  assert.deepEqual(wiki.candidates.map(row => row.ref), ['knowledge:wiki:member']);
  assert.deepEqual(wiki.candidates[0].discovery_signals, ['group:design']);
  assert.deepEqual(wiki.domain_group_signals, []);
  assert.deepEqual(discoverLegacy(f.request, f.root).candidates, f.find().candidates);
});

test('linked DomainGroup directories outside the root cannot supply candidates', t => {
  const f = fixture(t), outside = fixture(t);
  outside.put('design.md', group('design'));
  f.put('domains/Design.md', '---\ndomain_groups: [design]\n---\n# Domain');
  fs.symlinkSync(outside.root, path.join(f.root, 'domain-groups'), process.platform === 'win32' ? 'junction' : 'dir');
  const found = f.find();
  assert.equal(found.candidates.length, 0);
  assert.ok(found.unavailable.some(row => row.path === 'domain-groups'));
});

test('principle planning can obtain only real member Domains with Wiki disabled and legacy discovery', t => {
  const f = fixture(t);
  f.put('domain-groups/design.md', group('design'));
  f.put('domain-groups/inactive.md', group('inactive', 'inactive'));
  f.put('domains/Member.md', '---\ndomain_groups: [design]\n---\n# Member\n[Wiki](../wiki/member.md)');
  f.put('domains/Other.md', '---\ndomain_groups: [other]\n---\n# Other');
  f.put('domains/Inactive.md', '---\ndomain_groups: [inactive]\n---\n# Inactive');
  f.put('wiki/member.md', '# unmatched-query');
  const found = discover({...f.request, sources: {wiki: false}, retrieval: {mode: 'legacy'}}, f.root);
  const domains = found.candidates.filter(row => row.source_kind === 'domain');
  assert.equal(found.retrieval.used_mode, 'legacy');
  assert.deepEqual(domains.map(row => row.ref), ['knowledge:domain:Member']);
  assert.equal(domains[0].content_read, false);
  assert.equal(found.discovery_scope.wiki_metadata_files, 0);
  assert.equal(found.metrics.source_content_returns, 0);
  assert.deepEqual(f.find({domain_groups: ['inactive'], sources: {wiki: false}}).candidates, []);
});

test('Wiki receipts expose only the related section while preserving all linked Wiki navigation', t => {
  const f = fixture(t);
  f.put('wiki/core.md', '# Core\n[Body](body.md)\n```md\n## 相关页面\n```\n## 来源\n[Source](source.md)\n## 相关页面\n[Peer](peer.md#mechanism)\n### 子类\n[Nested](<nested peer.md>)\n[Raw](../raw-sources/source.md)\n[External](https://example.invalid/wiki/external.md)\n## 下一节\n[Other](other.md)');
  const receipt = readSource({request: f.request, ref: 'knowledge:wiki:core'}, f.root);
  assert.equal(receipt.status, 'source_read');
  assert.deepEqual(receipt.navigation.related_wiki, ['wiki/peer.md', 'wiki/nested peer.md']);
  assert.deepEqual(receipt.navigation.linked_wiki, ['wiki/body.md', 'wiki/source.md', 'wiki/peer.md', 'wiki/nested peer.md', 'wiki/other.md']);
  for (const file of ['body', 'source', 'peer', 'nested peer', 'other']) f.put('wiki/' + file + '.md', '# Candidate');
  const discovery = f.find({domain_groups: [], related_from: ['knowledge:wiki:core']});
  assert.deepEqual(discovery.candidates.filter(row => row.discovery_signals.includes('related:wiki/core.md')).map(row => row.path).sort(), [...receipt.navigation.related_wiki].sort());
  f.put('wiki/none.md', '# No related section\n[Body](body.md)');
  assert.deepEqual(readSource({request: f.request, ref: 'knowledge:wiki:none'}, f.root).navigation.related_wiki, []);
  f.put('domains/Design.md', '# Domain\n## 领域设计原则\n1. **Rule**\n<!-- principle_id: DPR-TT-001 -->\nCondition [Supporting](../wiki/body.md)');
  const domain = readSource({request: f.request, ref: 'knowledge:domain:Design'}, f.root);
  assert.deepEqual(domain.navigation.linked_wiki, ['wiki/body.md']);
  assert.equal(Object.hasOwn(domain.navigation, 'related_wiki'), false);
  const principle = readSource({request: f.request, ref: 'knowledge:principle:DPR-TT-001'}, f.root);
  assert.equal(principle.status, 'source_read');
  assert.deepEqual(principle.navigation.linked_wiki, ['wiki/body.md']);
  assert.equal(Object.hasOwn(principle.navigation, 'related_wiki'), false);
});


test('Raw read navigation shares Clipping resolution and ignores body-only provenance',t=>{
 const f=fixture(t);
 f.put('Clippings/nested/Actual.md','# Actual original');
 f.put('Clippings/Unrelated.md','# Body link');
 const text='---\nsource_clipping: "[[Actual#Heading|Alias]]"\n---\n# Raw\n[[Clippings/Unrelated]]\n';
 f.put('raw-sources/Trace.md',text);
 const result=readSource({request:{need:{question:'Trace actual provenance'}},ref:'knowledge:raw:Trace'},f.root);
 assert.equal(result.status,'source_read');assert.equal(result.content,text);assert.equal(result.range.complete_source,true);
 assert.deepEqual(result.navigation.source_links,['Clippings/nested/Actual.md']);
 assert.equal(readSource({request:{need:{question:'Trace'},sources:{clipping:false}},ref:'knowledge:clipping:nested/Actual'},f.root).status,'disabled');
});
