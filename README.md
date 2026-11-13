# Avidity Carpool

Youth volleyball carpool coordinator for **Avidity 16 Apex (26/27 Season)** (and future seasons), built with Vite, React, Tailwind CSS v4, and Firebase (Auth + Cloud Firestore).

Live URL (once deployed): `https://aviditycarpool.dautovic.com`  
GitHub Repo: `https://github.com/SDautovic-GH/AvidityCarpool`

## Local Development

```bash
cp .env.example .env
# Fill in your Firebase Web App keys in .env
npm install
npm run dev
```

## 1. Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. **Authentication → Sign-in method:** Enable **Email/Password** (leave Email link / passwordless off).
3. **Authentication → Settings → Authorized domains:** Add `aviditycarpool.dautovic.com` (and `sdautovic-gh.github.io` if testing the default Pages URL).
4. **Cloud Firestore:** Create the database, then paste the contents of `firestore.rules` into **Firestore → Rules** and publish (and deploy `firestore.indexes.json` if prompted).
5. **Bootstrap Global Admins:** In **Firestore → Data**, create collection `admins` and add two documents whose **Document IDs** are your lowercase admin email addresses (no fields required):
   - `samir.dautovic@gmail.com` (Samir Dautovic)
   - `ldautovic@gmail.com` (Lee-Anne Dautovic)
6. **Web App Config:** Register a Web App in **Project Settings** and copy the `VITE_FIREBASE_*` values into `.env` (for local dev) and GitHub repository secrets (for deployment).

## 2. First-Time App Setup (Silent Roster Build)

1. Sign up in the app using your admin email + password.
2. Click **Create Season** (e.g., `Avidity` / `16 Apex` / `26/27 Season`).
3. Open **Team Roster → Add Family / Parent** to add players and parents (multiple parents can link to the same player, and you can uncheck **Include in driving pool** for non-driving parents).
   - Adding families saves quietly to Firestore — **no emails are sent** until you share the app link with the team.
4. Open **Season & Schedule → Generate Practices** to populate Tue/Thu (`St. John's Prep`, 7:15–9:15 PM) and Sun (`DIS`, 5:00–7:00 PM) practices.

## 3. GitHub Pages + Cloudflare Deployment

1. Push this directory to `https://github.com/SDautovic-GH/AvidityCarpool`.
2. In GitHub **Settings → Secrets and variables → Actions**, add the 6 `VITE_FIREBASE_*` secrets from `.env.example`.
3. In GitHub **Settings → Pages**:
   - Source: **GitHub Actions**
   - Custom domain: `aviditycarpool.dautovic.com` (matches `public/CNAME`)
   - Enable **Enforce HTTPS** once DNS propagates.
4. In **Cloudflare DNS** for `dautovic.com`:
   - Add a `CNAME` record:
     - **Name:** `aviditycarpool`
     - **Target:** `sdautovic-gh.github.io`
     - **Proxy status:** DNS only (or Proxied with SSL/TLS set to **Full (strict)**).
