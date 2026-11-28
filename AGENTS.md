# AGENTS.md — AvidityCarpool

Concise operating guide and durable project knowledge for AI assistants working in `AvidityCarpool` (`SDautovic-GH/AvidityCarpool`).

| Key | Value |
| :--- | :--- |
| **Live URL** | `https://aviditycarpool.dautovic.com` (GitHub Pages + Cloudflare DNS) |
| **Firebase Project** | `avidity-carpool` (Blaze plan, `us-central1`) |
| **Stack** | React 19, Vite 7, Tailwind CSS v4, Firebase Auth/Firestore, Cloud Functions v2 (Node 22), FCM Web Push |
| **Primary Docs** | [Documentation/AvidityCarpool-PRD-v2.0.md](Documentation/AvidityCarpool-PRD-v2.0.md) · [Documentation/AvidityCarpool-ManagerSummary.md](Documentation/AvidityCarpool-ManagerSummary.md) · [Documentation/AvidityCarpool-UserGuide.md](Documentation/AvidityCarpool-UserGuide.md) · [Documentation/AvidityCarpool-AdminGuide.md](Documentation/AvidityCarpool-AdminGuide.md) |

---

## 1. Architecture Decisions (Locked)

- **Auth & Access Model:** Email + Password only (no passwordless email links). Global admins live in `admins/{lowercaseEmail}` (seeded in Firebase Console, non-writable from client). Season members live in `seasons/{seasonId}/parents/{lowercaseEmail}` so security rules do O(1) `exists(...)` checks without UID pre-provisioning.
- **Data Integrity:** All carpool seat/driver mutations use Firestore `runTransaction` to prevent race conditions. Players (`players/`) and parents (`parents/`) are separate subcollections to support multiple parents per player and per-parent `canDrive` exclusion.
- **Carpool Scoping & Guests:** Practice cards scope to players with `inCarpool === true` (falling back to Melrose parent address if unset) plus optional **Guest Riders** (`isGuest: true`, `G` badge), while the **Team** tab shows the full roster.
- **Auto-Consolidated Round-Trip Cards:** When all going carpool riders are covered and every driver/rider pairing is identical on both legs (regardless of car count), `PracticeCard.jsx` collapses `→ TO PRACTICE` and `← FROM PRACTICE` into one `⇄ TO & FROM` section with a `To / From ▾` expand toggle.
- **Copy & Status Conventions:**
  - Singular vs. plural unassigned callout: `Needs ride: <Name>` (1 rider) vs. `Need ride: <Name>, <Name>` (2+ riders).
  - Header badges: `All Set` (green check, including `No Carpool` practices) and `Needs Sub` (amber) when a driver requests a sub.
  - Calm App UI: no unexpected layout shifts; Light and Dark themes supported.
- **Web Push & Alerts Inbox (Blaze):** Three Cloud Functions v2 in `functions/index.js`:
  - `onPracticeUpdatedNeedsSub`: notifies other carpool drivers when a car transitions to `needs_sub`, and auto-deletes resolved `needs_sub` docs from `seasons/{seasonId}/notifications` when taken over, withdrawn, dropped, or cancelled.
  - `nightBeforeCarpoolSweep`: runs daily at `18:00 America/New_York`; reminds confirmed drivers of tomorrow's legs/riders and alerts carpool drivers if a leg is uncovered; silent when no practice tomorrow.
  - `sendTestPushToSelf`: admin-only callable (`Team → Roster → Alerts → Test Alert (Me)`).
- **Service Worker:** `public/firebase-messaging-sw.js` uses native `push` / `notificationclick` listeners directly on FCM Web Push payloads — no Firebase SDK import or keys baked into `public/`.

---

## 2. Constraints & Gotchas

- **Strict `firestore.rules`:** Every collection enforces `hasOnlyAllowedFields`, immutable `createdAt`, and immutable `email` on `parents` (plus once-only `activatedAt`). When updating existing docs from the client, never include `createdAt` or unlisted fields.
- **Server-Only `notifications`:** `seasons/{seasonId}/notifications` has `allow write: if false`; only Cloud Functions (Admin SDK) create or delete alert docs.
- **iOS Web Push Requirement:** iOS Safari only exposes Push APIs after **Share → Add to Home Screen** and launching from the Home Screen icon, and `Notification.requestPermission()` must run inside a direct tap handler.
- **Batch Practice Creation:** Strip any client-side `id` field before writing to `practices/{practiceId}`, and skip existing practice IDs so regenerating a schedule never overwrites active drivers/riders.
- **Secrets Hygiene:** Never commit `.env`. Production builds inject 7 GitHub Actions secrets (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`).
- **Firestore Rules Authoring:** Use the `firestore-rules-author` specialist subagent whenever modifying `firestore.rules`.

---

## 3. Dead Ends (DO NOT RETRY)

- **Do not add `React.lazy` dynamic route splitting for GitHub Pages:** Stale open tabs hit 404s on hashed chunks after a deploy. Keep static `manualChunks` (`firebase`, `vendor`) + `emitVersionPlugin` (`version.json`) in `vite.config.js`.
- **Do not bake Firebase config into `public/firebase-messaging-sw.js`:** Native Web Push event handling already works cleanly with FCM payloads.
- **Do not use recursive `git add --force` on `.json`/`.html`/`.md` in sync scripts:** `node_modules/` and `dist/` will get committed.
- **Do not treat Firebase Blaze budget limits as a hard spend shutoff:** Google Cloud budgets only send email alerts unless automated billing disablement is explicitly wired up.
- **Cross-workspace IDE `edit_file` hang (Antigravity):** When the active IDE workspace is `ScriptLibrary` rather than `AvidityCarpool`, `edit_file` on `AvidityCarpool` files can hang on tab save. Open `AvidityCarpool` directly or write edits via script/shell.

---

## 4. Deploy & Sync Quirks

- **Frontend (GitHub Pages):** Auto-builds and deploys via `.github/workflows/deploy.yml` (Node 22) on every push to `main`. On macOS, sync with:
  ```bash
  pwsh -NoProfile -File ./SyncGit-macOS-AvidityCarpool.ps1
  ```
- **Firebase Rules, Indexes & Cloud Functions (Manual Deploy):** GitHub Actions deploys only `dist/` to GitHub Pages. Deploy backend changes manually:
  ```bash
  npx firebase-tools deploy --only firestore:rules,firestore:indexes --project avidity-carpool
  npx firebase-tools deploy --only functions --project avidity-carpool
  ```
- **Google Drive Guide Mirror:** The two HTML guides are shared from Google Drive folder `Avidity Carpool` (`15r6cIm0hcPy4480ZchKd36y9qOa-V5pX`). Always update **in place** to preserve share links:
  - `Documentation/AvidityCarpool-UserGuide.html` → ID `1CzgdsbRYJdQjIZ76Jdrlbt8kk38fffPT`
  - `Documentation/AvidityCarpool-AdminGuide.html` → ID `1CZTJsW_tNVuNWDDX-oGCW4MdIjIxPniC`
  ```bash
  gdrive mutate update <FILE_ID> <LOCAL_HTML_PATH> --mime-type text/html
  ```
  *(In-app guide content lives in `src/components/UserGuideModal.jsx`; keep it in sync with `Documentation/` when updating guides.)*

---

## 5. Current Open Items / Minor Follow-Ups

- *(None currently open.)*
