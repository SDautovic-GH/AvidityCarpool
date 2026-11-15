import React from 'react';
import { MapPin } from 'lucide-react';
import { getAvatarColor, getInitials, getShortPlayerNames } from '../utils/schedule';

export default function CarRow({
  practice,
  leg,
  car,
  players,
  shortPlayerNames,
  currentParent,
  isAdmin,
  isReadOnly = false,
  onJoin,
  onJoinBoth,
  onLeave,
  onToggleNeedSub,
  onDropDrive,
  onTakeOver,
  onUpdateCarSeats,
  onAdminRemoveRider,
  onOpenStopsModal,
}) {
  const myPlayerId = currentParent?.playerId || '';
  const myParentId = currentParent?.id || '';
  const canDrive = currentParent?.canDrive !== false;

  const isMyDrive = car.driverParentId === myParentId;
  const isDrivingThisLeg = (practice.legs?.[leg] || []).some(
    (c) => c.driverParentId === myParentId
  );
  const myKidCurrentCar = (practice.legs?.[leg] || []).find((c) =>
    (c.riderIds || []).includes(myPlayerId)
  );
  const isMyKidInCar = myPlayerId && (car.riderIds || []).includes(myPlayerId);
  const isMyKidGoing = myPlayerId && !(practice.absentPlayerIds || []).includes(myPlayerId);

  const carpoolIds = new Set(players.map((pl) => pl.id));
  const riderIds = (car.riderIds || []).filter((id) => carpoolIds.has(id));
  const openSeats = Math.max(0, (car.seatsTotal || 0) - riderIds.length);
  const isFull = openSeats === 0;
  const isNeedsSub = car.status === 'needs_sub';

  const otherLeg = leg === 'to' ? 'from' : 'to';
  const otherCar = (practice.legs?.[otherLeg] || []).find(
    (c) => c.driverParentId === car.driverParentId
  );
  const isDrivingOtherLeg = (practice.legs?.[otherLeg] || []).some(
    (c) => c.driverParentId === myParentId
  );
  const myKidInOther = otherCar && (otherCar.riderIds || []).includes(myPlayerId);

  const canRideBoth =
    !isNeedsSub &&
    !isDrivingThisLeg &&
    !isDrivingOtherLeg &&
    isMyKidGoing &&
    !myKidCurrentCar &&
    !isFull &&
    otherCar &&
    otherCar.status !== 'needs_sub' &&
    !myKidInOther &&
    (otherCar.riderIds || []).length < (otherCar.seatsTotal || 0);

  const shortNames = shortPlayerNames || getShortPlayerNames(players);
  const getPlayerName = (pid) => shortNames[pid] || 'Player';
  const otherRiders = riderIds.filter((id) => id !== myPlayerId).map(getPlayerName);

  return (
    <div
      className={
        isNeedsSub
          ? 'my-1.5 rounded-xl bg-amber-500/10 border border-amber-500/35 border-l-4 border-l-amber-400 px-3 py-3'
          : 'py-3 first:pt-2 last:pb-1'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-full ${getAvatarColor(car.driverName)} flex items-center justify-center text-xs font-bold shrink-0`}
          >
            {getInitials(car.driverName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-semibold text-sm whitespace-nowrap">{car.driverName}</span>
              {isMyDrive && (
                <span className="text-xs text-blue-400 font-medium whitespace-nowrap">• You</span>
              )}
              {isNeedsSub && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Needs Sub
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className="flex items-center gap-1"
                title={`${riderIds.length} of ${car.seatsTotal} seats taken`}
              >
                {Array.from({ length: car.seatsTotal || 0 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < riderIds.length ? 'bg-blue-500' : 'border border-slate-500'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`text-xs ${
                  isFull ? 'text-slate-400' : 'text-emerald-400 font-medium'
                }`}
              >
                {car.seatsTotal === 1 ? 'Driving solo' : isFull ? 'Full' : `${openSeats} open`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isReadOnly && !isNeedsSub && !isDrivingThisLeg && isMyKidGoing && !myKidCurrentCar && !isFull && (
            <>
              <button
                onClick={() => onJoin(practice.id, leg, car.id)}
                className="px-3.5 py-2 min-h-[36px] rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                Join
              </button>
              {canRideBoth && (
                <button
                  onClick={() => onJoinBoth(practice.id, car.driverParentId)}
                  className="px-3.5 py-2 min-h-[36px] rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 transition"
                >
                  Both Ways
                </button>
              )}
            </>
          )}

          {!isReadOnly && !isMyDrive && isNeedsSub && canDrive && currentParent && (
            <button
              onClick={() => onTakeOver(practice.id, leg, car.id)}
              className="px-3.5 py-2 min-h-[36px] rounded-full text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition"
            >
              Take Over
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 pl-10 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {isAdmin ? (
            riderIds.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No riders yet</span>
            ) : (
              riderIds.map((pid) => {
                const isMine = pid === myPlayerId;
                return (
                  <span
                    key={pid}
                    className={`inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-semibold ${
                      isMine ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    {getPlayerName(pid)}
                    <button
                      onClick={() => onAdminRemoveRider(practice.id, leg, car.id, pid)}
                      title="Remove rider"
                      className="px-1.5 py-0.5 rounded-full hover:bg-slate-700/60 hover:opacity-80 font-bold"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )
          ) : (
            <>
              {otherRiders.length > 0 ? (
                <span className="font-medium text-slate-200">{otherRiders.join(', ')}</span>
              ) : (
                !isMyKidInCar && (
                  <span className="text-xs text-slate-400 italic">No riders yet</span>
                )
              )}
              {isMyKidInCar && (
                <span className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-400">
                  {getPlayerName(myPlayerId)}
                  {!isReadOnly && !isMyDrive && (
                    <button
                      onClick={() => onLeave(practice.id, leg, car.id)}
                      title="Leave car"
                      className="px-1.5 py-0.5 rounded-full hover:bg-blue-500/20 hover:opacity-80 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              )}
            </>
          )}
        </div>

        {!isReadOnly && (isMyDrive || isAdmin) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onUpdateCarSeats && (
              <div
                className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-100"
                title="Adjust available seats for this practice"
              >
                <button
                  type="button"
                  disabled={(car.seatsTotal || 1) <= Math.max(1, riderIds.length)}
                  onClick={() =>
                    onUpdateCarSeats(practice.id, leg, car.id, (car.seatsTotal || 1) - 1)
                  }
                  className="px-2.5 py-1.5 min-h-[36px] rounded-l-full hover:bg-slate-700 disabled:opacity-40 transition"
                  aria-label="Decrease seats"
                >
                  −
                </button>
                <span className="px-1.5 tabular-nums whitespace-nowrap">
                  {car.seatsTotal || 1} {car.seatsTotal === 1 ? 'seat' : 'seats'}
                </span>
                <button
                  type="button"
                  disabled={(car.seatsTotal || 1) >= 7}
                  onClick={() =>
                    onUpdateCarSeats(practice.id, leg, car.id, (car.seatsTotal || 1) + 1)
                  }
                  className="px-2.5 py-1.5 min-h-[36px] rounded-r-full hover:bg-slate-700 disabled:opacity-40 transition"
                  aria-label="Increase seats"
                >
                  +
                </button>
              </div>
            )}
            {isMyDrive && otherRiders.length > 0 && onOpenStopsModal && (
              <button
                onClick={() => onOpenStopsModal(practice.id, leg, car.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-300 transition"
                title="View rider addresses and parent contacts"
              >
                <MapPin className="w-3.5 h-3.5" />
                Stops
              </button>
            )}
            <button
              onClick={() => onToggleNeedSub(practice.id, leg, car.id)}
              className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-medium border transition ${
                isNeedsSub
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-transparent'
              }`}
            >
              {isNeedsSub ? 'Cancel Sub' : 'Need Sub'}
            </button>
            {(isMyDrive || isAdmin) && (
              <button
                onClick={() => {
                  if (
                    !isMyDrive &&
                    !window.confirm(`Remove ${car.driverName}'s car from this leg?`)
                  ) {
                    return;
                  }
                  onDropDrive(practice.id, leg, car.id);
                }}
                className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-medium text-rose-400 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 transition"
              >
                Drop
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
