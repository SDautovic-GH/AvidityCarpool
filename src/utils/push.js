import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { app, functions, isFirebaseConfigured } from '../firebase';

const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true
  );
}

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export function isPushConfigured() {
  return Boolean(isFirebaseConfigured && app && VAPID_KEY);
}

export async function canUseWebPush() {
  if (!isPushConfigured()) return false;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Must be called from a direct user tap/click handler (required by iOS Safari).
 * Requests notification permission, registers the push service worker, and returns the FCM token.
 */
export async function requestPushToken() {
  if (!isPushConfigured()) {
    throw new Error('Push notifications are not configured yet (missing VAPID key).');
  }
  const supported = await canUseWebPush();
  if (!supported) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked in your device settings.'
        : 'Notification permission was not granted.'
    );
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  });
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Could not obtain a push notification token for this device.');
  }
  return token;
}

export async function sendTestPushToSelf(seasonId) {
  if (!functions || !seasonId) {
    throw new Error('Firebase Functions not initialized.');
  }
  const callable = httpsCallable(functions, 'sendTestPushToSelf');
  const res = await callable({ seasonId });
  return res.data;
}
