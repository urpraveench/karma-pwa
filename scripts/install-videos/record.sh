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
# the first big change on screen (used to start a recording just before the first tap)
first_change() { ffmpeg -i "$1" -vf "select='gt(scene,0.08)',showinfo" -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | head -1 | cut -d: -f2; }

if [ "${ONLY:-ios}" = ios ] || [ -z "${ONLY:-}" ]; then
echo "== iPhone · Safari"
SIM="iPhone 16"
xcrun simctl shutdown "$SIM" 2>/dev/null || true
xcrun simctl erase "$SIM"; xcrun simctl boot "$SIM"; xcrun simctl bootstatus "$SIM" -b >/dev/null
# a plain English keyboard and region, so no "Type English and Hindi" tip pops up over the name field
xcrun simctl spawn "$SIM" defaults write -g AppleKeyboards -array "en_US@sw=QWERTY;hw=Automatic" "emoji@sw=Emoji"
xcrun simctl spawn "$SIM" defaults write -g AppleLanguages -array en-US
xcrun simctl spawn "$SIM" defaults write -g AppleLocale en_US
xcrun simctl shutdown "$SIM"; xcrun simctl boot "$SIM"; xcrun simctl bootstatus "$SIM" -b >/dev/null
UDID=$(xcrun simctl list devices | grep "$SIM (" | grep -o '[0-9A-F-]\{36\}' | head -1)
(cd ios && xcodegen generate >/dev/null && xcodebuild build-for-testing -project InstallRecorder.xcodeproj -scheme Recorder -destination "id=$UDID" -derivedDataPath "$WORK/build" >/dev/null)
xcrun simctl openurl "$SIM" https://app.tiktym.com/; sleep 10
xcrun simctl io "$SIM" recordVideo --codec h264 --force "$WORK/ios.mov" & REC=$!
sleep 1
(cd ios && xcodebuild test-without-building -project InstallRecorder.xcodeproj -scheme Recorder -destination "id=$UDID" -derivedDataPath "$WORK/build" > "$WORK/test.log")
kill -INT $REC; wait $REC || true
# keep from just before the Share tap to just after Add (the test prints when), then end on a clean home screen:
# the home screen in the recording also shows the test runner's icon
# cut from just before the Share tap to just before the jump home (the test prints when each tap happened)
mark() { grep -o "TIKTYM_MARK $1 [0-9.]*" "$WORK/test.log" | head -1 | cut -d' ' -f3; }
# the home screen's wallpaper is far darker than Safari: the first dark frame is the jump home after Add
HOME_T=$(ffmpeg -i "$WORK/ios.mov" -vf "fps=10,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 \
  | awk '/pts_time/ {split($0,a,"pts_time:"); t=a[2]+0} /YAVG/ {split($0,b,"="); if (b[2]+0 < 160 && t > 3) {print t; exit}}')
TO=$(python3 -c "print($HOME_T - 0.15)")
FROM=$(python3 -c "print(max(0, $TO - ($(mark added) - $(mark share)) - 2.0))")
# -t (a length): with -ss before -i, ffmpeg would read -to as a length too, and overshoot by FROM
ffmpeg -y -loglevel error -ss "$FROM" -i "$WORK/ios.mov" -t "$(python3 -c "print($TO - $FROM)")" -c:v libx264 -pix_fmt yuv420p "$WORK/ios-cut.mov"
for app in com.tiktym.tools.InstallUITests.xctrunner com.tiktym.tools.Host; do xcrun simctl uninstall "$SIM" "$app" 2>/dev/null || true; done
sleep 2; xcrun simctl io "$SIM" screenshot "$WORK/home.png" >/dev/null
W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$WORK/ios-cut.mov"); H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$WORK/ios-cut.mov")
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$WORK/home.png" -vf "scale=$W:$H,fps=30,format=yuv420p" -c:v libx264 "$WORK/home.mp4"
ffmpeg -y -loglevel error -i "$WORK/ios-cut.mov" -i "$WORK/home.mp4" -filter_complex "[0:v]fps=30,format=yuv420p[a];[1:v]fps=30,format=yuv420p[b];[a][b]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 "$WORK/ios-full.mp4"
encode "$WORK/ios-full.mp4" "$OUT/iphone-safari" 0 4
xcrun simctl shutdown "$SIM"
fi

if [ "${ONLY:-android}" = android ] || [ -z "${ONLY:-}" ]; then
echo "== Android · Chrome"
"$SDK/emulator/emulator" -avd Pixel_9_Pro -no-window -no-audio -no-boot-anim -wipe-data -no-snapshot > "$WORK/emu.log" 2>&1 &
"$ADB" wait-for-device
until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
sleep 15 # let the home screen settle after a fresh boot
python3 android.py "$WORK/android.mp4"
START=$(echo "$(first_change "$WORK/android.mp4") - 1.5" | bc); [ "$(echo "$START < 0" | bc)" = 1 ] && START=0
encode "$WORK/android.mp4" "$OUT/android-chrome" "$START" 4
"$ADB" emu kill >/dev/null
fi

ls -la "$OUT"
