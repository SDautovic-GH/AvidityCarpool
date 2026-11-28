# Avidity Carpool — PRD & Technical Reference

| Field | Value |
| :--- | :--- |
| **Document Type** | Product Requirements Document (PRD) & Technical Spec |
| **App Name** | Avidity Carpool |
| **App Version** | 2.0.0 |
| **PRD Revision** | v2.0 (supersedes v1.0 from 2026-11-13) |
| **Date** | 2026-11-27 |
| **Author** | Samir Dautovic |
| **Status** | Deployed (`https://aviditycarpool.dautovic.com`) |
| **Firebase Project** | `avidity-carpool` (Blaze plan) |
| **Summary** | Real-time youth volleyball carpool coordination PWA for Avidity 16 Apex (26/27 Season) and future seasons, built with Vite, React 19, Tailwind CSS v4, Firebase Auth/Firestore, and Cloud Functions v2 Web Push notifications, deployed to GitHub Pages behind Cloudflare DNS. |

---

## 1. Objective & Non-Goals

- **Primary Objective:** Replace manual spreadsheets and long group text threads for volleyball carpool families across weekly practices (Tue/Thu 7:15–9:15 PM at St. John's Prep, Sun 5:00–7:00 PM at DIS; Coaches: Ashley Krugh, Hannah Mullarkey) with a fast, calm, mobile-first PWA where drivers offer seats, parents claim rides per leg (`To` / `From`), and timely Web Push alerts notify drivers only when action is needed.
- **Audience:** Team parents/guardians (including multiple parents per player), optional guest riders, and team carpool admins (`samir.dautovic@gmail.com`, `ldautovic@gmail.com`).
- **Non-Goals:**
  - Automated email/SMS blasting on roster creation (admins build the roster silently and share the link when ready).
  - Turn-by-turn navigation inside the app (delegates to Apple Maps on iOS and Google Maps on Android/Desktop, including multi-stop route links).
  - Public/unauthenticated access (all team data requires Firebase Authentication + season roster membership or global admin allowlist).

---

## 2. Active Decisions & Technical Rationale

| Date | Decision | Reason & Trade-offs | Status |
| :--- | :--- | :--- | :--- |
| 2026-11-13 | Vite 7 + React 19 + Tailwind CSS v4 + Firebase (Auth & Firestore) | Real-time sync across parents' phones; offline persistence via `persistentLocalCache`; fast PWA bundle. | Locked |
| 2026-11-13 | Email + Password auth with 1-tap admin reset (`sendPasswordResetEmail`) | Simple login without passwordless email-link friction; admins can pre-load the roster silently before sharing the URL. | Locked |
| 2026-11-13 | Separated `players` and `parents` subcollections under `seasons/{seasonId}` | Supports multiple parents/guardians per player splitting driving duties, and per-parent `canDrive` exclusion from the driving pool. | Locked |
| 2026-11-13 | Document ID = lowercase email in `admins/{email}` and `seasons/{seasonId}/parents/{email}` | Direct O(1) security rule checks (`exists(...)`) and clean self-service profile updates without UID pre-provisioning. | Locked |
| 2026-11-13 | Firestore `runTransaction` for all carpool seat & driver mutations | Prevents race conditions when two parents claim the last open seat simultaneously. | Locked |
| 2026-11-13 | Explicit `inCarpool` player flag (with Melrose-address fallback) + full-team `Team` tab | Keeps practice/drive cards focused on active carpool families while preserving full-team roster, jersey numbers, and `Text Team` contacts. | Locked |
| 2026-11-13 | Static vendor chunking (`firebase`, `vendor`) + `version.json` build stamp in `vite.config.js` | Splits the bundle into preloaded vendor chunks without `React.lazy` stale-tab 404 risk across GitHub Pages deploys, and enables clean new-version detection. | Locked |
| 2026-11-13 | GitHub Pages (`GitHub Actions`) + `public/CNAME` (`aviditycarpool.dautovic.com`) | Automatic build/deploy on push to `main` with custom domain and TLS; Firebase keys & VAPID key injected via GitHub Actions secrets. | Locked |
| 2026-11-25 | Firebase Blaze plan + Cloud Functions v2 (`us-central1`, Node 22) + FCM Web Push (`firebase-messaging-sw.js`) | Enables instant `Needs Sub` push alerts, 6:00 PM ET night-before driver reminders & uncovered-leg alerts, and an in-app Bell Alerts inbox (`seasons/{seasonId}/notifications`) with minimal cost (pennies/month at team scale). | Locked |
| 2026-11-26 | Auto-consolidated `⇄ TO & FROM` round-trip practice view | When all carpool riders are covered and every driver/rider pairing is identical on both legs (whether 1 car or multiple cars), collapses the two legs into one compact `⇄ TO & FROM` section with a `To / From ▾` expand toggle. | Locked |
| 2026-11-26 | Dual Light & Dark theme support (default Midnight Obsidian dark + crisp Light mode) | Supports outdoor/daytime readability while keeping the Apple Sports visual hierarchy and calm, non-shifting layout. | Locked |

---

## 3. Mistakes, Pitfalls & Guardrails (DO NOT REPEAT)

- **Never commit `.env`:** Local Firebase keys and `VITE_FIREBASE_VAPID_KEY` live in `.env` (gitignored); production builds read `VITE_FIREBASE_*` from GitHub Actions repository secrets.
- **Sync script `forceFiles` hazard:** `AvidityCarpool` contains `node_modules/` and `dist/`. Never run `git add --force` recursively on `.json`/`.html`/`.md` files in `SyncGit-*.ps1`, or `node_modules` and `dist` will be committed.
- **Parent `createdAt` & `email` immutability:** `firestore.rules` enforces `hasOnlyAllowedFields` and immutable `createdAt`/`email` on `parents` (plus once-only `activatedAt`). Updates to existing parent docs must use `updateDoc` with allowed fields only; new parent docs must include `createdAt: serverTimestamp()`.
- **Batch practice creation:** Always strip the client-side `id` property before writing to `seasons/{seasonId}/practices/{practiceId}`, and skip existing practice IDs so re-running schedule generation never overwrites active drivers/riders.
- **iOS Web Push requires Home Screen PWA:** Safari on iOS only exposes `Notification` / Push APIs when the app is installed via **Share → Add to Home Screen** and opened from the Home Screen icon, and `Notification.requestPermission()` must be triggered from a direct user tap.
- **Notifications subcollection is server-written only:** `seasons/{seasonId}/notifications` denies all client writes (`allow write: if false`); only Cloud Functions via Admin SDK create or auto-clear alert docs.

---

## 4. Application Architecture & Tech Stack

| Component | Technology | Notes |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 7 | `base: '/'`, `manualChunks` (`firebase`, `vendor`), `emitVersionPlugin` (`version.json`), PWA manifest + home-screen icons (`public/manifest.webmanifest`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Midnight Obsidian dark theme (`#070913` / `#101528`) + Light mode toggle, pill buttons (`rounded-full`), bottom jump bar (`Practices`, `My Drives`, `Events`, `Team`), persistent zoom (`80%–130%`), floating `↑` back-to-top button |
| **Icons** | `lucide-react` | Tree-shaken SVG icons |
| **Auth** | Firebase Authentication | Email/Password + self/admin password reset (`sendPasswordResetEmail`) |
| **Database** | Cloud Firestore | Real-time listeners (`onSnapshot`), transactions (`runTransaction`), multi-tab local cache, strict schema/role rules deployed via `firebase.json` |
| **Push & Scheduled Backend** | Firebase Cloud Functions v2 (Node 22, `us-central1`) + FCM | `onPracticeUpdatedNeedsSub`, `nightBeforeCarpoolSweep` (`0 18 * * *` `America/New_York`), `sendTestPushToSelf` callable; service worker `public/firebase-messaging-sw.js`; automatic pruning of expired FCM tokens |
| **Hosting & DNS** | GitHub Pages + Cloudflare | Repo `SDautovic-GH/AvidityCarpool`, CNAME `aviditycarpool.dautovic.com` → `sdautovic-gh.github.io` |

### Key Source Modules
- `src/App.jsx` & `src/hooks/useCarpoolData.js` — App shell, season state, theme/zoom, `Parent View` admin preview toggle, real-time Firestore subscriptions.
- `src/components/PracticeCard.jsx`, `CarRow.jsx`, `PracticeQuickScan.jsx` — Practice cards, auto-consolidated `⇄ TO & FROM` round-trip layout, `Needs Sub` / `All Set` / `No Carpool` badges, `Needs ride` / `Need ride` summary, quick scan bar.
- `src/components/DriveModal.jsx`, `AssignModal.jsx`, `StopsModal.jsx`, `AddPracticeModal.jsx` — Volunteering to drive (single or recurring weekday), admin `[Name] +` assignment (including `Both Ways`), multi-stop pickup/drop-off route sheet, practice CRUD.
- `src/components/AdminRoster.jsx`, `GuestPoolView.jsx`, `DriverEngagementView.jsx`, `AdminSeasonModal.jsx` — Family/parent management, Guest Pool (`G`), Driver Engagement stats (`Drivers`), Global Push Alert controls & `Test Alert (Me)`, multi-season creation & schedule generation.
- `src/components/NotificationsModal.jsx`, `PushOptInBanner.jsx`, `src/utils/push.js` — Bell Alerts inbox, iOS/desktop push opt-in flow, FCM token registration & opt-out.
- `src/components/TournamentsView.jsx`, `UserGuideModal.jsx`, `src/utils/calendar.js`, `maps.js`, `schedule.js` — Tournaments + `.ics` exports, built-in User/Admin Guide modal, Apple/Google Maps links.
- `functions/index.js` — Cloud Functions v2 for `Needs Sub` push + auto-clearing, 6:00 PM ET night-before sweep, and admin self-test push.

---

## 5. Firestore Data Model & Security Model

All rules are enforced in `firestore.rules` with default-deny at root (`allow read, write: if false`).

- `admins/{email}` — Global admin allowlist (lowercase email doc ID, seeded in Firebase Console; readable only by own email; non-writable from client).
- `config/app` — Optional bootstrap config (`activeSeasonId`, `clubName`, `updatedAt`); readable by authenticated users, writable only by global admins.
- `seasons/{seasonId}` — Season metadata (`clubName`, `teamName`, `label`, `status` `'active'|'archived'`, `notifications: { needsSubEnabled, nightBeforeEnabled }`, `createdAt`). Supports multi-year carryover (`16 Apex` → `17 Apex`).
  - `players/{playerId}` — Team players (`name`, `jerseyNumber`, `inCarpool` bool, `isGuest` bool, `guestDays` list, `linkedParentId`, `createdAt`). Admin-writable only.
  - `parents/{email}` — Linked parents (`name`, `email`, `playerId`, `canDrive` bool, `defaultSeats` 1–7, `role` `'admin'|'parent'`, `phone`, `address`, `activatedAt`, `lastLoginAt`, `pushEnabled` bool, `fcmTokens` list max 10, `createdAt`). Parents may update only their own `phone`, `address`, `name`, `defaultSeats`, `activatedAt` (once), `lastLoginAt`, `pushEnabled`, and `fcmTokens`.
  - `practices/{practiceId}` — Scheduled practices (`isoDate`, `timeLabel`, `location`, `address`, `status` `'scheduled'|'cancelled'`, `carpoolMode` `'both'|'to_only'|'from_only'|'none'`, `absentPlayerIds`, `guestRiders`, `guestIds`, `legs: { to: [], from: [] }`, `notesList` + legacy `notes`/`notesAuthor`, `createdAt`, `updatedAt`). Non-admin parents may update only `absentPlayerIds`, `legs`, `notes`, `notesAuthor`, `notesList`, and `updatedAt`.
  - `tournaments/{tournamentId}` — Team tournaments (`name`, `dateLabel`, `sortDate`, `location`, `address`, `notes`, `createdAt`). Admin-writable only.
  - `notifications/{notificationId}` — In-app Bell Alerts inbox (`title`, `body`, `type` `'needs_sub'|'night_before_driver'|'night_before_uncovered'|'test'`, `practiceId`, `leg`, `recipientIds`, `createdAt`). Read-only for season admins and listed recipients; written and deleted exclusively by Cloud Functions via Admin SDK.

---

## 6. Key Implemented Workflows

1. **Practice Cards & Auto-Consolidated Round-Trip View:**
   - Displays `Today` / `Tomorrow` / `Next` badge and spotlight border on the next upcoming practice.
   - Shows `All Set` (green check) when all going carpool riders are covered (including `No Carpool` practices), `Needs Sub` in the header when a driver has requested a sub, and `Needs ride: <Name>` (singular) / `Need ride: <Name>, <Name>` (plural) when riders are unassigned.
   - Automatically consolidates `→ TO PRACTICE` and `← FROM PRACTICE` into a single `⇄ TO & FROM` block when all riders are covered and every driver/rider pairing matches in both directions, with a `To / From ▾` toggle to expand legs on demand.
   - Supports **All Upcoming** / **Needs Driver** filter, **Past** toggle (read-only for non-admins), collapsed cancelled-practice cards, and quick return-to-top via **All Upcoming**, tapping the active bottom tab, or the floating `↑` button.
2. **Driving, Riding & Guest Riders:**
   - Parents offer to drive `Both Ways` (displays `⇄ Both Ways` badge), `To Only`, or `From Only` (1–7 seats), with optional **"Repeat for all upcoming [weekday] practices"** bulk signup.
   - Drivers can mark `Need Sub`, `Drop` a leg, or view **Stops** (ordered pickup/drop-off addresses with Apple/Google Maps links); other eligible parents can `Take Over`.
   - Riders join a specific car (`Join` or `Both Ways`) or leave (`×`). Admins can assign unassigned players via `[Name] +` (including `Both Ways`) and attach one-off or recurring **Guest Riders** (`G` badge) from the Guest Pool.
3. **Web Push Notifications & Bell Alerts Inbox:**
   - **Instant `Needs Sub` alert (`onPracticeUpdatedNeedsSub`):** Notifies other carpool drivers when a confirmed car requests a sub; automatically deletes the in-app alert once the sub is taken over, withdrawn, dropped, or the practice is cancelled.
   - **6:00 PM ET Night-Before Sweep (`nightBeforeCarpoolSweep`):** Reminds confirmed drivers of tomorrow's legs and riders, and alerts carpool drivers if a leg still lacks enough seats. Silent when there is no practice tomorrow.
   - **Controls:** Admins manage global toggles (`Needs Sub` / `Night-Before`) and run `Test Alert (Me)` (`sendTestPushToSelf`) under **Team → Roster → Alerts** (`✓ Alerts Enabled`). Parents opt in via the banner (with iOS Home Screen guidance) and can mute/unmute under **Edit My Info**.
4. **Notes, Share, Targeted Texting & Calendar Exports (`.ics`):**
   - Multiple attributed notes per practice (`notesList`; authors delete their own, admins delete any), native/clipboard **Share** summary, and 1-tap `sms:` links for **Text My Car**, **Text Carpool**, and **Text Team**.
   - **My Drives** tab with **Add My Drives to Calendar** `.ics` export (excluding cancelled practices) and per-tournament **+ Calendar** `.ics` export on **Events**.
5. **Admin Operations & Oversight:**
   - **Team** tab with `+ Family / Parent`, `+ Parent`, `+ Guest`, `+ Practice`, **Drivers** engagement breakdown, and **Parent View** (`Back to Admin`) toggle so admins can preview the exact parent experience.
   - Built-in **User Guide / Admin Guide** modal (`UserGuideModal.jsx`) synced with `Documentation/` HTML/Markdown guides.

---

## 7. Version History

| Revision | Date | Summary |
| :--- | :--- | :--- |
| **v1.0** | 2026-11-13 | Initial Spark-tier launch: Email/Password auth, Firestore carpool coordination, recurring drives, targeted SMS, `.ics` exports, multi-season support, GitHub Pages deploy. |
| **v2.0** | 2026-11-27 | Blaze-tier Cloud Functions v2 Web Push notifications + Bell Alerts inbox + auto-clearing `Needs Sub` alerts, Light/Dark themes, auto-consolidated `⇄ TO & FROM` round-trip cards, Guest Pool (`G`), `Parent View` preview, Driver Engagement (`Drivers`), `Both Ways` admin assignment, `No Carpool` mode, and floating back-to-top navigation. |
