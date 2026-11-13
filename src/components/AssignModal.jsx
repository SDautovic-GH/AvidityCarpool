import React from 'react';
import { X } from 'lucide-react';
import { formatPracticeDate } from '../utils/schedule';

export default function AssignModal({
  practice,
  leg,
  player,
  onClose,
  onAssign,
}) {
  if (!practice || !player) return null;

  const { fullDay, month, dateNum } = formatPracticeDate(practice.isoDate);
  const legLabel = leg === 'to' ? '→ To Practice' : '← From Practice';
  const cars = (practice.legs?.[leg] || []).filter(
    (c) => c.status !== 'needs_sub' && (c.riderIds?.length || 0) < c.seatsTotal
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Assign {player.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {fullDay}, {month} {dateNum} · {legLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {cars.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No confirmed cars with open seats on this leg.
            </div>
          ) : (
            cars.map((car) => {
              const riders = car.riderIds?.length || 0;
              const openSeats = car.seatsTotal - riders;
              return (
                <button
                  key={car.id}
                  onClick={() => onAssign(practice.id, leg, car.id, player.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-800/70 transition text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {car.driverName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {riders} / {car.seatsTotal} seats filled
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                    Assign ({openSeats} left)
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
