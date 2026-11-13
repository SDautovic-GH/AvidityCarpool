import React, { useState } from 'react';
import { formatPracticeDate } from '../utils/schedule';

export default function DriveModal({ practice, currentParent, playerName, onClose, onConfirm }) {
  const drivesTo = (practice.legs?.to || []).some(
    (c) => c.driverParentId === currentParent.id
  );
  const drivesFrom = (practice.legs?.from || []).some(
    (c) => c.driverParentId === currentParent.id
  );

  const initialDir = drivesTo && !drivesFrom ? 'from' : !drivesTo && drivesFrom ? 'to' : 'both';
  const [direction, setDirection] = useState(initialDir);
  const [seats, setSeats] = useState(currentParent.defaultSeats || 4);
  const [busy, setBusy] = useState(false);

  const { month, dateNum, fullDay } = formatPracticeDate(practice.isoDate);

  const dirBtn = (val, label, disabled) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setDirection(val)}
      className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold border transition ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-slate-800'
          : direction === val
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );

  async function handleSubmit() {
    setBusy(true);
    try {
      await onConfirm(practice.id, direction, seats);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Offer to Drive</h3>
            <p className="text-xs text-slate-400">
              {fullDay}, {month} {dateNum} • {practice.timeLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Which direction?</label>
          <div className="flex gap-2">
            {dirBtn('both', 'Both Ways', drivesTo || drivesFrom)}
            {dirBtn('to', 'To Only', drivesTo)}
            {dirBtn('from', 'From Only', drivesFrom)}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-semibold">Player seats in your car</div>
            <div className="text-xs text-slate-400">
              {seats === 1
                ? `Driving solo (just ${playerName || 'your player'})`
                : `${playerName || 'Your player'} + ${seats - 1} other rider${seats - 1 === 1 ? '' : 's'}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              className="w-8 h-8 rounded-full bg-slate-800 font-bold"
            >
              -
            </button>
            <span className="font-bold text-base w-4 text-center">{seats}</span>
            <button
              type="button"
              onClick={() => setSeats((s) => Math.min(7, s + 1))}
              className="w-8 h-8 rounded-full bg-slate-800 font-bold"
            >
              +
            </button>
          </div>
        </div>

        <button
          disabled={busy}
          onClick={handleSubmit}
          className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Confirm Drive'}
        </button>
      </div>
    </div>
  );
}
