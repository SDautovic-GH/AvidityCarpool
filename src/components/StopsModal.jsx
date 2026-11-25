import React from 'react';
import { ExternalLink, MapPin, MessageCircle, Phone, X } from 'lucide-react';
import { buildSmsUrl, getMapUrl } from '../utils/maps';
import { formatPracticeDate } from '../utils/schedule';

export default function StopsModal({
  practice,
  leg,
  car,
  players,
  parents,
  shortPlayerNames,
  currentParentId,
  myPlayerId,
  onClose,
}) {
  if (!practice || !car) return null;

  const { fullDay, month, dateNum } = formatPracticeDate(practice.isoDate);
  const legLabel = leg === 'to' ? '→ To Practice (Pickups)' : '← From Practice (Dropoffs)';
  const playerMap = new Map(players.map((pl) => [pl.id, pl]));

  const riderIds = (car.riderIds || []).filter(
    (id) => id !== myPlayerId && playerMap.has(id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Rider Stops</h2>
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

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {riderIds.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No other riders in your car yet.
            </div>
          ) : (
            riderIds.map((pid) => {
              const player = playerMap.get(pid);
              const displayName = shortPlayerNames?.[pid] || player?.name || 'Player';
              const matchesRiderParent = (p) =>
                p.playerId === pid || (player?.linkedParentId && p.id === player.linkedParentId);
              const linkedParents = parents.filter(
                (p) => matchesRiderParent(p) && p.id !== currentParentId
              );
              const displayParents =
                linkedParents.length > 0
                  ? linkedParents
                  : parents.filter(matchesRiderParent);

              return (
                <div
                  key={pid}
                  className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-2"
                >
                  <div className="text-[15px] font-bold text-slate-100">{displayName}</div>
                  {displayParents.length === 0 ? (
                    <div className="text-[13px] text-slate-400 italic">
                      No parent contact on file
                    </div>
                  ) : (
                    displayParents.map((par) => {
                      const smsUrl = par.phone ? buildSmsUrl(par.phone) : '';
                      return (
                        <div key={par.id} className="space-y-1.5 text-[13px]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200">{par.name}</span>
                            {par.phone && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <a
                                  href={`tel:${par.phone}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
                                >
                                  <Phone className="w-3 h-3 text-emerald-400" />
                                  Call
                                </a>
                                {smsUrl && (
                                  <a
                                    href={smsUrl}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
                                  >
                                    <MessageCircle className="w-3 h-3 text-blue-400" />
                                    Text
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          {par.address ? (
                            <a
                              href={getMapUrl(par.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-start gap-1.5 text-blue-400 hover:text-blue-300 font-medium"
                            >
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{par.address}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                            </a>
                          ) : (
                            <div className="text-slate-500 italic">No home address on file</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })
          )}

          {practice.location && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[13px]">
              <span className="text-slate-400 font-medium">Gym</span>
              <a
                href={getMapUrl(practice.location, practice.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
              >
                <MapPin className="w-3.5 h-3.5" />
                {practice.location}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
