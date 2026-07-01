export function getSignalUrl() {
  if (process.env.REACT_APP_SIGNAL_URL) return process.env.REACT_APP_SIGNAL_URL;

  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (process.env.NODE_ENV === 'production' || !isLocalHost) {
    return window.location.origin;
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`;
}
