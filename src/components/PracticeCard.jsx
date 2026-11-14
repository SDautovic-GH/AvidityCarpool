import React, { useState } from 'react';
import { Check, MapPin, MessageCircle, MessageSquare, Pencil, Share2, Trash2 } from 'lucide-react';
import CarRow from './CarRow';
import { formatPracticeShareText } from '../utils/calendar';
import { buildSmsUrl, getMapUrl } from '../utils/maps';
import {
  formatPracticeDate,
  getGoingPlayers,
  getLegSummary,
  getPracticeNotes,
  getShortPlayerNames,
  getTimingBadge,
  getUnassignedPlayers,
} from '../utils/schedule';

const TONE_DOT = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
};

export default function PracticeCard({
  practice,
  isFirstUpcoming,
  isPast = false,
  players,
  carpoolParents = [],
  shortPlayerNames,
  currentParent,
  isAdmin,
  onToggleAttendance,
  onOpenDriveModal,
  onOpenAssignModal,
  onJoin,
  onJoinBoth,
  onLeave,
  onToggleNeedSub,
  onDropDrive,
  onTakeOver,
  onAdminRemoveRider,
  onAddNote,
  onDeleteNote,
  onUpdatePractice,
  onDeletePractice,
  onToast,
}) {
  const [activeLeg, setActiveLeg] = useState('to');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingPractice, setEditingPractice] = useState(false);
  const [practiceDraft, setPracticeDraft] = useState({
    isoDate: practice.isoDate,
    timeLabel: practice.timeLabel,
    location: practice.location,
    address: practice.address || '',
    status: practice.status || 'scheduled',
  });

  const myPlayerId = currentParent?.playerId || '';
  const myParentId = currentParent?.id || '';
  const isReadOnly = Boolean(isPast && !isAdmin);
  const isCancelled = practice.status === 'cancelled';
  const canDrive = currentParent?.canDrive !== false;
  const myPlayer = players.find((pl) => pl.id === myPlayerId);
  const shortNames = shortPlayerNames || getShortPlayerNames(players);
  const shortNameOf = (pl) => shortNames[pl?.id] || pl?.name || 'Player';

  const { month, dateNum, fullDay } = formatPracticeDate(practice.isoDate);
  const timingLabel = getTimingBadge(practice.isoDate, isFirstUpcoming);
  const goingCount = getGoingPlayers(practice, players).length;
  const isOut = myPlayerId && (practice.absentPlayerIds || []).includes(myPlayerId);

  const toSum = getLegSummary(practice, 'to', players);
  const fromSum = getLegSummary(practice, 'from', players);
  const isSatisfied = !isCancelled && toSum.tone === 'success' && fromSum.tone === 'success';

  const toSeatsCount = (practice.legs?.to || [])
    .filter((c) => c.status !== 'needs_sub')
    .reduce((s, c) => s + (c.seatsTotal || 0), 0);
  const fromSeatsCount = (practice.legs?.from || [])
    .filter((c) => c.status !== 'needs_sub')
    .reduce((s, c) => s + (c.seatsTotal || 0), 0);

  const drivesTo = (practice.legs?.to || []).some((c) => c.driverParentId === myParentId);
  const drivesFrom = (practice.legs?.from || []).some((c) => c.driverParentId === myParentId);
  const drivesBoth = drivesTo && drivesFrom;

  const driveFlagText = drivesBoth
    ? "You're driving Both Ways"
    : drivesTo
      ? "You're driving To Practice"
      : drivesFrom
        ? "You're driving From Practice"
        : null;

  const carpoolPlayerIdSet = new Set(players.map((pl) => pl.id));
  const carpoolPhones = carpoolParents
    .filter((p) => p.id !== myParentId && carpoolPlayerIdSet.has(p.playerId) && p.phone)
    .map((p) => p.phone);
  const carpoolSmsUrl = buildSmsUrl(carpoolPhones);

  const myCarDriverParentIds = new Set();
  const myCarRiderPlayerIds = new Set();
  ['to', 'from'].forEach((legKey) => {
    (practice.legs?.[legKey] || []).forEach((car) => {
      const validRiders = (car.riderIds || []).filter((id) => carpoolPlayerIdSet.has(id));
      const involved =
        (myParentId && car.driverParentId === myParentId) ||
        (myPlayerId && validRiders.includes(myPlayerId));
      if (involved) {
        if (car.driverParentId) myCarDriverParentIds.add(car.driverParentId);
        validRiders.forEach((pid) => myCarRiderPlayerIds.add(pid));
      }
    });
  });
  const myCarPhones = carpoolParents
    .filter(
      (p) =>
        p.id !== myParentId &&
        p.phone &&
        (myCarDriverParentIds.has(p.id) || myCarRiderPlayerIds.has(p.playerId))
    )
    .map((p) => p.phone);
  const myCarSmsUrl = buildSmsUrl(myCarPhones);

  async function handleShare() {
    const text = formatPracticeShareText(practice, players);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('Carpool summary copied');
    } catch {
      onToast?.('Could not copy summary');
    }
  }

  const renderLegBody = (leg, isDesktop) => {
    const cars = practice.legs?.[leg] || [];
    const unassigned = getUnassignedPlayers(practice, leg, players);
    const isDrivingThisLeg = (practice.legs?.[leg] || []).some(
      (c) => c.driverParentId === myParentId
    );
    const summary = leg === 'to' ? toSum : fromSum;
    const confirmedSeats = cars
      .filter((c) => c.status !== 'needs_sub')
      .reduce((s, c) => s + (c.seatsTotal || 0), 0);
    const needsMoreDrivers = confirmedSeats < goingCount;

    return (
      <div className="space-y-2">
        {isDesktop && (
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold tracking-tight">
                {leg === 'to' ? '→ To Practice' : '← From Practice'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <span className={`w-2 h-2 rounded-full ${TONE_DOT[summary.tone]}`} />
                {summary.text}
              </span>
            </div>
            {!isReadOnly && canDrive && !isDrivingThisLeg && needsMoreDrivers && (
              <button
                onClick={() => onOpenDriveModal(practice.id, leg)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                + I can drive
              </button>
            )}
          </div>
        )}

        <div className="divide-y divide-slate-800/80">
          {cars.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No drivers signed up yet
            </div>
          ) : (
            cars.map((car) => (
              <CarRow
                key={car.id}
                practice={practice}
                leg={leg}
                car={car}
                players={players}
                shortPlayerNames={shortNames}
                currentParent={currentParent}
                isAdmin={isAdmin}
                isReadOnly={isReadOnly}
                onJoin={onJoin}
                onJoinBoth={onJoinBoth}
                onLeave={onLeave}
                onToggleNeedSub={onToggleNeedSub}
                onDropDrive={onDropDrive}
                onTakeOver={onTakeOver}
                onAdminRemoveRider={onAdminRemoveRider}
              />
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="text-sm flex flex-wrap items-center gap-1.5">
            {unassigned.length > 0 ? (
              <>
                <span className="text-amber-400 font-medium">Still need a ride:</span>
                {isAdmin ? (
                  unassigned.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => onOpenAssignModal(practice.id, leg, pl.id)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-blue-600 text-slate-100 transition"
                    >
                      {shortNameOf(pl)} +
                    </button>
                  ))
                ) : (
                  <span className="font-medium text-slate-200">
                    {unassigned.map((pl, idx) => (
                      <React.Fragment key={pl.id}>
                        {idx > 0 && ', '}
                        {pl.id === myPlayerId ? (
                          <strong>{shortNameOf(pl)}</strong>
                        ) : (
                          shortNameOf(pl)
                        )}
                      </React.Fragment>
                    ))}
                  </span>
                )}
              </>
            ) : (
              <span className="text-emerald-400 font-medium">Everyone going has a ride</span>
            )}
          </div>

          {!isReadOnly && !isDesktop && canDrive && !isDrivingThisLeg && needsMoreDrivers && (
            <button
              onClick={() =>
                onOpenDriveModal(practice.id, !drivesTo && !drivesFrom ? 'both' : leg)
              }
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shrink-0"
            >
              + I can drive
            </button>
          )}
        </div>
      </div>
    );
  };

  const notesList = getPracticeNotes(practice);

  const adminPracticeActions = isAdmin ? (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => {
          setPracticeDraft({
            isoDate: practice.isoDate,
            timeLabel: practice.timeLabel,
            location: practice.location,
            address: practice.address || '',
            status: practice.status || 'scheduled',
          });
          setEditingPractice((v) => !v);
        }}
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        title="Edit / reschedule practice"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => {
          if (
            window.confirm(
              `Remove practice on ${fullDay}, ${month} ${dateNum}?`
            )
          ) {
            onDeletePractice?.(practice.id);
          }
        }}
        className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
        title="Remove practice"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : null;

  return (
    <div
      className={`rounded-2xl bg-slate-900 border ${
        isFirstUpcoming && !isCancelled ? 'border-blue-500/45' : 'border-slate-800'
      } p-4 space-y-3.5 min-w-0 overflow-hidden`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`relative w-11 h-11 rounded-xl ${
                isSatisfied
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : isFirstUpcoming && !isCancelled
                    ? 'bg-blue-500/15 border border-blue-500/30'
                    : 'bg-slate-950 border border-slate-800/80'
              } flex flex-col items-center justify-center shrink-0`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                  isSatisfied
                    ? 'text-emerald-400'
                    : isFirstUpcoming && !isCancelled
                      ? 'text-blue-400'
                      : 'text-slate-400'
                }`}
              >
                {month}
              </span>
              <span className="text-base font-extrabold leading-tight mt-0.5">{dateNum}</span>
              {isSatisfied && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center"
                  title="Both ways covered"
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-bold text-base leading-tight text-slate-100">
                    {fullDay}
                  </span>
                  {timingLabel && !isCancelled && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                      {timingLabel}
                    </span>
                  )}
                  {isSatisfied && (
                    <span className="text-xs font-semibold text-emerald-400">All Set</span>
                  )}
                </div>
                <div className="sm:hidden shrink-0">{adminPracticeActions}</div>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                {practice.timeLabel}
                {!isCancelled && ` • ${goingCount}/${players.length} going`}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0">
          {!isCancelled &&
            myPlayer &&
            (isReadOnly ? (
              <span
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isOut
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOut ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                />
                {shortNameOf(myPlayer)}: {isOut ? 'Out' : 'Going'}
              </span>
            ) : (
              <button
                onClick={() => onToggleAttendance(practice.id, myPlayer.id)}
                title="Tap to toggle Going / Out"
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  isOut
                    ? 'bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/25 text-rose-300'
                    : 'bg-slate-800/90 border-slate-700/80 hover:bg-slate-700 text-slate-100'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOut ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                />
                {shortNameOf(myPlayer)}: {isOut ? 'Out' : 'Going'}
              </button>
            ))}
          {!isCancelled && !isReadOnly && canDrive && !drivesBoth && (
            <button
              onClick={() => onOpenDriveModal(practice.id, 'both')}
              className="hidden md:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              + I can drive
            </button>
          )}
          <div className="hidden sm:flex">{adminPracticeActions}</div>
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300">
          Practice Cancelled
        </div>
      )}

      {editingPractice && isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdatePractice?.(practice.id, practiceDraft);
            setEditingPractice(false);
          }}
          className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="date"
              required
              value={practiceDraft.isoDate}
              onChange={(e) =>
                setPracticeDraft((d) => ({ ...d, isoDate: e.target.value }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              required
              value={practiceDraft.timeLabel}
              onChange={(e) =>
                setPracticeDraft((d) => ({ ...d, timeLabel: e.target.value }))
              }
              placeholder="7:15 – 9:15 PM"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <select
              value={practiceDraft.status}
              onChange={(e) =>
                setPracticeDraft((d) => ({ ...d, status: e.target.value }))
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={practiceDraft.location}
              onChange={(e) =>
                setPracticeDraft((d) => ({ ...d, location: e.target.value }))
              }
              placeholder="Location"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={practiceDraft.address}
              onChange={(e) =>
                setPracticeDraft((d) => ({ ...d, address: e.target.value }))
              }
              placeholder="Address"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingPractice(false)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          href={getMapUrl(practice.location, practice.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:underline"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{practice.location}</span>
          <span className="text-slate-400 font-normal">↗</span>
        </a>
        {!isCancelled && driveFlagText && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-100">
            {driveFlagText}
          </span>
        )}
      </div>

      {notesList.length > 0 && (
        <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 px-3 py-2 space-y-1.5 text-xs text-slate-300">
          {notesList.map((note) => {
            const canDelete =
              !isReadOnly && (isAdmin || (note.authorId && note.authorId === myParentId));
            return (
              <div key={note.id} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 break-words">
                    <span>{note.text}</span>
                    {note.authorName && (
                      <span className="text-slate-400"> — {note.authorName}</span>
                    )}
                  </div>
                </div>
                {canDelete && onDeleteNote && (
                  <button
                    onClick={() => onDeleteNote(practice.id, note.id)}
                    className="px-1.5 py-0.5 rounded-full text-[11px] font-bold text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
                    title="Delete note"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingNote ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteDraft.trim()) return;
            onAddNote?.(practice.id, noteDraft);
            setNoteDraft('');
            setEditingNote(false);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            maxLength={500}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note for this practice (e.g. pickup spot, early dismissal)..."
            className="w-full sm:w-auto sm:flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setEditingNote(false)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {!isReadOnly && onAddNote && (
            <button
              onClick={() => {
                setNoteDraft('');
                setEditingNote(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition"
            >
              <MessageSquare className="w-3 h-3" />
              + Note
            </button>
          )}
          {myCarSmsUrl && (
            <a
              href={myCarSmsUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition"
              title="Text parents in your car for this practice"
            >
              <MessageCircle className="w-3 h-3" />
              Text My Car
            </a>
          )}
          {carpoolSmsUrl && (
            <a
              href={carpoolSmsUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition"
              title="Text all parents in the Melrose carpool"
            >
              <MessageCircle className="w-3 h-3" />
              Text Carpool
            </a>
          )}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition"
            title="Share or copy carpool summary"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      )}

      {!isCancelled && (
        <>
          {/* Mobile: Segmented To/From tabs */}
          <div className="md:hidden space-y-2">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-950 border border-slate-800">
              <button
                onClick={() => setActiveLeg('to')}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition ${
                  activeLeg === 'to'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[toSum.tone]}`} />
                <span>→ To Practice</span>
                <span className="text-[10px] font-normal text-slate-400 tabular-nums">
                  {toSeatsCount}/{goingCount}
                </span>
              </button>
              <button
                onClick={() => setActiveLeg('from')}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition ${
                  activeLeg === 'from'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[fromSum.tone]}`} />
                <span>← From Practice</span>
                <span className="text-[10px] font-normal text-slate-400 tabular-nums">
                  {fromSeatsCount}/{goingCount}
                </span>
              </button>
            </div>
            {renderLegBody(activeLeg, false)}
          </div>

          {/* Desktop: Side-by-side To/From */}
          <div className="hidden md:grid md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl bg-slate-950/55 border border-slate-800/80 p-3.5">
              {renderLegBody('to', true)}
            </div>
            <div className="rounded-xl bg-slate-950/55 border border-slate-800/80 p-3.5">
              {renderLegBody('from', true)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
