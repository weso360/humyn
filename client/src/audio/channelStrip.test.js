import { CHANNEL_PRESETS, DEFAULT_CHANNEL_SETTINGS, createChannelStrip } from './channelStrip';

class Param {
  constructor(value = 0) { this.value = value; this.targets = []; }
  setTargetAtTime(value, time, constant) { this.value = value; this.targets.push([value, time, constant]); }
}

class Node {
  constructor(type) { this.type = type; this.connections = []; this.disconnected = false; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
}

function node(type, params = {}) {
  const n = new Node(type);
  Object.entries(params).forEach(([key, value]) => { n[key] = new Param(value); });
  return n;
}

function makeContext({ panner = true } = {}) {
  const made = [];
  const add = n => (made.push(n), n);
  const context = {
    currentTime: 7,
    sampleRate: 100,
    destination: add(node('destination')),
    createMediaStreamSource: () => add(node('source')),
    createGain: () => add(node('gain', { gain: 1 })),
    createBiquadFilter: () => add(node('biquad', { frequency: 0, gain: 0, Q: 1 })),
    createDynamicsCompressor: () => add(node('compressor', { threshold: -24, ratio: 1, knee: 0, attack: 0, release: .25 })),
    createDelay: () => add(node('delay', { delayTime: 0 })),
    createConvolver: () => add(node('convolver')),
    createAnalyser: () => add(node('analyser')),
    createBuffer: (channels, length, sampleRate) => ({ channels, length, sampleRate, data: Array.from({ length: channels }, () => new Float32Array(length)), getChannelData(i) { return this.data[i]; } }),
    made,
  };
  if (panner) context.createStereoPanner = () => add(node('panner', { pan: 0 }));
  return context;
}

const stream = (stops = []) => ({ getTracks: () => [{ stop: () => stops.push('stop') }] });

test('exports neutral defaults and named presets', () => {
  expect(DEFAULT_CHANNEL_SETTINGS).toEqual(expect.objectContaining({ preset: 'flat', highPassEnabled: false, highPassHz: 80, bass: 0, mid: 0, treble: 0, presence: 0, compressorEnabled: false, compressorThreshold: -24, compressorAmount: .5, gateEnabled: false, gateThreshold: -52, reverbEnabled: false, reverbRoom: .35, reverbMix: 0, delayEnabled: false, delayTime: .18, delayFeedback: .2, delayMix: 0, pan: 0 }));
  expect(Object.keys(CHANNEL_PRESETS)).toEqual(['flat', 'speech', 'vocal', 'instrument', 'room']);
});

test('creates the complete graph without connecting the master destination', () => {
  const strip = createChannelStrip(makeContext(), stream(), { id: 'mic', kind: 'microphone' });
  expect(strip.id).toBe('mic');
  expect(strip.nodes.source.connections[0]).toBe(strip.nodes.trim);
  expect(strip.nodes.analyser.connections[0]).toBe(strip.output);
  expect(strip.output.connections).toHaveLength(0);
  expect(strip.nodes.dry.connections[0]).toBe(strip.nodes.recombine);
  expect(strip.nodes.delayWet.connections[0]).toBe(strip.nodes.recombine);
  expect(strip.nodes.reverbWet.connections[0]).toBe(strip.nodes.recombine);
});

test('clamps every bounded setting', () => {
  const s = createChannelStrip(makeContext(), stream(), { id: 'x', kind: 'mic' });
  const values = { bass: 99, mid: -99, treble: 99, presence: -99, highPassHz: 999, pan: -9, alignmentMs: 9999, compressorAmount: 9, reverbRoom: -2, reverbMix: 9, delayTime: 9, delayFeedback: 9, delayMix: -2, compressorThreshold: -200, gateThreshold: 10 };
  Object.entries(values).forEach(([k, v]) => s.setSetting(k, v));
  expect(s.getSettings()).toEqual(expect.objectContaining({ bass: 12, mid: -12, treble: 12, presence: -12, highPassHz: 400, pan: -1, alignmentMs: 500, compressorAmount: 1, reverbRoom: 0, reverbMix: 1, delayTime: 1, delayFeedback: .85, delayMix: 0, compressorThreshold: -60, gateThreshold: 0 }));
});

test('delays an input independently for microphone alignment', () => {
  const s = createChannelStrip(makeContext(), stream(), { id: 'x', kind: 'mic' });
  expect(s.nodes.gate.connections[0]).toBe(s.nodes.alignmentDelay);
  s.setSetting('alignmentMs', 135);
  expect(s.nodes.alignmentDelay.delayTime.value).toBeCloseTo(.135);
});

test('presets apply independently and reset restores defaults', () => {
  const a = createChannelStrip(makeContext(), stream(), { id: 'a', kind: 'mic' });
  const b = createChannelStrip(makeContext(), stream(), { id: 'b', kind: 'mic' });
  a.applyPreset('vocal');
  expect(a.getSettings().preset).toBe('vocal');
  expect(a.getSettings()).not.toEqual(b.getSettings());
  expect(() => a.applyPreset('missing')).toThrow(/preset/i);
  a.reset();
  expect(a.getSettings()).toEqual(DEFAULT_CHANNEL_SETTINGS);
});

test('mute preserves the independently controlled fader', () => {
  const s = createChannelStrip(makeContext(), stream(), { id: 'x', kind: 'mic' });
  s.setFader(.42);
  s.setMuted(true);
  expect(s.nodes.fader.gain.value).toBe(0);
  s.setFader(.8);
  expect(s.nodes.fader.gain.value).toBe(0);
  s.setMuted(false);
  expect(s.nodes.fader.gain.value).toBe(.8);
});

test('gate bypasses, attacks below threshold, and releases more slowly', () => {
  const s = createChannelStrip(makeContext(), stream(), { id: 'x', kind: 'mic' });
  s.tickGate(0);
  expect(s.nodes.gate.gain.targets.at(-1)[0]).toBe(1);
  s.setSetting('gateEnabled', true);
  s.setSetting('gateThreshold', -40);
  s.tickGate(.001);
  s.tickGate(1);
  const targets = s.nodes.gate.gain.targets.slice(-2);
  expect(targets[0][0]).toBe(.25);
  expect(targets[1][0]).toBe(1);
  expect(targets[1][2]).toBeGreaterThan(targets[0][2]);
});

test('works without a StereoPannerNode', () => {
  const s = createChannelStrip(makeContext({ panner: false }), stream(), { id: 'x', kind: 'mic' });
  expect(s.nodes.panner).toBeNull();
  expect(() => s.setSetting('pan', .5)).not.toThrow();
});

test('dispose disconnects nodes and honors track ownership', () => {
  const ownedStops = [], borrowedStops = [];
  const owned = createChannelStrip(makeContext(), stream(ownedStops), { id: 'a', kind: 'mic' });
  const borrowed = createChannelStrip(makeContext(), stream(borrowedStops), { id: 'b', kind: 'mic', stopTracks: false });
  owned.dispose(); borrowed.dispose();
  expect(ownedStops).toEqual(['stop']);
  expect(borrowedStops).toEqual([]);
  expect(Object.values(owned.nodes).filter(Boolean).every(n => n.disconnected)).toBe(true);
});
