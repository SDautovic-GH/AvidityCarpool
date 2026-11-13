import React, { useMemo, useState } from 'react';
import { CalendarPlus, Sparkles, X } from 'lucide-react';
import { generateSeasonPractices } from '../utils/schedule';

function slugifySeasonId(teamName, label) {
  return `${teamName}-${label}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminSeasonModal({
  activeSeason,
  players,
  parents,
  onClose,
  onCreateSeason,
  onBatchCreatePractices,
}) {
  const [tab, setTab] = useState(activeSeason ? 'practices' : 'season');

  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState('2027-05-31');
  const [generating, setGenerating] = useState(false);

  const [clubName, setClubName] = useState(activeSeason?.clubName || 'Avidity');
  const [teamName, setTeamName] = useState(activeSeason ? '17 Apex' : '16 Apex');
  const [label, setLabel] = useState(activeSeason ? '27/28 Season' : '26/27 Season');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() =>
    players.map((p) => p.id)
  );
  const [creatingSeason, setCreatingSeason] = useState(false);

  const previewPractices = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    return generateSeasonPractices(startDate, endDate);
  }, [startDate, endDate]);

  const togglePlayer = (playerId) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleGeneratePractices = async () => {
    if (previewPractices.length === 0) return;
    setGenerating(true);
    try {
      await onBatchCreatePractices(previewPractices);
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateSeason = async (e) => {
    e.preventDefault();
    if (!clubName.trim() || !teamName.trim() || !label.trim()) return;
    const seasonId = slugifySeasonId(teamName, label) || `season-${Date.now()}`;
    setCreatingSeason(true);
    try {
      await onCreateSeason({
        seasonId,
        clubName: clubName.trim(),
        teamName: teamName.trim(),
        label: label.trim(),
        carryOverPlayerIds: selectedPlayerIds,
        sourcePlayers: players,
        sourceParents: parents,
      });
      onClose();
    } finally {
      setCreatingSeason(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100">Season &amp; Schedule</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="inline-flex p-1 rounded-full bg-slate-950 border border-slate-800">
            {activeSeason && (
              <button
                type="button"
                onClick={() => setTab('practices')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  tab === 'practices'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Generate Practices
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('season')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'season'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Season
            </button>
          </div>
        </div>

        {tab === 'practices' && activeSeason ? (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400">
              Adds Tue &amp; Thu practices at <strong>St. John&apos;s Prep</strong> (7:15–9:15 PM)
              and Sun practices at <strong>DIS</strong> (5:00–7:00 PM) to{' '}
              <strong>
                {activeSeason.clubName} {activeSeason.teamName}
              </strong>
              . Existing dates and major US holidays (Thanksgiving, Christmas Eve/Day, New
              Year&apos;s Eve/Day, Easter, July 4) are skipped.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-4 py-3 text-xs text-slate-300">
              {previewPractices.length > 0 ? (
                <>
                  Ready to add <strong>{previewPractices.length}</strong> practices (Tue / Thu /
                  Sun).
                </>
              ) : (
                <span className="text-amber-400">Select a valid date range.</span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generating || previewPractices.length === 0}
                onClick={handleGeneratePractices}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                {generating
                  ? 'Adding...'
                  : `Add ${previewPractices.length} Practices`}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSeason} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Club Name
                </label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Avidity"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="17 Apex"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Season Label
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="27/28 Season"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {players.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    Carry over returning players ({selectedPlayerIds.length}/{players.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPlayerIds(
                        selectedPlayerIds.length === players.length
                          ? []
                          : players.map((p) => p.id)
                      )
                    }
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    {selectedPlayerIds.length === players.length
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                  {players.map((pl) => (
                    <label
                      key={pl.id}
                      className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-slate-900/60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(pl.id)}
                        onChange={() => togglePlayer(pl.id)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-sm text-slate-200">{pl.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingSeason}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {creatingSeason ? 'Creating...' : 'Create Season'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

