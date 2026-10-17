# Android app (Android Studio project)

A thin shell. It shows the shared web app from `../web` inside a WebView and adds the native bits:

- `MainActivity.kt` - opens the web app, handles the phone's back button, and the photo picker (receipts, logo).
- `Haptics.kt` - taps use the phone's haptic feedback, with a very light vibration on phones without it.

The screens and all business logic are in `../web`. Android Studio packages that folder into the app, so there is no copy step.

## Run it
1. Open **this `android` folder** in Android Studio (File > Open). Let Gradle sync finish.
2. Connect a phone with USB debugging on (or start an emulator) and press Run.

App name: Bookkeep. Package: `com.bookkeep.app`. Minimum Android 8.0.

## Debug the page
With the phone connected, open `chrome://inspect` in Chrome on your computer.
