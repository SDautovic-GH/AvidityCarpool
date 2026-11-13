import React, { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CalendarPlus, Car, LogOut, Plus, Trophy, Users } from 'lucide-react';
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
import { exportMyDrivesIcs } from './utils/calendar';
import { getLegSummary, getShortPlayerNames } from './utils/schedule';

const AdminRoster = lazy(() => import('./components/AdminRoster'));
const AdminSeasonModal = lazy(() => import('./components/AdminSeasonModal'));
const TournamentsView = lazy(() => import('./components/TournamentsView'));

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  const [tab, setTab] = useState('all'); // 'all' | 'my-drives' | 'tournaments' | 'roster'
  const [onlyNeedsDriver, setOnlyNeedsDriver] = useState(false);
  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const el = tabRefs.current[tab];
      if (!el) return;
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [tab, user]);
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
  } = useCarpoolData(user);

  const todayIso = new Date().toISOString().slice(0, 10);

  const needsDriverCount = useMemo(
    () =>
      practices.filter((p) => {
        if (p.isoDate < todayIso || p.status === 'cancelled') return false;
        const toSum = getLegSummary(p, 'to', players);
        const fromSum = getLegSummary(p, 'from', players);
        return toSum.tone !== 'success' || fromSum.tone !== 'success';
      }).length,
    [practices, players, todayIso]
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
        const toSum = getLegSummary(p, 'to', players);
        const fromSum = getLegSummary(p, 'from', players);
        return toSum.tone !== 'success' || fromSum.tone !== 'success';
      });
    }

    return list;
  }, [practices, showPast, tab, currentParent, todayIso, onlyNeedsDriver, players]);

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
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate text-slate-100">
                  {activeSeason
                    ? `${activeSeason.clubName} ${activeSeason.teamName}`
                    : 'Avidity Carpool'}
                </h1>
                {activeSeason?.label && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
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

          <div className="flex items-center gap-2 shrink-0">
            {seasons.length > 1 && (
              <select
                value={activeSeasonId || ''}
                onChange={(e) => setActiveSeasonId(e.target.value)}
                className="px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 max-w-[140px] sm:max-w-none"
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
              className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-2.5 sm:pb-3 flex items-center justify-between gap-2 flex-wrap">
          {(() => {
            const tabs = [
              { id: 'all', label: 'Practices', icon: Calendar },
              { id: 'my-drives', label: 'My Drives', icon: Car },
              { id: 'tournaments', label: 'Events', icon: Trophy },
              { id: 'roster', label: 'Team', icon: Users },
            ];
            return (
              <div className="w-full sm:w-auto overflow-x-auto no-scrollbar">
                <div className="relative min-w-full sm:min-w-0 inline-flex items-center justify-between sm:justify-start gap-0.5 sm:gap-1 p-1 rounded-full bg-slate-900 border border-slate-800">
                  <div
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-0 rounded-full bg-blue-600 transition-all duration-200 ease-out"
                    style={{
                      transform: `translateX(${indicatorStyle.left}px)`,
                      width: `${indicatorStyle.width}px`,
                      opacity: indicatorStyle.ready ? 1 : 0,
                    }}
                  />
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      ref={(el) => {
                        tabRefs.current[id] = el;
                      }}
                      onClick={(e) => {
                        setTab(id);
                        e.currentTarget.scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
                      }}
                      className={`relative z-10 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        tab === id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {tab !== 'roster' && tab !== 'tournaments' && pastCount > 0 && (
            <button
              onClick={() => setShowPast((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            >
              {showPast ? 'Hide past practices' : `Show past (${pastCount})`}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-4">
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
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-400">Loading events...</div>}>
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
          </Suspense>
        ) : tab === 'roster' ? (
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-400">Loading team...</div>}>
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
          </Suspense>
        ) : (
          <>
            {tab === 'all' && needsDriverCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
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
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const count = exportMyDrivesIcs(
                      visiblePractices,
                      currentParent.id,
                      players
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
                  players={players}
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
                  onUpdateNotes={(practiceId, notes) =>
                    runAction(() => updatePracticeNotes(practiceId, notes), 'Note saved')
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
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

