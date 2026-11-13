import {
  formatPracticeDate,
  getGoingPlayers,
  getPracticeNotes,
  getShortPlayerNames,
  getUnassignedPlayers,
} from './schedule';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatIcsLocalDateTime(date) {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}${pad2(date.getMinutes())}00`
  );
}

function formatIcsDateOnly(isoDate) {
  return isoDate.replace(/-/g, '');
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function parseTimeRange(isoDate, timeLabel) {
  const [y, m, d] = (isoDate || '').split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, 19, 0, 0);
  const end = new Date(y, (m || 1) - 1, d || 1, 21, 0, 0);
  if (!timeLabel) return { start, end };

  const match = timeLabel.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );
  if (!match) return { start, end };

  const endMeridiem = (match[6] || match[3] || 'PM').toUpperCase();
  const startMeridiem = (match[3] || endMeridiem).toUpperCase();

  const to24 = (hStr, mer) => {
    let h = parseInt(hStr, 10);
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h;
  };

  start.setHours(to24(match[1], startMeridiem), parseInt(match[2], 10), 0, 0);
  end.setHours(to24(match[4], endMeridiem), parseInt(match[5], 10), 0, 0);
  if (end <= start) end.setHours(start.getHours() + 2);
  return { start, end };
}

function downloadIcs(filename, events) {
  if (!events.length) return;
  const stamp = formatIcsLocalDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Avidity Carpool//EN',
    'CALSCALE:GREGORIAN',
  ];

  events.forEach((ev) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@aviditycarpool.dautovic.com`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${ev.dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${ev.dtEnd}`);
    } else {
      lines.push(`DTSTART:${ev.dtStart}`);
      lines.push(`DTEND:${ev.dtEnd}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(ev.summary)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportMyDrivesIcs(practices, parentId, players) {
  const playerMap = getShortPlayerNames(players);
  const events = practices
    .map((p) => {
      const toCar = (p.legs?.to || []).find((c) => c.driverParentId === parentId);
      const fromCar = (p.legs?.from || []).find((c) => c.driverParentId === parentId);
      if (!toCar && !fromCar) return null;

      const legsLabel = toCar && fromCar ? 'Both Ways' : toCar ? 'To Practice' : 'From Practice';
      const { start, end } = parseTimeRange(p.isoDate, p.timeLabel);
      const descParts = [];
      if (toCar) {
        const riders = (toCar.riderIds || []).map((id) => playerMap[id] || 'Rider');
        descParts.push(`To Practice: ${riders.length ? riders.join(', ') : 'No riders yet'}`);
      }
      if (fromCar) {
        const riders = (fromCar.riderIds || []).map((id) => playerMap[id] || 'Rider');
        descParts.push(`From Practice: ${riders.length ? riders.join(', ') : 'No riders yet'}`);
      }
      getPracticeNotes(p).forEach((n) => {
        descParts.push(`Note: ${n.text}${n.authorName ? ` — ${n.authorName}` : ''}`);
      });

      return {
        uid: `drive-${p.id}-${parentId}`,
        dtStart: formatIcsLocalDateTime(start),
        dtEnd: formatIcsLocalDateTime(end),
        summary: `Carpool (${legsLabel}) – ${p.location || 'Practice'}`,
        location: [p.location, p.address].filter(Boolean).join(', '),
        description: descParts.join('\n'),
      };
    })
    .filter(Boolean);

  downloadIcs('avidity-my-drives.ics', events);
  return events.length;
}

export function exportTournamentIcs(tournament) {
  if (!tournament?.sortDate) return;
  const [y, m, d] = tournament.sortDate.split('-').map(Number);
  const startDate = new Date(y, (m || 1) - 1, d || 1);
  let days = 1;
  const rangeMatch = (tournament.dateLabel || '').match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (rangeMatch) {
    const diff = parseInt(rangeMatch[2], 10) - parseInt(rangeMatch[1], 10) + 1;
    if (diff > 1 && diff <= 7) days = diff;
  }
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  const toIso = (dt) =>
    `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;

  downloadIcs(`${(tournament.name || 'tournament').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, [
    {
      uid: `tournament-${tournament.id}`,
      allDay: true,
      dtStart: formatIcsDateOnly(toIso(startDate)),
      dtEnd: formatIcsDateOnly(toIso(endDate)),
      summary: tournament.name,
      location:
        tournament.location && tournament.location.toUpperCase() !== 'TBD'
          ? tournament.location
          : '',
      description: tournament.notes || '',
    },
  ]);
}

export function formatPracticeShareText(practice, players) {
  const playerMap = getShortPlayerNames(players);
  const { month, dateNum, fullDay } = formatPracticeDate(practice.isoDate);
  const goingCount = getGoingPlayers(practice, players).length;

  const formatLeg = (leg, arrow) => {
    const cars = practice.legs?.[leg] || [];
    const unassigned = getUnassignedPlayers(practice, leg, players);
    if (!cars.length) {
      return `${arrow}: No drivers yet`;
    }
    const carText = cars
      .map((c) => {
        const riders = (c.riderIds || []).map((id) => playerMap[id] || 'Rider');
        const flag = c.status === 'needs_sub' ? ' [NEEDS SUB]' : '';
        return `${c.driverName}${flag} (${riders.length ? riders.join(', ') : 'open'})`;
      })
      .join(' · ');
    const openText = unassigned.length
      ? ` | Need ride: ${unassigned.map((p) => playerMap[p.id] || p.name).join(', ')}`
      : '';
    return `${arrow}: ${carText}${openText}`;
  };

  const lines = [
    `${fullDay}, ${month} ${dateNum} · ${practice.timeLabel} @ ${practice.location} (${goingCount} going)`,
    formatLeg('to', '→ TO'),
    formatLeg('from', '← FROM'),
  ];
  getPracticeNotes(practice).forEach((n) => {
    lines.push(`Note: ${n.text}${n.authorName ? ` — ${n.authorName}` : ''}`);
  });
  return lines.join('\n');
}

