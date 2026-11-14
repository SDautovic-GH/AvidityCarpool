/**
 * Returns an Apple Maps link on iOS/iPadOS and a Google Maps link on Desktop/Android.
 */
export function getMapUrl(location, address = '') {
  const query = address ? `${location}, ${address}` : location;
  const encoded = encodeURIComponent(query);
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isIOS
    ? `https://maps.apple.com/?q=${encoded}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

/**
 * Builds a single- or multi-recipient SMS link compatible with iOS/macOS Messages and Android.
 */
export function buildSmsUrl(rawPhones, body = '') {
  const list = Array.isArray(rawPhones) ? rawPhones : [rawPhones];
  const unique = [
    ...new Set(
      list
        .map((p) => String(p || '').replace(/[^\d+]/g, ''))
        .filter((p) => p.length >= 7)
    ),
  ];
  if (unique.length === 0) return '';

  const isApple =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);

  if (isApple) {
    if (unique.length === 1) {
      return `sms:${unique[0]}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
    }
    return `sms:/open?addresses=${unique.join(',')}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
  }

  return `sms:${unique.join(',')}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
}
