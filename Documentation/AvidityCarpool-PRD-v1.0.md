# Avidity Carpool — PRD & Technical Reference

| Field | Value |
| :--- | :--- |
| **Document Type** | Product Requirements Document (PRD) & Technical Spec |
| **App Name** | Avidity Carpool |
| **App Version** | 1.0.0 |
| **PRD Revision** | v1.0 |
| **Date** | 2026-11-13 |
| **Author** | Samir Dautovic |
| **Status** | Deployed (`https://aviditycarpool.dautovic.com`) |
| **Summary** | Real-time youth volleyball carpool coordination web app for Avidity 16 Apex (26/27 Season) and future seasons, built with Vite, React, Tailwind CSS v4, Firebase Auth/Firestore, and deployed to GitHub Pages behind Cloudflare DNS. |

---

## 1. Objective & Non-Goals

- **Primary Objective:** Replace manual spreadsheets and group text threads for 8–10 volleyball families across 3 weekly practices (Tue/Thu 7:15–9:15 PM at St. John's Prep, Sun 5:00–7:00 PM at DIS; Coaches: Ashley Krugh, Hannah Mullarkey) with a fast, mobile-first web app where drivers offer seats and parents claim rides per leg (`To Practice` / `From Practice`).
- **Audience:** Team parents/guardians (including multiple parents per player) and team carpool admins (`samir.dautovic@gmail.com`, `ldautovic@gmail.com`).
- **Non-Goals:**
  - Automated email/SMS blasting on roster creation (admins build the roster silently and share the link when ready).
  - Turn-by-turn navigation inside the app (delegates to Apple Maps on iOS and Google Maps on Android/Desktop).
  - Public/unauthenticated access (all team data requires Firebase Authentication + season roster membership or global admin allowlist).

---

## 2. Active Decisions & Technical Rationale

| Date | Decision | Reason & Trade-offs | Status |
| :--- | :--- | :--- | :--- |
| 2026-11-13 | Vite + React 19 + Tailwind CSS v4 + Firebase (Auth & Firestore) | Zero-backend real-time sync across parents' phones; offline persistence via `persistentLocalCache`; free Spark tier covers team scale. | Locked |
| 2026-11-13 | Email + Password auth with 1-tap admin reset (`sendPasswordResetEmail`) | Simple, familiar login for parents without passwordless email-link friction; admins can pre-load roster silently before sharing URL. | Locked |
| 2026-11-13 | Separated `players` and `parents` subcollections under `seasons/{seasonId}` | Supports multiple parents/guardians per player splitting driving duties, and per-parent `canDrive` exclusion from the driving pool. | Locked |
| 2026-11-13 | Document ID = lowercase email in `admins/{email}` and `seasons/{seasonId}/parents/{email}` | Enables direct O(1) security rule checks (`exists(...)`) and clean self-service profile updates without UID pre-provisioning. | Locked |
| 2026-11-13 | Firestore `runTransaction` for all carpool seat & driver mutations | Prevents race conditions when two parents claim the last open seat simultaneously. | Locked |
| 2026-11-13 | Melrose-address carpool scoping (`carpoolPlayers`) + full-team `Team` tab | Keeps practice/drive cards focused on the active Melrose carpool while preserving full-team roster, jersey numbers, and `Text Team` contacts. | Locked |
| 2026-11-13 | Static vendor chunking (`firebase`, `vendor`) in `vite.config.js` | Splits the 760 KB bundle into preloaded vendor chunks without `React.lazy` stale-tab 404 risk across GitHub Pages deploys. | Locked |
| 2026-11-13 | GitHub Pages (`GitHub Actions`) + `public/CNAME` (`aviditycarpool.dautovic.com`) | Automatic build/deploy on push to `main` with custom domain and TLS; Firebase keys injected via GitHub Actions secrets. | Locked |

---

## 3. Mistakes, Pitfalls & Guardrails (DO NOT REPEAT)

- ⚠️ **Never commit `.env`:** Local Firebase keys live in `.env` (gitignored); production builds read `VITE_FIREBASE_*` from GitHub Actions repository secrets.
- ⚠️ **Sync script `forceFiles` hazard:** Unlike static-file repos, `AvidityCarpool` contains `node_modules/` and `dist/`. Never run `git add --force` recursively on `.json`/`.html`/`.md` files in `SyncGit-*.ps1`, or `node_modules` and `dist` will be committed.
- ⚠️ **Parent `createdAt` vs `updatedAt`:** `firestore.rules` enforces `hasOnlyAllowedFields` and immutable `createdAt` on `parents`. Updates to existing parent docs must use `updateDoc` without `createdAt` or disallowed fields; new parent docs must include `createdAt: serverTimestamp()`.
- ⚠️ **Batch practice creation:** Always strip the client-side `id` property before writing to `seasons/{seasonId}/practices/{practiceId}`, and skip existing practice IDs so re-running schedule generation never overwrites active drivers/riders.

---

## 4. Application Architecture & Tech Stack

| Component | Technology | Notes |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 7 | `base: '/'`, `manualChunks` (`firebase`, `vendor`), PWA manifest + home-screen icons (`public/manifest.webmanifest`, `apple-touch-icon.png`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Apple Sports Midnight Obsidian palette (`#070913` / `#101528`), pill buttons (`rounded-full`), MHS-inspired jump bar (`Practices`, `My Drives`, `Events`, `Team`), persistent zoom (`80%–130%`) |
| **Icons** | `lucide-react` | Lightweight tree-shaken SVG icons |
| **Auth** | Firebase Authentication | Email/Password + self/admin password reset |
| **Database** | Cloud Firestore | Real-time listeners (`onSnapshot`), transactions (`runTransaction`), multi-tab local cache, rules deployed via `firebase.json` |
| **Hosting & DNS** | GitHub Pages + Cloudflare | Repo `SDautovic-GH/AvidityCarpool`, CNAME `aviditycarpool.dautovic.com` → `sdautovic-gh.github.io` |

---

## 5. Firestore Data Model & Security Model

- `admins/{email}` — Global admin allowlist (lowercase email doc ID, seeded in Firebase Console; non-writable from client).
- `seasons/{seasonId}` — Season metadata (`clubName`, `teamName`, `label`, `status`, `createdAt`). Supports multi-year carryover (`16 Apex` → `17 Apex`).
  - `players/{playerId}` — Team players (`name`, optional `jerseyNumber`, `createdAt`).
  - `parents/{email}` — Linked parents (`name`, `email`, `playerId`, `phone`, `address`, `defaultSeats` 1–7, `canDrive` bool, `role` `'admin'|'parent'`, `createdAt`). Parents can update only their own `phone`, `address`, `name`, and `defaultSeats`.
  - `practices/{practiceId}` — Scheduled practices (`isoDate`, `timeLabel`, `location`, `address`, `status` `'scheduled'|'cancelled'`, `absentPlayerIds`, `legs: { to: [], from: [] }`, `notesList` array of attributed notes + legacy `notes`/`notesAuthor`, `createdAt`, `updatedAt`).
  - `tournaments/{tournamentId}` — Team tournaments (`name`, `dateLabel`, `sortDate`, `location`, `notes`, `createdAt`, `updatedAt`).

---

## 6. Key Implemented Workflows

1. **Practice Cards & Status:** Displays `Today` / `Tomorrow` / `Next` badge and blue spotlight border on the next upcoming practice; marks the date tile `All Set` with a green check when both legs are covered, or shows `● Need a driver` when seats are short. Supports **All Upcoming** / **Needs Driver** filter, **Past** toggle (read-only for non-admins), and collapsed cancelled-practice cards.
2. **Driving & Riding:** Parents offer to drive `Both Ways`, `To Only`, or `From Only` (1–7 seats, where `1` = driving solo), with an optional **"Repeat for all upcoming [weekday] practices"** bulk signup (`Promise.all`). Drivers can mark `Need Sub` or `Drop` a leg; other eligible parents can `Take Over`. Riders join a specific car (`Join` or `Both Ways`) or leave (`×`).
3. **Notes, Share & Targeted Texting:** Multiple attributed notes per practice (`notesList`; authors can delete their own, admins can delete any), native/clipboard **Share** summary, and 1-tap `sms:` links scoped to **Text My Car** (driver + rider parents in your car) or **Text Carpool** (Melrose carpool parents only).
4. **My Drives & Calendar Exports (`.ics`):** Dedicated **My Drives** tab with **Add My Drives to Calendar** `.ics` export (excluding cancelled practices), plus per-tournament **+ Calendar** `.ics` export on the **Events** tab.
5. **Events (Tournaments) & Team Directory:** **Events** tab lists team tournaments with `NEXT` badge, Maps links, `.ics` export, and Admin CRUD + 26/27 season seed. **Team** tab shows the full team roster with `Carpool` badges, `tel:` / `Text` / Maps links, **Text Carpool** and **Text Team** buttons, and **Edit My Info** self-service updates.
6. **Admin Roster & Schedule Management:** Silent family/player creation, multiple parents per player, `canDrive` pool toggle, 1-tap password reset email, bulk player/jersey import, admin rider assignment (`AssignModal`), inline practice edit/cancel/delete, new season creation with carryover, and 1-click Tue/Thu/Sun schedule generation.

