import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

export function useCarpoolData(user) {
  const [seasons, setSeasons] = useState([]);
  const [activeSeasonId, setActiveSeasonId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [parents, setParents] = useState([]);
  const [practices, setPractices] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const userEmail = user?.email?.toLowerCase().trim() || null;

  // Check if user is in top-level admins/{email}
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !userEmail) {
      setIsGlobalAdmin(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'admins', userEmail))
      .then((snap) => {
        if (!cancelled) setIsGlobalAdmin(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setIsGlobalAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // Listen to seasons
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !userEmail) {
      setSeasons([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'seasons'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSeasons(list);
        setActiveSeasonId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          const active = list.find((s) => s.status === 'active');
          return active?.id || list[0]?.id || null;
        });
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return unsub;
  }, [userEmail]);

  // Listen to players, parents, practices, tournaments for activeSeasonId
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !activeSeasonId || !userEmail) {
      setPlayers([]);
      setParents([]);
      setPractices([]);
      setTournaments([]);
      return;
    }

    const unsubPlayers = onSnapshot(
      query(collection(db, 'seasons', activeSeasonId, 'players'), orderBy('name')),
      (snap) => setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubParents = onSnapshot(
      query(collection(db, 'seasons', activeSeasonId, 'parents'), orderBy('name')),
      (snap) => setParents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubPractices = onSnapshot(
      query(collection(db, 'seasons', activeSeasonId, 'practices'), orderBy('isoDate')),
      (snap) => setPractices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubTournaments = onSnapshot(
      query(collection(db, 'seasons', activeSeasonId, 'tournaments'), orderBy('sortDate')),
      (snap) => setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubPlayers();
      unsubParents();
      unsubPractices();
      unsubTournaments();
    };
  }, [activeSeasonId, userEmail]);

  const currentParent = parents.find((p) => p.id === userEmail || p.email === userEmail) || null;
  const isAdmin = Boolean(isGlobalAdmin || currentParent?.role === 'admin');
  const activeSeason = seasons.find((s) => s.id === activeSeasonId) || null;

  // Transactional Practice Mutations
  async function updatePracticeTx(practiceId, mutator) {
    const ref = doc(db, 'seasons', activeSeasonId, 'practices', practiceId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Practice not found');
      const data = snap.data();
      const updated = mutator(structuredClone(data));
      if (updated) tx.update(ref, updated);
    });
  }

  async function toggleAttendance(practiceId, playerId) {
    await updatePracticeTx(practiceId, (p) => {
      const absent = new Set(p.absentPlayerIds || []);
      if (absent.has(playerId)) {
        absent.delete(playerId);
      } else {
        absent.add(playerId);
        ['to', 'from'].forEach((leg) => {
          (p.legs?.[leg] || []).forEach((car) => {
            car.riderIds = (car.riderIds || []).filter((id) => id !== playerId);
          });
        });
      }
      return {
        absentPlayerIds: [...absent],
        legs: p.legs || { to: [], from: [] },
      };
    });
  }

  async function offerToDrive(practiceId, direction, seatsTotal, parentDoc) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      const isGoing = !(p.absentPlayerIds || []).includes(parentDoc.playerId);

      const addLeg = (leg) => {
        const list = legs[leg] || [];
        if (list.some((c) => c.driverParentId === parentDoc.id)) return;
        if (parentDoc.playerId) {
          list.forEach((c) => {
            c.riderIds = (c.riderIds || []).filter((id) => id !== parentDoc.playerId);
          });
        }
        list.push({
          id: `car_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          driverParentId: parentDoc.id,
          driverName: parentDoc.name,
          seatsTotal,
          riderIds: isGoing && parentDoc.playerId ? [parentDoc.playerId] : [],
          status: 'confirmed',
        });
        legs[leg] = list;
      };

      if (direction === 'both' || direction === 'to') addLeg('to');
      if (direction === 'both' || direction === 'from') addLeg('from');
      return { legs };
    });
  }

  async function dropDrive(practiceId, leg, carId) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      legs[leg] = (legs[leg] || []).filter((c) => c.id !== carId);
      return { legs };
    });
  }

  async function toggleNeedSub(practiceId, leg, carId) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      const car = (legs[leg] || []).find((c) => c.id === carId);
      if (!car) return null;
      car.status = car.status === 'needs_sub' ? 'confirmed' : 'needs_sub';
      return { legs };
    });
  }

  async function takeOverDrive(practiceId, leg, carId, parentDoc) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      const car = (legs[leg] || []).find((c) => c.id === carId);
      if (!car) return null;
      car.driverParentId = parentDoc.id;
      car.driverName = parentDoc.name;
      car.seatsTotal = Math.max(parentDoc.defaultSeats || 4, (car.riderIds || []).length);
      car.status = 'confirmed';
      const isGoing = !(p.absentPlayerIds || []).includes(parentDoc.playerId);
      if (
        isGoing &&
        parentDoc.playerId &&
        !(car.riderIds || []).includes(parentDoc.playerId) &&
        car.riderIds.length < car.seatsTotal
      ) {
        (legs[leg] || []).forEach((c) => {
          c.riderIds = (c.riderIds || []).filter((id) => id !== parentDoc.playerId);
        });
        car.riderIds.push(parentDoc.playerId);
      }
      return { legs };
    });
  }

  async function joinCar(practiceId, leg, carId, playerId) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      const car = (legs[leg] || []).find((c) => c.id === carId);
      if (!car) throw new Error('Car not found');
      if ((car.riderIds || []).length >= car.seatsTotal) {
        throw new Error('This car is already full');
      }
      (legs[leg] || []).forEach((c) => {
        c.riderIds = (c.riderIds || []).filter((id) => id !== playerId);
      });
      car.riderIds = [...(car.riderIds || []), playerId];
      return { legs };
    });
  }

  async function joinBothWays(practiceId, driverParentId, playerId) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      ['to', 'from'].forEach((leg) => {
        const car = (legs[leg] || []).find((c) => c.driverParentId === driverParentId);
        if (car && car.status !== 'needs_sub' && (car.riderIds || []).length < car.seatsTotal) {
          (legs[leg] || []).forEach((c) => {
            c.riderIds = (c.riderIds || []).filter((id) => id !== playerId);
          });
          car.riderIds = [...(car.riderIds || []), playerId];
        }
      });
      return { legs };
    });
  }

  async function leaveCar(practiceId, leg, carId, playerId) {
    await updatePracticeTx(practiceId, (p) => {
      const legs = p.legs || { to: [], from: [] };
      const car = (legs[leg] || []).find((c) => c.id === carId);
      if (!car) return null;
      car.riderIds = (car.riderIds || []).filter((id) => id !== playerId);
      return { legs };
    });
  }

  async function updatePracticeNotes(practiceId, notes, authorName = '') {
    if (!activeSeasonId) return;
    const trimmed = (notes || '').trim();
    await updateDoc(doc(db, 'seasons', activeSeasonId, 'practices', practiceId), {
      notes: trimmed,
      notesAuthor: trimmed ? (authorName || '').trim() : '',
      updatedAt: serverTimestamp(),
    });
  }

  async function updatePracticeDetails(practiceId, { isoDate, timeLabel, location, address, status }) {
    if (!activeSeasonId) return;
    await updateDoc(doc(db, 'seasons', activeSeasonId, 'practices', practiceId), {
      isoDate: isoDate.trim(),
      timeLabel: timeLabel.trim(),
      location: location.trim(),
      address: (address || '').trim(),
      status: status || 'scheduled',
      updatedAt: serverTimestamp(),
    });
  }

  async function deletePractice(practiceId) {
    if (!activeSeasonId) return;
    await deleteDoc(doc(db, 'seasons', activeSeasonId, 'practices', practiceId));
  }

  // Admin: Roster & Season Actions
  async function savePlayerAndParent({
    existingParentId,
    parentName,
    email,
    phone = '',
    address = '',
    playerId,
    newPlayerName,
    defaultSeats,
    canDrive,
    role,
  }) {
    const cleanEmail = email.toLowerCase().trim();
    let finalPlayerId = playerId;

    if (!finalPlayerId && newPlayerName?.trim()) {
      const pRef = doc(collection(db, 'seasons', activeSeasonId, 'players'));
      finalPlayerId = pRef.id;
      await setDoc(pRef, {
        name: newPlayerName.trim(),
        createdAt: serverTimestamp(),
      });
    }

    if (existingParentId && existingParentId !== cleanEmail) {
      await deleteDoc(doc(db, 'seasons', activeSeasonId, 'parents', existingParentId));
    }

    const parentRef = doc(db, 'seasons', activeSeasonId, 'parents', cleanEmail);
    const parentPayload = {
      name: parentName.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      playerId: finalPlayerId || '',
      defaultSeats: Number(defaultSeats) || 4,
      canDrive: Boolean(canDrive),
      role: role === 'admin' ? 'admin' : 'parent',
    };

    if (existingParentId && existingParentId === cleanEmail) {
      await updateDoc(parentRef, parentPayload);
    } else {
      await setDoc(parentRef, {
        ...parentPayload,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function updateMyProfile({ phone = '', address = '', defaultSeats }) {
    if (!activeSeasonId || !currentParent?.id) return;
    const parentRef = doc(db, 'seasons', activeSeasonId, 'parents', currentParent.id);
    const updates = {
      phone: phone.trim(),
      address: address.trim(),
    };
    if (defaultSeats !== undefined) {
      updates.defaultSeats = Number(defaultSeats) || 4;
    }
    await updateDoc(parentRef, updates);
  }

  async function updatePlayerName(playerId, name, jerseyNumber = '') {
    await updateDoc(doc(db, 'seasons', activeSeasonId, 'players', playerId), {
      name: name.trim(),
      jerseyNumber: String(jerseyNumber || '').trim(),
    });
  }

  async function upsertPlayerOnly({ name, jerseyNumber = '' }) {
    if (!activeSeasonId) return;
    const cleanName = name.trim();
    const cleanJersey = String(jerseyNumber || '').trim();
    const lower = cleanName.toLowerCase();
    const existing = players.find((pl) => {
      const ex = (pl.name || '').trim().toLowerCase();
      return ex === lower || lower.startsWith(ex + ' ') || ex.slice(0, 4) === lower.slice(0, 4);
    });
    if (existing) {
      await updateDoc(doc(db, 'seasons', activeSeasonId, 'players', existing.id), {
        name: cleanName,
        jerseyNumber: cleanJersey,
      });
    } else {
      const pRef = doc(collection(db, 'seasons', activeSeasonId, 'players'));
      await setDoc(pRef, {
        name: cleanName,
        jerseyNumber: cleanJersey,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function removeParent(parentId) {
    await deleteDoc(doc(db, 'seasons', activeSeasonId, 'parents', parentId));
  }

  async function createSeason({
    seasonId,
    clubName,
    teamName,
    label,
    carryOverPlayerIds = [],
    sourcePlayers = [],
    sourceParents = [],
  }) {
    await setDoc(doc(db, 'seasons', seasonId), {
      clubName: clubName.trim(),
      teamName: teamName.trim(),
      label: label.trim(),
      status: 'active',
      createdAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    const idSet = new Set(carryOverPlayerIds);

    sourcePlayers
      .filter((pl) => idSet.has(pl.id))
      .forEach((pl) => {
        batch.set(doc(db, 'seasons', seasonId, 'players', pl.id), {
          name: pl.name,
          jerseyNumber: pl.jerseyNumber || '',
          createdAt: serverTimestamp(),
        });
      });

    sourceParents
      .filter((pr) => idSet.has(pr.playerId) || pr.role === 'admin')
      .forEach((pr) => {
        batch.set(doc(db, 'seasons', seasonId, 'parents', pr.id), {
          name: pr.name,
          email: pr.email,
          phone: pr.phone || '',
          address: pr.address || '',
          playerId: idSet.has(pr.playerId) ? pr.playerId : '',
          defaultSeats: pr.defaultSeats || 4,
          canDrive: pr.canDrive !== false,
          role: pr.role || 'parent',
          createdAt: serverTimestamp(),
        });
      });

    await batch.commit();
    setActiveSeasonId(seasonId);
  }

  async function batchCreatePractices(practiceList) {
    const existingIds = new Set(practices.map((p) => p.id));
    const batch = writeBatch(db);
    let added = 0;
    practiceList.forEach(({ id, ...rest }) => {
      if (existingIds.has(id)) return;
      batch.set(doc(db, 'seasons', activeSeasonId, 'practices', id), {
        ...rest,
        createdAt: serverTimestamp(),
      });
      added += 1;
    });
    if (added > 0) {
      await batch.commit();
    }
  }

  async function saveTournament({ existingId, name, dateLabel, sortDate, location, notes = '' }) {
    if (!activeSeasonId) return;
    const payload = {
      name: name.trim(),
      dateLabel: dateLabel.trim(),
      sortDate: sortDate.trim(),
      location: location.trim(),
      notes: notes.trim(),
    };
    if (existingId) {
      await updateDoc(
        doc(db, 'seasons', activeSeasonId, 'tournaments', existingId),
        payload
      );
    } else {
      const ref = doc(collection(db, 'seasons', activeSeasonId, 'tournaments'));
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function deleteTournament(tournamentId) {
    if (!activeSeasonId) return;
    await deleteDoc(doc(db, 'seasons', activeSeasonId, 'tournaments', tournamentId));
  }

  async function batchCreateTournaments(list) {
    if (!activeSeasonId) return;
    const batch = writeBatch(db);
    list.forEach((t) => {
      const ref = doc(collection(db, 'seasons', activeSeasonId, 'tournaments'));
      batch.set(ref, {
        name: t.name,
        dateLabel: t.dateLabel,
        sortDate: t.sortDate,
        location: t.location || '',
        notes: t.notes || '',
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return {
    seasons,
    activeSeason,
    activeSeasonId,
    setActiveSeasonId,
    players,
    parents,
    practices,
    tournaments,
    currentParent,
    isAdmin,
    loading,
    toggleAttendance,
    offerToDrive,
    dropDrive,
    toggleNeedSub,
    takeOverDrive,
    joinCar,
    joinBothWays,
    leaveCar,
    updatePracticeNotes,
    updatePracticeDetails,
    deletePractice,
    savePlayerAndParent,
    updateMyProfile,
    updatePlayerName,
    upsertPlayerOnly,
    removeParent,
    createSeason,
    batchCreatePractices,
    saveTournament,
    deleteTournament,
    batchCreateTournaments,
  };
}
