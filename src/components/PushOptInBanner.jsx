import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  canUseWebPush,
  getNotificationPermission,
  isIosDevice,
  isPushConfigured,
  isStandalonePwa,
} from '../utils/push';

const DISMISS_KEY = 'avidity_push_banner_dismissed';

export default function PushOptInBanner({
  currentParent,
  seasonNotifications,
  onEnablePush,
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    canUseWebPush().then((ok) => {
      if (active) setSupported(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!currentParent || dismissed || !isPushConfigured()) return null;

  const globalAnyEnabled =
    seasonNotifications?.needsSubEnabled !== false ||
    seasonNotifications?.nightBeforeEnabled !== false;
  if (!globalAnyEnabled) return null;

  if (currentParent.pushEnabled === false) return null;

  const permission = getNotificationPermission();
  const hasRegisteredToken =
    Array.isArray(currentParent.fcmTokens) && currentParent.fcmTokens.length > 0;

  // Already granted and token saved on profile
  if (permission === 'granted' && hasRegisteredToken) return null;
  if (permission === 'denied') return null;

  const iosBrowserNeedsInstall = isIosDevice() && !isStandalonePwa();
  if (!iosBrowserNeedsInstall && !supported) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await onEnablePush();
      if (ok) handleDismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-blue-500/35 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-100">
            {iosBrowserNeedsInstall ? 'Add to Home Screen for Alerts' : 'Get Carpool Alerts?'}
          </div>
          <p className="text-[13px] text-slate-400 leading-snug mt-0.5">
            {iosBrowserNeedsInstall ? (
              <>
                Tap <strong className="text-slate-200">Share → Add to Home Screen</strong> in Safari to receive urgent{' '}
                <strong className="text-slate-200">Needs Sub</strong> alerts &amp; 6 PM night-before driver reminders.
              </>
            ) : (
              <>
                Only urgent <strong className="text-slate-200">Needs Sub</strong> alerts &amp; 6 PM night-before driver reminders. Opt out anytime in Update My Info.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-10 sm:pl-0">
        {!iosBrowserNeedsInstall && (
          <button
            type="button"
            disabled={busy}
            onClick={handleEnable}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition whitespace-nowrap"
          >
            {busy ? 'Enabling...' : 'Enable Alerts'}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition whitespace-nowrap"
          aria-label="Dismiss alert banner"
        >
          {iosBrowserNeedsInstall ? <X className="w-3.5 h-3.5" /> : 'Not Now'}
        </button>
      </div>
    </div>
  );
}
