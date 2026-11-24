import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatPracticeDate,
  getLegSummary,
  getPracticeCarpoolLegs,
} from '../utils/schedule';

function shortGymLabel(location = '') {
  const lower = location.toLowerCase();
  if (lower.includes("st. john's prep")) return 'SJP';
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="inline-flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setDayFilter('all')}
              className={`px-2.5 py-1 min-h-[32px] rounded-full font-semibold transition ${
                dayFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Days
            </button>
            {availableDays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDayFilter(d)}
                className={`px-2.5 py-1 min-h-[32px] rounded-full font-semibold transition ${
                  dayFilter === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">Tap any row for full details</span>
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

            <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
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
                  <div key={p.id} className={isPast ? 'opacity-70' : ''}>
                    <div
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
                        isExpanded
                          ? 'bg-blue-500/10 border-l-2 border-blue-500'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <div className="w-12 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-100 leading-tight">
                              {fullDay.slice(0, 3)}
                            </span>
                            {isNext && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 leading-tight mt-0.5 tabular-nums">
                            {month} {dateNum}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
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
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {p.timeLabel} · {shortGymLabel(p.location)}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {showDriveBtn && !isExpanded && (
                          <button
                            type="button"
                            onClick={() => onOpenDriveModal(p.id, drivePref)}
                            className={`px-3 py-1.5 min-h-[34px] rounded-full text-xs font-semibold transition ${
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
                          className={
                            isExpanded
                              ? 'inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition'
                              : 'p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition'
                          }
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
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
