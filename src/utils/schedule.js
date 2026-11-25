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
  const totalSeats = cars
    .filter((c) => c.status !== 'needs_sub')
    .reduce((s, c) => s + (c.seatsTotal || 0), 0);
  const goingCount = getGoingPlayers(practice, allPlayers).length;
  const unassignedCount = getUnassignedPlayers(practice, leg, allPlayers).length;

  if (hasSub) return { text: 'Needs Sub', tone: 'warning' };
  if (cars.length === 0) return { text: 'Need a driver', tone: 'error' };
  if (totalSeats < goingCount) return { text: 'Need a driver', tone: 'error' };
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
  {
    name: 'Nike Wicked Good Challenge #1',
    dateLabel: 'Dec 12–13',
    sortDate: '2026-12-12',
    location: 'Rhode Island Convention Center',
    address: '1 Sabin St, Providence, RI 02903',
    notes: 'Wave: AM',
  },
  {
    name: 'The Nike Springfield Invitational - USAV National Qualifier',
    dateLabel: 'Feb 6–7',
    sortDate: '2027-02-06',
    location: 'MassMutual Center',
    address: '1277 Main St, Springfield, MA 01103',
    notes: 'Wave: TBD',
  },
  {
    name: 'Capitol Hill Volleyball Classic',
    dateLabel: 'Feb 13–15',
    sortDate: '2027-02-13',
    location: 'Walter E. Washington Convention Center',
    address: '801 Mount Vernon Pl NW, Washington, DC 20001',
    notes: 'Wave: TBD',
  },
  {
    name: 'Nike Mid-East Qualifier #2',
    dateLabel: 'Mar 12–14',
    sortDate: '2027-03-12',
    location: "America's Center Convention Complex",
    address: '701 Convention Plaza, St. Louis, MO 63101',
    notes: 'Wave: TBD',
  },
  {
    name: 'Nike Boston National Qualifier #3',
    dateLabel: 'Mar 26–28',
    sortDate: '2027-03-26',
    location: 'Boston Convention and Exhibition Center',
    address: '415 Summer St, Boston, MA 02210',
    notes: 'Wave: TBD',
  },
  {
    name: 'The Boston Open',
    dateLabel: 'Apr 10–11',
    sortDate: '2027-04-10',
    location: 'ForeKicks Marlboro',
    address: '219 Forest St, Marlborough, MA 01752',
    notes: 'Wave: AM · 16 Power',
  },
  {
    name: 'AAU Top Series Spring',
    dateLabel: 'May 1–2',
    sortDate: '2027-05-01',
    location: 'Mohegan Sun Casino',
    address: '1 Mohegan Sun Blvd, Uncasville, CT 06382',
    notes: 'Wave: AM · 16 Power/Select',
  },
  {
    name: 'North Atlantic Champs #2',
    dateLabel: 'May 8–9',
    sortDate: '2027-05-08',
    location: 'Hartford Convention Center (Connecticut Convention Center)',
    address: '100 Columbus Blvd, Hartford, CT 06103',
    notes: 'Wave: TBD',
  },
  {
    name: 'AAU Nationals 6/21-6/25 or USAV Nationals 7/2-7/5',
    dateLabel: 'Jun 21–25 / Jul 2–5 (TBD)',
    sortDate: '2027-06-21',
    location: 'AAU (Orlando, FL) or USAV (Las Vegas, NV) — TBD',
    address: 'Orlando, FL or Las Vegas, NV (TBD)',
    notes: 'Wave: TBD · Either AAU Nationals (Jun 21–25, Orlando, FL) or USAV Nationals (Jul 2–5, Las Vegas, NV)',
  },
];

export function getAvatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getShortPlayerNames(players = []) {
  const firstCounts = new Map();
  const parsed = players.map((pl) => {
    const parts = (pl.name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || pl.name || 'Player';
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
    const key = first.toLowerCase();
    firstCounts.set(key, (firstCounts.get(key) || 0) + 1);
    return { id: pl.id, first, lastInitial, key };
  });

  const result = {};
  for (const item of parsed) {
    const isDuplicate = (firstCounts.get(item.key) || 0) > 1;
    result[item.id] =
      isDuplicate && item.lastInitial ? `${item.first} ${item.lastInitial}.` : item.first;
  }
  return result;
}

export function getPracticeNotes(practice) {
  const list = Array.isArray(practice?.notesList) ? practice.notesList : [];
  if (list.length > 0) return list;
  if (practice?.notes && practice.notes.trim()) {
    return [
      {
        id: 'legacy',
        text: practice.notes.trim(),
        authorName: practice.notesAuthor || '',
        authorId: '',
      },
    ];
  }
  return [];
}

/**
 * Returns the Set of player IDs included in the carpool.
 * Explicit boolean `player.inCarpool` overrides the default Melrose address match.
 */
export function getCarpoolPlayerIdSet(players = [], parents = []) {
  const melroseIds = new Set(
    parents
      .filter((p) => (p.address || '').toLowerCase().includes('melrose'))
      .map((p) => p.playerId)
      .filter(Boolean)
  );
  const result = new Set();
  players.forEach((pl) => {
    const included = typeof pl.inCarpool === 'boolean' ? pl.inCarpool : melroseIds.has(pl.id);
    if (included) result.add(pl.id);
  });
  return result;
}

export function getPracticeCarpoolLegs(practice) {
  const mode = ['both', 'to_only', 'from_only', 'none'].includes(practice?.carpoolMode)
    ? practice.carpoolMode
    : 'both';
  return {
    mode,
    toEnabled: mode === 'both' || mode === 'to_only',
    fromEnabled: mode === 'both' || mode === 'from_only',
  };
}

export function getEffectivePlayers(practice, carpoolPlayers = []) {
  const guests = Array.isArray(practice?.guestRiders) ? practice.guestRiders : [];
  if (guests.length === 0) return carpoolPlayers;
  return [
    ...carpoolPlayers,
    ...guests.map((g) => ({
      id: g.id,
      name: g.name,
      isGuest: true,
      addedByParentId: g.addedByParentId || '',
      addedByName: g.addedByName || '',
    })),
  ];
}
