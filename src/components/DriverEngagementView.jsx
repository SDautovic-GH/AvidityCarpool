import React, { useMemo, useState } from 'react';
import { BarChart3, Car, MessageCircle } from 'lucide-react';
import {
  formatPracticeDate,
  getAvatarColor,
  getCarpoolPlayerIdSet,
  getInitials,
  getLegSummary,
  getPracticeCarpoolLegs,
} from '../utils/schedule';
import { buildSmsUrl } from '../utils/maps';

function formatShortDate(iso) {
  if (!iso) return '';
  const { month, dateNum } = formatPracticeDate(iso);
  return `${month} ${dateNum}`;
}

export default function DriverEngagementView({ players, parents, practices, todayIso }) {
  const [timeframe, setTimeframe] = useState('all'); // 'all' | 'past' | 'upcoming'
  const [scope, setScope] = useState('carpool'); // 'carpool' | 'all'
  const [sortBy, setSortBy] = useState('most'); // 'most' | 'fewest' | 'name'

  const { rows, summary } = useMemo(() => {
    const carpoolPlayerIds = getCarpoolPlayerIdSet(players, parents);
    const carpoolPlayers = players.filter((pl) => carpoolPlayerIds.has(pl.id));
    const playerById = new Map(players.map((pl) => [pl.id, pl]));

    const statsByParentId = new Map();
    const ensureParent = (parentId, fallbackName = '') => {
      if (!statsByParentId.has(parentId)) {
        statsByParentId.set(parentId, {
          toPast: 0,
          fromPast: 0,
          toUpcoming: 0,
          fromUpcoming: 0,
          datesPast: new Set(),
          datesUpcoming: new Set(),
          ridersPast: 0,
          ridersUpcoming: 0,
          needsSubUpcoming: 0,
          lastDriveIso: '',
          nextDriveIso: '',
        });
      }
      const entry = statsByParentId.get(parentId);
      if (fallbackName && !entry.fallbackName) entry.fallbackName = fallbackName;
      return entry;
    };

    parents.forEach((p) => ensureParent(p.id, p.name));

    let totalPastLegs = 0;
    let totalUpcomingLegs = 0;
    let uncoveredUpcomingLegs = 0;

    practices.forEach((p) => {
      if (p.status === 'cancelled') return;
      const isPast = p.isoDate < todayIso;
      const { toEnabled, fromEnabled } = getPracticeCarpoolLegs(p);

      ['to', 'from'].forEach((leg) => {
        const enabled = leg === 'to' ? toEnabled : fromEnabled;
        if (!enabled) return;

        if (!isPast) {
          const sum = getLegSummary(p, leg, carpoolPlayers);
          if (sum.tone !== 'success') uncoveredUpcomingLegs += 1;
        }

        const cars = p.legs?.[leg] || [];
        cars.forEach((car) => {
          if (!car.driverParentId) return;
          const st = ensureParent(car.driverParentId, car.driverName);
          if (car.status === 'needs_sub') {
            if (!isPast) st.needsSubUpcoming += 1;
            return;
          }

          const riderCount = (car.riderIds || []).length;
          if (isPast) {
            totalPastLegs += 1;
            if (leg === 'to') st.toPast += 1;
            else st.fromPast += 1;
            st.datesPast.add(p.isoDate);
            st.ridersPast += riderCount;
            if (!st.lastDriveIso || p.isoDate > st.lastDriveIso) st.lastDriveIso = p.isoDate;
          } else {
            totalUpcomingLegs += 1;
            if (leg === 'to') st.toUpcoming += 1;
            else st.fromUpcoming += 1;
            st.datesUpcoming.add(p.isoDate);
            st.ridersUpcoming += riderCount;
            if (!st.nextDriveIso || p.isoDate < st.nextDriveIso) st.nextDriveIso = p.isoDate;
          }
        });
      });
    });

    const builtRows = parents.map((p) => {
      const st = ensureParent(p.id, p.name);
      const player = playerById.get(p.playerId);
      const inCarpool = Boolean(p.playerId && carpoolPlayerIds.has(p.playerId));

      const toCount =
        timeframe === 'past'
          ? st.toPast
          : timeframe === 'upcoming'
            ? st.toUpcoming
            : st.toPast + st.toUpcoming;
      const fromCount =
        timeframe === 'past'
          ? st.fromPast
          : timeframe === 'upcoming'
            ? st.fromUpcoming
            : st.fromPast + st.fromUpcoming;
      const legsCount = toCount + fromCount;

      const practiceDates =
        timeframe === 'past'
          ? st.datesPast.size
          : timeframe === 'upcoming'
            ? st.datesUpcoming.size
            : new Set([...st.datesPast, ...st.datesUpcoming]).size;

      const ridersCarried =
        timeframe === 'past'
          ? st.ridersPast
          : timeframe === 'upcoming'
            ? st.ridersUpcoming
            : st.ridersPast + st.ridersUpcoming;

      return {
        parent: p,
        playerName: player?.name || '',
        inCarpool,
        canDrive: p.canDrive !== false,
        defaultSeats: p.defaultSeats ?? 4,
        toCount,
        fromCount,
        legsCount,
        practiceDates,
        ridersCarried,
        pastTotal: st.toPast + st.fromPast,
        upcomingTotal: st.toUpcoming + st.fromUpcoming,
        needsSubUpcoming: st.needsSubUpcoming,
        lastDriveIso: st.lastDriveIso,
        nextDriveIso: st.nextDriveIso,
      };
    });

    const filtered = builtRows.filter((r) => {
      if (scope === 'all') return true;
      return r.inCarpool || r.pastTotal + r.upcomingTotal > 0;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.parent.name || '').localeCompare(b.parent.name || '');
      if (sortBy === 'fewest') {
        if (a.legsCount !== b.legsCount) return a.legsCount - b.legsCount;
        return (a.parent.name || '').localeCompare(b.parent.name || '');
      }
      if (b.legsCount !== a.legsCount) return b.legsCount - a.legsCount;
      return (a.parent.name || '').localeCompare(b.parent.name || '');
    });

    const drivablePool = filtered.filter((r) => r.canDrive);
    const activeDrivers = drivablePool.filter((r) => r.legsCount > 0).length;

    return {
      rows: filtered,
      summary: {
        activeDrivers,
        drivableCount: drivablePool.length,
        totalPastLegs,
        totalUpcomingLegs,
        totalLegs:
          timeframe === 'past'
            ? totalPastLegs
            : timeframe === 'upcoming'
              ? totalUpcomingLegs
              : totalPastLegs + totalUpcomingLegs,
        uncoveredUpcomingLegs,
      },
    };
  }, [players, parents, practices, todayIso, timeframe, scope, sortBy]);

  const maxLegs = Math.max(1, ...rows.map((r) => r.legsCount));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Driver Engagement Overview
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Legs signed up across scheduled practices (excluding cancelled and needs-sub cars).
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-full bg-slate-950 border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'All Season' },
              { id: 'past', label: 'Past' },
              { id: 'upcoming', label: 'Upcoming' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1 rounded-full font-semibold transition ${
                  timeframe === opt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3 py-2.5">
            <div className="text-[11px] font-medium text-slate-400">Active Drivers</div>
            <div className="text-base font-bold text-slate-100 tabular-nums mt-0.5">
              {summary.activeDrivers}
              <span className="text-xs font-medium text-slate-400"> / {summary.drivableCount}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3 py-2.5">
            <div className="text-[11px] font-medium text-slate-400">Legs Covered</div>
            <div className="text-base font-bold text-slate-100 tabular-nums mt-0.5">
              {summary.totalLegs}
              {timeframe === 'all' && (
                <span className="text-[11px] font-normal text-slate-400 ml-1">
                  ({summary.totalPastLegs}p · {summary.totalUpcomingLegs}u)
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3 py-2.5">
            <div className="text-[11px] font-medium text-slate-400">Open Upcoming</div>
            <div
              className={`text-base font-bold tabular-nums mt-0.5 ${
                summary.uncoveredUpcomingLegs > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {summary.uncoveredUpcomingLegs}{' '}
              <span className="text-xs font-medium text-slate-400">legs</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScope('carpool')}
              className={`px-2.5 py-1 rounded-full font-semibold transition ${
                scope === 'carpool'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Carpool Parents
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-full font-semibold transition ${
                scope === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Roster
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Sort:</span>
            {[
              { id: 'most', label: 'Most' },
              { id: 'fewest', label: 'Fewest' },
              { id: 'name', label: 'Name' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                className={`px-2.5 py-1 rounded-full font-semibold transition ${
                  sortBy === s.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => {
          const smsUrl = r.parent.phone ? buildSmsUrl([r.parent.phone]) : null;
          const pct = Math.round((r.legsCount / maxLegs) * 100);
          return (
            <div
              key={r.parent.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
                      r.parent.id
                    )}`}
                  >
                    {getInitials(r.parent.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {r.parent.name}
                      </span>
                      {r.playerName && (
                        <span className="text-xs text-slate-400">({r.playerName})</span>
                      )}
                      {!r.canDrive && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                          Can&apos;t drive
                        </span>
                      )}
                      {!r.inCarpool && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                          Non-carpool
                        </span>
                      )}
                      {r.needsSubUpcoming > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {r.needsSubUpcoming} needs sub
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {r.canDrive && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="w-3 h-3 text-slate-500" />
                          {r.defaultSeats} default seats
                        </span>
                      )}
                      {r.legsCount > 0 && (
                        <span>
                          {r.toCount} to · {r.fromCount} from · {r.practiceDates}{' '}
                          {r.practiceDates === 1 ? 'practice' : 'practices'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-slate-100 tabular-nums leading-tight">
                    {r.legsCount}{' '}
                    <span className="text-xs font-medium text-slate-400">
                      {r.legsCount === 1 ? 'leg' : 'legs'}
                    </span>
                  </div>
                  {smsUrl && (
                    <a
                      href={smsUrl}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 mt-0.5"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Text
                    </a>
                  )}
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    r.legsCount > 0 ? 'bg-blue-500' : 'bg-transparent'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Past: <strong className="text-slate-200">{r.pastTotal}</strong> · Upcoming:{' '}
                  <strong className="text-slate-200">{r.upcomingTotal}</strong> · Riders carried:{' '}
                  <strong className="text-slate-200">{r.ridersCarried}</strong>
                </span>
                <span>
                  {r.lastDriveIso ? `Last: ${formatShortDate(r.lastDriveIso)}` : 'No past drives'}
                  {r.nextDriveIso ? ` · Next: ${formatShortDate(r.nextDriveIso)}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
