import React, { useState } from 'react';
import { MapPin, Pencil, Plus, Sparkles, Trash2, Trophy, X } from 'lucide-react';
import { getMapUrl } from '../utils/maps';
import { DEFAULT_2627_TOURNAMENTS } from '../utils/schedule';

const EMPTY_FORM = {
  existingId: null,
  name: '',
  dateLabel: '',
  sortDate: '',
  location: '',
  notes: '',
};

export default function TournamentsView({
  tournaments,
  isAdmin,
  onSaveTournament,
  onDeleteTournament,
  onSeedTournaments,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (t) => {
    setForm({
      existingId: t.id,
      name: t.name || '',
      dateLabel: t.dateLabel || '',
      sortDate: t.sortDate || '',
      location: t.location || '',
      notes: t.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dateLabel.trim() || !form.sortDate.trim()) return;
    setSaving(true);
    try {
      await onSaveTournament(form);
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedTournaments(DEFAULT_2627_TOURNAMENTS);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-blue-400" />
            Tournament Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tournaments.length} {tournaments.length === 1 ? 'tournament' : 'tournaments'} scheduled
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {tournaments.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {seeding ? 'Loading...' : 'Load 26/27 Tournaments'}
              </button>
            )}
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tournament
            </button>
          </div>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
          No tournaments added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => {
            const hasLocation = t.location && t.location.toUpperCase() !== 'TBD';
            const [monthPart, ...restParts] = (t.dateLabel || '').split(' ');
            const dayPart = restParts.join(' ');

            return (
              <div
                key={t.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 rounded-xl bg-slate-950 border border-slate-800 py-2 px-1.5 text-center shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      {monthPart}
                    </div>
                    <div className="text-sm font-extrabold text-slate-100 mt-0.5 leading-tight">
                      {dayPart || 'TBD'}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                      {t.name}
                    </h3>
                    {t.location && (
                      <div className="mt-0.5">
                        {hasLocation ? (
                          <a
                            href={getMapUrl(t.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.location}</span>
                            <span className="text-slate-400 font-normal">↗</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">{t.location}</span>
                        )}
                      </div>
                    )}
                    {t.notes && (
                      <p className="text-xs text-slate-400 mt-1 break-words">{t.notes}</p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                      title="Edit tournament"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove "${t.name}"?`)) {
                          onDeleteTournament(t.id);
                        }
                      }}
                      className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete tournament"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">
                {form.existingId ? 'Edit Tournament' : 'Add Tournament'}
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
                  Tournament Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Wicked Good"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date Label
                  </label>
                  <input
                    type="text"
                    required
                    value={form.dateLabel}
                    onChange={(e) => setForm((f) => ({ ...f, dateLabel: e.target.value }))}
                    placeholder="Dec 12–13"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date (for sorting)
                  </label>
                  <input
                    type="date"
                    required
                    value={form.sortDate}
                    onChange={(e) => setForm((f) => ({ ...f, sortDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Providence, RI"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Venue, hotel block, or wave time"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
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
