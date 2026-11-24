# Muraja
An Android Quran memorization app for Android 8 and newer. Select an ayah, hide it, reveal individual words, and compare a completed Arabic recitation with its reference. Mark verses practiced and resume your previous location. The app stores progress locally.

## Speech
Android opens the installed speech service and requests Arabic and offline processing. The service may require a network connection. The app does not record or save audio. Word alignment ignores selected Arabic orthographic differences. Recognition and Uthmani spelling differences can produce false mismatches. This version does not evaluate tajwid or provide continuous tracking.

## Build
Install Android SDK Platform 35, Build Tools 35.0.0, a JDK and zip. Set ANDROID_HOME to the SDK directory. Create your own signing key with keytool, set KEYSTORE to its path and STORE_PASS to its password in your environment, then run ./build.sh. The output is dist/Muraja-1.0.apk. Keep your signing key for future compatible updates.

## Quran text
assets/quran.json is the unmodified quran-json 3.1.2 distribution by Risan Bagja Pradana, based on the Noble Qur’an Encyclopedia. The package is distributed under CC BY-SA 4.0. See assets/QURAN-LICENSE.txt and https://github.com/risan/quran-json. The displayed verse always uses the bundled original string.
