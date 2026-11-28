import React from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
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
  const drivesBothWays = Boolean(otherCar && !isNeedsSub && otherCar.status !== 'needs_sub');
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
  const isGuestId = (pid) => Boolean(players.find((p) => p.id === pid)?.isGuest);
  const getPlayerName = (pid) => {
    const pl = players.find((p) => p.id === pid);
    if (pl?.isGuest) return pl.name || 'Guest';
    return shortNames[pid] || pl?.name || 'Player';
  };
  const myGuestIds = riderIds.filter((id) => {
    const pl = players.find((p) => p.id === id);
    return Boolean(pl?.isGuest && pl.addedByParentId === myParentId);
  });
  const otherRiders = riderIds
    .filter((id) => id !== myPlayerId && !myGuestIds.includes(id))
    .map((id) => (isGuestId(id) ? `${getPlayerName(id)} (Guest)` : getPlayerName(id)));

  return (
    <div
      className={
        isNeedsSub
          ? 'my-1.5 rounded-xl bg-amber-500/10 border border-amber-500/35 border-l-4 border-l-amber-400 px-3 py-2.5'
          : 'py-2.5 first:pt-1.5 last:pb-1'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex items-start gap-2.5 min-w-0 max-w-full">
          <div
            className={`w-8 h-8 rounded-full ${getAvatarColor(car.driverName)} flex items-center justify-center text-xs font-bold shrink-0`}
          >
            {getInitials(car.driverName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-[15px] whitespace-nowrap">{car.driverName}</span>
              {isMyDrive && (
                <span className="text-[13px] text-blue-400 font-medium whitespace-nowrap">• You</span>
              )}
              {drivesBothWays && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                  ⇄ Both Ways
                </span>
              )}
              {isNeedsSub && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Needs Sub
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
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
                className={`text-[13px] ${
                  isFull ? 'text-slate-400' : 'text-emerald-400 font-medium'
                }`}
              >
                {car.seatsTotal === 1 ? 'Driving solo' : isFull ? 'Full' : `${openSeats} open`}
              </span>
              {!isReadOnly && (isMyDrive || isAdmin) && onUpdateCarSeats && (
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Adjust available seats for this practice"
                    title="Adjust available seats for this practice"
                    value={car.seatsTotal || 1}
                    onChange={(e) =>
                      onUpdateCarSeats(practice.id, leg, car.id, Number(e.target.value))
                    }
                    className="appearance-none cursor-pointer pl-2.5 pr-5 py-0.5 rounded-full text-xs font-medium bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-slate-100 focus:outline-none transition"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option
                        key={n}
                        value={n}
                        disabled={n < riderIds.length}
                        className="bg-slate-900 text-slate-100"
                      >
                        {n} {n === 1 ? 'seat' : 'seats'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>

        {((!isReadOnly && !isNeedsSub && !isDrivingThisLeg && isMyKidGoing && !myKidCurrentCar && !isFull) ||
          (!isReadOnly && !isMyDrive && isNeedsSub && canDrive && currentParent)) && (
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {!isReadOnly && !isNeedsSub && !isDrivingThisLeg && isMyKidGoing && !myKidCurrentCar && !isFull && (
              <>
                <button
                  onClick={() => onJoin(practice.id, leg, car.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition whitespace-nowrap"
                >
                  {leg === 'to' ? 'Join To' : 'Join From'}
                </button>
                {canRideBoth && (
                  <button
                    onClick={() => onJoinBoth(practice.id, car.driverParentId)}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-700/75 hover:bg-slate-700 text-slate-100 transition whitespace-nowrap"
                  >
                    Both Ways
                  </button>
                )}
              </>
            )}

            {!isReadOnly && !isMyDrive && isNeedsSub && canDrive && currentParent && (
              <button
                onClick={() => onTakeOver(practice.id, leg, car.id)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition whitespace-nowrap"
              >
                Take Over
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 sm:pl-10 flex flex-wrap items-center justify-between gap-2 text-sm min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {isAdmin ? (
            riderIds.length === 0 ? (
              <span className="text-[13px] text-slate-400 italic">No riders yet</span>
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
                    {isGuestId(pid) && (
                      <span className="px-1 rounded text-[10px] font-bold bg-violet-500/25 text-violet-300">
                        G
                      </span>
                    )}
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
                !isMyKidInCar && myGuestIds.length === 0 && (
                  <span className="text-[13px] text-slate-400 italic">No riders yet</span>
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
              {myGuestIds.map((gid) => (
                <span
                  key={gid}
                  className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-semibold bg-slate-800 text-slate-200"
                >
                  {getPlayerName(gid)}
                  <span className="px-1 rounded text-[10px] font-bold bg-violet-500/25 text-violet-300">
                    G
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => onLeave(practice.id, leg, car.id, gid)}
                      title="Remove guest from car"
                      className="px-1.5 py-0.5 rounded-full hover:bg-slate-700/60 hover:opacity-80 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </>
          )}
        </div>

        {!isReadOnly && (isMyDrive || isAdmin) && (
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {isMyDrive && otherRiders.length > 0 && onOpenStopsModal && (
              <button
                onClick={() => onOpenStopsModal(practice.id, leg, car.id)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-medium bg-slate-700/75 hover:bg-slate-700 text-blue-300 transition"
                title="View rider addresses and parent contacts"
              >
                <MapPin className="w-3.5 h-3.5" />
                Stops
              </button>
            )}
            <button
              onClick={() => onToggleNeedSub(practice.id, leg, car.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                isNeedsSub
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  : 'bg-slate-700/75 hover:bg-slate-700 text-slate-100 border-transparent'
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
                className="px-4 py-2 rounded-full text-xs font-medium text-rose-400 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 transition"
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
