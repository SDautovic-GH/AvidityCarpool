import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, LogOut, MoreHorizontal, Plus } from 'lucide-react';
import {
  auth,
  isFirebaseConfigured,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from './firebase';
import { useCarpoolData } from './hooks/useCarpoolData';
import AuthScreen from './components/AuthScreen';
import PracticeCard from './components/PracticeCard';
import DriveModal from './components/DriveModal';
import AssignModal from './components/AssignModal';
import AdminRoster from './components/AdminRoster';
import AdminSeasonModal from './components/AdminSeasonModal';
import TournamentsView from './components/TournamentsView';
import { exportMyDrivesIcs } from './utils/calendar';
import { getLegSummary, getShortPlayerNames } from './utils/schedule';

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  const [tab, setTab] = useState('all'); // 'all' | 'my-drives' | 'tournaments' | 'roster'
  const [onlyNeedsDriver, setOnlyNeedsDriver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoomPct, setZoomPct] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('avidity_zoom_pct'));
      return saved >= 80 && saved <= 130 ? saved : 100;
    } catch {
      return 100;
    }
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomPct}%`;
    try {
      localStorage.setItem('avidity_zoom_pct', String(zoomPct));
    } catch {
      // ignore storage errors
    }
  }, [zoomPct]);
  const [showPast, setShowPast] = useState(false);
  const [driveModal, setDriveModal] = useState(null); // { practiceId, defaultDirection }
  const [assignModal, setAssignModal] = useState(null); // { practiceId, leg, playerId }
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const showToast = (msg) => {
    setToast(msg);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const {
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
    addPracticeNote,
    deletePracticeNote,
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
  } = useCarpoolData(user);

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const carpoolPlayers = useMemo(() => {
    const melrosePlayerIds = new Set(
      parents
        .filter((p) => (p.address || '').toLowerCase().includes('melrose'))
        .map((p) => p.playerId)
        .filter(Boolean)
    );
    return players.filter((pl) => melrosePlayerIds.has(pl.id));
  }, [players, parents]);

  const needsDriverCount = useMemo(
    () =>
      practices.filter((p) => {
        if (p.isoDate < todayIso || p.status === 'cancelled') return false;
        const toSum = getLegSummary(p, 'to', carpoolPlayers);
        const fromSum = getLegSummary(p, 'from', carpoolPlayers);
        return toSum.tone !== 'success' || fromSum.tone !== 'success';
      }).length,
    [practices, carpoolPlayers, todayIso]
  );

  const visiblePractices = useMemo(() => {
    const myParentId = currentParent?.id || '';
    let list = practices;

    if (!showPast) {
      list = list.filter((p) => p.isoDate >= todayIso);
    }

    if (tab === 'my-drives') {
      list = list.filter(
        (p) =>
          (p.legs?.to || []).some((c) => c.driverParentId === myParentId) ||
          (p.legs?.from || []).some((c) => c.driverParentId === myParentId)
      );
    } else if (tab === 'all' && onlyNeedsDriver) {
      list = list.filter((p) => {
        if (p.status === 'cancelled') return false;
        const toSum = getLegSummary(p, 'to', carpoolPlayers);
        const fromSum = getLegSummary(p, 'from', carpoolPlayers);
        return toSum.tone !== 'success' || fromSum.tone !== 'success';
      });
    }

    return list;
  }, [practices, showPast, tab, currentParent, todayIso, onlyNeedsDriver, carpoolPlayers]);

  const pastCount = useMemo(
    () => practices.filter((p) => p.isoDate < todayIso).length,
    [practices, todayIso]
  );

  const firstUpcomingId = useMemo(
    () => practices.find((p) => p.isoDate >= todayIso)?.id || null,
    [practices, todayIso]
  );

  const shortPlayerNames = useMemo(() => getShortPlayerNames(players), [players]);

  const runAction = async (fn, successMsg) => {
    try {
      await fn();
      if (successMsg) showToast(successMsg);
    } catch (err) {
      showToast(err?.message || 'Something went wrong');
    }
  };

  if (!isFirebaseConfigured || !authReady) {
    if (!isFirebaseConfigured) return <AuthScreen />;
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!loading && !currentParent && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-100">Access Pending</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Signed in as <strong>{user.email}</strong>, but this email isn&apos;t on the
            active team roster yet. Ask your team admin to add you, or check back once the
            roster is published.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const myPlayer = players.find((pl) => pl.id === currentParent?.playerId);
  const myPlayerShortName = myPlayer ? shortPlayerNames[myPlayer.id] || myPlayer.name : '';
  const activeDrivePractice = driveModal
    ? practices.find((p) => p.id === driveModal.practiceId)
    : null;
  const activeAssignPractice = assignModal
    ? practices.find((p) => p.id === assignModal.practiceId)
    : null;
  const activeAssignPlayer = assignModal
    ? players.find((pl) => pl.id === assignModal.playerId)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setTab('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left text-inherit cursor-pointer focus:outline-none"
          >
            <img
              src="/volleyball.svg?v=4"
              alt="Avidity Carpool"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight truncate text-slate-100">
                  {activeSeason
                    ? `${activeSeason.clubName} ${activeSeason.teamName}`
                    : 'Avidity Carpool'}
                </h1>
                {activeSeason?.label && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                    {activeSeason.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {currentParent?.name || user.email}
                {myPlayerShortName ? ` · ${myPlayerShortName}'s parent` : ''}
              </p>
            </div>
          </button>

          <div className="relative flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="inline-flex items-center rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300"
                title="App zoom"
              >
                <button
                  type="button"
                  onClick={() => setZoomPct((z) => Math.max(80, z - 10))}
                  disabled={zoomPct <= 80}
                  className="px-2 py-1.5 rounded-l-full hover:bg-slate-800 disabled:opacity-40 transition"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPct(100)}
                  className="px-1 py-1.5 tabular-nums hover:text-white transition"
                  title="Reset zoom to 100%"
                >
                  {zoomPct}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomPct((z) => Math.min(130, z + 10))}
                  disabled={zoomPct >= 130}
                  className="px-2 py-1.5 rounded-r-full hover:bg-slate-800 disabled:opacity-40 transition"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
              {seasons.length > 1 && (
                <select
                  value={activeSeasonId || ''}
                  onChange={(e) => setActiveSeasonId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.teamName} ({s.label})
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => signOut(auth)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="sm:hidden w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 transition"
              aria-label="Menu"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 sm:hidden"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="sm:hidden absolute right-0 top-10 z-50 w-52 rounded-2xl bg-slate-900 border border-slate-800 p-3 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400">Zoom</span>
                    <div className="inline-flex items-center rounded-full bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-200">
                      <button
                        type="button"
                        onClick={() => setZoomPct((z) => Math.max(80, z - 10))}
                        disabled={zoomPct <= 80}
                        className="px-2 py-1 rounded-l-full hover:bg-slate-800 disabled:opacity-40"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomPct(100)}
                        className="px-1.5 py-1 tabular-nums"
                      >
                        {zoomPct}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomPct((z) => Math.min(130, z + 10))}
                        disabled={zoomPct >= 130}
                        className="px-2 py-1 rounded-r-full hover:bg-slate-800 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {seasons.length > 1 ? (
                    <select
                      value={activeSeasonId || ''}
                      onChange={(e) => {
                        setActiveSeasonId(e.target.value);
                        setMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200"
                    >
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.teamName} ({s.label})
                        </option>
                      ))}
                    </select>
                  ) : (
                    activeSeason?.label && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400">Season</span>
                        <span className="font-semibold text-slate-200">{activeSeason.label}</span>
                      </div>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      signOut(auth);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-3">
          {(() => {
            const myParentId = currentParent?.id || '';
            const upcomingCount = practices.filter((p) => p.isoDate >= todayIso).length;
            const myDrivesCount = practices.filter(
              (p) =>
                p.isoDate >= todayIso &&
                ((p.legs?.to || []).some((c) => c.driverParentId === myParentId) ||
                  (p.legs?.from || []).some((c) => c.driverParentId === myParentId))
            ).length;
            const tabs = [
              { id: 'all', label: 'Practices', count: upcomingCount },
              { id: 'my-drives', label: 'My Drives', count: myDrivesCount },
              { id: 'tournaments', label: 'Events', count: tournaments.length },
              { id: 'roster', label: 'Team', count: 0 },
            ];
            return (
              <div className="flex-1 sm:flex-none flex items-center justify-between sm:justify-start sm:gap-6">
                {tabs.map(({ id, label, count }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-1.5 py-2.5 text-[13px] sm:text-sm whitespace-nowrap shrink-0 transition-colors ${
                      tab === id
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 font-semibold'
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                          tab === id
                            ? 'bg-slate-800 text-slate-100'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })()}

          {tab !== 'roster' && tab !== 'tournaments' && pastCount > 0 && (
            <button
              onClick={() => setShowPast((v) => !v)}
              className="mb-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0"
            >
              {showPast ? 'Hide past' : `Past (${pastCount})`}
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-3 sm:px-4 pt-5 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading carpool schedule...
          </div>
        ) : !activeSeason && isAdmin ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
            <h2 className="text-base font-bold text-slate-100">
              Welcome! Let&apos;s set up your first season.
            </h2>
            <p className="text-sm text-slate-400">
              Create your season (for example, Avidity 16 Apex · 26/27 Season) and generate
              the Tue/Thu/Sun practice schedule.
            </p>
            <button
              onClick={() => setSeasonModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <Plus className="w-4 h-4" />
              Create Season
            </button>
          </div>
        ) : tab === 'tournaments' ? (
          <TournamentsView
            tournaments={tournaments}
            isAdmin={isAdmin}
            onSaveTournament={(payload) =>
              runAction(() => saveTournament(payload), 'Tournament saved')
            }
            onDeleteTournament={(id) =>
              runAction(() => deleteTournament(id), 'Tournament removed')
            }
            onSeedTournaments={(list) =>
              runAction(
                () => batchCreateTournaments(list),
                `Added ${list.length} tournaments`
              )
            }
          />
        ) : tab === 'roster' ? (
          <AdminRoster
            players={players}
            parents={parents}
            currentParent={currentParent}
            currentParentEmail={user.email}
            isAdmin={isAdmin}
            onSavePlayerAndParent={(payload) =>
              runAction(() => savePlayerAndParent(payload), 'Roster updated')
            }
            onUpdateMyProfile={(payload) =>
              runAction(() => updateMyProfile(payload), 'Your contact info updated')
            }
            onUpdatePlayerName={(id, name, jerseyNumber) =>
              runAction(() => updatePlayerName(id, name, jerseyNumber), 'Player updated')
            }
            onUpsertPlayerOnly={(payload) =>
              runAction(() => upsertPlayerOnly(payload), 'Players imported')
            }
            onRemoveParent={(parentId) =>
              runAction(() => removeParent(parentId), 'Parent removed')
            }
            onSendResetEmail={(email) =>
              runAction(
                () => sendPasswordResetEmail(auth, email),
                `Password reset email sent to ${email}`
              )
            }
            onOpenSeasonModal={() => setSeasonModalOpen(true)}
          />
        ) : (
          <>
            {tab === 'all' && needsDriverCount > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => setOnlyNeedsDriver(false)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      !onlyNeedsDriver
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Upcoming
                  </button>
                  <button
                    onClick={() => setOnlyNeedsDriver(true)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                      onlyNeedsDriver
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Needs Driver ({needsDriverCount})
                  </button>
                </div>
              </div>
            )}

            {tab === 'my-drives' && visiblePractices.length > 0 && currentParent && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const count = exportMyDrivesIcs(
                      visiblePractices,
                      currentParent.id,
                      carpoolPlayers
                    );
                    if (count) showToast(`Exported ${count} drive${count === 1 ? '' : 's'} (.ics)`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                  Add My Drives to Calendar
                </button>
              </div>
            )}

            {visiblePractices.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  {tab === 'my-drives'
                    ? "You aren't signed up to drive for any upcoming practices yet."
                    : onlyNeedsDriver
                      ? 'All upcoming practices have drivers covered!'
                      : 'No upcoming practices scheduled.'}
                </p>
                {isAdmin && tab === 'all' && !onlyNeedsDriver && (
                  <button
                    onClick={() => setSeasonModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Generate Practices
                  </button>
                )}
              </div>
            ) : (
              visiblePractices.map((practice) => (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  isFirstUpcoming={practice.id === firstUpcomingId}
                  isPast={practice.isoDate < todayIso}
                  players={carpoolPlayers}
                  currentParent={currentParent}
                  isAdmin={isAdmin}
                  onToggleAttendance={(practiceId, playerId) =>
                    runAction(() => toggleAttendance(practiceId, playerId))
                  }
                  onOpenDriveModal={(practiceId, leg) =>
                    setDriveModal({ practiceId, defaultDirection: leg || 'both' })
                  }
                  onOpenAssignModal={(practiceId, leg, playerId) =>
                    setAssignModal({ practiceId, leg, playerId })
                  }
                  onJoin={(practiceId, leg, carId, playerId) =>
                    runAction(() => joinCar(practiceId, leg, carId, playerId))
                  }
                  onJoinBoth={(practiceId, driverParentId, playerId) =>
                    runAction(() => joinBothWays(practiceId, driverParentId, playerId))
                  }
                  onLeave={(practiceId, leg, carId, playerId) =>
                    runAction(() => leaveCar(practiceId, leg, carId, playerId))
                  }
                  onToggleNeedSub={(practiceId, leg, carId) =>
                    runAction(() => toggleNeedSub(practiceId, leg, carId))
                  }
                  onDropDrive={(practiceId, leg, carId) =>
                    runAction(() => dropDrive(practiceId, leg, carId), 'Drive removed')
                  }
                  onTakeOver={(practiceId, leg, carId) =>
                    runAction(
                      () => takeOverDrive(practiceId, leg, carId, currentParent),
                      'You took over this drive'
                    )
                  }
                  onAdminRemoveRider={(practiceId, leg, carId, playerId) =>
                    runAction(() => leaveCar(practiceId, leg, carId, playerId))
                  }
                  onAddNote={(practiceId, text) =>
                    runAction(
                      () =>
                        addPracticeNote(
                          practiceId,
                          text,
                          currentParent,
                          user?.email || ''
                        ),
                      'Note added'
                    )
                  }
                  onDeleteNote={(practiceId, noteId) =>
                    runAction(
                      () => deletePracticeNote(practiceId, noteId),
                      'Note removed'
                    )
                  }
                  onUpdatePractice={(practiceId, details) =>
                    runAction(
                      () => updatePracticeDetails(practiceId, details),
                      'Practice updated'
                    )
                  }
                  onDeletePractice={(practiceId) =>
                    runAction(() => deletePractice(practiceId), 'Practice removed')
                  }
                  onToast={showToast}
                />
              ))
            )}
          </>
        )}
      </main>

      {activeDrivePractice && currentParent && (() => {
        const targetWeekday = new Date(`${activeDrivePractice.isoDate}T12:00:00`).getDay();
        const upcomingSameWeekday = practices.filter(
          (p) =>
            p.id !== activeDrivePractice.id &&
            p.isoDate > activeDrivePractice.isoDate &&
            p.status !== 'cancelled' &&
            new Date(`${p.isoDate}T12:00:00`).getDay() === targetWeekday
        );
        return (
          <DriveModal
            practice={activeDrivePractice}
            currentParent={currentParent}
            playerName={myPlayerShortName}
            defaultDirection={driveModal.defaultDirection}
            upcomingSameWeekdayCount={upcomingSameWeekday.length}
            onClose={() => setDriveModal(null)}
            onConfirm={(practiceId, direction, seats, repeatSameWeekday) => {
              setDriveModal(null);
              if (!repeatSameWeekday) {
                runAction(
                  () => offerToDrive(practiceId, direction, seats, currentParent),
                  'Added to carpool'
                );
              } else {
                const targets = [activeDrivePractice, ...upcomingSameWeekday];
                runAction(async () => {
                  for (const p of targets) {
                    await offerToDrive(p.id, direction, seats, currentParent);
                  }
                }, `Added to ${targets.length} practices`);
              }
            }}
          />
        );
      })()}

      {activeAssignPractice && activeAssignPlayer && (
        <AssignModal
          practice={activeAssignPractice}
          leg={assignModal.leg}
          player={activeAssignPlayer}
          displayName={shortPlayerNames[activeAssignPlayer.id] || activeAssignPlayer.name}
          onClose={() => setAssignModal(null)}
          onAssign={(practiceId, leg, carId, playerId) => {
            setAssignModal(null);
            const assignedName =
              shortPlayerNames[activeAssignPlayer.id] || activeAssignPlayer.name;
            runAction(
              () => joinCar(practiceId, leg, carId, playerId),
              `${assignedName} assigned`
            );
          }}
        />
      )}

      {seasonModalOpen && isAdmin && (
        <AdminSeasonModal
          activeSeason={activeSeason}
          players={players}
          parents={parents}
          onClose={() => setSeasonModalOpen(false)}
          onCreateSeason={(payload) =>
            runAction(() => createSeason(payload), 'Season created')
          }
          onBatchCreatePractices={(list) =>
            runAction(
              () => batchCreatePractices(list),
              `Added ${list.length} practices`
            )
          }
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

