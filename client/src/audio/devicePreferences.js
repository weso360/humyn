const STORAGE_KEY = 'streamlink-audio-preferences-v1';

export function choosePreferredInput(devices, saved) {
  const savedDevice = saved?.deviceId
    && devices.find(device => device.deviceId === saved.deviceId);

  if (savedDevice) return savedDevice;

  return devices.find(device => /usb\s*pnp/i.test(device.label || '')) || null;
}

export function loadAudioPreferences(storage = window.localStorage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY)) || null;
  } catch (_) {
    return null;
  }
}

export function saveAudioPreferences(storage = window.localStorage, preference) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(preference));
    return true;
  } catch (_) {
    return false;
  }
}
