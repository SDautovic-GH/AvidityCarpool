import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Car, LogOut, Phone, Plus, Trophy, Users } from 'lucide-react';
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
import TeamDirectory from './components/TeamDirectory';
import TournamentsView from './components/TournamentsView';

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  const [tab, setTab] = useState('all'); // 'all' | 'my-drives' | 'roster'
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
    savePlayerAndParent,
    updateMyProfile,
    updatePlayerName,
    removeParent,
    createSeason,
    batchCreatePractices,
    saveTournament,
    deleteTournament,
    batchCreateTournaments,
  } = useCarpoolData(user);

  const todayIso = new Date().toISOString().slice(0, 10);

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
    }

    return list;
  }, [practices, showPast, tab, currentParent, todayIso]);

  const pastCount = useMemo(
    () => practices.filter((p) => p.isoDate < todayIso).length,
    [practices, todayIso]
  );

  const firstUpcomingId = useMemo(
    () => practices.find((p) => p.isoDate >= todayIso)?.id || null,
    [practices, todayIso]
  );

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
              AC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                  {activeSeason
                    ? `${activeSeason.clubName} ${activeSeason.teamName}`
                    : 'Avidity Carpool'}
                </h1>
                {activeSeason?.label && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                    {activeSeason.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {currentParent?.name || user.email}
                {myPlayer ? ` · ${myPlayer.name}'s parent` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(seasons.length > 1 || isAdmin) && (
              <select
                value={activeSeasonId || ''}
                onChange={(e) => setActiveSeasonId(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
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
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-full bg-slate-900 border border-slate-800">
            <button
              onClick={() => setTab('all')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              All Practices
            </button>
            <button
              onClick={() => setTab('my-drives')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'my-drives'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              My Drives
            </button>
            <button
              onClick={() => setTab('tournaments')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'tournaments'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Tournaments
            </button>
            <button
              onClick={() => setTab('directory')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === 'directory'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Directory
            </button>
            {isAdmin && (
              <button
                onClick={() => setTab('roster')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  tab === 'roster'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Team Roster
              </button>
            )}
          </div>

          {tab !== 'roster' && tab !== 'directory' && tab !== 'tournaments' && pastCount > 0 && (
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
        ) : tab === 'directory' ? (
          <TeamDirectory
            players={players}
            parents={parents}
            currentParent={currentParent}
            onUpdateMyProfile={(payload) =>
              runAction(() => updateMyProfile(payload), 'Your contact info updated')
            }
          />
        ) : tab === 'roster' && isAdmin ? (
          <AdminRoster
            players={players}
            parents={parents}
            currentParentEmail={user.email}
            onSavePlayerAndParent={(payload) =>
              runAction(() => savePlayerAndParent(payload), 'Roster updated')
            }
            onUpdatePlayerName={(id, name) =>
              runAction(() => updatePlayerName(id, name), 'Player name updated')
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
        ) : visiblePractices.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
            <p className="text-sm text-slate-400">
              {tab === 'my-drives'
                ? "You aren't signed up to drive for any upcoming practices yet."
                : 'No upcoming practices scheduled.'}
            </p>
            {isAdmin && tab === 'all' && (
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
            />
          ))
        )}
      </main>

      {activeDrivePractice && currentParent && (
        <DriveModal
          practice={activeDrivePractice}
          currentParent={currentParent}
          playerName={myPlayer?.name}
          defaultDirection={driveModal.defaultDirection}
          onClose={() => setDriveModal(null)}
          onConfirm={(practiceId, direction, seats) => {
            setDriveModal(null);
            runAction(
              () => offerToDrive(practiceId, direction, seats, currentParent),
              'Added to carpool'
            );
          }}
        />
      )}

      {activeAssignPractice && activeAssignPlayer && (
        <AssignModal
          practice={activeAssignPractice}
          leg={assignModal.leg}
          player={activeAssignPlayer}
          onClose={() => setAssignModal(null)}
          onAssign={(practiceId, leg, carId, playerId) => {
            setAssignModal(null);
            runAction(
              () => joinCar(practiceId, leg, carId, playerId),
              `${activeAssignPlayer.name} assigned`
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

