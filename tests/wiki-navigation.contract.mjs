import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const readme=fs.readFileSync(path.join(root,'wiki/README.md'),'utf8');
const standard=fs.readFileSync(path.join(root,'system/protocols/WIKI-LINK-STANDARD.md'),'utf8');
const slug=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').replace(/ /g,'-');
function check(source,target){
 const anchors=new Set([...target.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(m=>slug(m[1])));
 const links=[...source.matchAll(/\]\(\.\.\/system\/protocols\/WIKI-LINK-STANDARD\.md#([^)]+)\)/g)].map(m=>decodeURIComponent(m[1]));
 assert.equal(links.length,3,'The real public README must retain all three incoming navigation links');
 for(const anchor of links)assert.ok(anchors.has(anchor),'Missing published target anchor: '+anchor);
 return links;
}
test('real public README links reach current headings, with correct section labels',()=>{
 assert.deepEqual(check(readme,standard),['一是否值得链','三内联与底部镜像','三内联与底部镜像']);
 assert.equal((readme.match(/WIKI-LINK-STANDARD\.md §三/g)??[]).length,2);
 assert.ok(!readme.includes('WIKI-LINK-STANDARD.md §二'));
});
test('old published anchors are real failures, not warning-only or punctuation aliases',()=>{
 assert.throws(()=>check(readme.replace('#一是否值得链','#一、链接分级'),standard),/Missing published target anchor/);
 assert.throws(()=>check(readme.replace('#三内联与底部镜像','#二、内联插入规则'),standard),/Missing published target anchor/);
});
test('target heading drift or dropped incoming link is rejected',()=>{
 assert.throws(()=>check(readme,standard.replace('## 三、内联与底部镜像','## 三、新标题')),/Missing published target anchor/);
 assert.throws(()=>check(readme.replace(/\]\(\.\.\/system\/protocols\/WIKI-LINK-STANDARD\.md#[^)]+\)/,''),standard),/all three incoming navigation links/);
});
