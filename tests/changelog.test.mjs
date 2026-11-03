import test from 'node:test';
import assert from 'node:assert/strict';
import { publicReleases, loadChangelog, RELEASE_API } from '../changelog.mjs';
const release=(version='1.2.3',body='### Fixes\n\n* **Updates** work')=>({tag_name:`v${version}`,html_url:`https://github.com/wheregmis/meroalpha/releases/tag/v${version}`,published_at:'2026-11-03T01:00:00Z',body});
test('public changelog validates release URLs/versions/dates, filters unstable records and sorts versions',()=>{
 const list=publicReleases([release('1.2.3'),{...release(),draft:true},{...release(),prerelease:true},{...release(),html_url:'https://evil.invalid'},{...release(),published_at:'bad'},release('9999999999999999999.0.0'),release('01.2.3'),release('1.10.0'),release('2.0.0'),release('1.9.0')]);
 assert.deepEqual(list.map(x=>x.version),['2.0.0','1.10.0','1.9.0']);
 assert.equal(list[0].notes,'Fixes\n\n* Updates work');assert.equal(list[0].date,'2026-11-03');
 assert.equal(publicReleases([release('1.0.0',' ')] )[0].notes,'No change details were provided for this version.');
 assert.equal(publicReleases([release('1.0.0','x'.repeat(40000))])[0].notes.length,2000);
 assert.throws(()=>publicReleases({}),/Invalid/);
});
test('HTML and tracking images remain inert text and no token is sent',async()=>{
 const created=[];const element=tag=>({tag,children:[],append(...items){this.children.push(...items);},set innerHTML(_){throw Error('Unsafe HTML rendering');}});
 const status=element('p'),list=element('div'),doc={querySelector:q=>q==='[data-release-status]'?status:list,createElement:tag=>{const e=element(tag);created.push(e);return e;}};
 const malicious='<img src="https://tracker.invalid" onerror="alert(1)"><script>alert(2)</script>';
 await loadChangelog(doc,async(url,init)=>{assert.equal(url,RELEASE_API);assert.equal(init.credentials,'omit');assert.equal(init.headers.Authorization,undefined);return{ok:true,json:async()=>[release('1.0.0',malicious)]};});
 assert.equal(list.children.length,1);assert.ok(created.some(x=>x.tag==='p'&&x.textContent===malicious));assert.ok(!created.some(x=>['img','script','iframe'].includes(x.tag)));assert.equal(status.hidden,true);
});
test('empty, rate limited, offline and malformed responses leave a useful fallback',async()=>{
 for(const get of [async()=>({ok:true,json:async()=>[]}),async()=>({ok:false}),async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>({message:'rate limited'})})]){
  const status={},list={append(){throw Error('Unexpected release');}},doc={querySelector:q=>q==='[data-release-status]'?status:list};
  await loadChangelog(doc,get);assert.match(status.textContent,/release history/);assert.notEqual(status.hidden,true);
 }
});
