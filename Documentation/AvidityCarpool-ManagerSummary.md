# Avidity Carpool — Manager Summary

| Field | Value |
| :--- | :--- |
| **Document Type** | Manager & Admin Summary |
| **App Name** | Avidity Carpool |
| **App Version** | 2.0.0 |
| **Live URL** | `https://aviditycarpool.dautovic.com` |
| **Repository** | `https://github.com/SDautovic-GH/AvidityCarpool` |
| **Date** | 2026-11-27 |
| **Coaches** | Ashley Krugh, Hannah Mullarkey |
| **Practice Schedule** | Tue & Thu 7:15–9:15 PM (St. John's Prep) · Sun 5:00–7:00 PM (DIS) |
| **Admins** | Samir Dautovic (`samir.dautovic@gmail.com`), Lee-Anne Dautovic (`ldautovic@gmail.com`) |

---

## Executive Overview

**Avidity Carpool** replaces manual Excel sheets and noisy group text chains with a mobile-first web app (PWA) for coordinating rides to and from practices for **Avidity 16 Apex (26/27 Season)** and future seasons.

### Core Benefits
- **Instant, Calm Visibility:**
  - Every practice card shows who is going, who is driving, open seats, `Needs Sub` warnings, `Needs ride` / `Need ride` callouts, and a green **All Set** indicator once both ways are covered.
  - When drivers and riders match identically in both directions, the card automatically collapses into a single compact **`⇄ TO & FROM`** view (expandable via `To / From ▾`), cutting scrolling in half.
  - Supports **Light and Dark modes**, adjustable text zoom, **Needs Driver** filtering, **My Drives** calendar export (`.ics`), and one-tap **Stops** pickup/drop-off directions.
- **Timely Push Alerts (Zero Noise):**
  - **Instant `Needs Sub` alerts** notify other carpool drivers the moment a driver needs a sub — and automatically clear from the in-app Bell Alerts inbox once covered or resolved.
  - **6:00 PM Night-Before reminders** confirm tomorrow's drivers and their riders, and flag any leg that still needs a driver (completely silent on non-practice days).
  - Works on desktop browsers, Android, and iPhone (when added to the Home Screen), with per-parent mute controls in **Edit My Info**.
- **Built for Real Family Schedules:**
  - **Carpool-Scoped Practice Cards:** Focuses practice carpools on participating carpool families (plus optional **Guest Riders** marked `G`) while keeping the full team roster, jersey numbers, and tournament schedule (**Events** tab) accessible to everyone.
  - **Recurring Weekday Drives:** Parents can volunteer for all upcoming practices on a weekday (e.g., all Sundays) in one tap.
  - **Targeted Group Texting:** **Text My Car** texts only the parents in your car; **Text Carpool** texts carpool parents; **Text Team** (in **Team**) texts the full roster.
  - Supports **multiple parents per player**, **non-driving parents** (`Include in driving pool` unchecked), **`No Carpool`** / single-leg practices, and **1-tap sub handoffs** (`Need Sub` / `Take Over`).
- **Private & Controlled Rollout:**
  - Adding families in **Team** saves quietly to Firestore — **no automated invite emails are sent** until you share `https://aviditycarpool.dautovic.com`.
  - Only email addresses listed on the team roster (or global admins) can view schedules, phone numbers, or home addresses.
- **Multi-Season Ready:** At season end, admins can create next year's season (e.g., `17 Apex · 27/28 Season`), selectively carry over returning players and parents, and generate the full Tue/Thu/Sun practice calendar in one click.

---

## Admin Quick Reference

| Task | Where in the App |
| :--- | :--- |
| **Add / Edit Families & Parents** | **Team → `+ Family / Parent`** (or **`+ Parent`** on a player card) |
| **Manage Guest Riders** | **Team → `+ Guest`** (or Guest Pool) |
| **Exclude a Parent from Driving** | Edit parent → uncheck **Include in driving pool** |
| **Help a Parent Reset Password** | **Team → Reset Password** next to their name |
| **Configure Push Alerts & Test** | **Team → Roster → Alerts** (`Needs Sub`, `Night-Before`, **`Test Alert (Me)`**) |
| **View Driving Balance** | **Team → Drivers** (Driver Engagement breakdown) |
| **Preview as a Parent** | Tap **`Parent View`** in the header (**`Back to Admin`** to return) |
| **Assign an Unassigned Player** | Tap the player's **`Name +`** pill on a practice card (supports **`Both Ways`**) |
| **Add / Edit / Cancel a Practice** | **`+ Practice`** in **Team**, or tap the **Pencil** / **Trash** icon on any practice card |
| **Manage Tournaments** | **Events → `+ Tournament`** (or Pencil/Trash on any event card) |
| **Generate Tue/Thu/Sun Practices** | **Team → Season & Schedule → Generate Practices** |
| **Start Next Year's Season** | **Team → Season & Schedule → New Season** |
