export const DEFAULT_FACILITIES = [
  {
    key: 'sjp',
    name: "St. John's Prep",
    address: "72 Spring St, Danvers, MA 01923",
  },
  {
    key: 'dis',
    name: 'DIS (Danvers Indoor Sports)',
    address: '150R Andover St, Danvers, MA 01923',
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
 * Returns true for major US holidays that typically cancel youth sports practices
 * (Thanksgiving, Christmas Eve/Day, New Year's Eve/Day, Easter Sunday, July 4).
 */
export function isMajorUSHoliday(dt) {
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const dow = dt.getDay();

  if ((m === 1 && d === 1) || (m === 7 && d === 4)) return true;
  if (m === 12 && (d === 24 || d === 25 || d === 31)) return true;
  if (m === 11 && dow === 4 && d >= 22 && d <= 28) return true; // Thanksgiving

  // Easter Sunday (Gregorian algorithm)
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d1 = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d1 - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m1 = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m1 + 114) / 31);
  const easterDay = ((h + l - 7 * m1 + 114) % 31) + 1;
  if (m === easterMonth && d === easterDay) return true;

  return false;
}

/**
 * Generates Tue (7:15-9:15 PM St. John's Prep), Thu (7:15-9:15 PM St. John's Prep),
 * and Sun (5:00-7:00 PM DIS) practices between startDate and endDate (YYYY-MM-DD),
 * skipping major US holidays.
 */
export function generateSeasonPractices(startDate, endDate) {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const results = [];

  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 2=Tue, 4=Thu
    if ((dow === 2 || dow === 4 || dow === 0) && !isMajorUSHoliday(cur)) {
      const isoDate = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const isSunday = dow === 0;
      results.push({
        id: isoDate,
        isoDate,
        timeLabel: isSunday ? '5:00 – 7:00 PM' : '7:15 – 9:15 PM',
        location: isSunday ? 'DIS (Danvers Indoor Sports)' : "St. John's Prep",
        address: isSunday ? '150R Andover St, Danvers, MA 01923' : '72 Spring St, Danvers, MA 01923',
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

export const DEFAULT_2627_TOURNAMENTS = [
  { name: 'Wicked Good', dateLabel: 'Dec 12–13', sortDate: '2026-12-12', location: 'Providence, RI' },
  { name: 'NE Winterfest', dateLabel: 'Jan 16–18', sortDate: '2027-01-16', location: 'Hartford, CT' },
  { name: 'Springfield Invitational', dateLabel: 'Feb 6–7', sortDate: '2027-02-06', location: 'Springfield, MA' },
  { name: 'Capitol Hill Classic', dateLabel: 'Feb 13–15', sortDate: '2027-02-13', location: 'Washington, D.C.' },
  { name: 'Mideast Qualifier', dateLabel: 'Mar 12–14', sortDate: '2027-03-12', location: 'St. Louis, MO' },
  { name: 'Boston Qualifier', dateLabel: 'Mar 26–28', sortDate: '2027-03-26', location: 'Boston, MA' },
  { name: 'Boston Open', dateLabel: 'Apr 10–11', sortDate: '2027-04-10', location: 'Boston, MA' },
  { name: 'Top Series', dateLabel: 'May 1–2', sortDate: '2027-05-01', location: 'Mohegan Sun, CT' },
  { name: 'North Atlantic Championship', dateLabel: 'May 8–9', sortDate: '2027-05-08', location: 'Hartford, CT' },
  { name: 'USAV or AAU Nationals', dateLabel: 'June (TBD)', sortDate: '2027-06-15', location: 'TBD' },
];

export function getAvatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
