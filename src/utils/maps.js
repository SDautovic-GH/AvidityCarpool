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
