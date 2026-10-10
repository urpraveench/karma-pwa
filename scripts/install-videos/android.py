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
# the phone's own shape (1280x2856 is too big for the encoder; 720x1600 keeps the proportions)
rec = subprocess.Popen([ADB, 'shell', 'screenrecord', '--size', '720x1600', '--bit-rate', '8000000', '/sdcard/install.mp4'])
time.sleep(2.5)
tap('com.android.chrome:id/menu_button', pause=2.2)
tap('Add to Home screen|Install app', pause=2.5)
tap('Install', pause=3)
# newer Android asks once more before placing the icon
if find('Add to home screen|Add automatically', tries=4): tap('Add to home screen|Add automatically', pause=3)
sh('shell', 'input', 'keyevent', 'KEYCODE_HOME'); time.sleep(2)
# show the page the icon landed on
for _ in range(3):
    if find('TikTym', tries=1): break
    sh('shell', 'input', 'swipe', '1100', '1500', '200', '1500', '300'); time.sleep(1.2)
time.sleep(2.5)
sh('shell', 'pkill', '-INT', 'screenrecord'); rec.wait(); time.sleep(1)
sh('pull', '/sdcard/install.mp4', out)
print('recorded', out)
