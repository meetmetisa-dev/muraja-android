#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")"
tools="${BUILD_TOOLS:-${ANDROID_HOME:?Set ANDROID_HOME}/build-tools/35.0.0}"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
mkdir -p "$out/classes" "$out/dex" dist
"$tools/aapt2" compile --dir res -o "$out/res.zip"
"$tools/aapt2" link -I "$platform" --manifest AndroidManifest.xml -A assets -o "$out/app.apk" "$out/res.zip"
if [[ -n "${ECJ_JAR:-}" ]]; then
  java -jar "$ECJ_JAR" -proc:none -source 8 -target 8 -bootclasspath "$platform:$tools/core-lambda-stubs.jar" -d "$out/classes" src/id/muraja/practice/*.java
else
  javac -source 8 -target 8 -bootclasspath "$platform:$tools/core-lambda-stubs.jar" -d "$out/classes" src/id/muraja/practice/*.java
fi
"$tools/d8" --lib "$platform" --min-api 26 --output "$out/dex" "$out/classes"/id/muraja/practice/*.class
(cd "$out/dex" && zip -q "$out/app.apk" classes.dex)
"$tools/zipalign" -f 4 "$out/app.apk" "$out/aligned.apk"
"$tools/apksigner" sign --ks "${KEYSTORE:?Set KEYSTORE}" --ks-pass env:STORE_PASS --out dist/Muraja-Voice-1.2.apk "$out/aligned.apk"
"$tools/apksigner" verify --verbose dist/Muraja-Voice-1.2.apk
