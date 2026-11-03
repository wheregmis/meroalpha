"""Read release metadata with standard XML/ZIP/plist parsers; never extract a ZIP."""
import json
import plistlib
import re
import struct
import sys
import zipfile
from pathlib import PurePosixPath
import xml.etree.ElementTree as ET

SPARKLE = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'

def one(parent, tag):
    children = parent.findall(tag)
    if len(children) != 1:
        raise ValueError('Expected exactly one actual XML element: ' + tag.rsplit('}', 1)[-1])
    return children[0]

def text(parent, tag):
    node = one(parent, tag)
    if len(node):
        raise ValueError('Nested update metadata is unsupported')
    return (node.text or '').strip()

def appcast():
    raw = sys.stdin.buffer.read(64001)
    if len(raw) > 64000 or re.search(br'<!DOCTYPE|<!ENTITY', raw, re.I):
        raise ValueError('Unsupported appcast declaration or size')
    root = ET.fromstring(raw)
    if root.tag != 'rss' or root.get('version') != '2.0':
        raise ValueError('Expected an RSS 2.0 appcast')
    item = one(one(root, 'channel'), 'item')
    enclosure = one(item, 'enclosure')
    if item.find(SPARKLE + 'channel') is not None or SPARKLE + 'installationType' in enclosure.attrib:
        raise ValueError('Only the default application channel is supported')
    return {'version': text(item, SPARKLE + 'version'), 'shortVersion': text(item, SPARKLE + 'shortVersionString'),
            'minimum': text(item, SPARKLE + 'minimumSystemVersion'), 'url': enclosure.get('url'),
            'length': enclosure.get('length'), 'type': enclosure.get('type'),
            'signature': enclosure.get(SPARKLE + 'edSignature'), 'os': enclosure.get(SPARKLE + 'os')}

def archive(path):
    with zipfile.ZipFile(path) as bundle:
        entries = bundle.infolist()
        for entry in entries:
            parts = PurePosixPath(entry.filename)
            if parts.is_absolute() or '..' in parts.parts or '\\' in entry.filename:
                raise ValueError('Unsafe archive path')
        infos = [entry for entry in entries if re.fullmatch(r'[^/]+\.app/Contents/Info\.plist', entry.filename)]
        if len(infos) != 1 or infos[0].file_size > 1024 * 1024 or (infos[0].external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError('Expected one regular application Info.plist')
        with bundle.open(infos[0]) as handle:
            raw = handle.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError('Application metadata is too large')
        info = plistlib.loads(raw)
        executable = info.get('CFBundleExecutable', '')
        if not isinstance(executable, str) or not re.fullmatch(r'[A-Za-z0-9 ._-]+', executable):
            raise ValueError('Invalid application executable name')
        binary = infos[0].filename.removesuffix('Info.plist') + 'MacOS/' + executable
        binaries = [entry for entry in entries if entry.filename == binary]
        if len(binaries) != 1 or (binaries[0].external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError('Expected one regular application executable')
        with bundle.open(binary) as handle:
            header = handle.read(4096)
        arm64 = False
        if header[:4] == b'\xcf\xfa\xed\xfe' and len(header) >= 8:
            arm64 = struct.unpack_from('<I', header, 4)[0] == 0x0100000c
        elif header[:4] in [b'\xca\xfe\xba\xbe', b'\xca\xfe\xba\xbf'] and len(header) >= 8:
            count = struct.unpack_from('>I', header, 4)[0]
            size = 32 if header[:4] == b'\xca\xfe\xba\xbf' else 20
            if 0 < count <= 32 and len(header) >= 8 + count * size:
                arm64 = any(struct.unpack_from('>I', header, 8 + i * size)[0] == 0x0100000c for i in range(count))
        return {'id': info.get('CFBundleIdentifier'), 'version': info.get('CFBundleShortVersionString'),
                'build': info.get('CFBundleVersion'), 'minimum': info.get('LSMinimumSystemVersion'),
                'publicKey': info.get('SUPublicEDKey'), 'feedURL': info.get('SUFeedURL'), 'arm64': arm64}

if __name__ == '__main__':
    try:
        result = appcast() if sys.argv[1:] == ['appcast'] else archive(sys.argv[2]) if len(sys.argv) == 3 and sys.argv[1] == 'archive' else None
        if result is None:
            raise ValueError('Expected appcast or archive command')
        print(json.dumps(result))
    except (ValueError, KeyError, OSError, ET.ParseError, zipfile.BadZipFile, RuntimeError):
        print('Invalid XML or application archive metadata', file=sys.stderr)
        sys.exit(1)
