import test from 'node:test';
import assert from 'node:assert/strict';
import { publicReleases, loadChangelog, RELEASE_API, dayLabel } from '../src/lib/changelog.mjs';
const release=(version='1.2.3',body='### Fixes\n\n* **Updates** work')=>({tag_name:`v${version}`,html_url:`https://github.com/wheregmis/meroalpha/releases/tag/v${version}`,published_at:'2026-11-03T01:00:00Z',body});
test('public changelog validates release URLs/versions/dates, filters unstable records and sorts versions',()=>{
 const list=publicReleases([release('1.2.3'),{...release(),draft:true},{...release(),prerelease:true},{...release(),html_url:'https://evil.invalid'},{...release(),published_at:'bad'},release('9999999999999999999.0.0'),release('01.2.3'),release('1.10.0'),release('2.0.0'),release('1.9.0')]);
 assert.deepEqual(list.map(x=>x.version),['2.0.0','1.10.0','1.9.0']);
 assert.equal(list[0].notes,'Fixes\n\n* Updates work');assert.equal(list[0].date,'2026-11-03');
 assert.equal(publicReleases([release('1.0.0',' ')] )[0].notes,'No change details were provided for this version.');
 assert.equal(publicReleases([release('1.0.0','x'.repeat(40000))])[0].notes.length,2000);
 assert.throws(()=>publicReleases({}),/Invalid/);
 assert.equal(dayLabel('2026-11-03'),'Tue 3 Nov 2026');
 assert.deepEqual(publicReleases([release('1.0.0'),release('1.1.0'),release('1.2.0'),release('1.3.0')],10).map(x=>x.version),['1.3.0','1.2.0','1.1.0','1.0.0']);
});
test('HTML and tracking images remain inert text and no token is sent',async()=>{
 const created=[];const element=tag=>({tag,children:[],append(...items){this.children.push(...items);},set innerHTML(_){throw Error('Unsafe HTML rendering');}});
 const status=element('p'),list=element('div'),doc={querySelector:q=>q==='[data-release-status]'?status:list,createElement:tag=>{const e=element(tag);created.push(e);return e;}};
 const malicious='<img src="https://tracker.invalid" onerror="alert(1)"><script>alert(2)</script>';
 await loadChangelog(doc,async(url,init)=>{assert.equal(url,RELEASE_API);assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,undefined);return{ok:true,json:async()=>[release('1.0.0',malicious),release('0.9.0')]};});
 assert.equal(list.children.length,2);assert.deepEqual(created.filter(x=>x.tag==='li').map(x=>x.textContent),['Updates work']);assert.ok(created.some(x=>x.tag==='p'&&x.textContent===malicious));assert.ok(!created.some(x=>['img','script','iframe'].includes(x.tag)));assert.equal(status.hidden,true);assert.deepEqual(created.filter(x=>x.tag==='time').map(x=>x.textContent),['Tue 3 Nov 2026','Tue 3 Nov 2026']);assert.equal(created.find(x=>x.tag==='span')?.textContent,'Latest');
});
test('empty, rate limited, offline and malformed responses leave a useful fallback',async()=>{
 for(const get of [async()=>({ok:true,json:async()=>[]}),async()=>({ok:false}),async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>({message:'rate limited'})})]){
  const status={},list={append(){throw Error('Unexpected release');}},doc={querySelector:q=>q==='[data-release-status]'?status:list};
  await loadChangelog(doc,get);assert.match(status.textContent,/release history/);assert.notEqual(status.hidden,true);
 }
});
test('roadmap sections shrink to the screen, because the page clips sideways overflow (#17)',async()=>{
 const {readFile}=await import('node:fs/promises');
 const css=await readFile(new URL('../src/styles/changelog.css',import.meta.url),'utf8');
 assert.match(css,/\.changelog-page__shipped, \.changelog-page__building \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
 assert.match(css,/\.changelog-page__next \{[^}]*minmax\(min\(260px, 100%\), 1fr\)/);
});
