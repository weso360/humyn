export const DEFAULT_CHANNEL_SETTINGS = Object.freeze({
  preset: 'flat', highPassEnabled: false, highPassHz: 80,
  bass: 0, mid: 0, treble: 0, presence: 0,
  compressorEnabled: false, compressorThreshold: -24, compressorAmount: .5,
  gateEnabled: false, gateThreshold: -52,
  reverbEnabled: false, reverbRoom: .35, reverbMix: 0,
  delayEnabled: false, delayTime: .18, delayFeedback: .2, delayMix: 0,
  pan: 0, alignmentMs: 0,
});

export const CHANNEL_PRESETS = Object.freeze({
  flat: {},
  speech: { highPassEnabled: true, highPassHz: 100, bass: -2, mid: 2, presence: 3, compressorEnabled: true, compressorThreshold: -22, compressorAmount: .45, gateEnabled: true, gateThreshold: -50 },
  vocal: { highPassEnabled: true, highPassHz: 85, bass: 1, mid: -1, treble: 1.5, presence: 2, compressorEnabled: true, compressorThreshold: -24, compressorAmount: .55, reverbEnabled: true, reverbRoom: .3, reverbMix: .08 },
  instrument: { highPassEnabled: true, highPassHz: 55, bass: 1, mid: -1.5, treble: 1, compressorEnabled: true, compressorThreshold: -20, compressorAmount: .35, reverbEnabled: true, reverbRoom: .4, reverbMix: .1 },
  room: { highPassEnabled: true, highPassHz: 70, bass: -1, presence: 1, compressorEnabled: true, compressorThreshold: -18, compressorAmount: .3, gateEnabled: true, gateThreshold: -55 },
});

const LIMITS = {
  bass: [-12, 12], mid: [-12, 12], treble: [-12, 12], presence: [-12, 12],
  highPassHz: [20, 400], pan: [-1, 1], alignmentMs: [0, 500], compressorAmount: [0, 1],
  reverbRoom: [0, 1], reverbMix: [0, 1], delayTime: [0, 1],
  delayFeedback: [0, .85], delayMix: [0, 1], compressorThreshold: [-60, 0],
  gateThreshold: [-80, 0],
};
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, Number(value)));
const db = value => 20 * Math.log10(Math.max(value, 1e-7));

export function createChannelStrip(context, stream, { id, kind, stopTracks = true, initialSettings = {} }) {
  const source = context.createMediaStreamSource(stream);
  const trim = context.createGain();
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass';
  const bass = context.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 120;
  const mid = context.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = .8;
  const treble = context.createBiquadFilter(); treble.type = 'highshelf'; treble.frequency.value = 6000;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 3500; presence.Q.value = .7;
  const compressor = context.createDynamicsCompressor();
  const gate = context.createGain();
  const alignmentDelay = context.createDelay(.5);
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;
  const dry = context.createGain(), delaySend = context.createGain(), delay = context.createDelay(1), delayFeedback = context.createGain(), delayWet = context.createGain();
  const reverbSend = context.createGain(), convolver = context.createConvolver(), reverbWet = context.createGain();
  const recombine = context.createGain(), fader = context.createGain(), analyser = context.createAnalyser(), output = context.createGain();
  const nodes = { source, trim, highpass, bass, mid, treble, presence, compressor, gate, alignmentDelay, panner, dry, delaySend, delay, delayFeedback, delayWet, reverbSend, convolver, reverbWet, recombine, fader, analyser, output };
  const connect = (a, b) => a.connect(b);
  connect(source, trim); connect(trim, highpass); connect(highpass, bass); connect(bass, mid); connect(mid, treble); connect(treble, presence); connect(presence, compressor); connect(compressor, gate);
  connect(gate, alignmentDelay);
  const post = panner || alignmentDelay; if (panner) connect(alignmentDelay, panner);
  connect(post, dry); connect(dry, recombine);
  connect(post, delaySend); connect(delaySend, delay); connect(delay, delayWet); connect(delayWet, recombine); connect(delay, delayFeedback); connect(delayFeedback, delay);
  connect(post, reverbSend); connect(reverbSend, convolver); connect(convolver, reverbWet); connect(reverbWet, recombine);
  connect(recombine, fader); connect(fader, analyser); connect(analyser, output);

  let settings = { ...DEFAULT_CHANNEL_SETTINGS };
  let faderValue = 1, muted = false;
  const target = (param, value, constant = .015) => param.setTargetAtTime ? param.setTargetAtTime(value, context.currentTime, constant) : (param.value = value);
  const impulse = room => {
    const length = Math.max(1, Math.round(context.sampleRate * (.15 + room * 1.85)));
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let c = 0; c < 2; c++) { const data = buffer.getChannelData(c); for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5 + (1 - room) * 3); }
    return buffer;
  };
  const sync = () => {
    target(highpass.frequency, settings.highPassHz); highpass.type = settings.highPassEnabled ? 'highpass' : 'allpass';
    target(bass.gain, settings.bass); target(mid.gain, settings.mid); target(treble.gain, settings.treble); target(presence.gain, settings.presence);
    target(compressor.threshold, settings.compressorEnabled ? settings.compressorThreshold : 0);
    target(compressor.ratio, settings.compressorEnabled ? 1 + settings.compressorAmount * 11 : 1);
    target(alignmentDelay.delayTime, settings.alignmentMs / 1000);
    if (panner) target(panner.pan, settings.pan);
    target(delay.delayTime, settings.delayTime); target(delayFeedback.gain, settings.delayEnabled ? settings.delayFeedback : 0); target(delayWet.gain, settings.delayEnabled ? settings.delayMix : 0); target(delaySend.gain, 1);
    target(reverbWet.gain, settings.reverbEnabled ? settings.reverbMix : 0); target(reverbSend.gain, 1); convolver.buffer = impulse(settings.reverbRoom);
  };
  const setSetting = (name, value) => {
    if (!(name in DEFAULT_CHANNEL_SETTINGS)) return;
    settings = { ...settings, [name]: LIMITS[name] ? clamp(value, LIMITS[name]) : value };
    if (name !== 'preset') settings.preset = 'custom';
    sync();
  };
  const applyPreset = name => {
    if (!Object.prototype.hasOwnProperty.call(CHANNEL_PRESETS, name)) throw new Error(`Unknown channel preset: ${name}`);
    settings = { ...DEFAULT_CHANNEL_SETTINGS, ...CHANNEL_PRESETS[name], preset: name }; sync();
  };
  const reset = () => { settings = { ...DEFAULT_CHANNEL_SETTINGS }; sync(); };
  Object.entries(initialSettings).forEach(([key, value]) => { if (key in settings) settings[key] = LIMITS[key] ? clamp(value, LIMITS[key]) : value; });
  sync();
  return {
    id, kind, stream, nodes, input: trim, output, analyser,
    getSettings: () => ({ ...settings }), setSetting, applyPreset, reset,
    setFader(value) { faderValue = clamp(value, [0, 1]); target(fader.gain, muted ? 0 : faderValue); },
    setMuted(value) { muted = Boolean(value); target(fader.gain, muted ? 0 : faderValue); },
    tickGate(rms) { const open = !settings.gateEnabled || db(rms) >= settings.gateThreshold; target(gate.gain, open ? 1 : .25, open ? .12 : .015); return open; },
    dispose() { Object.values(nodes).filter(Boolean).forEach(n => { try { n.disconnect(); } catch (_) {} }); if (stopTracks && stream.getTracks) stream.getTracks().forEach(track => track.stop()); },
  };
}
