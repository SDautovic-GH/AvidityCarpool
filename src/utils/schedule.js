export const DEFAULT_FACILITIES = [
  {
    key: 'sjp',
    name: "St. John's Prep",
    address: "72 Spring St, Danvers, MA 01923",
  },
  {
    key: 'dis',
    name: 'DIS (Danvers Indoor Sports)',
    address: '150 Andover St, Danvers, MA 01923',
  },
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatPracticeDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    month: SHORT_MONTHS[m - 1],
    dateNum: String(d),
    fullDay: FULL_DAYS[dt.getDay()],
  };
}

export function getTimingBadge(isoDate, isFirstUpcoming) {
  const now = new Date();
  const toIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = toIso(now);
  const tmrw = new Date(now);
  tmrw.setDate(tmrw.getDate() + 1);
  const tmrwIso = toIso(tmrw);

  if (isoDate === todayIso) return 'Today';
  if (isoDate === tmrwIso) return 'Tomorrow';
  if (isFirstUpcoming) return 'Next';
  return null;
}

export function getGoingPlayers(practice, allPlayers) {
  const absent = practice.absentPlayerIds || [];
  return allPlayers.filter((pl) => !absent.includes(pl.id));
}

export function getUnassignedPlayers(practice, leg, allPlayers) {
  const cars = practice.legs?.[leg] || [];
  const assigned = new Set(cars.flatMap((c) => c.riderIds || []));
  return getGoingPlayers(practice, allPlayers).filter((pl) => !assigned.has(pl.id));
}

export function getLegSummary(practice, leg, allPlayers) {
  const cars = practice.legs?.[leg] || [];
  const hasSub = cars.some((c) => c.status === 'needs_sub');
  const totalSeats = cars.reduce((s, c) => s + (c.seatsTotal || 0), 0);
  const goingCount = getGoingPlayers(practice, allPlayers).length;
  const unassignedCount = getUnassignedPlayers(practice, leg, allPlayers).length;

  if (hasSub) return { text: 'Needs Sub', tone: 'warning' };
  if (cars.length === 0) return { text: 'No Drivers', tone: 'error' };
  if (totalSeats < goingCount) return { text: 'Need 1 More Car', tone: 'error' };
  if (unassignedCount > 0) return { text: `${unassignedCount} Need Ride`, tone: 'warning' };
  return { text: 'Covered', tone: 'success' };
}

/**
 * Generates Tue (7:15-9:15 PM St. John's Prep), Thu (7:15-9:15 PM St. John's Prep),
 * and Sun (5:00-7:00 PM DIS) practices between startDate and endDate (YYYY-MM-DD).
 */
export function generateSeasonPractices(startDate, endDate) {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const results = [];

  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 2=Tue, 4=Thu
    if (dow === 2 || dow === 4 || dow === 0) {
      const isoDate = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const isSunday = dow === 0;
      results.push({
        id: isoDate,
        isoDate,
        timeLabel: isSunday ? '5:00 – 7:00 PM' : '7:15 – 9:15 PM',
        location: isSunday ? 'DIS (Danvers Indoor Sports)' : "St. John's Prep",
        address: isSunday ? '150 Andover St, Danvers, MA 01923' : '72 Spring St, Danvers, MA 01923',
        status: 'scheduled',
        absentPlayerIds: [],
        legs: { to: [], from: [] },
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return results;
}

const AVATAR_PALETTE = [
  'bg-sky-500/20 text-sky-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-violet-500/20 text-violet-400',
  'bg-rose-500/20 text-rose-400',
  'bg-teal-500/20 text-teal-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-orange-500/20 text-orange-400',
];

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
