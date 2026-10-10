#!/bin/bash
# Re-records the website's install videos from the live app (GTM-20): `npm run site:install-videos`.
# iPhone Safari on the iOS simulator (iPhone 16, Xcode), driven by a UI test; Android Chrome on the emulator
# (Pixel_9_Pro), driven over adb. Writes site/install/{iphone-safari,android-chrome}.{mp4,jpg}. Needs Xcode,
# xcodegen (brew install xcodegen), the Android SDK and ffmpeg. Chrome on iPhone can't run in the simulator.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../site/install; mkdir -p "$OUT"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
SDK=~/Library/Android/sdk; ADB=$SDK/platform-tools/adb
# shrink to the website's size: 390 wide, 30 fps, small and fast-starting; poster from a chosen moment
encode() { ffmpeg -y -loglevel error -ss "$3" -i "$1" -vf "scale=390:-2,fps=30" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an "$2.mp4"
           ffmpeg -y -loglevel error -ss "$4" -i "$2.mp4" -frames:v 1 -q:v 4 "$2.jpg"; }

echo "== iPhone · Safari"
SIM="iPhone 16"
xcrun simctl shutdown "$SIM" 2>/dev/null || true
xcrun simctl erase "$SIM"; xcrun simctl boot "$SIM"; xcrun simctl bootstatus "$SIM" -b >/dev/null
UDID=$(xcrun simctl list devices | grep "$SIM (" | grep -o '[0-9A-F-]\{36\}' | head -1)
(cd ios && xcodegen generate >/dev/null && xcodebuild build-for-testing -project InstallRecorder.xcodeproj -scheme Recorder -destination "id=$UDID" -derivedDataPath "$WORK/build" >/dev/null)
xcrun simctl openurl "$SIM" https://app.tiktym.com/; sleep 10
xcrun simctl io "$SIM" recordVideo --codec h264 --force "$WORK/ios.mov" & REC=$!
sleep 1
(cd ios && xcodebuild test-without-building -project InstallRecorder.xcodeproj -scheme Recorder -destination "id=$UDID" -derivedDataPath "$WORK/build" >/dev/null)
kill -INT $REC; wait $REC || true
# the home screen at the end shows the test runner's icon: cut it, then end on a clean home screen
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/ios.mov")
ffmpeg -y -loglevel error -i "$WORK/ios.mov" -t "$(echo "$DUR - 3.2" | bc)" -c copy "$WORK/ios-cut.mov"
for app in com.tiktym.tools.InstallUITests.xctrunner com.tiktym.tools.Host; do xcrun simctl uninstall "$SIM" "$app" 2>/dev/null || true; done
sleep 2; xcrun simctl io "$SIM" screenshot "$WORK/home.png" >/dev/null
W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$WORK/ios-cut.mov"); H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$WORK/ios-cut.mov")
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$WORK/home.png" -vf "scale=$W:$H,fps=30,format=yuv420p" -c:v libx264 "$WORK/home.mp4"
ffmpeg -y -loglevel error -i "$WORK/ios-cut.mov" -i "$WORK/home.mp4" -filter_complex "[0:v]fps=30,format=yuv420p[a];[1:v]fps=30,format=yuv420p[b];[a][b]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 "$WORK/ios-full.mp4"
encode "$WORK/ios-full.mp4" "$OUT/iphone-safari" 2.5 9
xcrun simctl shutdown "$SIM"

echo "== Android · Chrome"
"$SDK/emulator/emulator" -avd Pixel_9_Pro -no-window -no-audio -no-boot-anim -wipe-data -no-snapshot > "$WORK/emu.log" 2>&1 &
"$ADB" wait-for-device
until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
sleep 15 # let the home screen settle after a fresh boot
python3 android.py "$WORK/android.mp4"
encode "$WORK/android.mp4" "$OUT/android-chrome" 0.5 6
"$ADB" emu kill >/dev/null

ls -la "$OUT"
