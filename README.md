# Avidity Carpool

Youth volleyball carpool coordinator PWA for **Avidity 16 Apex (26/27 Season)** (and future seasons), built with Vite, React 19, Tailwind CSS v4, Firebase (Auth + Cloud Firestore), and Firebase Cloud Functions v2 for Web Push notifications.

- **Live URL:** `https://aviditycarpool.dautovic.com`
- **GitHub Repo:** `https://github.com/SDautovic-GH/AvidityCarpool`
- **Documentation:** [PRD v2.0](Documentation/AvidityCarpool-PRD-v2.0.md) · [Manager Summary](Documentation/AvidityCarpool-ManagerSummary.md) · [User Guide](Documentation/AvidityCarpool-UserGuide.md) · [Admin Guide](Documentation/AvidityCarpool-AdminGuide.md)

## Local Development

```bash
cp .env.example .env
# Fill in your Firebase Web App keys (and VITE_FIREBASE_VAPID_KEY for Web Push) in .env
npm install
npm run dev
```

## 1. Firebase Setup

1. Create or select the Firebase project (`avidity-carpool`) in the [Firebase Console](https://console.firebase.google.com/).
2. **Authentication → Sign-in method:** Enable **Email/Password** (leave Email link / passwordless off).
3. **Authentication → Settings → Authorized domains:** Add `aviditycarpool.dautovic.com` (and `sdautovic-gh.github.io` if testing the default Pages URL).
4. **Cloud Firestore:** Create the database and deploy rules and indexes:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project avidity-carpool
   ```
5. **Bootstrap Global Admins:** In **Firestore → Data**, create collection `admins` and add documents whose **Document IDs** are your lowercase admin email addresses (no fields required):
   - `samir.dautovic@gmail.com` (Samir Dautovic)
   - `ldautovic@gmail.com` (Lee-Anne Dautovic)
6. **Web App Config & Web Push (Blaze Plan):**
   - Register a Web App in **Project Settings** and copy the 6 `VITE_FIREBASE_*` values into `.env` (local dev) and GitHub repository secrets.
   - In **Project Settings → Cloud Messaging → Web Push certificates**, generate a key pair and set `VITE_FIREBASE_VAPID_KEY` in `.env` and GitHub Actions secrets.
   - Deploy Cloud Functions (`onPracticeUpdatedNeedsSub`, `nightBeforeCarpoolSweep`, `sendTestPushToSelf`):
     ```bash
     cd functions && npm install && cd ..
     npx firebase-tools deploy --only functions --project avidity-carpool
     ```

## 2. First-Time App Setup (Silent Roster Build)

1. Sign up in the app using your admin email + password.
2. Click **Create Season** (e.g., `Avidity` / `16 Apex` / `26/27 Season`).
3. Open **Team → `+ Family / Parent`** to add players and parents (multiple parents can link to the same player, and you can uncheck **Include in driving pool** for non-driving parents).
   - Adding families saves quietly to Firestore — **no emails are sent** until you share the app link with the team.
4. Open **Team → Season & Schedule → Generate Practices** to populate Tue/Thu (`St. John's Prep`, 7:15–9:15 PM) and Sun (`DIS`, 5:00–7:00 PM) practices.
5. Verify push alerts under **Team → Roster → Alerts → `Test Alert (Me)`**.

## 3. GitHub Pages + Cloudflare Deployment

1. Push changes to `https://github.com/SDautovic-GH/AvidityCarpool` (`main` branch).
2. In GitHub **Settings → Secrets and variables → Actions**, configure the 6 `VITE_FIREBASE_*` secrets plus `VITE_FIREBASE_VAPID_KEY`.
3. In GitHub **Settings → Pages**:
   - Source: **GitHub Actions**
   - Custom domain: `aviditycarpool.dautovic.com` (matches `public/CNAME`)
   - Enable **Enforce HTTPS**.
4. In **Cloudflare DNS** for `dautovic.com`:
   - `CNAME` record `aviditycarpool` → `sdautovic-gh.github.io` (DNS only, or Proxied with SSL/TLS set to **Full (strict)**).
