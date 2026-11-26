import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Bell, Car, X } from 'lucide-react';

function formatRelativeTime(ts) {
  const dt = ts?.toDate?.();
  if (!dt) return '';
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return `Yesterday · ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsModal({
  notifications = [],
  lastReadMs = 0,
  onClose,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-label="Recent Alerts"
      className="fixed top-16 bottom-auto inset-x-0 sm:inset-0 mx-auto my-0 sm:m-auto p-0 w-[calc(100%-1.5rem)] max-w-md max-h-[75dvh] bg-transparent border-0 overflow-hidden rounded-2xl shadow-2xl"
    >
      <div className="w-full max-h-[75dvh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 touch-none">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            Recent Alerts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alerts"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto overscroll-y-contain space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-slate-200">No alerts yet</div>
              <p className="text-[13px] text-slate-400 max-w-xs mx-auto">
                Urgent Needs Sub requests and 6:00 PM night-before carpool reminders will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const createdMs = n.createdAt?.toMillis?.() || 0;
              const isUnread = createdMs > lastReadMs;
              const isUrgent = n.type === 'needs_sub' || n.type === 'night_before_uncovered';

              return (
                <div
                  key={n.id}
                  className={`rounded-xl border px-3.5 py-3 space-y-1 ${
                    isUnread
                      ? 'bg-blue-500/10 border-blue-500/35'
                      : 'bg-slate-950/65 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isUrgent
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/15 text-blue-300'
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <Car className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="text-sm font-bold text-slate-100 leading-snug">
                        {n.title}
                      </span>
                    </div>
                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="text-[13px] text-slate-300 leading-snug pl-8">{n.body}</p>
                  {n.createdAt && (
                    <div className="text-xs text-slate-400 pl-8">
                      {formatRelativeTime(n.createdAt)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end shrink-0 touch-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
