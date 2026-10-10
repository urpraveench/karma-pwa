# Records adding TikTym to the home screen in Chrome on the Android emulator (Pixel_9_Pro, Play Store image):
# ⋮ › Add to Home screen › Install. Called by record.sh, which has already booted a freshly wiped emulator.
import subprocess, sys, time
from droid import ADB, sh, find, tap

out = sys.argv[1]
sh('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'); sh('shell', 'wm', 'dismiss-keyguard'); sh('shell', 'svc', 'power', 'stayon', 'true')
sh('shell', 'echo "_ --disable-fre --no-default-browser-check --no-first-run" > /data/local/tmp/chrome-command-line')
sh('shell', 'am', 'set-debug-app', '--persistent', 'com.android.chrome')
sh('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'https://app.tiktym.com/', 'com.android.chrome')
time.sleep(8)
if find('No thanks', tries=3): tap('No thanks')
time.sleep(3)
rec = subprocess.Popen([ADB, 'shell', 'screenrecord', '--bit-rate', '8000000', '/sdcard/install.mp4'])
time.sleep(2.5)
tap('com.android.chrome:id/menu_button', pause=2.2)
tap('Add to Home screen|Install app', pause=2.5)
tap('Install', pause=4)
sh('shell', 'input', 'keyevent', 'KEYCODE_HOME'); time.sleep(3.5)
sh('shell', 'pkill', '-INT', 'screenrecord'); rec.wait(); time.sleep(1)
sh('pull', '/sdcard/install.mp4', out)
print('recorded', out)
