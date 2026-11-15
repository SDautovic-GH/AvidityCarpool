# Avidity Carpool — Admin Guide

This guide covers all team administrator capabilities in **Avidity Carpool** (`https://aviditycarpool.dautovic.com`). Admins have all standard parent features plus full control over the roster, carpool eligibility, practice schedule, ride assignments, tournaments, and seasons.

---

## 1. Admin Access & Roles

- **How Admin Access Works:** A parent is an admin if their parent record has the **Admin** role (`role: "admin"`), or if they are a global admin.
- **Granting or Revoking Admin:** On the **Team** tab, edit any parent and toggle their role between **Parent** and **Admin**.

---

## 2. Managing the Roster & Carpool Eligibility (`Team` Tab)

1. **Add a Family / Parent:** Tap **Add Family / Parent** to create a player and/or parent contact (email, phone, home address, default seats, and role).
   - Parents use the exact **email address** entered here when they tap **First-time sign up** on the login screen.
2. **Bulk Import:** Tap **Bulk Import** to paste or load multiple players/families at once.
3. **Edit Player or Parent Details:**
   - Tap the edit icon on any player to update their **name** or **jersey number**.
   - Tap the edit icon on any parent to update their **contact info**, **home address**, **default seats**, or **Admin role**.
   - Tap **Send Reset Email** on a parent to email them a password-reset link if they get locked out.
   - Tap **Remove** on a parent to remove them from the team roster.
4. **Carpool Membership (`✓ Carpool` / `+ Carpool`):**
   - By default, any player whose parent address includes **Melrose** is automatically included in the carpool (`✓ Carpool`).
   - Admins can tap the **`✓ Carpool`** or **`+ Carpool`** pill on any player to manually **override** the address rule:
     - **Include a non-Melrose teammate:** Tap `+ Carpool` → switches to `✓ Carpool`.
     - **Exclude a Melrose player who opts out:** Tap `✓ Carpool` → switches to `+ Carpool`.
   - Only `✓ Carpool` players appear in practice ride headcounts, *"Still need a ride"*, and **Text Carpool**.

---

## 3. Managing Practices (`Practices` Tab)

1. **Generate a Season Schedule:**
   - Open **Team** → **Season & Schedule** → **Generate Practices** (or tap **Generate Practices** when no upcoming practices exist).
   - Pick a **Start Date** and **End Date** to preview and batch-create practices.
2. **Edit, Reschedule, or Cancel a Practice:**
   - Tap the **pencil (Edit)** icon in the top-right of any practice card to change its **date**, **time**, **gym/address**, or **status** (for example, marking a practice **Cancelled**).
   - Tap the **trash (Remove)** icon in the top-right of a practice card to delete it permanently.
3. **Past Practices:** Admins can still view and edit past practices when toggling **Past** in the Practices filter.

---

## 4. Ride Assignments, Cars & Notes (`Practices` Tab)

Admins can step in to organize rides on any practice card:

- **Assign a Driver:** Tap **+ I can drive** or **+ Assign driver** on any practice card and pick any drivable parent from the **Driver (Admin)** dropdown (for that practice or all upcoming practices on that weekday).
- **Override Need Sub / Remove a Driver:** On any car row, tap **Need Sub** / **Cancel Sub** to override sub status, **Take Over** on a sub-needed car, or **Drop** (with confirmation) to remove that driver from an individual practice leg without changing their roster `Can drive` status.
- **Assign or Remove Riders:** Under **Still need a ride:**, tap any player's **`[Name] +`** button to open the **Assign** modal and place them into any confirmed car with open seats, or tap **`×`** next to any rider's name to remove them.
- **Delete Any Note:** Admins can delete any parent's practice note on a card.

---

## 5. Tournaments & Events (`Events` Tab)

- **Load Default Schedule:** When the Events tab is empty, tap **Load 26/27 Tournaments** to seed the season's tournament list in one click.
- **Add / Edit / Delete Tournaments:** Tap **+ Add Tournament** to add a new event (name, dates, location/address), or use the edit/delete controls on any existing tournament card.

---

## 6. Seasons (`Team` Tab → `Season & Schedule`)

1. Tap **Season & Schedule** on the **Team** tab and switch to **New Season**.
2. Enter the **Club Name**, **Team Name**, and **Season Label** (e.g., `17 Apex` / `27/28 Season`).
3. Check the players (and their linked parents) you want to **carry over** into the new season.
4. Tap **Create Season** to initialize and switch to the new season.
