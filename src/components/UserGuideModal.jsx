import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Shield, X } from 'lucide-react';

export default function UserGuideModal({ isAdmin = false, onClose }) {
  const [tab, setTab] = useState('parent'); // 'parent' | 'admin'
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-label={tab === 'admin' ? 'Admin Guide' : 'Parent User Guide'}
      className="fixed inset-x-0 bottom-0 top-auto sm:inset-0 m-0 sm:m-auto p-0 w-full max-w-full sm:max-w-lg max-h-[90dvh] bg-transparent border-0 overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
    >
      <div className="w-full max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 overflow-hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 touch-none">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            {tab === 'admin' ? 'Admin Guide' : 'Parent User Guide'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isAdmin && (
          <div className="px-5 pt-3 shrink-0 touch-none">
            <div className="inline-flex p-1 rounded-full bg-slate-950 border border-slate-800 text-[13px] font-semibold">
              <button
                type="button"
                onClick={() => setTab('parent')}
                className={`px-3.5 py-1.5 rounded-full transition ${
                  tab === 'parent'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Parent Guide
              </button>
              <button
                type="button"
                onClick={() => setTab('admin')}
                className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full transition ${
                  tab === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3 h-3" />
                Admin Guide
              </button>
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto overscroll-y-contain space-y-5 text-sm text-slate-300 leading-relaxed">
          {tab === 'parent' ? (
            <>
              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">1. Reading Practices &amp; Quick Scan</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong className="text-slate-100">Cards vs. Scan:</strong> Switch between{' '}
                    <strong className="text-slate-100">Cards</strong> (full details) and{' '}
                    <strong className="text-slate-100">Scan</strong> (condensed list grouped by month with weekday filters, available on both{' '}
                    <strong className="text-slate-100">Practices</strong> and <strong className="text-slate-100">My Drives</strong>) — your preference is saved automatically. Tap{' '}
                    <strong className="text-slate-100">View ▾</strong> on any Scan row to expand its full card, or look for the green{' '}
                    <strong className="text-emerald-400">✓ All Set</strong> pill.
                  </li>
                  <li>
                    <strong className="text-slate-100">Filters:</strong> Use{' '}
                    <strong className="text-slate-100">All Upcoming</strong> to filter by month or past practices, and toggle{' '}
                    <strong className="text-slate-100">Needs Driver</strong> to see uncovered practices in that view.
                  </li>
                  <li>
                    <strong className="text-slate-100">Status &amp; Directions:</strong> Green{' '}
                    <strong className="text-emerald-400">All Set</strong> means every going player has a ride. One-way events show{' '}
                    <strong className="text-slate-100">Carpool To Only</strong> or{' '}
                    <strong className="text-slate-100">Carpool From Only</strong>. Tap the gym name for Apple/Google Maps directions.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">2. Going / Out &amp; Claiming a Ride</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong className="text-slate-100">Missing a practice:</strong> Tap{' '}
                    <strong className="text-slate-100">[Name]: Going</strong> on that card to flip it to{' '}
                    <strong className="text-slate-100">Out</strong>. This updates headcounts and frees their seat immediately.
                  </li>
                  <li>
                    <strong className="text-slate-100">Joining a car:</strong> Tap{' '}
                    <strong className="text-slate-100">Join</strong> on a car with open seats (or{' '}
                    <strong className="text-slate-100">Both Ways</strong> when available). Tap{' '}
                    <strong className="text-slate-100">×</strong> next to your player&apos;s name to leave a car.
                  </li>
                  <li>
                    <strong className="text-slate-100">Guest Riders (G):</strong> Riders marked with a{' '}
                    <strong className="text-violet-300">G</strong> badge are approved guest or sibling riders for that practice and count toward seat capacity and{' '}
                    <strong className="text-slate-100">Stops</strong>. To request a guest rider, please reach out to{' '}
                    <strong className="text-slate-100">Lee-Anne</strong>.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">3. Offering to Drive</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Tap <strong className="text-slate-100">+ I can drive</strong> (or{' '}
                    <strong className="text-slate-100">+ Drive</strong> in Quick Scan), choose{' '}
                    <strong className="text-slate-100">Both Ways</strong> / <strong className="text-slate-100">To Only</strong> /{' '}
                    <strong className="text-slate-100">From Only</strong>, and pick player seats (1–7;{' '}
                    <strong className="text-slate-100">1</strong> = driving solo). You can optionally repeat for all upcoming practices on that weekday.
                  </li>
                  <li>
                    <strong className="text-slate-100">Adjust seats per practice:</strong> Use the inline{' '}
                    <strong className="text-slate-100">N seats ▾</strong> dropdown next to your open-seat count on any car you drive.
                  </li>
                  <li>
                    <strong className="text-slate-100">Stops &amp; Plan Changes:</strong> Tap{' '}
                    <strong className="text-slate-100">Stops</strong> on your car for rider addresses (1-tap Maps) and parent Call/Text links. Tap{' '}
                    <strong className="text-slate-100">Need Sub</strong> if you need another parent to{' '}
                    <strong className="text-slate-100">Take Over</strong>, or <strong className="text-slate-100">Drop</strong> to cancel your drive.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">4. Notes, Texting, Calendar &amp; Team</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong className="text-slate-100">Notes &amp; Car Texting:</strong> Use{' '}
                    <strong className="text-slate-100">+ Note</strong> on a card or{' '}
                    <strong className="text-slate-100">Text My Car</strong> to message the parents in your car for that practice. (Use{' '}
                    <strong className="text-slate-100">Text Carpool</strong> / <strong className="text-slate-100">Text Team</strong> on the{' '}
                    <strong className="text-slate-100">Team</strong> tab to message the full group.)
                  </li>
                  <li>
                    <strong className="text-slate-100">My Drives &amp; Events:</strong> Export your driving schedule (
                    <code>.ics</code>) from <strong className="text-slate-100">My Drives</strong>, or view tournaments and add them to your calendar from{' '}
                    <strong className="text-slate-100">Events</strong>.
                  </li>
                  <li>
                    <strong className="text-slate-100">Team Tab &amp; Push Alerts:</strong> Tap any phone number to call/text, address for Maps, or{' '}
                    <strong className="text-slate-100">Edit My Info</strong> to update your phone, address, default seats, or opt in/out of push alerts. Tap{' '}
                    <strong className="text-slate-100">Enable Alerts</strong> (on iPhone, first add the app to your Home Screen via <em>Share → Add to Home Screen</em>) to receive urgent{' '}
                    <strong className="text-slate-100">Needs Sub</strong> alerts and{' '}
                    <strong className="text-slate-100">6:00 PM night-before</strong> driver reminders. Tap the{' '}
                    <strong className="text-slate-100">Bell</strong> icon in the top bar anytime to review recent alerts you may have missed.
                  </li>
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">1. Roster, Carpool Membership &amp; Alerts (Team Tab)</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Add or edit families with <strong className="text-slate-100">+ Family / Parent</strong>,{' '}
                    <strong className="text-slate-100">Bulk Import</strong>, or the pencil icon. Toggle{' '}
                    <strong className="text-slate-100">✓ Carpool</strong> / <strong className="text-slate-100">+ Carpool</strong> on any player to include or exclude them from carpool headcounts.
                  </li>
                  <li>
                    Tap <strong className="text-slate-100">Alerts</strong> in <strong className="text-slate-100">Team → Roster</strong> to see how many carpool drivers have alerts active, globally enable or disable{' '}
                    <strong className="text-slate-100">Instant &ldquo;Needs Sub&rdquo; Alerts</strong> and the{' '}
                    <strong className="text-slate-100">6:00 PM Night-Before Sweep</strong>, or tap{' '}
                    <strong className="text-slate-100">Send Test Alert (Me Only)</strong> to verify push delivery and the top-bar{' '}
                    <strong className="text-slate-100">Bell</strong> Alerts inbox without notifying other parents.
                  </li>
                  <li>
                    Use the <strong className="text-slate-100">Guest Pool</strong> tab inside{' '}
                    <strong className="text-slate-100">Team</strong> to register siblings or guest riders (linked to an existing parent or new contact/address) and optionally set recurring weekdays (e.g., <em>Sun</em>) or leave manual.
                  </li>
                  <li>
                    Use the <strong className="text-slate-100">Driver Engagement</strong> view at the top of{' '}
                    <strong className="text-slate-100">Team</strong> to review legs driven, past vs. upcoming coverage, and tap any driver&apos;s name for their ride history and riders.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">2. Practices &amp; Carpool Mode</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Use <strong className="text-slate-100">+ Practice</strong> on the Practices tab to add a single practice, or{' '}
                    <strong className="text-slate-100">Team → Season &amp; Schedule → Generate Practices</strong> to batch-create a date range.
                  </li>
                  <li>
                    Tap the <strong className="text-slate-100">pencil</strong> icon on any practice card to edit date, time, gym, status (<em>Cancelled</em>), or{' '}
                    <strong className="text-slate-100">Carpool Needed</strong> (<em>Both Ways</em>, <em>From Practice Only</em>, <em>To Practice Only</em>, or <em>No Carpool Needed</em>), or the{' '}
                    <strong className="text-slate-100">trash</strong> icon to delete it.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[15px] font-bold text-slate-100">3. Ride Overrides</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Assign any drivable parent via the <strong className="text-slate-100">Driver (Admin)</strong> dropdown in the Drive modal.
                  </li>
                  <li>
                    On any car row, use <strong className="text-slate-100">N seats ▾</strong> to adjust seats,{' '}
                    <strong className="text-slate-100">Need Sub</strong> / <strong className="text-slate-100">Cancel Sub</strong>, or{' '}
                    <strong className="text-slate-100">Drop</strong> to remove that driver from that leg only.
                  </li>
                  <li>
                    Under <em>Still need a ride</em>, tap <strong className="text-slate-100">[Name] +</strong> to place a rider into a confirmed car, or{' '}
                    <strong className="text-slate-100">×</strong> to remove a rider.
                  </li>
                  <li>
                    Tap <strong className="text-slate-100">+ Guest</strong> on any practice card to add a guest from the Guest Pool (or a one-off guest, max 10 per practice) and assign them to a car.
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end shrink-0 touch-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[13px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
