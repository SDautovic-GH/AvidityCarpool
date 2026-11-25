import React, { useState } from 'react';
import { Car, KeyRound, MapPin, MessageCircle, Pencil, Phone, Plus, Shield, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import { getAvatarColor, getCarpoolPlayerIdSet, getInitials } from '../utils/schedule';
import { buildSmsUrl, getMapUrl } from '../utils/maps';
import DriverEngagementView from './DriverEngagementView';
import GuestPoolView from './GuestPoolView';

const EMPTY_FORM = {
  existingParentId: null,
  parentName: '',
  email: '',
  phone: '',
  address: '',
  playerId: '',
  newPlayerName: '',
  defaultSeats: 4,
  canDrive: true,
  role: 'parent',
};

export default function AdminRoster({
  players,
  parents,
  practices = [],
  todayIso = '',
  currentParent,
  currentParentEmail,
  isAdmin,
  onSavePlayerAndParent,
  onUpdateMyProfile,
  onUpdatePlayerName,
  onTogglePlayerCarpool,
  onUpsertPlayerOnly,
  onRemoveParent,
  onSendResetEmail,
  onOpenSeasonModal,
  onSaveGuest,
  onDeleteGuest,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subView, setSubView] = useState(() => {
    try {
      const saved = sessionStorage.getItem('avidity_team_subview');
      return ['roster', 'guests', 'drivers'].includes(saved) ? saved : 'roster';
    } catch {
      return 'roster';
    }
  }); // 'roster' | 'guests' | 'drivers'

  React.useEffect(() => {
    try {
      sessionStorage.setItem('avidity_team_subview', subView);
    } catch {
      // ignore storage errors
    }
  }, [subView]);
  const [saving, setSaving] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerNameDraft, setPlayerNameDraft] = useState('');
  const [playerJerseyDraft, setPlayerJerseyDraft] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingSelf, setEditingSelf] = useState(false);
  const [selfPhone, setSelfPhone] = useState('');
  const [selfAddress, setSelfAddress] = useState('');
  const [selfSeats, setSelfSeats] = useState(4);
  const [savingSelf, setSavingSelf] = useState(false);

  const openEditSelf = () => {
    setSelfPhone(currentParent?.phone || '');
    setSelfAddress(currentParent?.address || '');
    setSelfSeats(currentParent?.defaultSeats ?? 4);
    setEditingSelf(true);
  };

  const handleSaveSelf = async (e) => {
    e.preventDefault();
    setSavingSelf(true);
    try {
      await onUpdateMyProfile({
        phone: selfPhone,
        address: selfAddress,
        defaultSeats: currentParent?.canDrive !== false ? selfSeats : undefined,
      });
      setEditingSelf(false);
    } finally {
      setSavingSelf(false);
    }
  };

  const openAddNewFamily = () => {
    setForm({ ...EMPTY_FORM, playerId: '__new__' });
    setFormOpen(true);
  };

  const openAddParentToPlayer = (playerId) => {
    setForm({ ...EMPTY_FORM, playerId });
    setFormOpen(true);
  };

  const openEditParent = (parent) => {
    setForm({
      existingParentId: parent.id,
      parentName: parent.name || '',
      email: parent.email || parent.id || '',
      phone: parent.phone || '',
      address: parent.address || '',
      playerId: parent.playerId || '',
      newPlayerName: '',
      defaultSeats: parent.defaultSeats ?? 4,
      canDrive: parent.canDrive !== false,
      role: parent.role || 'parent',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.parentName.trim() || !form.email.trim()) return;
    if (form.playerId === '__new__' && !form.newPlayerName.trim()) return;

    setSaving(true);
    try {
      await onSavePlayerAndParent({
        existingParentId: form.existingParentId,
        parentName: form.parentName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        playerId: form.playerId === '__new__' ? '' : form.playerId,
        newPlayerName: form.playerId === '__new__' ? form.newPlayerName.trim() : '',
        defaultSeats: Number(form.defaultSeats) || 4,
        canDrive: Boolean(form.canDrive),
        role: form.role,
      });
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlayerName = async (playerId) => {
    if (!playerNameDraft.trim()) return;
    await onUpdatePlayerName(playerId, playerNameDraft.trim(), playerJerseyDraft.trim());
    setEditingPlayerId(null);
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setImporting(true);
    try {
      const playerMap = new Map(
        players.map((pl) => [pl.name.trim().toLowerCase(), pl.id])
      );
      for (const line of lines) {
        const parts = (line.includes('|') ? line.split('|') : line.split('\t')).map((s) =>
          s.trim()
        );
        if (parts.length === 2 && /^\d+$/.test(parts[0]) && parts[1] && onUpsertPlayerOnly) {
          await onUpsertPlayerOnly({ name: parts[1], jerseyNumber: parts[0] });
          continue;
        }
        const [playerName, parentName, rawEmail = '', phone = '', address = '', rawSeats = '4'] =
          parts;
        if (!playerName || !parentName) continue;

        const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const email =
          rawEmail || `${slug(parentName)}.${slug(playerName)}@placeholder.local`;
        const existingId = playerMap.get(playerName.toLowerCase()) || '';

        await onSavePlayerAndParent({
          existingParentId: null,
          parentName,
          email,
          phone,
          address,
          playerId: existingId,
          newPlayerName: existingId ? '' : playerName,
          defaultSeats: Number(rawSeats) || 4,
          canDrive: true,
          role: 'parent',
        });
      }
      setImportOpen(false);
      setImportText('');
    } finally {
      setImporting(false);
    }
  };

  const regularPlayers = players.filter((pl) => !pl.isGuest);
  const guestPlayersCount = players.length - regularPlayers.length;
  const guestPlayerIds = new Set(players.filter((pl) => pl.isGuest).map((pl) => pl.id));
  const regularParents = parents.filter((p) => !guestPlayerIds.has(p.playerId));

  const unassignedParents = regularParents.filter(
    (p) => !regularPlayers.some((pl) => pl.id === p.playerId)
  );

  const carpoolPlayerIds = getCarpoolPlayerIdSet(regularPlayers, regularParents);
  const myParentId = currentParent?.id || '';
  const carpoolPhones = regularParents
    .filter((p) => p.id !== myParentId && carpoolPlayerIds.has(p.playerId) && p.phone)
    .map((p) => p.phone);
  const carpoolSmsUrl = buildSmsUrl(carpoolPhones);

  const teamPhones = regularParents
    .filter((p) => p.id !== myParentId && p.phone)
    .map((p) => p.phone);
  const teamSmsUrl = buildSmsUrl(teamPhones);
  const activatedCount = regularParents.filter((p) => Boolean(p.activatedAt || p.lastLoginAt)).length;

  const formatTimestamp = (ts) => {
    const dt = ts?.toDate?.();
    if (!dt) return '';
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-center">
          <div className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubView('roster')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full whitespace-nowrap transition ${
                subView === 'roster'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Roster
            </button>
            <button
              type="button"
              onClick={() => setSubView('guests')}
              className={`inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-full whitespace-nowrap transition ${
                subView === 'guests'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Guest Pool{guestPlayersCount > 0 ? ` (${guestPlayersCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setSubView('drivers')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full whitespace-nowrap transition ${
                subView === 'drivers'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">Drivers</span>
              <span className="hidden sm:inline">Driver Engagement</span>
            </button>
          </div>
        </div>
      )}

      {isAdmin && subView === 'drivers' ? (
        <DriverEngagementView
          players={regularPlayers}
          parents={parents}
          practices={practices}
          todayIso={todayIso}
        />
      ) : isAdmin && subView === 'guests' ? (
        <GuestPoolView
          players={players}
          parents={regularParents}
          onSaveGuest={onSaveGuest}
          onDeleteGuest={onDeleteGuest}
        />
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Team Roster &amp; Contacts
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {regularPlayers.length} {regularPlayers.length === 1 ? 'player' : 'players'} · {regularParents.length}{' '}
            {regularParents.length === 1 ? 'parent' : 'parents'}
            {isAdmin && regularParents.length > 0 ? ` · ${activatedCount}/${regularParents.length} activated` : ''} · Tap
            phone to call/text or address for directions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {carpoolSmsUrl && (
            <a
              href={carpoolSmsUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Text all Melrose carpool parents"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              Text Carpool
            </a>
          )}
          {teamSmsUrl && (
            <a
              href={teamSmsUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Text all parents on the team roster"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              Text Team
            </a>
          )}
          {currentParent && !isAdmin && (
            <button
              onClick={openEditSelf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit My Info
            </button>
          )}
          {isAdmin && onOpenSeasonModal && (
            <button
              onClick={onOpenSeasonModal}
              className="px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Season &amp; Schedule
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Bulk Import
              </button>
              <button
                onClick={openAddNewFamily}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Family / Parent
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-slate-400 font-semibold">Coaches:</span> Ashley Krugh, Hannah Mullarkey
        </div>
        <div>
          <span className="text-slate-400 font-semibold">Schedule:</span> Tue &amp; Thu 7:15–9:15 PM (SJP) · Sun 5:00–7:00 PM (DIS)
        </div>
      </div>

      <div className="space-y-3">
        {regularPlayers.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
            No players in this season yet. Click <strong>Add Family / Parent</strong> to start
            building your roster.
          </div>
        ) : (
          regularPlayers.map((player) => {
            const linkedParents = regularParents.filter((p) => p.playerId === player.id);
            const isEditingName = editingPlayerId === player.id;

            return (
              <div
                key={player.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <div className="px-3.5 sm:px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
                  {isEditingName ? (
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(
                          player.name
                        )}`}
                      >
                        {getInitials(player.name)}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                        <input
                          type="text"
                          value={playerJerseyDraft}
                          onChange={(e) => setPlayerJerseyDraft(e.target.value)}
                          placeholder="#"
                          className="w-12 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 text-center focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={playerNameDraft}
                          onChange={(e) => setPlayerNameDraft(e.target.value)}
                          className="min-w-0 flex-1 sm:flex-none px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSavePlayerName(player.id)}
                          className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-blue-600 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlayerId(null)}
                          className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(
                              player.name
                            )}`}
                          >
                            {getInitials(player.name)}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
                            <span className="text-sm font-bold text-slate-100 leading-snug">
                              {player.name}
                            </span>
                            {player.jerseyNumber && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-blue-300 shrink-0">
                                #{player.jerseyNumber}
                              </span>
                            )}
                            {!isAdmin && carpoolPlayerIds.has(player.id) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                                Carpool
                              </span>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingPlayerId(player.id);
                              setPlayerNameDraft(player.name);
                              setPlayerJerseyDraft(player.jerseyNumber || '');
                            }}
                            className="sm:hidden p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition shrink-0"
                            title="Edit player name & jersey #"
                            aria-label="Edit player"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          {onTogglePlayerCarpool &&
                            (() => {
                              const inCarpool = carpoolPlayerIds.has(player.id);
                              return (
                                <button
                                  type="button"
                                  onClick={() => onTogglePlayerCarpool(player.id, !inCarpool)}
                                  title={
                                    inCarpool
                                      ? 'In carpool — tap to remove'
                                      : 'Not in carpool — tap to add'
                                  }
                                  className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-semibold border shrink-0 transition cursor-pointer ${
                                    inCarpool
                                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                                      : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
                                  }`}
                                >
                                  {inCarpool ? '✓ Carpool' : '+ Carpool'}
                                </button>
                              );
                            })()}

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditingPlayerId(player.id);
                                setPlayerNameDraft(player.name);
                                setPlayerJerseyDraft(player.jerseyNumber || '');
                              }}
                              className="hidden sm:flex p-1.5 min-w-[32px] min-h-[32px] items-center justify-center rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                              title="Edit player name & jersey #"
                              aria-label="Edit player"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAddParentToPlayer(player.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold bg-slate-700/75 hover:bg-slate-700 text-slate-100 transition shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">Add Parent</span>
                              <span className="sm:hidden">Parent</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="divide-y divide-slate-800/70">
                  {linkedParents.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No parents linked yet.
                    </div>
                  ) : (
                    linkedParents.map((parent) => {
                      const canDrive = parent.canDrive !== false;
                      const isSelf =
                        (parent.email || parent.id).toLowerCase() ===
                        (currentParentEmail || '').toLowerCase();

                      return (
                        <div
                          key={parent.id}
                          className="px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-100">
                                {parent.name}
                              </span>
                              {parent.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  <Shield className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              )}
                              {canDrive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <Car className="w-2.5 h-2.5" />
                                  {parent.defaultSeats ?? 4} seats
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                                  Non-driver
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-1">
                              {parent.email || parent.id}
                            </div>
                            {isAdmin && (
                              <div className="mt-1">
                                {parent.activatedAt || parent.lastLoginAt ? (
                                  <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span
                                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      aria-label="Account setup complete"
                                      title={
                                        parent.activatedAt
                                          ? `Account setup completed ${formatTimestamp(parent.activatedAt)}`
                                          : 'Account setup completed'
                                      }
                                    >
                                      ✓
                                    </span>
                                    {parent.lastLoginAt && (
                                      <span className="text-slate-400">
                                        Last seen {formatTimestamp(parent.lastLoginAt)}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300/90">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Pending Setup
                                  </span>
                                )}
                              </div>
                            )}
                            {(parent.phone || parent.address) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                                {parent.phone && (
                                  <span className="inline-flex items-center gap-2">
                                    <a
                                      href={`tel:${parent.phone.replace(/[^\d+]/g, '')}`}
                                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                      title="Call"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {parent.phone}
                                    </a>
                                    <a
                                      href={buildSmsUrl(parent.phone)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                      title="Send text message"
                                    >
                                      <MessageCircle className="w-2.5 h-2.5 text-blue-400" />
                                      Text
                                    </a>
                                  </span>
                                )}
                                {parent.address && (
                                  <a
                                    href={getMapUrl(parent.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-slate-300 hover:text-blue-300"
                                  >
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {parent.address}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isAdmin && isSelf && (
                              <button
                                onClick={openEditSelf}
                                className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                              >
                                Update
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openEditParent(parent)}
                                  className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => onSendResetEmail(parent.email || parent.id)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                  title="Send password reset email"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Reset Password
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Remove ${parent.name} (${parent.email || parent.id}) from this season?`
                                        )
                                      ) {
                                        onRemoveParent(parent.id);
                                      }
                                    }}
                                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                    title="Remove parent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}

        {unassignedParents.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-amber-800/40 p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Parents without a linked player
            </div>
            {unassignedParents.map((parent) => (
              <div
                key={parent.id}
                className="flex items-center justify-between gap-2 text-sm text-slate-200"
              >
                <span>
                  {parent.name} ({parent.email || parent.id})
                </span>
                <button
                  onClick={() => openEditParent(parent)}
                  className="px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700"
                >
                  Link Player
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">
                {form.existingParentId ? 'Edit Parent' : 'Add Family / Parent'}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Name
                </label>
                <input
                  type="text"
                  required
                  value={form.parentName}
                  onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                  placeholder="e.g. Samir Dautovic"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Parent Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="parent@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, Danvers, MA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linked Player
                </label>
                <select
                  value={form.playerId}
                  onChange={(e) => setForm((f) => ({ ...f, playerId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="__new__">+ New Player</option>
                  {regularPlayers.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>

              {form.playerId === '__new__' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Player Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.newPlayerName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newPlayerName: e.target.value }))
                    }
                    placeholder="e.g. Maya"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Default Seats
                  </label>
                  <select
                    value={form.defaultSeats}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, defaultSeats: Number(e.target.value) }))
                    }
                    disabled={!form.canDrive}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 disabled:opacity-40 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 (Solo)' : `${n} seats`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.canDrive}
                  onChange={(e) => setForm((f) => ({ ...f, canDrive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-xs font-medium text-slate-200">
                  Include in driving pool (uncheck to exclude from driving)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
                >
                  {saving ? 'Saving...' : form.existingParentId ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setImportOpen(false)}
        >
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Bulk Import Roster</h3>
              <button
                onClick={() => setImportOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="p-5 space-y-3">
              <p className="text-xs text-slate-400">
                One family per line:{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-200">
                  Player | Parent | Email (optional) | Phone | Address | Seats
                </code>
              </p>
              <textarea
                rows={7}
                required
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Daniela | Justin | | (781) 389-5579 | 27 Penney Hill Road, Melrose, MA 02176 | 6"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
                >
                  {importing ? 'Importing...' : 'Import Families'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSelf && currentParent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingSelf(false)}
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Update My Info</h3>
              <button
                onClick={() => setEditingSelf(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSelf} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={selfPhone}
                  onChange={(e) => setSelfPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Home Address
                </label>
                <input
                  type="text"
                  value={selfAddress}
                  onChange={(e) => setSelfAddress(e.target.value)}
                  placeholder="123 Main St, Melrose, MA 02176"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              {currentParent.canDrive !== false && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Default Carpool Seats
                  </label>
                  <select
                    value={selfSeats}
                    onChange={(e) => setSelfSeats(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 (Solo)' : `${n} seats`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSelf(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSelf}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
                >
                  {savingSelf ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

