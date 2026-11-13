import React, { useState } from 'react';
import { MapPin, Pencil, Phone, Users, X } from 'lucide-react';
import { getAvatarColor, getInitials } from '../utils/schedule';
import { getMapUrl } from '../utils/maps';

export default function TeamDirectory({
  players,
  parents,
  currentParent,
  onUpdateMyProfile,
}) {
  const [editingSelf, setEditingSelf] = useState(false);
  const [phone, setPhone] = useState(currentParent?.phone || '');
  const [address, setAddress] = useState(currentParent?.address || '');
  const [defaultSeats, setDefaultSeats] = useState(currentParent?.defaultSeats ?? 4);
  const [saving, setSaving] = useState(false);

  const openEditSelf = () => {
    setPhone(currentParent?.phone || '');
    setAddress(currentParent?.address || '');
    setDefaultSeats(currentParent?.defaultSeats ?? 4);
    setEditingSelf(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateMyProfile({
        phone,
        address,
        defaultSeats: currentParent?.canDrive !== false ? defaultSeats : undefined,
      });
      setEditingSelf(false);
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
            Team Contact Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tap any phone number to call or any address for directions.
          </p>
        </div>
        {currentParent && (
          <button
            onClick={openEditSelf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit My Info
          </button>
        )}
      </div>

      <div className="space-y-3">
        {players.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
            No players in the directory yet.
          </div>
        ) : (
          players.map((player) => {
            const linkedParents = parents.filter((p) => p.playerId === player.id);

            return (
              <div
                key={player.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(
                      player.name
                    )}`}
                  >
                    {getInitials(player.name)}
                  </span>
                  <span className="text-sm font-bold text-slate-100">{player.name}</span>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {linkedParents.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No parent contacts listed.
                    </div>
                  ) : (
                    linkedParents.map((parent) => {
                      const isSelf = parent.id === currentParent?.id;
                      return (
                        <div
                          key={parent.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">
                                {parent.name}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                                  You
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              {parent.phone ? (
                                <a
                                  href={`tel:${parent.phone.replace(/[^\d+]/g, '')}`}
                                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {parent.phone}
                                </a>
                              ) : (
                                <span className="text-slate-500">No phone listed</span>
                              )}

                              {parent.address ? (
                                <a
                                  href={getMapUrl(parent.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-300 hover:text-blue-300"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{parent.address}</span>
                                </a>
                              ) : (
                                <span className="text-slate-500">No address listed</span>
                              )}
                            </div>
                          </div>

                          {isSelf && (
                            <button
                              onClick={openEditSelf}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0"
                            >
                              Update
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingSelf && currentParent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingSelf(false)}
        >
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Update My Info</h3>
              <button
                onClick={() => setEditingSelf(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Home Address (for pickup / drop-off)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Danvers, MA 01923"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {currentParent.canDrive !== false && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Default Carpool Seats
                  </label>
                  <select
                    value={defaultSeats}
                    onChange={(e) => setDefaultSeats(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 (Solo)' : `${n} seats`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSelf(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

