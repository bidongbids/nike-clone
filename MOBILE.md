# Mobile App Setup — Capacitor

This project is now exportable as native **iOS** and **Android** apps using Capacitor (free, no Expo required). Same React codebase, packaged as native apps.

---

## How it works

Capacitor wraps your existing built web app inside a native shell. The app gets:
- App icon on home screen
- Splash screen
- Native gestures, scroll behavior
- Access to native APIs (camera, push notifications, etc. if needed later)
- Distributable as `.apk` / `.aab` for Android and `.ipa` for iOS

The **same React code** runs everywhere — no rewrites.

---

## One-time setup

### Prerequisites
- **For Android:** [Android Studio](https://developer.android.com/studio) (free)
- **For iOS:** macOS + [Xcode](https://developer.apple.com/xcode/) (free, but iOS dev requires a Mac)

### Initialize Capacitor (already done in this project)
```bash
npm install
npx cap init
```

The `capacitor.config.ts` file is already configured.

---

## Build & Run

### Step 1 — Build the web app
```bash
npm run build
```
This produces the `dist/` folder.

### Step 2 — Add platforms
```bash
npx cap add android
npx cap add ios   # macOS only
```

### Step 3 — Sync your build into the native projects
```bash
npx cap sync
```

Run this command **every time** you make changes to the React code.

### Step 4 — Open in native IDE
```bash
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode (macOS only)
```

From there click **Run** in the IDE to launch the app on an emulator or connected device.

---

## Typical workflow

```bash
# 1. Make changes to React code
# 2. Rebuild + sync
npm run build && npx cap sync

# 3. Run in Android Studio / Xcode
```

For faster development, you can also enable **live reload** so changes appear in the mobile app instantly without rebuilding. Add this to `capacitor.config.ts`:

```ts
server: {
  url: 'http://YOUR_LOCAL_IP:5173',  // your computer's IP on the same Wi-Fi
  cleartext: true,
}
```

Then run `npm run dev` and `npx cap sync` once — your phone connects to the dev server live.

---

## Building for distribution

### Android (.apk / .aab)
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Choose `.aab` (recommended for Play Store) or `.apk` (for direct install)
3. Follow the wizard to sign the build

### iOS (.ipa)
1. In Xcode: **Product → Archive**
2. **Distribute App → App Store Connect**
3. Requires Apple Developer account ($99/year) to publish

---

## What works out of the box

✅ Login / Register / Forgot Password (via Supabase Auth)
✅ Product browsing, search, filters
✅ Cart, checkout, order placement
✅ Reviews, wishlist, addresses
✅ Image uploads to Supabase Storage
✅ Admin panel (responsive, works on tablets)
✅ Real-time product updates

---

## Adding native features (optional)

Capacitor has plugins for native APIs. Install only what you need:

```bash
# Push notifications
npm install @capacitor/push-notifications

# Camera (for taking product review photos)
npm install @capacitor/camera

# Geolocation
npm install @capacitor/geolocation

# Then sync:
npx cap sync
```

Each plugin has a JS API you can call from your React components, e.g.:

```ts
import { Camera, CameraResultType } from '@capacitor/camera'

const photo = await Camera.getPhoto({
  quality: 90,
  resultType: CameraResultType.Uri,
})
```

---

## Common issues

**App crashes on launch** — usually a missing `npx cap sync` after building. Always run sync after `npm run build`.

**White screen on Android** — check `capacitor.config.ts` has `androidScheme: 'https'`. Required for some Supabase auth flows.

**Supabase auth fails in mobile** — make sure your Supabase project has the deep link redirect set up:
- Go to **Supabase → Authentication → URL Configuration**
- Add `com.nikeclone.app://` to **Redirect URLs**

---

## App identifier

The default appId in `capacitor.config.ts` is `com.nikeclone.app`. Change this to your own reverse-domain identifier before publishing (e.g. `com.yourname.nikestore`). This ID is permanent once published to app stores.
