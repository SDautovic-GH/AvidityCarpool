import React from 'react';
import { X } from 'lucide-react';
import { formatPracticeDate, getPracticeCarpoolLegs } from '../utils/schedule';

export default function AssignModal({
  practice,
  leg,
  player,
  displayName,
  onClose,
  onAssign,
  onAssignBoth,
}) {
  if (!practice || !player) return null;

  const { fullDay, month, dateNum } = formatPracticeDate(practice.isoDate);
  const legLabel = leg === 'to' ? '→ To Practice' : '← From Practice';
  const otherLeg = leg === 'to' ? 'from' : 'to';
  const { toEnabled, fromEnabled } = getPracticeCarpoolLegs(practice);
  const bothLegsEnabled = toEnabled && fromEnabled;
  const playerHasOtherLegRide = (practice.legs?.[otherLeg] || []).some((c) =>
    (c.riderIds || []).includes(player.id)
  );
  const canOfferBoth = Boolean(onAssignBoth) && bothLegsEnabled && !playerHasOtherLegRide;

  const cars = (practice.legs?.[leg] || []).filter(
    (c) => c.status !== 'needs_sub' && (c.riderIds?.length || 0) < c.seatsTotal
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto  rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Assign {displayName || player.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {fullDay}, {month} {dateNum} · {legLabel}
            </p>
          </div>
          <button
            type="button"
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
              const otherCar = canOfferBoth
                ? (practice.legs?.[otherLeg] || []).find(
                    (c) =>
                      c.driverParentId === car.driverParentId &&
                      c.status !== 'needs_sub' &&
                      (c.riderIds?.length || 0) < c.seatsTotal
                  )
                : null;

              return (
                <div
                  key={car.id}
                  className="w-full flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100">
                      {car.driverName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {riders} / {car.seatsTotal} seats filled · {openSeats} left
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {otherCar ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAssign(practice.id, leg, car.id, player.id)}
                          className="px-3 py-1.5 min-h-[34px] rounded-full text-xs font-semibold bg-slate-700/75 hover:bg-slate-700 text-slate-100 transition"
                        >
                          {leg === 'to' ? 'To Only' : 'From Only'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAssignBoth(practice.id, car.driverParentId, player.id)}
                          className="px-3.5 py-1.5 min-h-[34px] rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                        >
                          Both Ways
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssign(practice.id, leg, car.id, player.id)}
                        className="px-3.5 py-1.5 min-h-[34px] rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                      >
                        Assign ({openSeats} left)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
