const PRESET_KEY = 'streamlink-church-audio-presets-v1';
const toDb = value => value > 0 ? 20 * Math.log10(value) : -Infinity;

export function analyseSamples(samples) {
  if (!samples?.length) return { peak: 0, rms: 0, peakDb: -Infinity, rmsDb: -Infinity, clipping: false };
  let peak = 0, sum = 0;
  for (const sample of samples) {
    const absolute = Math.abs(sample);
    if (absolute > peak) peak = absolute;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / samples.length);
  return { peak, rms, peakDb: toDb(peak), rmsDb: toDb(rms), clipping: peak >= .988 };
}

export function buildStreamHealth({ status, viewerCount, bitrateMbps, peakDb, clipping, videoReady }) {
  const issues = [];
  if (!videoReady) issues.push('Video unavailable');
  if (clipping || peakDb > -1) issues.push('Audio clipping');
  if (peakDb < -30) issues.push('Audio level too low');
  if (status === 'live' && bitrateMbps < .5) issues.push('Low upload bitrate');
  if (status !== 'live' && viewerCount > 0) issues.push('Viewer connection pending');
  return { grade: issues.length === 0 ? 'good' : issues.length === 1 ? 'ok' : 'poor', issues };
}

export function loadChurchPresets(storage) {
  try {
    const value = JSON.parse(storage?.getItem(PRESET_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) { return []; }
}

export function saveChurchPreset(storage, name, inputs, masterGain) {
  if (!name?.trim()) return loadChurchPresets(storage);
  const presets = loadChurchPresets(storage).filter(preset => preset.name !== name.trim());
  const snapshot = {
    name: name.trim(), masterGain,
    inputs: inputs.map(({ label, deviceId, gain, muted, settings }) => ({ label, deviceId, gain, muted, settings })),
  };
  const next = [snapshot, ...presets].slice(0, 12);
  try { storage?.setItem(PRESET_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

export function deleteChurchPreset(storage, name) {
  const next = loadChurchPresets(storage).filter(preset => preset.name !== name);
  try { storage?.setItem(PRESET_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}
