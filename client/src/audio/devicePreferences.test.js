import {
  choosePreferredInput,
  loadAudioPreferences,
  saveAudioPreferences,
} from './devicePreferences';

describe('choosePreferredInput', () => {
  const devices = [
    { deviceId: 'built-in', label: 'MacBook Air Microphone' },
    { deviceId: 'usb', label: 'USB   PnP Audio Device' },
  ];

  test('uses an available saved device first', () => {
    expect(choosePreferredInput(devices, { deviceId: 'built-in' })).toBe(devices[0]);
  });

  test('prefers USB PnP case-insensitively when there is no available saved device', () => {
    const lowercaseUsb = { deviceId: 'lowercase-usb', label: 'usb pnp microphone' };

    expect(choosePreferredInput([...devices.slice(0, 1), lowercaseUsb], { deviceId: 'missing' }))
      .toBe(lowercaseUsb);
    expect(choosePreferredInput(devices, null)).toBe(devices[1]);
  });

  test('returns null to request the browser default when USB PnP is absent', () => {
    expect(choosePreferredInput(devices.slice(0, 1), null)).toBeNull();
  });
});

describe('audio preference storage', () => {
  const createStorage = (value = null) => ({
    value,
    getItem: jest.fn(() => value),
    setItem: jest.fn((_, nextValue) => { value = nextValue; }),
  });

  test('preferences round-trip through storage', () => {
    const storage = createStorage();
    const preference = { deviceId: 'usb', label: 'USB PnP Audio Device' };

    saveAudioPreferences(storage, preference);

    expect(storage.setItem).toHaveBeenCalledWith(
      'streamlink-audio-preferences-v1',
      JSON.stringify(preference),
    );
    expect(loadAudioPreferences(storage)).toEqual(preference);
  });

  test('returns null for missing or malformed stored preferences', () => {
    expect(loadAudioPreferences(createStorage())).toBeNull();
    expect(loadAudioPreferences(createStorage('{not valid json'))).toBeNull();
  });

  test('saving is best-effort when storage rejects the write', () => {
    const storage = {
      setItem: jest.fn(() => { throw new Error('Storage quota exceeded'); }),
    };

    expect(() => saveAudioPreferences(storage, { deviceId: 'usb' })).not.toThrow();
  });
});
