import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatPracticeDate,
  getLegSummary,
  getPracticeCarpoolLegs,
} from '../utils/schedule';

function shortGymLabel(location = '') {
  const lower = location.toLowerCase();
  if (/st\.?\s*john/.test(lower)) return 'SJP';
  if (lower.includes('danvers indoor') || lower.startsWith('dis')) return 'DIS';
  return location;
}

function monthHeaderLabel(isoDate = '') {
  const [y, m] = isoDate.split('-').map(Number);
  if (!y || !m) return 'Other';
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function LegChip({ label, summary }) {
  if (!summary) return null;
  if (summary.tone === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 whitespace-nowrap">
        ✓ {label}
      </span>
    );
  }
  if (summary.text === 'Needs Sub') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {label}: Sub
      </span>
    );
  }
  if (summary.tone === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {label}: {summary.text}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      {label}
    </span>
  );
}

export default function PracticeQuickScan({
  practices,
  players,
  currentParent,
  isAdmin,
  todayIso,
  firstUpcomingId,
  onOpenDriveModal,
  renderExpandedCard,
}) {
  const [dayFilter, setDayFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const canDrive = currentParent?.canDrive !== false;
  const myParentId = currentParent?.id || '';

  const availableDays = useMemo(() => {
    const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const found = new Set();
    practices.forEach((p) => {
      if (!p.isoDate) return;
      const { fullDay } = formatPracticeDate(p.isoDate);
      found.add(fullDay.slice(0, 3));
    });
    return order.filter((d) => found.has(d));
  }, [practices]);

  const grouped = useMemo(() => {
    const filtered =
      dayFilter === 'all'
        ? practices
        : practices.filter((p) => formatPracticeDate(p.isoDate).fullDay.slice(0, 3) === dayFilter);

    const groups = [];
    const byKey = new Map();
    filtered.forEach((p) => {
      const ym = (p.isoDate || '').slice(0, 7) || 'other';
      if (!byKey.has(ym)) {
        const entry = { key: ym, label: monthHeaderLabel(p.isoDate), items: [] };
        byKey.set(ym, entry);
        groups.push(entry);
      }
      byKey.get(ym).items.push(p);
    });
    return groups;
  }, [practices, dayFilter]);

  return (
    <div className="space-y-3">
      {availableDays.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setDayFilter('all')}
            className={`px-2.5 py-1 min-h-[30px] rounded-full font-semibold shrink-0 transition ${
              dayFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {availableDays.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDayFilter(d)}
              className={`px-2.5 py-1 min-h-[30px] rounded-full font-semibold shrink-0 transition ${
                dayFilter === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-sm text-slate-400">
          No practices match this weekday filter.
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.key} className="space-y-1.5">
            <div className="flex items-center justify-between px-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                {group.items.length} {group.items.length === 1 ? 'practice' : 'practices'}
              </span>
            </div>

            <div className="space-y-2.5">
              {group.items.map((p) => {
                const { month, dateNum, fullDay } = formatPracticeDate(p.isoDate);
                const isPast = p.isoDate < todayIso;
                const isReadOnly = isPast && !isAdmin;
                const isCancelled = p.status === 'cancelled';
                const isNext = p.id === firstUpcomingId;
                const { toEnabled, fromEnabled } = getPracticeCarpoolLegs(p);
                const hasCarpool = toEnabled || fromEnabled;

                const toSum = toEnabled ? getLegSummary(p, 'to', players) : null;
                const fromSum = fromEnabled ? getLegSummary(p, 'from', players) : null;

                const drivesTo =
                  toEnabled && (p.legs?.to || []).some((c) => c.driverParentId === myParentId);
                const drivesFrom =
                  fromEnabled && (p.legs?.from || []).some((c) => c.driverParentId === myParentId);
                const drivesAll = hasCarpool && (!toEnabled || drivesTo) && (!fromEnabled || drivesFrom);

                const toNeedsDriver = Boolean(toSum && toSum.tone === 'error');
                const fromNeedsDriver = Boolean(fromSum && fromSum.tone === 'error');
                const needsAnyDriver = toNeedsDriver || fromNeedsDriver;

                const drivePref =
                  toNeedsDriver && !fromNeedsDriver
                    ? 'to'
                    : !toNeedsDriver && fromNeedsDriver
                      ? 'from'
                      : toEnabled && !fromEnabled
                        ? 'to'
                        : !toEnabled && fromEnabled
                          ? 'from'
                          : 'both';

                const showDriveBtn =
                  !isCancelled &&
                  !isReadOnly &&
                  hasCarpool &&
                  (canDrive || isAdmin) &&
                  (needsAnyDriver || isAdmin) &&
                  (!drivesAll || isAdmin);

                const isExpanded = expandedId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl bg-slate-900 border ${
                      isExpanded ? 'border-blue-500/45' : 'border-slate-800'
                    } overflow-hidden ${isPast ? 'opacity-70' : ''}`}
                  >
                    <div
                      className={`px-3.5 py-3.5 transition-colors ${
                        isExpanded
                          ? 'bg-blue-500/10 border-l-2 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-3">
                        {/* Row 1 on mobile (left side on desktop): Date + Time/Gym + View/Hide on mobile */}
                        <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-1">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="flex items-baseline sm:items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-1.5 shrink-0 sm:w-20">
                              <span className="text-[13px] font-bold text-slate-100 whitespace-nowrap">
                                {fullDay.slice(0, 3)}, {month} {dateNum}
                              </span>
                              {isNext && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                            <span className="text-xs text-slate-400 truncate">
                              {p.timeLabel} · {shortGymLabel(p.location)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            aria-label={isExpanded ? 'Collapse practice' : 'Expand practice'}
                            className={`sm:hidden inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-full text-xs font-semibold shrink-0 transition ${
                              isExpanded
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                                : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                            }`}
                          >
                            {isExpanded ? (
                              <>
                                <span>Hide</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>View</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>

                        {/* Row 2 on mobile (right side on desktop): Status chips + Drive + desktop View/Hide */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left"
                          >
                            {isCancelled ? (
                              <span className="text-xs font-semibold text-rose-400">Cancelled</span>
                            ) : !hasCarpool ? (
                              <span className="text-xs text-slate-400">No Carpool</span>
                            ) : (
                              <>
                                <LegChip label="To" summary={toSum} />
                                <LegChip label="From" summary={fromSum} />
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-3 shrink-0">
                            {showDriveBtn && !isExpanded && (
                              <button
                                type="button"
                                onClick={() => onOpenDriveModal(p.id, drivePref)}
                                className={`px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold transition ${
                                  needsAnyDriver
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                              >
                                {drivesAll && isAdmin ? '+ Assign' : '+ Drive'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              aria-label={isExpanded ? 'Collapse practice' : 'Expand practice'}
                              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-full text-xs font-semibold transition ${
                                isExpanded
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                                  : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60'
                              }`}
                            >
                              {isExpanded ? (
                                <>
                                  <span>Hide</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>View</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800/80 [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
                        {renderExpandedCard(p)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
