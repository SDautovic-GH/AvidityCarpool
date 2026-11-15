import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronDown, LogOut, MoreHorizontal, Plus } from 'lucide-react';
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
import StopsModal from './components/StopsModal';
import AdminRoster from './components/AdminRoster';
import AdminSeasonModal from './components/AdminSeasonModal';
import TournamentsView from './components/TournamentsView';
import { exportMyDrivesIcs } from './utils/calendar';
import {
  doesPlayerNeedRide,
  getCarpoolPlayerIdSet,
  getLegSummary,
  getShortPlayerNames,
} from './utils/schedule';

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  const [tab, setTab] = useState('all'); // 'all' | 'my-drives' | 'tournaments' | 'roster'
  const [onlyNeedsDriver, setOnlyNeedsDriver] = useState(false);
  const [onlyMyNeedsRide, setOnlyMyNeedsRide] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all');
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
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
  const [driveModal, setDriveModal] = useState(null); // { practiceId, defaultDirection }
  const [assignModal, setAssignModal] = useState(null); // { practiceId, leg, playerId }
  const [stopsModal, setStopsModal] = useState(null); // { practiceId, leg, carId }
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
    togglePlayerCarpool,
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
    const carpoolPlayerIds = getCarpoolPlayerIdSet(players, parents);
    return players.filter((pl) => carpoolPlayerIds.has(pl.id));
  }, [players, parents]);

  const carpoolParents = useMemo(() => {
    const ids = new Set(carpoolPlayers.map((pl) => pl.id));
    return parents.filter((p) => ids.has(p.playerId));
  }, [carpoolPlayers, parents]);

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

  const myPlayerId = currentParent?.playerId || '';
  const isMyPlayerInCarpool = Boolean(
    myPlayerId && carpoolPlayers.some((pl) => pl.id === myPlayerId)
  );
  const myNeedsRideCount = useMemo(() => {
    if (!isMyPlayerInCarpool) return 0;
    return practices.filter(
      (p) =>
        p.isoDate >= todayIso &&
        p.status !== 'cancelled' &&
        doesPlayerNeedRide(p, myPlayerId)
    ).length;
  }, [practices, todayIso, isMyPlayerInCarpool, myPlayerId]);

  const upcomingMonthOptions = useMemo(() => {
    const counts = new Map();
    practices.forEach((p) => {
      if (p.isoDate < todayIso) return;
      const ym = (p.isoDate || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ym)) return;
      counts.set(ym, (counts.get(ym) || 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, count]) => {
        const [y, m] = ym.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        return { key: ym, label, count };
      });
  }, [practices, todayIso]);

  const visiblePractices = useMemo(() => {
    const myParentId = currentParent?.id || '';
    if (tab === 'all' && !onlyNeedsDriver && !onlyMyNeedsRide && monthFilter === 'past') {
      return practices.filter((p) => p.isoDate < todayIso).reverse();
    }

    let list = practices.filter((p) => p.isoDate >= todayIso);

    if (tab === 'my-drives') {
      list = list.filter(
        (p) =>
          p.status !== 'cancelled' &&
          ((p.legs?.to || []).some((c) => c.driverParentId === myParentId) ||
            (p.legs?.from || []).some((c) => c.driverParentId === myParentId))
      );
    } else if (tab === 'all' && onlyMyNeedsRide && isMyPlayerInCarpool) {
      list = list.filter(
        (p) => p.status !== 'cancelled' && doesPlayerNeedRide(p, myPlayerId)
      );
    } else if (tab === 'all' && onlyNeedsDriver) {
      list = list.filter((p) => {
        if (p.status === 'cancelled') return false;
        const toSum = getLegSummary(p, 'to', carpoolPlayers);
        const fromSum = getLegSummary(p, 'from', carpoolPlayers);
        return toSum.tone !== 'success' || fromSum.tone !== 'success';
      });
    } else if (tab === 'all' && monthFilter !== 'all') {
      list = list.filter((p) => (p.isoDate || '').startsWith(monthFilter));
    }

    return list;
  }, [
    practices,
    tab,
    currentParent,
    todayIso,
    onlyNeedsDriver,
    onlyMyNeedsRide,
    isMyPlayerInCarpool,
    myPlayerId,
    monthFilter,
    carpoolPlayers,
  ]);

  const pastCount = useMemo(
    () => practices.filter((p) => p.isoDate < todayIso).length,
    [practices, todayIso]
  );

  const firstUpcomingId = useMemo(
    () =>
      practices.find((p) => p.isoDate >= todayIso && p.status !== 'cancelled')?.id || null,
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

        <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-center">
          {(() => {
            const myParentId = currentParent?.id || '';
            const upcomingCount = practices.filter(
              (p) => p.isoDate >= todayIso && p.status !== 'cancelled'
            ).length;
            const myDrivesCount = practices.filter(
              (p) =>
                p.isoDate >= todayIso &&
                p.status !== 'cancelled' &&
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
              <div className="w-full sm:w-auto flex items-center justify-evenly sm:justify-center sm:gap-7">
                {tabs.map(({ id, label, count }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 py-2.5 text-sm sm:text-[15px] whitespace-nowrap shrink-0 transition-colors ${
                      tab === id
                        ? 'text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 font-semibold'
                    }`}
                  >
                    <span
                      className={`pb-0.5 border-b ${
                        tab === id ? 'border-current' : 'border-transparent'
                      }`}
                    >
                      {label}
                    </span>
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
            onTogglePlayerCarpool={(playerId, nextVal) =>
              runAction(
                () => togglePlayerCarpool(playerId, nextVal),
                nextVal ? 'Added to carpool' : 'Removed from carpool'
              )
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
            {tab === 'all' && (upcomingMonthOptions.length > 0 || pastCount > 0 || needsDriverCount > 0 || onlyNeedsDriver || myNeedsRideCount > 0 || onlyMyNeedsRide) && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-2xl sm:rounded-full bg-slate-900 border border-slate-800">
                  {onlyNeedsDriver || onlyMyNeedsRide ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyNeedsDriver(false);
                        setOnlyMyNeedsRide(false);
                        setMonthFilter('all');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-[13px] font-semibold bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition"
                    >
                      All Upcoming
                    </button>
                  ) : (
                    <div className="relative inline-flex items-center">
                      <select
                        aria-label="Filter practices by month"
                        value={monthFilter}
                        onChange={(e) => {
                          setMonthFilter(e.target.value);
                          setOnlyNeedsDriver(false);
                          setOnlyMyNeedsRide(false);
                        }}
                        className="appearance-none cursor-pointer pl-3.5 pr-7 py-1.5 min-h-[36px] rounded-full text-[13px] font-semibold transition focus:outline-none bg-slate-800 text-slate-100"
                      >
                        <option value="all" className="bg-slate-900 text-slate-100">
                          All Upcoming
                        </option>
                        {upcomingMonthOptions.map((m) => (
                          <option key={m.key} value={m.key} className="bg-slate-900 text-slate-100">
                            {m.label} ({m.count})
                          </option>
                        ))}
                        {pastCount > 0 && (
                          <option value="past" className="bg-slate-900 text-slate-100">
                            All Past ({pastCount})
                          </option>
                        )}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5" />
                    </div>
                  )}
                  {(myNeedsRideCount > 0 || onlyMyNeedsRide) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyMyNeedsRide((v) => !v);
                        setOnlyNeedsDriver(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-[13px] font-semibold transition ${
                        onlyMyNeedsRide
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-rose-300/85 hover:text-rose-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      Needs My Ride ({myNeedsRideCount})
                    </button>
                  )}
                  {(needsDriverCount > 0 || onlyNeedsDriver) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyNeedsDriver((v) => !v);
                        setOnlyMyNeedsRide(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-[13px] font-semibold transition ${
                        onlyNeedsDriver
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Needs Driver ({needsDriverCount})
                    </button>
                  )}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[36px] rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
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
                    : onlyMyNeedsRide
                      ? 'Your player has a confirmed ride for every upcoming practice!'
                      : onlyNeedsDriver
                        ? 'All upcoming practices have drivers covered!'
                        : 'No upcoming practices scheduled.'}
                </p>
                {isAdmin && tab === 'all' && !onlyNeedsDriver && !onlyMyNeedsRide && (
                  <button
                    onClick={() => setSeasonModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Generate Practices
                  </button>
                )}
              </div>
            ) : (() => {
              const shouldCapUpcoming =
                tab === 'all' &&
                !onlyNeedsDriver &&
                !onlyMyNeedsRide &&
                monthFilter === 'all' &&
                !showAllUpcoming &&
                visiblePractices.length > 10;
              const displayedPractices = shouldCapUpcoming
                ? visiblePractices.slice(0, 10)
                : visiblePractices;
              return (
                <>
                  {displayedPractices.map((practice) => (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  isFirstUpcoming={practice.id === firstUpcomingId}
                  isPast={practice.isoDate < todayIso}
                  players={carpoolPlayers}
                  carpoolParents={carpoolParents}
                  shortPlayerNames={shortPlayerNames}
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
                  onOpenStopsModal={(practiceId, leg, carId) =>
                    setStopsModal({ practiceId, leg, carId })
                  }
                  onJoin={(practiceId, leg, carId, playerId) =>
                    runAction(() =>
                      joinCar(practiceId, leg, carId, playerId || currentParent?.playerId)
                    )
                  }
                  onJoinBoth={(practiceId, driverParentId, playerId) =>
                    runAction(() =>
                      joinBothWays(
                        practiceId,
                        driverParentId,
                        playerId || currentParent?.playerId
                      )
                    )
                  }
                  onLeave={(practiceId, leg, carId, playerId) =>
                    runAction(() =>
                      leaveCar(practiceId, leg, carId, playerId || currentParent?.playerId)
                    )
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
                  ))}
                  {shouldCapUpcoming && (
                    <div className="flex justify-center pt-1">
                      <button
                        onClick={() => setShowAllUpcoming(true)}
                        className="px-5 py-2.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
                      >
                        Show all {visiblePractices.length} upcoming practices
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
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
                runAction(
                  () =>
                    Promise.all(
                      targets.map((p) =>
                        offerToDrive(p.id, direction, seats, currentParent)
                      )
                    ),
                  `Added to ${targets.length} practices`
                );
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

      {stopsModal && (() => {
        const activeStopsPractice = practices.find((p) => p.id === stopsModal.practiceId);
        const activeStopsCar = (activeStopsPractice?.legs?.[stopsModal.leg] || []).find(
          (c) => c.id === stopsModal.carId
        );
        if (!activeStopsPractice || !activeStopsCar) return null;
        return (
          <StopsModal
            practice={activeStopsPractice}
            leg={stopsModal.leg}
            car={activeStopsCar}
            players={carpoolPlayers}
            parents={parents}
            shortPlayerNames={shortPlayerNames}
            currentParentId={currentParent?.id || ''}
            myPlayerId={myPlayerId}
            onClose={() => setStopsModal(null)}
          />
        );
      })()}

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

