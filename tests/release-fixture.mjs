import { execFileSync } from 'node:child_process';
/** Synthetic ZIP/plist/Mach-O header only: never executable application code. */
export function fixtureArchive(version, options = {}) {
  return execFileSync(process.platform === 'darwin' ? '/usr/bin/python3' : 'python3', ['-c', `import io,json,plistlib,struct,sys,zipfile
v=json.load(sys.stdin);out=io.BytesIO()
info={'CFBundleIdentifier':v.get('id','com.meroalpha.agent'),'CFBundleExecutable':'fixture','CFBundleVersion':v.get('build',v['version']),'CFBundleShortVersionString':v['version'],'LSMinimumSystemVersion':v.get('minimum','14.0'),'SUPublicEDKey':v.get('publicKey',''),'SUFeedURL':'https://github.com/wheregmis/meroalpha/releases/latest/download/appcast.xml'}
with zipfile.ZipFile(out,'w') as z:
 z.writestr('Fixture.app/Contents/Info.plist',plistlib.dumps(info))
 z.writestr('Fixture.app/Contents/MacOS/fixture',struct.pack('<II',0xfeedfacf,v.get('cpu',0x0100000c))+bytes(24))
 if v.get('unsafe'):z.writestr('../escape','synthetic')
sys.stdout.buffer.write(out.getvalue())`], { input: JSON.stringify({ version, ...options }), stdio: ['pipe', 'pipe', 'pipe'] });
}
