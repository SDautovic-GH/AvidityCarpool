import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Car, ChevronRight, MessageCircle } from 'lucide-react';
import {
  formatPracticeDate,
  getAvatarColor,
  getCarpoolPlayerIdSet,
  getInitials,
  getLegSummary,
  getPracticeCarpoolLegs,
  getShortPlayerNames,
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
  const [selectedDriverId, setSelectedDriverId] = useState(() => {
    try {
      return sessionStorage.getItem('avidity_selected_driver_id') || null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    try {
      if (selectedDriverId) {
        sessionStorage.setItem('avidity_selected_driver_id', selectedDriverId);
      } else {
        sessionStorage.removeItem('avidity_selected_driver_id');
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedDriverId]);

  const shortPlayerNames = useMemo(() => getShortPlayerNames(players), [players]);

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

  const selectedDriverDetail = useMemo(() => {
    if (!selectedDriverId) return null;
    const driverRow = rows.find((r) => r.parent.id === selectedDriverId);
    if (!driverRow) return null;

    const carpoolPlayerIds = getCarpoolPlayerIdSet(players, parents);
    const riderCounts = new Map();
    const upcomingRides = [];
    const pastRides = [];

    practices.forEach((p) => {
      if (p.status === 'cancelled') return;
      const isPast = p.isoDate < todayIso;
      const { toEnabled, fromEnabled } = getPracticeCarpoolLegs(p);
      ['to', 'from'].forEach((leg) => {
        const enabled = leg === 'to' ? toEnabled : fromEnabled;
        if (!enabled) return;
        const cars = p.legs?.[leg] || [];
        cars.forEach((car) => {
          if (car.driverParentId !== selectedDriverId) return;
          const riderIds = (car.riderIds || []).filter((id) => carpoolPlayerIds.has(id));
          if (car.status !== 'needs_sub') {
            riderIds.forEach((id) => {
              riderCounts.set(id, (riderCounts.get(id) || 0) + 1);
            });
          }
          const item = {
            key: `${p.id}-${leg}-${car.id}`,
            isoDate: p.isoDate,
            timeLabel: p.timeLabel,
            location: p.location,
            leg,
            status: car.status || 'confirmed',
            seatsTotal: car.seatsTotal || 1,
            riderNames: riderIds.map((id) => shortPlayerNames[id] || 'Player'),
          };
          if (isPast) pastRides.push(item);
          else upcomingRides.push(item);
        });
      });
    });

    pastRides.reverse();
    const ridersSummary = [...riderCounts.entries()]
      .map(([id, count]) => ({ id, name: shortPlayerNames[id] || 'Player', count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { driverRow, upcomingRides, pastRides, ridersSummary };
  }, [selectedDriverId, rows, players, parents, practices, todayIso, shortPlayerNames]);

  if (selectedDriverDetail) {
    const { driverRow, upcomingRides, pastRides, ridersSummary } = selectedDriverDetail;
    const smsUrl = driverRow.parent.phone ? buildSmsUrl([driverRow.parent.phone]) : null;

    const renderRideItem = (ride) => {
      const { month, dateNum, fullDay } = formatPracticeDate(ride.isoDate);
      const isNeedsSub = ride.status === 'needs_sub';
      return (
        <div
          key={ride.key}
          className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3.5 py-2.5 space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-slate-100">
                {fullDay.slice(0, 3)}, {month} {dateNum}
              </span>
              <span className="text-xs text-slate-400">
                {ride.timeLabel} · {ride.location}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  ride.leg === 'to'
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {ride.leg === 'to' ? '→ To Practice' : '← From Practice'}
              </span>
              {isNeedsSub && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Needs Sub
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-300">
            <span>
              {ride.riderNames.length > 0 ? (
                <>
                  <span className="text-slate-400">Riders: </span>
                  <strong className="font-medium text-slate-100">
                    {ride.riderNames.join(', ')}
                  </strong>
                </>
              ) : (
                <span className="text-slate-400 italic">No riders</span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {ride.seatsTotal === 1
                ? 'Driving solo'
                : `${ride.riderNames.length}/${ride.seatsTotal} seats`}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedDriverId(null)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Driver Engagement
        </button>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(
                  driverRow.parent.id
                )}`}
              >
                {getInitials(driverRow.parent.name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-100">{driverRow.parent.name}</h3>
                  {driverRow.playerName && (
                    <span className="text-xs text-slate-400">({driverRow.playerName})</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {driverRow.canDrive ? (
                    <span>{driverRow.defaultSeats} default seats</span>
                  ) : (
                    <span>Can&apos;t drive</span>
                  )}
                  <span>·</span>
                  <span>
                    Past: <strong className="text-slate-200">{driverRow.pastTotal}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Upcoming: <strong className="text-slate-200">{driverRow.upcomingTotal}</strong>
                  </span>
                </div>
              </div>
            </div>
            {smsUrl && (
              <a
                href={smsUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 transition shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Text
              </a>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Players Driven ({ridersSummary.length})
            </div>
            {ridersSummary.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {ridersSummary.map((rs) => (
                  <span
                    key={rs.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-200"
                  >
                    {rs.name}
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-blue-300 tabular-nums">
                      {rs.count}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No riders recorded yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Upcoming Rides ({upcomingRides.length})
          </h4>
          {upcomingRides.length > 0 ? (
            <div className="space-y-2">{upcomingRides.map(renderRideItem)}</div>
          ) : (
            <p className="text-xs text-slate-400 italic">No upcoming rides signed up.</p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Past Rides ({pastRides.length})
          </h4>
          {pastRides.length > 0 ? (
            <div className="space-y-2">{pastRides.map(renderRideItem)}</div>
          ) : (
            <p className="text-xs text-slate-400 italic">No past rides recorded.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Driver Engagement Overview
            </h3>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Legs signed up across scheduled practices (excluding cancelled and needs-sub cars).
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-full bg-slate-950 border border-slate-800 text-sm">
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
            <div className="text-xs font-medium text-slate-400">Active Drivers</div>
            <div className="text-base font-bold text-slate-100 tabular-nums mt-0.5">
              {summary.activeDrivers}
              <span className="text-xs font-medium text-slate-400"> / {summary.drivableCount}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3 py-2.5">
            <div className="text-xs font-medium text-slate-400">Legs Covered</div>
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
            <div className="text-xs font-medium text-slate-400">Open Upcoming</div>
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
          <div className="inline-flex items-center gap-1.5 text-sm">
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

          <div className="inline-flex items-center gap-1.5 text-sm">
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
                      <button
                        type="button"
                        onClick={() => setSelectedDriverId(r.parent.id)}
                        className="inline-flex items-center gap-1 text-[15px] font-semibold text-slate-100 hover:text-blue-400 transition truncate text-left"
                      >
                        <span className="truncate">{r.parent.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </button>
                      {r.playerName && (
                        <span className="text-[13px] text-slate-400">({r.playerName})</span>
                      )}
                      {!r.canDrive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          Can&apos;t drive
                        </span>
                      )}
                      {!r.inCarpool && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          Non-carpool
                        </span>
                      )}
                      {r.needsSubUpcoming > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {r.needsSubUpcoming} needs sub
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {r.canDrive && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-slate-500" />
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
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 mt-0.5"
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

              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-400">
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
