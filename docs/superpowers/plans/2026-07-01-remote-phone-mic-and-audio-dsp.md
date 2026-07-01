# Remote Phone Microphone and Audio DSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled audio-only phone contributor and independently adjustable church-oriented DSP to every StreamLink mixer input while preserving configurable local-device selection.

**Architecture:** Extract each Web Audio channel into a focused channel-strip module, keep the sender as owner of the master destination, and add an audio-only host/contributor WebRTC negotiation path through the existing Socket.IO server. The existing sender UI consumes these modules and renders inline effects, while a new phone route owns permission, device selection, local gain/mute, and connection status.

**Tech Stack:** React 18, React Router 6, Web Audio API, WebRTC, Socket.IO, Jest, React Testing Library, Create React App.

---

## File map

- Create `client/src/audio/channelStrip.js`: one channel's Web Audio graph, safe parameter mapping, presets, impulse generation, meter access, and disposal.
- Create `client/src/audio/channelStrip.test.js`: fake-Web-Audio unit coverage for defaults, bounds, presets, independence, and disposal.
- Create `client/src/audio/devicePreferences.js`: preferred-device matching and local-storage persistence.
- Create `client/src/audio/devicePreferences.test.js`: USB PnP preference and fallback tests.
- Create `client/src/audio/phoneHost.js`: host-side audio-only peer lifecycle and remote-track callbacks.
- Create `client/src/audio/phoneHost.test.js`: offer, track, reconnect identity, and cleanup tests.
- Create `client/src/pages/PhoneMic.js`: controlled phone microphone page.
- Create `client/src/pages/PhoneMic.test.js`: permission, controls, signaling, and status tests.
- Modify `server.js`: contributor membership and role-specific phone signaling.
- Modify `server.test.js`: signaling authorization and disconnect coverage.
- Modify `client/src/App.js`: register `/mic/:roomId`.
- Modify `client/src/pages/Sender.js`: adopt channel strips, primary-device preference, phone pairing, inline per-channel effects, and master limiter.
- Modify `client/src/App.css`: phone page, pairing sheet, primary badge, and effects panel styles.
- Modify `.gitignore`: ignore `.superpowers/` visual-companion artifacts.

### Task 1: Preferred local audio device

**Files:**
- Create: `client/src/audio/devicePreferences.js`
- Create: `client/src/audio/devicePreferences.test.js`

- [ ] **Step 1: Write failing selection and persistence tests**

```js
import { choosePreferredInput, loadAudioPreferences, saveAudioPreferences } from './devicePreferences';

describe('choosePreferredInput', () => {
  const devices = [
    { deviceId: 'built-in', label: 'MacBook Air Microphone' },
    { deviceId: 'usb', label: 'USB PnP Audio Device' },
  ];

  test('uses an available saved device first', () => {
    expect(choosePreferredInput(devices, { deviceId: 'built-in' }).deviceId).toBe('built-in');
  });

  test('prefers USB PnP when there is no available saved device', () => {
    expect(choosePreferredInput(devices, { deviceId: 'missing' }).deviceId).toBe('usb');
  });

  test('returns null to request the browser default when USB PnP is absent', () => {
    expect(choosePreferredInput(devices.slice(0, 1), null)).toBeNull();
  });
});

test('preferences round-trip through storage', () => {
  const storage = { value: null, setItem: (_, value) => { storage.value = value; }, getItem: () => storage.value };
  saveAudioPreferences(storage, { deviceId: 'usb', label: 'USB PnP Audio Device' });
  expect(loadAudioPreferences(storage)).toEqual({ deviceId: 'usb', label: 'USB PnP Audio Device' });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `cd client && CI=true npm test -- --runInBand src/audio/devicePreferences.test.js`

Expected: FAIL because `./devicePreferences` does not exist.

- [ ] **Step 3: Implement deterministic preference helpers**

```js
const STORAGE_KEY = 'streamlink-audio-preferences-v1';

export function choosePreferredInput(devices, saved) {
  const savedDevice = saved?.deviceId && devices.find(device => device.deviceId === saved.deviceId);
  if (savedDevice) return savedDevice;
  return devices.find(device => /usb\s*pnp/i.test(device.label || '')) || null;
}

export function loadAudioPreferences(storage = window.localStorage) {
  try { return JSON.parse(storage.getItem(STORAGE_KEY)) || null; } catch (_) { return null; }
}

export function saveAudioPreferences(storage = window.localStorage, preference) {
  storage.setItem(STORAGE_KEY, JSON.stringify(preference));
}
```

- [ ] **Step 4: Re-run the focused test**

Run: `cd client && CI=true npm test -- --runInBand src/audio/devicePreferences.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the device-preference unit**

```bash
git add client/src/audio/devicePreferences.js client/src/audio/devicePreferences.test.js
git commit -m "feat: add preferred audio device selection"
```

### Task 2: Per-input DSP channel strip

**Files:**
- Create: `client/src/audio/channelStrip.js`
- Create: `client/src/audio/channelStrip.test.js`

- [ ] **Step 1: Write failing tests for neutral defaults, bounds, presets, and cleanup**

Use a fake audio context whose node factories return nodes with `connect`, `disconnect`, and AudioParam-like `{ value, setTargetAtTime }` properties. Assert:

```js
const strip = createChannelStrip(ctx, stream, { id: 'usb', kind: 'local' });
expect(strip.getSettings()).toEqual(DEFAULT_CHANNEL_SETTINGS);
strip.setSetting('bass', 99);
expect(strip.getSettings().bass).toBe(12);
strip.applyPreset('speech');
expect(strip.getSettings()).toMatchObject({ highPassEnabled: true, compressorEnabled: true });
strip.dispose();
expect(strip.nodes.source.disconnect).toHaveBeenCalled();
expect(stream.getTracks()[0].stop).toHaveBeenCalled();
```

Also create two strips, change only one, and assert the second retains neutral settings.

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd client && CI=true npm test -- --runInBand src/audio/channelStrip.test.js`

Expected: FAIL because the channel-strip exports do not exist.

- [ ] **Step 3: Implement settings, presets, generated impulse response, and safe setters**

Export these stable interfaces:

```js
export const DEFAULT_CHANNEL_SETTINGS = {
  preset: 'flat', highPassEnabled: false, highPassHz: 80,
  bass: 0, mid: 0, treble: 0, presence: 0,
  compressorEnabled: false, compressorThreshold: -24, compressorAmount: 0.5,
  gateEnabled: false, gateThreshold: -52,
  reverbEnabled: false, reverbRoomSize: 0.35, reverbMix: 0,
  delayEnabled: false, delayTime: 0.18, delayFeedback: 0.2, delayMix: 0,
  pan: 0,
};

export const CHANNEL_PRESETS = { flat: {}, speech: {}, vocal: {}, instrument: {}, room: {} };
```

Implement `createChannelStrip(context, stream, options)` and return `{ id, stream, nodes, input, output, analyser, getSettings, setSetting, applyPreset, reset, setFader, setMuted, tickGate, dispose }`. Build dry, delay-send, and convolver-send branches that recombine before the fader. Clamp EQ to `[-12, 12]`, pan to `[-1, 1]`, mixes and room size to `[0, 1]`, delay to `[0, 1]`, and feedback to `[0, 0.85]`. Use `setTargetAtTime(value, context.currentTime, 0.015)` for live parameters. Generate a stereo exponentially decaying impulse buffer from `reverbRoomSize` and the context sample rate.

Implement the gate as a smoothed fader multiplier updated by `tickGate(rms)`: below threshold targets `0.25`, above threshold targets `1`, with slower release than attack. Bypass targets `1`.

- [ ] **Step 4: Re-run channel-strip tests**

Run: `cd client && CI=true npm test -- --runInBand src/audio/channelStrip.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the DSP unit**

```bash
git add client/src/audio/channelStrip.js client/src/audio/channelStrip.test.js
git commit -m "feat: add per-input Web Audio DSP strip"
```

### Task 3: Phone contributor signaling server

**Files:**
- Modify: `server.js:34-139`
- Modify: `server.test.js`

- [ ] **Step 1: Add failing Socket.IO integration tests**

Add tests using the existing ephemeral server helper to prove:

```js
phone.emit('phone-mic-join', { roomId, contributorId: 'phone-a' }, ack);
expect(ack).toEqual({ ok: true, hostAvailable: true });
expect(hostEvent).toMatchObject({ contributorId: 'phone-a', phoneSocketId: expect.any(String) });

host.emit('phone-mic-offer', { phoneSocketId, contributorId: 'phone-a', sdp: offer });
expect(phoneOffer).toMatchObject({ hostId: host.id, contributorId: 'phone-a', sdp: offer });

phone.emit('phone-mic-answer', { hostId: host.id, contributorId: 'phone-a', sdp: answer });
expect(hostAnswer).toMatchObject({ phoneSocketId: phone.id, contributorId: 'phone-a', sdp: answer });
```

Also assert a non-host socket cannot relay `phone-mic-offer`, and host receives `phone-mic-disconnected` with the stable contributor ID when the phone disconnects.

- [ ] **Step 2: Run server tests and verify failure**

Run: `npm test -- --runInBand server.test.js`

Expected: FAIL from missing phone-mic events.

- [ ] **Step 3: Extend room state and add role-checked relays**

Every room is created through one helper returning:

```js
function createRoom() {
  return { sender: null, senderToken: null, viewers: new Set(), phoneMics: new Map() };
}
```

Implement `phone-mic-join`, `phone-mic-offer`, `phone-mic-answer`, and dedicated `phone-mic-ice-candidate` relays. Store `phoneMics.set(contributorId, socket.id)`, set `socket.data.role = 'phone-mic'`, and validate that offers originate from `room.sender` and answers/candidates originate from the registered participant. Update empty-room cleanup to include `phoneMics.size === 0`.

- [ ] **Step 4: Re-run server tests**

Run: `npm test -- --runInBand server.test.js`

Expected: PASS.

- [ ] **Step 5: Commit signaling**

```bash
git add server.js server.test.js
git commit -m "feat: add phone microphone signaling"
```

### Task 4: Host-side phone peer controller

**Files:**
- Create: `client/src/audio/phoneHost.js`
- Create: `client/src/audio/phoneHost.test.js`

- [ ] **Step 1: Write failing controller tests**

With fake socket and peer objects, assert that `phone-mic-available` creates one peer, adds an audio `recvonly` transceiver, emits an offer, sends ICE to the phone socket, forwards `ontrack` as `{ contributorId, stream }`, replaces a stale peer with the same contributor ID, and calls `onDisconnect` after `phone-mic-disconnected`.

- [ ] **Step 2: Run the focused test**

Run: `cd client && CI=true npm test -- --runInBand src/audio/phoneHost.test.js`

Expected: FAIL because `createPhoneHost` is missing.

- [ ] **Step 3: Implement the controller**

```js
export function createPhoneHost({ socket, createPeer, onTrack, onStatus }) {
  const peers = new Map();
  async function handleAvailable({ contributorId, phoneSocketId }) {
    remove(contributorId);
    const pc = createPeer();
    peers.set(contributorId, { pc, phoneSocketId });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = event => onTrack({ contributorId, stream: event.streams[0] });
    pc.onicecandidate = event => event.candidate && socket.emit('phone-mic-ice-candidate', {
      targetId: phoneSocketId, contributorId, candidate: event.candidate,
    });
    pc.onconnectionstatechange = () => onStatus(contributorId, pc.connectionState);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('phone-mic-offer', { phoneSocketId, contributorId, sdp: pc.localDescription });
  }
  async function handleAnswer({ contributorId, sdp }) {
    await peers.get(contributorId)?.pc.setRemoteDescription(sdp);
  }
  async function handleIce({ contributorId, candidate }) {
    await peers.get(contributorId)?.pc.addIceCandidate(candidate);
  }
  function remove(contributorId) {
    const entry = peers.get(contributorId);
    if (!entry) return;
    entry.pc.close();
    peers.delete(contributorId);
    onStatus(contributorId, 'disconnected');
  }
  function handleDisconnected({ contributorId }) { remove(contributorId); }
  socket.on('phone-mic-available', handleAvailable);
  socket.on('phone-mic-answer', handleAnswer);
  socket.on('phone-mic-ice-candidate', handleIce);
  socket.on('phone-mic-disconnected', handleDisconnected);
  function dispose() {
    socket.off('phone-mic-available', handleAvailable);
    socket.off('phone-mic-answer', handleAnswer);
    socket.off('phone-mic-ice-candidate', handleIce);
    socket.off('phone-mic-disconnected', handleDisconnected);
    [...peers.keys()].forEach(remove);
  }
  return { peers, remove, dispose };
}
```

Register and unregister named socket handlers. Never use anonymous callbacks with `off`, because they cannot be removed reliably.

- [ ] **Step 4: Re-run controller tests**

Run: `cd client && CI=true npm test -- --runInBand src/audio/phoneHost.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the controller**

```bash
git add client/src/audio/phoneHost.js client/src/audio/phoneHost.test.js
git commit -m "feat: add host phone microphone controller"
```

### Task 5: Controlled phone microphone page

**Files:**
- Create: `client/src/pages/PhoneMic.js`
- Create: `client/src/pages/PhoneMic.test.js`
- Modify: `client/src/App.js`
- Modify: `client/src/App.css`

- [ ] **Step 1: Write failing page behavior tests**

Mock `enumerateDevices`, `getUserMedia`, Socket.IO, and `RTCPeerConnection`. Verify the page starts at Permission needed, offers a microphone selector after permission, exposes gain and mute, does not request video, emits `phone-mic-join` with a stable local-storage contributor ID, adds only the processed audio track to its peer, and renders Connecting, Live, Reconnecting, and Disconnected from peer/socket transitions.

- [ ] **Step 2: Run the page tests and verify failure**

Run: `cd client && CI=true npm test -- --runInBand src/pages/PhoneMic.test.js`

Expected: FAIL because the page and route do not exist.

- [ ] **Step 3: Implement the `/mic/:roomId` route and controlled flow**

The page requests `{ audio: { deviceId }, video: false }`, builds a small local graph `MediaStreamSource -> GainNode -> MediaStreamDestination`, and publishes only the destination audio track. Keep the raw capture stream private and stop both raw and processed tracks on disconnect/unmount. Generate the contributor ID once with `crypto.randomUUID()` and persist it as `streamlink-phone-contributor-id`.

On `phone-mic-offer`, create the phone peer, add the processed track, apply the offer, create/set the answer, and emit `phone-mic-answer`. Relay dedicated ICE events. Rejoin after Socket.IO reconnect and use bounded retry delays of 1, 2, 4, 8, then 15 seconds.

Register in `App.js`:

```jsx
<Route path="/mic/:roomId" element={<PhoneMic />} />
```

Style a mobile-first single-column card with status badge, selector, meter, gain, mute, Connect, and Disconnect controls.

- [ ] **Step 4: Re-run page tests**

Run: `cd client && CI=true npm test -- --runInBand src/pages/PhoneMic.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the phone page**

```bash
git add client/src/pages/PhoneMic.js client/src/pages/PhoneMic.test.js client/src/App.js client/src/App.css
git commit -m "feat: add controlled phone microphone page"
```

### Task 6: Integrate DSP and primary selection into Sender

**Files:**
- Modify: `client/src/pages/Sender.js:232-365,1325-1440`
- Modify: `client/src/App.css:920-1005`

- [ ] **Step 1: Add failing integration-oriented component tests**

Create `client/src/pages/Sender.audio.test.js` with mocked media devices and channel strips. Verify an available USB PnP device is selected only when no saved device exists, changing the existing selector persists the new preference, each rendered channel has its own Effects expander, changing Bass on one channel calls only that strip, and designating Primary reorders/labels channels without removing either.

- [ ] **Step 2: Run the test and verify failure**

Run: `cd client && CI=true npm test -- --runInBand src/pages/Sender.audio.test.js`

Expected: FAIL because Sender still owns raw gain-only nodes.

- [ ] **Step 3: Replace raw per-input nodes with channel strips**

In `addAudioInputNode`, call `createChannelStrip(ctx, stream, { id, kind })`, connect `strip.output` to the master bus, and store the strip by ID. Replace direct gain mutation with `strip.setFader`, `strip.setMuted`, `strip.setSetting`, `strip.applyPreset`, and `strip.reset`. Meter polling reads time-domain RMS, calls `strip.tickGate(rms)`, and stores the displayed level.

Insert a master limiter between master gain and destination:

```js
const limiter = ctx.createDynamicsCompressor();
limiter.threshold.value = -3;
limiter.knee.value = 0;
limiter.ratio.value = 20;
limiter.attack.value = 0.003;
limiter.release.value = 0.12;
master.connect(limiter);
limiter.connect(dest);
```

Apply `choosePreferredInput` only during initial device resolution. Persist explicit selector changes. Do not auto-switch in the `devicechange` handler.

- [ ] **Step 4: Render inline effects and primary controls**

Add a Primary action/badge and a `<details className="mixer-effects">` per channel. Render preset buttons plus bounded controls for High-pass, Bass, Mid, Treble, Presence, Compressor threshold/amount, Gate threshold, Reverb room/mix, Delay time/feedback/mix, and Pan. Every label shows its value and every effect has an explicit bypass toggle. Add Reset effects.

- [ ] **Step 5: Re-run Sender audio tests**

Run: `cd client && CI=true npm test -- --runInBand src/pages/Sender.audio.test.js`

Expected: PASS.

- [ ] **Step 6: Commit local mixer DSP integration**

```bash
git add client/src/pages/Sender.js client/src/pages/Sender.audio.test.js client/src/App.css
git commit -m "feat: add per-input effects to sender mixer"
```

### Task 7: Integrate phone pairing and remote channel lifecycle

**Files:**
- Modify: `client/src/pages/Sender.js`
- Modify: `client/src/pages/Sender.audio.test.js`
- Modify: `client/src/App.css`

- [ ] **Step 1: Extend the failing Sender test**

Verify **Add phone mic** opens a pairing sheet containing `${window.location.origin}/mic/${roomId}`, generates a QR code, and initializes `createPhoneHost`. Simulate `onTrack({ contributorId: 'phone-a', stream })` and assert one `Phone Room Mic` channel is added. Simulate disconnect/reconnect and assert the local channel remains, the logical remote ID is reused, and its DSP settings are restored from local storage.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd client && CI=true npm test -- --runInBand src/pages/Sender.audio.test.js`

Expected: FAIL because pairing and host controller integration are absent.

- [ ] **Step 3: Add pairing state and host-controller lifecycle**

Create `phoneMicUrl` from the current origin and room ID. Initialize `createPhoneHost` only after the sender Socket.IO connection exists. On remote track, register a channel with stable ID `phone-${contributorId}` and kind `phone`; on disconnect, dispose only that remote strip and retain its serialized settings under `streamlink-channel-dsp-v1:phone:${contributorId}`. Reapply those settings when the same contributor reconnects.

- [ ] **Step 4: Render and style the pairing sheet**

Add a button under local inputs, a QR canvas generated with the existing `qrcode` dependency, the copyable phone URL, Waiting/Live channel status, and close action. Keep the existing viewer QR state separate so opening one sheet cannot overwrite the other.

- [ ] **Step 5: Re-run focused tests**

Run: `cd client && CI=true npm test -- --runInBand src/pages/Sender.audio.test.js`

Expected: PASS.

- [ ] **Step 6: Commit phone-host integration**

```bash
git add client/src/pages/Sender.js client/src/pages/Sender.audio.test.js client/src/App.css
git commit -m "feat: mix remote phone microphones"
```

### Task 8: Full verification and live two-device check

**Files:**
- Modify: `.gitignore`
- Modify only if failures require corrections: files from Tasks 1-7

- [ ] **Step 1: Ignore visual-companion artifacts**

Add `.superpowers/` to `.gitignore`, then confirm `git status --short` no longer lists the brainstorming session.

- [ ] **Step 2: Run all automated tests**

Run: `npm test -- --runInBand && cd client && CI=true npm test -- --runInBand`

Expected: both Jest suites exit 0 with no failed tests.

- [ ] **Step 3: Run the production build**

Run: `npm run build:client`

Expected: `Compiled successfully.` CRA warnings must be reviewed; new hook dependency or accessibility warnings introduced by this work must be fixed.

- [ ] **Step 4: Perform desktop host smoke checks**

Open `/send/<test-room>`, grant devices, and verify the existing selector remains configurable; USB PnP is preferred only when no saved available choice exists; two local devices cannot be added twice; every channel's effects change only its own strip; monitoring still follows the final limited mix.

- [ ] **Step 5: Perform the real second-phone check**

On the same network, scan **Add phone mic**, select the phone microphone, adjust local gain, connect, and verify the desktop shows `Phone Room Mic`. Listen through headphones and separately exercise Bass, Mid, Treble, Presence, high-pass, compressor, gate, reverb, delay, pan, presets, mute, and fader. Disconnect Wi-Fi briefly and verify the local source continues and the phone returns through Reconnecting.

- [ ] **Step 6: Verify the outgoing viewer mix**

Open `/view/<test-room>` in another browser context. Confirm both sources and their processing are audible, channel mute is independent, and loud simultaneous input is limited without obvious clipping.

- [ ] **Step 7: Commit verification fixes and housekeeping**

```bash
git add .gitignore client/src server.js server.test.js
git commit -m "test: verify phone mic and DSP mixer"
```

- [ ] **Step 8: Record final evidence**

Run `git status --short --branch`, `git log --oneline -10`, and preserve the exact automated test/build totals plus the manual device/browser combinations in the handoff.
