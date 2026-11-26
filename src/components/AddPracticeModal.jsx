import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { DEFAULT_FACILITIES } from '../utils/schedule';

export default function AddPracticeModal({ defaultDate, onClose, onCreate }) {
  const initialDate = defaultDate || new Date().toISOString().slice(0, 10);
  const initialIsSun = new Date(`${initialDate}T12:00:00`).getDay() === 0;
  const initialFacility = DEFAULT_FACILITIES[initialIsSun ? 1 : 0];

  const [isoDate, setIsoDate] = useState(initialDate);
  const [timeLabel, setTimeLabel] = useState(
    initialIsSun ? '5:00 – 7:00 PM' : '7:15 – 9:15 PM'
  );
  const [facilityKey, setFacilityKey] = useState(initialFacility.key);
  const [location, setLocation] = useState(initialFacility.name);
  const [address, setAddress] = useState(initialFacility.address);
  const [carpoolMode, setCarpoolMode] = useState('both');
  const [saving, setSaving] = useState(false);

  const selectFacility = (key) => {
    setFacilityKey(key);
    const match = DEFAULT_FACILITIES.find((f) => f.key === key);
    if (match) {
      setLocation(match.name);
      setAddress(match.address);
    } else {
      setLocation('');
      setAddress('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isoDate || !timeLabel.trim() || !location.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        isoDate,
        timeLabel: timeLabel.trim(),
        location: location.trim(),
        address: address.trim(),
        carpoolMode,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)] rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-blue-400" />
            Add Practice Event
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={isoDate}
                onChange={(e) => setIsoDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
              <input
                type="text"
                required
                value={timeLabel}
                onChange={(e) => setTimeLabel(e.target.value)}
                placeholder="7:15 – 9:15 PM"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Facility</label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_FACILITIES.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => selectFacility(f.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    facilityKey === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectFacility('custom')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  facilityKey === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Location Name</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => {
                setFacilityKey('custom');
                setLocation(e.target.value);
              }}
              placeholder="e.g., St. John's Prep"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Address (for Maps)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 72 Spring St, Danvers, MA 01923"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Carpool Needed
            </label>
            <select
              value={carpoolMode}
              onChange={(e) => setCarpoolMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="both">Both Ways (To &amp; From)</option>
              <option value="from_only">From Practice Only (Parents drive there)</option>
              <option value="to_only">To Practice Only (Parents pick up)</option>
              <option value="none">No Carpool Needed</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition"
            >
              {saving ? 'Adding...' : 'Add Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
