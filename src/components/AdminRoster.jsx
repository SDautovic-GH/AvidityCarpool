import React, { useState } from 'react';
import { Car, KeyRound, MapPin, Pencil, Phone, Plus, Shield, Trash2, UserPlus, Users, X } from 'lucide-react';
import { getAvatarColor, getInitials } from '../utils/schedule';
import { getMapUrl } from '../utils/maps';

const EMPTY_FORM = {
  existingParentId: null,
  parentName: '',
  email: '',
  phone: '',
  address: '',
  playerId: '',
  newPlayerName: '',
  defaultSeats: 4,
  canDrive: true,
  role: 'parent',
};

export default function AdminRoster({
  players,
  parents,
  currentParentEmail,
  onSavePlayerAndParent,
  onUpdatePlayerName,
  onRemoveParent,
  onSendResetEmail,
  onOpenSeasonModal,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerNameDraft, setPlayerNameDraft] = useState('');

  const openAddNewFamily = () => {
    setForm({ ...EMPTY_FORM, playerId: '__new__' });
    setFormOpen(true);
  };

  const openAddParentToPlayer = (playerId) => {
    setForm({ ...EMPTY_FORM, playerId });
    setFormOpen(true);
  };

  const openEditParent = (parent) => {
    setForm({
      existingParentId: parent.id,
      parentName: parent.name || '',
      email: parent.email || parent.id || '',
      phone: parent.phone || '',
      address: parent.address || '',
      playerId: parent.playerId || '',
      newPlayerName: '',
      defaultSeats: parent.defaultSeats ?? 4,
      canDrive: parent.canDrive !== false,
      role: parent.role || 'parent',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.parentName.trim() || !form.email.trim()) return;
    if (form.playerId === '__new__' && !form.newPlayerName.trim()) return;

    setSaving(true);
    try {
      await onSavePlayerAndParent({
        existingParentId: form.existingParentId,
        parentName: form.parentName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        playerId: form.playerId === '__new__' ? '' : form.playerId,
        newPlayerName: form.playerId === '__new__' ? form.newPlayerName.trim() : '',
        defaultSeats: Number(form.defaultSeats) || 4,
        canDrive: Boolean(form.canDrive),
        role: form.role,
      });
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlayerName = async (playerId) => {
    if (!playerNameDraft.trim()) return;
    await onUpdatePlayerName(playerId, playerNameDraft.trim());
    setEditingPlayerId(null);
  };

  const unassignedParents = parents.filter(
    (p) => !players.some((pl) => pl.id === p.playerId)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Team Roster &amp; Parents
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {players.length} {players.length === 1 ? 'player' : 'players'} · {parents.length}{' '}
            {parents.length === 1 ? 'parent' : 'parents'}. Adding families saves quietly — no
            emails are sent until you share the app link.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenSeasonModal && (
            <button
              onClick={onOpenSeasonModal}
              className="px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Season &amp; Schedule
            </button>
          )}
          <button
            onClick={openAddNewFamily}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Family / Parent
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {players.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
            No players in this season yet. Click <strong>Add Family / Parent</strong> to start
            building your roster.
          </div>
        ) : (
          players.map((player) => {
            const linkedParents = parents.filter((p) => p.playerId === player.id);
            const isEditingName = editingPlayerId === player.id;

            return (
              <div
                key={player.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(
                        player.name
                      )}`}
                    >
                      {getInitials(player.name)}
                    </span>
                    {isEditingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={playerNameDraft}
                          onChange={(e) => setPlayerNameDraft(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePlayerName(player.id)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-slate-100 truncate">
                          {player.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPlayerId(player.id);
                            setPlayerNameDraft(player.name);
                          }}
                          className="p-1 rounded-full text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                          title="Edit player name"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openAddParentToPlayer(player.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    Add Parent
                  </button>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {linkedParents.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No parents linked yet.
                    </div>
                  ) : (
                    linkedParents.map((parent) => {
                      const canDrive = parent.canDrive !== false;
                      const isSelf =
                        (parent.email || parent.id).toLowerCase() ===
                        (currentParentEmail || '').toLowerCase();

                      return (
                        <div
                          key={parent.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">
                                {parent.name}
                              </span>
                              {parent.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/60">
                                  <Shield className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              )}
                              {canDrive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
                                  <Car className="w-2.5 h-2.5" />
                                  {parent.defaultSeats ?? 4} seats
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                                  Non-driver
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {parent.email || parent.id}
                            </div>
                            {(parent.phone || parent.address) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                                {parent.phone && (
                                  <a
                                    href={`tel:${parent.phone.replace(/[^\d+]/g, '')}`}
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {parent.phone}
                                  </a>
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
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditParent(parent)}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onSendResetEmail(parent.email || parent.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                              title="Send password reset email"
                            >
                              <KeyRound className="w-3 h-3" />
                              Reset Password
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${parent.name} (${parent.email || parent.id}) from this season?`
                                    )
                                  ) {
                                    onRemoveParent(parent.id);
                                  }
                                }}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Remove parent"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}

        {unassignedParents.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-amber-800/40 p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Parents without a linked player
            </div>
            {unassignedParents.map((parent) => (
              <div
                key={parent.id}
                className="flex items-center justify-between gap-2 text-sm text-slate-200"
              >
                <span>
                  {parent.name} ({parent.email || parent.id})
                </span>
                <button
                  onClick={() => openEditParent(parent)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700"
                >
                  Link Player
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">
                {form.existingParentId ? 'Edit Parent' : 'Add Family / Parent'}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Name
                </label>
                <input
                  type="text"
                  required
                  value={form.parentName}
                  onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                  placeholder="e.g. Samir Dautovic"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Email
                </label>
                <input
                  type="email"
                  required
                  disabled={Boolean(form.existingParentId)}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="parent@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, Danvers, MA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linked Player
                </label>
                <select
                  value={form.playerId}
                  onChange={(e) => setForm((f) => ({ ...f, playerId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="__new__">+ New Player</option>
                  {players.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>

              {form.playerId === '__new__' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Player Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.newPlayerName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newPlayerName: e.target.value }))
                    }
                    placeholder="e.g. Maya"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Default Seats
                  </label>
                  <select
                    value={form.defaultSeats}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, defaultSeats: Number(e.target.value) }))
                    }
                    disabled={!form.canDrive}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 (Solo)' : `${n} seats`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canDrive}
                  onChange={(e) => setForm((f) => ({ ...f, canDrive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-xs font-medium text-slate-200">
                  Include in driving pool (uncheck to exclude from driving)
                </span>
              </label>

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
                  {saving ? 'Saving...' : form.existingParentId ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

