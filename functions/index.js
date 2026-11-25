const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const TIME_ZONE = 'America/New_York';
const APP_URL = 'https://carpool.dautovic.com/';

function getIsoDateInTimeZone(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function getTodayAndTomorrowIso() {
  const now = new Date();
  const todayIso = getIsoDateInTimeZone(now);
  const [y, m, d] = todayIso.split('-').map(Number);
  const tomorrowUtc = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const tomorrowIso = tomorrowUtc.toISOString().slice(0, 10);
  return { todayIso, tomorrowIso };
}

function formatShortPracticeDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dt);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dt);
  return `${weekday} ${month} ${d}`;
}

function getCarpoolPlayerIdSet(players, parents) {
  const regular = players.filter((pl) => !pl.isGuest);
  const explicit = regular.filter((pl) => pl.inCarpool === true);
  if (explicit.length > 0) {
    return new Set(explicit.map((pl) => pl.id));
  }
  const hasExplicitFalse = regular.some((pl) => pl.inCarpool === false);
  if (hasExplicitFalse) {
    return new Set();
  }
  // Fallback when no explicit inCarpool flags exist yet: players with a Melrose parent
  const melroseIds = new Set(
    parents
      .filter((p) => /melrose/i.test(p.address || ''))
      .map((p) => p.playerId)
      .filter(Boolean)
  );
  if (melroseIds.size > 0) return melroseIds;
  return new Set(regular.map((pl) => pl.id));
}

function getShortPlayerNames(players) {
  const firstCounts = {};
  players.forEach((p) => {
    const first = (p.name || '').trim().split(/\s+/)[0] || '';
    if (first) firstCounts[first] = (firstCounts[first] || 0) + 1;
  });
  const map = {};
  players.forEach((p) => {
    const parts = (p.name || '').trim().split(/\s+/);
    const first = parts[0] || 'Player';
    const last = parts[1] || '';
    map[p.id] = firstCounts[first] > 1 && last ? `${first} ${last[0]}.` : first;
  });
  return map;
}

function getPracticeCarpoolLegs(practice) {
  const mode = practice.carpoolMode || 'both';
  return {
    toEnabled: mode === 'both' || mode === 'to_only',
    fromEnabled: mode === 'both' || mode === 'from_only',
  };
}

async function sendToParentDocs(seasonId, parentDocs, notification, data = {}) {
  const tokenOwners = new Map(); // token -> parentDocId
  parentDocs.forEach((p) => {
    if (p.pushEnabled === false) return;
    const tokens = Array.isArray(p.fcmTokens) ? p.fcmTokens : [];
    tokens.forEach((t) => {
      if (typeof t === 'string' && t.trim()) {
        tokenOwners.set(t.trim(), p.id);
      }
    });
  });

  const tokens = [...tokenOwners.keys()];
  if (tokens.length === 0) return { sent: 0, cleaned: 0 };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification,
    data: {
      url: APP_URL,
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    },
    webpush: {
      fcmOptions: { link: APP_URL },
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      },
    },
  });

  // Clean up expired / unregistered device tokens
  const staleByParent = new Map();
  response.responses.forEach((res, idx) => {
    if (res.success) return;
    const code = res.error?.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      const badToken = tokens[idx];
      const parentId = tokenOwners.get(badToken);
      if (parentId) {
        if (!staleByParent.has(parentId)) staleByParent.set(parentId, []);
        staleByParent.get(parentId).push(badToken);
      }
    }
  });

  let cleaned = 0;
  for (const [parentId, badTokens] of staleByParent.entries()) {
    try {
      await db
        .doc(`seasons/${seasonId}/parents/${parentId}`)
        .update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens) });
      cleaned += badTokens.length;
    } catch (err) {
      logger.warn('Failed to prune stale FCM token', { seasonId, parentId, err: err.message });
    }
  }

  return { sent: response.successCount, cleaned };
}

/**
 * 1. Instant "Needs Sub" Push Alert
 * Fires when a confirmed car on an upcoming practice transitions to status === 'needs_sub'.
 * Audience: Other carpool drivers (inCarpool && canDrive && pushEnabled !== false).
 */
exports.onPracticeUpdatedNeedsSub = onDocumentUpdated(
  {
    document: 'seasons/{seasonId}/practices/{practiceId}',
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const { seasonId, practiceId } = event.params;
    if (after.status === 'cancelled') return;

    const { todayIso } = getTodayAndTomorrowIso();
    if (!after.isoDate || after.isoDate < todayIso) return;

    // Detect cars that JUST transitioned into needs_sub
    const newlyNeedsSub = [];
    for (const leg of ['to', 'from']) {
      const prevCars = Array.isArray(before.legs?.[leg]) ? before.legs[leg] : [];
      const nextCars = Array.isArray(after.legs?.[leg]) ? after.legs[leg] : [];
      const prevById = new Map(prevCars.map((c) => [c.id, c]));

      for (const car of nextCars) {
        if (car.status === 'needs_sub') {
          const prev = prevById.get(car.id);
          if (!prev || prev.status !== 'needs_sub') {
            newlyNeedsSub.push({ leg, car });
          }
        }
      }
    }

    if (newlyNeedsSub.length === 0) return;

    // Check global season setting
    const seasonSnap = await db.doc(`seasons/${seasonId}`).get();
    const season = seasonSnap.data();
    if (!season || season.status === 'archived') return;
    if (season.notifications?.needsSubEnabled === false) return;

    const [playersSnap, parentsSnap] = await Promise.all([
      db.collection(`seasons/${seasonId}/players`).get(),
      db.collection(`seasons/${seasonId}/parents`).get(),
    ]);
    const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const parents = parentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const carpoolPlayerIds = getCarpoolPlayerIdSet(players, parents);

    const dateLabel = formatShortPracticeDate(after.isoDate);

    for (const { leg, car } of newlyNeedsSub) {
      const legLabel = leg === 'to' ? 'To Practice' : 'From Practice';
      const recipients = parents.filter(
        (p) =>
          p.id !== car.driverParentId &&
          p.canDrive !== false &&
          p.pushEnabled !== false &&
          carpoolPlayerIds.has(p.playerId)
      );

      const title = `Driver Sub Needed · ${dateLabel}`;
      const body = `${car.driverName || 'A driver'} needs a sub for ${legLabel} (${after.timeLabel}, ${after.location}). Tap to take over.`;

      const result = await sendToParentDocs(
        seasonId,
        recipients,
        { title, body },
        { type: 'needs_sub', seasonId, practiceId, leg }
      );
      logger.info('Sent Needs Sub push', { seasonId, practiceId, leg, ...result });
    }
  }
);

/**
 * 2. 6:00 PM Night-Before Carpool Sweep
 * Runs daily at 6:00 PM America/New_York. Silent on days with no practice tomorrow.
 * Audience A: Confirmed drivers for tomorrow's practice (their legs & riders).
 * Audience B: Carpool drivers if tomorrow's To or From leg still needs a driver.
 */
exports.nightBeforeCarpoolSweep = onSchedule(
  {
    schedule: '0 18 * * *',
    timeZone: TIME_ZONE,
    region: 'us-central1',
  },
  async () => {
    const { tomorrowIso } = getTodayAndTomorrowIso();
    const seasonsSnap = await db.collection('seasons').where('status', '==', 'active').get();

    for (const seasonDoc of seasonsSnap.docs) {
      const seasonId = seasonDoc.id;
      const season = seasonDoc.data();
      if (season.notifications?.nightBeforeEnabled === false) continue;

      const practicesSnap = await db
        .collection(`seasons/${seasonId}/practices`)
        .where('isoDate', '==', tomorrowIso)
        .get();

      const practices = practicesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.status !== 'cancelled');

      if (practices.length === 0) continue;

      const [playersSnap, parentsSnap] = await Promise.all([
        db.collection(`seasons/${seasonId}/players`).get(),
        db.collection(`seasons/${seasonId}/parents`).get(),
      ]);
      const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const parents = parentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const parentById = new Map(parents.map((p) => [p.id, p]));
      const carpoolPlayerIds = getCarpoolPlayerIdSet(players, parents);
      const shortNames = getShortPlayerNames(players);

      const carpoolDrivers = parents.filter(
        (p) =>
          p.canDrive !== false &&
          p.pushEnabled !== false &&
          carpoolPlayerIds.has(p.playerId)
      );

      for (const practice of practices) {
        const { toEnabled, fromEnabled } = getPracticeCarpoolLegs(practice);
        if (!toEnabled && !fromEnabled) continue;

        const dateLabel = formatShortPracticeDate(practice.isoDate);
        const absentSet = new Set(Array.isArray(practice.absentPlayerIds) ? practice.absentPlayerIds : []);
        const goingCarpoolCount = [...carpoolPlayerIds].filter((pid) => !absentSet.has(pid)).length;

        // A. Remind confirmed drivers of their legs & riders
        const legsByDriver = new Map(); // driverParentId -> [{ legLabel, riderNames }]
        const uncoveredLegs = [];

        for (const [leg, enabled, legLabel] of [
          ['to', toEnabled, 'To Practice'],
          ['from', fromEnabled, 'From Practice'],
        ]) {
          if (!enabled) continue;
          const cars = Array.isArray(practice.legs?.[leg]) ? practice.legs[leg] : [];
          const confirmedCars = cars.filter((c) => c.status !== 'needs_sub');
          const confirmedSeats = confirmedCars.reduce((sum, c) => sum + (Number(c.seatsTotal) || 0), 0);

          if (goingCarpoolCount > 0 && confirmedSeats < goingCarpoolCount) {
            uncoveredLegs.push(legLabel);
          }

          for (const car of confirmedCars) {
            if (!car.driverParentId) continue;
            const riderNames = (Array.isArray(car.riderIds) ? car.riderIds : [])
              .map((pid) => shortNames[pid])
              .filter(Boolean);
            if (!legsByDriver.has(car.driverParentId)) {
              legsByDriver.set(car.driverParentId, []);
            }
            legsByDriver.get(car.driverParentId).push({ legLabel, riderNames });
          }
        }

        for (const [driverId, legEntries] of legsByDriver.entries()) {
          const driverDoc = parentById.get(driverId);
          if (!driverDoc || driverDoc.pushEnabled === false) continue;

          const summaryParts = legEntries.map(({ legLabel, riderNames }) => {
            const ridersText = riderNames.length > 0 ? riderNames.join(', ') : 'no riders yet';
            return `${legLabel}: ${ridersText}`;
          });

          const result = await sendToParentDocs(
            seasonId,
            [driverDoc],
            {
              title: `Tomorrow's Carpool · ${dateLabel}`,
              body: `You're driving (${practice.timeLabel}) — ${summaryParts.join(' · ')}. Tap for Stops.`,
            },
            { type: 'night_before_driver', seasonId, practiceId: practice.id }
          );
          logger.info('Sent night-before driver reminder', {
            seasonId,
            practiceId: practice.id,
            driverId,
            ...result,
          });
        }

        // B. Alert carpool drivers if a leg still needs coverage
        if (uncoveredLegs.length > 0) {
          const legText = uncoveredLegs.join(' & ');
          const result = await sendToParentDocs(
            seasonId,
            carpoolDrivers,
            {
              title: `Driver Needed Tomorrow · ${dateLabel}`,
              body: `${legText} (${practice.timeLabel}, ${practice.location}) still needs a driver.`,
            },
            { type: 'night_before_uncovered', seasonId, practiceId: practice.id }
          );
          logger.info('Sent night-before uncovered alert', {
            seasonId,
            practiceId: practice.id,
            uncoveredLegs,
            ...result,
          });
        }
      }
    }
  }
);
