import { analyseSamples, buildStreamHealth, loadChurchPresets, saveChurchPreset } from './productionAudio';

test('calculates peak, rms, decibels and clipping from PCM samples', () => {
  const result = analyseSamples(new Float32Array([0, .5, -.5, 1]));
  expect(result.peak).toBe(1);
  expect(result.rms).toBeCloseTo(Math.sqrt(.375));
  expect(result.peakDb).toBeCloseTo(0);
  expect(result.clipping).toBe(true);
});

test('grades stream health from live media signals', () => {
  expect(buildStreamHealth({ status: 'live', viewerCount: 2, bitrateMbps: 3, peakDb: -8, clipping: false, videoReady: true }).grade).toBe('good');
  const weak = buildStreamHealth({ status: 'live', viewerCount: 1, bitrateMbps: .3, peakDb: 0, clipping: true, videoReady: true });
  expect(weak.grade).toBe('poor');
  expect(weak.issues).toEqual(expect.arrayContaining(['Audio clipping', 'Low upload bitrate']));
});

test('stores named church presets and tolerates unavailable storage', () => {
  const state = {};
  const storage = { getItem: key => state[key] || null, setItem: (key, value) => { state[key] = value; } };
  saveChurchPreset(storage, 'Sunday Service', [{ label: 'Mixer', gain: .8, settings: { bass: 2 } }], .9);
  expect(loadChurchPresets(storage)[0]).toEqual(expect.objectContaining({ name: 'Sunday Service', masterGain: .9 }));
  expect(loadChurchPresets({ getItem: () => { throw new Error('blocked'); } })).toEqual([]);
});
