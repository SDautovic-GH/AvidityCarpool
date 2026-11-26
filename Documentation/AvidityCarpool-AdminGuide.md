# Avidity Carpool — Admin Guide

This guide covers all team administrator capabilities in **Avidity Carpool** (`https://aviditycarpool.dautovic.com`). Admins have all standard parent features plus full control over the roster, carpool eligibility, guest pool, push alert settings, practice schedule, ride assignments, tournaments, and seasons.

---

## 1. Admin Access, Roles & Parent View

- **How Admin Access Works:** A parent is an admin if their parent record has the **Admin** role (`role: "admin"`), or if they are a global admin.
- **Granting or Revoking Admin:** On the **Team** tab, edit any parent and toggle their role between **Parent** and **Admin**.
- **Parent View Preview:** Tap **Parent View** (top bar on desktop, or inside the **`•••`** menu on mobile) anytime to preview the exact non-admin parent experience. An amber **Viewing as regular parent** banner appears at the top with a 1-tap **Back to Admin** button.

---

## 2. Managing the Roster, Carpool Eligibility & Guest Pool (`Team` Tab)

1. **Add a Family / Parent:** Tap **`+ Family / Parent`** (or **`+ Parent`** on an existing player card) to add a player and/or parent contact (email, phone, home address, default seats, and role).
   - Parents use the exact **email address** entered here when they tap **First-time sign up** on the login screen.
2. **Bulk Import:** Tap **Bulk Import** to paste or load multiple players/families at once.
3. **Edit Player or Parent Details:**
   - Tap the **pencil** icon on any player header to update their **name** or **jersey number**.
   - Tap **Edit** on any parent to update their **contact info**, **home address**, **default seats**, or **Admin role**.
   - Tap **Reset Password** on a parent to email them a password-reset link if they get locked out.
   - Tap the **trash** icon to remove a parent from the team roster.
4. **Carpool Membership (`✓ Carpool` / `+ Carpool`):**
   - By default, any player whose parent address includes **Melrose** is automatically included in the carpool (`✓ Carpool`).
   - Tap **`✓ Carpool`** or **`+ Carpool`** on any player to manually include a non-Melrose teammate or exclude a Melrose opt-out.
   - Only `✓ Carpool` players appear in practice ride headcounts, *Needs ride / Need ride*, and **Text Carpool**.
5. **Guest Pool (`Team → Guest Pool`):**
   - Tap **`+ Guest`** to register siblings or recurring guest riders (linked to an existing parent or a new contact/address so drivers see their stop in **Stops**) and optionally set recurring weekdays (e.g., *Sun*) or leave manual.
6. **Driver Engagement (`Team → Drivers` / `Driver Engagement`):**
   - Review legs driven across **All Season**, **Past**, or **Upcoming** (filtered to Carpool Parents or All Roster), active drivers, and open upcoming legs—tap any driver's name for their ride history and players driven.

---

## 3. Global Push Alert Controls (`Team → Roster → Alerts`)

- Tap **Alerts** in **Team → Roster** to open the global push alert settings panel:
  - See how many carpool drivers currently have push alerts enabled on a device.
  - Globally enable or disable **Instant "Needs Sub" Alerts** and the **6:00 PM Night-Before Sweep**.
  - Tap **Enable on This Device** (switches to green **`✓ Alerts Enabled`** once active) and **`Test Alert (Me)`** to verify lock-screen push delivery and the top-bar **Bell** Alerts inbox without notifying any other parent.
- When a driver withdraws a sub request (**Cancel Sub**), someone taps **Take Over**, the drive is dropped, or the practice is cancelled, the stale `Needs Sub` alert is automatically removed from everyone's **Bell** inbox.

---

## 4. Managing Practices (`Practices` Tab)

1. **Add a Single Practice or Generate a Season Schedule:**
   - Tap **`+ Practice`** on the **Practices** tab to add a single practice event (date, time, facility/address, and carpool mode).
   - Or open **Team → Season & Schedule → Generate Practices** to preview and batch-create practices across a date range.
2. **Edit, Reschedule, or Cancel a Practice:**
   - Tap the **pencil** icon in the card header to change its **date**, **time**, **gym/address**, **status** (e.g., **Cancelled**), or **Carpool Needed** (**Both Ways**, **From Practice Only**, **To Practice Only**, or **No Carpool Needed**).
   - Tap the **trash** icon in the card header to delete it permanently.
3. **Past Practices:** Admins can still view and edit past practices when selecting **All Past** in the Practices filter.

---

## 5. Ride Assignments, Guests & Overrides (`Practices` Tab)

- **Assign a Driver:** Tap **+ I can drive** or **+ Assign driver** on any practice card and pick any drivable parent from the **Driver (Admin)** dropdown (for that practice or all upcoming practices on that weekday).
- **Override Need Sub / Adjust Seats / Remove a Driver:** On any car row, use **`N seats ▾`** to adjust seats for that leg, tap **Need Sub** / **Cancel Sub** to override sub status, **Take Over** on a sub-needed car, or **Drop** (with confirmation) to remove that driver from that leg only.
- **Assign or Remove Riders:** Under *Needs ride / Need ride*, tap any player's **`[Name] +`** button to assign them to a confirmed car—with a **`Both Ways`** option whenever that driver has open seats on both legs and the player doesn't already have a ride the other way—or tap **`×`** next to any rider to remove them.
- **Practice Guests:** Tap **`+ Guest`** on any practice card to add a guest from the Guest Pool (or type a one-off guest name, max 10 per practice) and assign them to a car.
- **Delete Any Note:** Admins can delete any parent's practice note on a card.

---

## 6. Tournaments & Seasons

- **Events Tab:** Tap **Load 26/27 Tournaments** (when empty) or **`+ Tournament`** to add, edit, or remove events.
- **New Season (`Team → Season & Schedule → New Season`):** Enter **Club Name**, **Team Name**, and **Season Label**, select players/parents to carry over, and tap **Create Season**.
