# Drives the Android emulator: find on-screen elements by text, description or id, and tap them.
import re, subprocess, sys, time
ADB = '/Users/praveenc_500355/Library/Android/sdk/platform-tools/adb'
def sh(*a): return subprocess.run([ADB, *a], capture_output=True, text=True).stdout
def nodes():
    sh('shell', 'uiautomator', 'dump', '/sdcard/ui.xml'); x = sh('shell', 'cat', '/sdcard/ui.xml'); out = []
    for m in re.finditer(r'<node [^>]*>', x):
        n = m.group(0); g = lambda k: re.search(k + r'="([^"]*)"', n).group(1)
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', g('bounds')))
        out.append({'id': g('resource-id'), 'text': g('text'), 'desc': g('content-desc'), 'x': (x1 + x2) // 2, 'y': (y1 + y2) // 2})
    return out
def find(pattern, tries=10):
    for _ in range(tries):
        for n in nodes():
            if any(re.fullmatch(pattern, v or '', re.I) for v in (n['text'], n['desc'], n['id'])): return n
        time.sleep(1)
    return None
def tap(pattern, tries=10, pause=0.9):
    n = find(pattern, tries)
    if not n: sys.exit(f'not found: {pattern}')
    sh('shell', 'input', 'tap', str(n['x']), str(n['y'])); time.sleep(pause); return n
if __name__ == '__main__':
    print(tap(sys.argv[1]) if sys.argv[1:] else [n for n in nodes() if n['text'] or n['desc']])
