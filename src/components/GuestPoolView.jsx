import React, { useMemo, useState } from 'react';
import { Car, MapPin, MessageCircle, Pencil, Phone, Trash2, UserPlus, Users, X } from 'lucide-react';
import { buildSmsUrl, getMapUrl } from '../utils/maps';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY_GUEST_FORM = {
  existingGuestId: null,
  guestName: '',
  guestDays: [],
  parentMode: 'existing', // 'existing' | 'new'
  linkedParentId: '',
  existingParentDocId: null,
  parentName: '',
  email: '',
  phone: '',
  address: '',
  canDrive: false,
  defaultSeats: 4,
};

export default function GuestPoolView({
  players,
  parents,
  onSaveGuest,
  onDeleteGuest,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_GUEST_FORM);
  const [saving, setSaving] = useState(false);

  const guestPlayers = useMemo(
    () => players.filter((pl) => pl.isGuest).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [players]
  );

  const sortedParents = useMemo(
    () => [...parents].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [parents]
  );

  const getGuestParent = (guest) => {
    if (guest.linkedParentId) {
      const linked = parents.find((p) => p.id === guest.linkedParentId);
      if (linked) return linked;
    }
    return parents.find((p) => p.playerId === guest.id) || null;
  };

  const openAdd = () => {
    setForm({
      ...EMPTY_GUEST_FORM,
      linkedParentId: sortedParents[0]?.id || '',
      parentMode: sortedParents.length > 0 ? 'existing' : 'new',
    });
    setFormOpen(true);
  };

  const openEdit = (guest) => {
    const parent = getGuestParent(guest);
    const isLinkedToExisting = Boolean(guest.linkedParentId);
    setForm({
      existingGuestId: guest.id,
      guestName: guest.name || '',
      guestDays: Array.isArray(guest.guestDays) ? guest.guestDays : [],
      parentMode: isLinkedToExisting ? 'existing' : 'new',
      linkedParentId: guest.linkedParentId || sortedParents[0]?.id || '',
      existingParentDocId: !isLinkedToExisting && parent ? parent.id : null,
      parentName: !isLinkedToExisting && parent ? parent.name || '' : '',
      email: !isLinkedToExisting && parent ? parent.email || parent.id || '' : '',
      phone: !isLinkedToExisting && parent ? parent.phone || '' : '',
      address: !isLinkedToExisting && parent ? parent.address || '' : '',
      canDrive: !isLinkedToExisting && parent ? parent.canDrive === true : false,
      defaultSeats: !isLinkedToExisting && parent ? parent.defaultSeats ?? 4 : 4,
    });
    setFormOpen(true);
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      guestDays: prev.guestDays.includes(day)
        ? prev.guestDays.filter((d) => d !== day)
        : [...prev.guestDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guestName.trim()) return;
    if (form.parentMode === 'new' && (!form.parentName.trim() || !form.email.trim())) return;
    if (form.parentMode === 'existing' && !form.linkedParentId) return;

    setSaving(true);
    try {
      await onSaveGuest({
        existingGuestId: form.existingGuestId,
        guestName: form.guestName.trim(),
        guestDays: form.guestDays,
        parentMode: form.parentMode,
        linkedParentId: form.parentMode === 'existing' ? form.linkedParentId : '',
        existingParentDocId: form.existingParentDocId,
        parentName: form.parentName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        canDrive: Boolean(form.canDrive),
        defaultSeats: Number(form.defaultSeats) || 4,
      });
      setFormOpen(false);
      setForm(EMPTY_GUEST_FORM);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Guest Pool
          </h2>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Ad-hoc or day-specific riders (e.g. siblings). Set recurring weekdays or add them to individual practices with <strong>+ Guest</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          + Guest
        </button>
      </div>

      {guestPlayers.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-2">
          <p className="text-sm text-slate-400">No guest riders in the pool yet.</p>
          <p className="text-[13px] text-slate-500">
            Add a sibling or guest rider here with parent contact &amp; home address so drivers see their stop in Stops.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {guestPlayers.map((guest) => {
            const parent = getGuestParent(guest);
            const days = Array.isArray(guest.guestDays) ? guest.guestDays : [];
            return (
              <div
                key={guest.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-100">{guest.name}</span>
                      <span
                        className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30"
                        title="Guest rider"
                      >
                        G
                      </span>
                      {days.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300">
                          Every {days.join(', ')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                          Manual (+ Guest) only
                        </span>
                      )}
                    </div>

                    {parent && (
                      <div className="text-[13px] text-slate-400 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-200">{parent.name}</span>
                          {parent.canDrive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300">
                              <Car className="w-3 h-3" />
                              Can drive ({parent.defaultSeats ?? 4} seats)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">
                              Rider only
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {parent.phone && (
                            <span className="inline-flex items-center gap-2">
                              <a
                                href={`tel:${parent.phone.replace(/[^\d+]/g, '')}`}
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                              >
                                <Phone className="w-3 h-3" />
                                {parent.phone}
                              </a>
                              <a
                                href={buildSmsUrl([parent.phone])}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                <MessageCircle className="w-2.5 h-2.5 text-blue-400" />
                                Text
                              </a>
                            </span>
                          )}
                          {parent.address && (
                            <a
                              href={getMapUrl(parent.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-300 hover:text-blue-300"
                            >
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {parent.address}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(guest)}
                      className="px-3 py-1.5 min-h-[34px] rounded-full text-xs font-semibold bg-slate-700/75 hover:bg-slate-700 text-slate-100 transition inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove guest "${guest.name}" from the Guest Pool?`)) {
                          onDeleteGuest(guest.id, guest.linkedParentId ? null : parent?.id);
                        }
                      }}
                      className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Remove guest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">
                {form.existingGuestId ? 'Edit Guest Rider' : 'Add Guest Rider'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Guest Rider Name
                </label>
                <input
                  type="text"
                  required
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="e.g., Maya"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Auto-Include Days (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const active = form.guestDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selected days auto-show this guest on those practice cards. Leave blank for manual <strong>+ Guest</strong> only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent / Contact
                </label>
                <div className="inline-flex p-0.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold mb-2.5">
                  {sortedParents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, parentMode: 'existing' }))}
                      className={`px-3 py-1 rounded-full transition ${
                        form.parentMode === 'existing'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Existing Parent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, parentMode: 'new' }))}
                    className={`px-3 py-1 rounded-full transition ${
                      form.parentMode === 'new'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    New Parent / Contact
                  </button>
                </div>

                {form.parentMode === 'existing' ? (
                  <select
                    value={form.linkedParentId}
                    onChange={(e) => setForm((f) => ({ ...f, linkedParentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {sortedParents.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                        {p.name} ({p.email || p.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      required
                      value={form.parentName}
                      onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                      placeholder="Parent full name"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Parent email"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone (e.g., 781-555-0123)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Home address (for Stops)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                      <input
                        type="checkbox"
                        checked={form.canDrive}
                        onChange={(e) => setForm((f) => ({ ...f, canDrive: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600"
                      />
                      <span>Enable parent to drive in carpool</span>
                    </label>
                    {form.canDrive && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Default Car Seats
                        </label>
                        <select
                          value={form.defaultSeats}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, defaultSeats: Number(e.target.value) }))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                            <option key={n} value={n} className="bg-slate-900 text-slate-100">
                              {n === 1 ? '1 seat (Solo)' : `${n} seats`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
                >
                  {saving ? 'Saving...' : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
