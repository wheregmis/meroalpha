import { releaseNotesText } from './release-notes.mjs';
export const RELEASE_API = 'https://api.github.com/repos/wheregmis/meroalpha/releases?per_page=10';
const page = 'https://github.com/wheregmis/meroalpha/releases/tag/';
export function publicReleases(value) {
  if (!Array.isArray(value)) throw Error('Invalid release list');
  const releases = value.filter(r => r && !r.draft && !r.prerelease && typeof r.tag_name === 'string' && /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(r.tag_name) && r.tag_name.slice(1).split('.').every(n=>Number.isSafeInteger(Number(n))) && r.html_url === page + r.tag_name && typeof r.published_at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r.published_at) && Number.isFinite(Date.parse(r.published_at)));
  return releases.sort((a,b)=>{const x=a.tag_name.slice(1).split('.').map(Number),y=b.tag_name.slice(1).split('.').map(Number);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];}).slice(0,3).map(r=>({version:r.tag_name.slice(1),url:r.html_url,date:new Date(r.published_at).toISOString().slice(0,10),notes:releaseNotesText(r.body,2000)||'No change details were provided for this version.'}));
}
export async function loadChangelog(doc = document, get = fetch) {
  const status=doc.querySelector('[data-release-status]'), list=doc.querySelector('[data-releases]');
  if(!status||!list)return;
  status.textContent='Loading release notes…';
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await get(RELEASE_API,{signal:controller.signal,credentials:'omit',headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error('Release notes unavailable');
    const releases=publicReleases(await response.json());
    for(const release of releases) {
      const item=doc.createElement('article');item.className='release';
      const header=doc.createElement('div');header.className='release__head';
      const title=doc.createElement('h3'),link=doc.createElement('a');link.href=release.url;link.textContent=`Version ${release.version}`;link.className='link';title.append(link);
      const date=doc.createElement('time');date.dateTime=release.date;date.textContent=release.date;
      const notes=doc.createElement('p');notes.className='release__notes';notes.textContent=release.notes;
      header.append(title,date);item.append(header,notes);list.append(item);
    }
    status.textContent=releases.length?'':'No releases are available yet. Check the release history for updates.';
    status.hidden=!!releases.length;
  } catch {status.textContent='Release notes couldn’t load. You can still read the release history on GitHub.';}
  finally {clearTimeout(timer);}
}
if(typeof document!=='undefined')void loadChangelog();
