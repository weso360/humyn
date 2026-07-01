# Remote Phone Microphone and Per-Input Audio DSP Design

## Objective

Extend the sender's existing audio mixer so a local analog mixer exposed as a USB PnP microphone can be preferred as the primary source, while a second phone can join over Wi-Fi as a controlled room microphone. Every input must remain independently configurable and receive its own effects chain before the final broadcast mix.

## Scope

This change adds:

- A controlled, microphone-only phone route at `/mic/:roomId`.
- QR-based phone pairing from the sender's Audio Mixer.
- A remote phone audio channel in the existing host-side Web Audio mixer.
- A configurable primary-input preference without hard-coding USB PnP.
- Per-input EQ, dynamics, ambience, delay, stereo placement, and presets.
- A master safety limiter.
- Persistence, reconnect handling, and verification for two-device operation.

It does not add server-side media mixing, multi-room audio contribution, recording, or automatic feedback suppression.

## User Experience

### Primary local input

The existing microphone selector remains available on the local camera-mic channel. The application remembers the user's last selected primary device. If no saved selection is available, it prefers an available audio input whose label contains `USB PnP` (case-insensitive). Otherwise it uses the browser or operating-system default.

The preferred device may be changed at any time through the existing selector. A device reconnecting during a broadcast must not silently replace the active input. Any local or remote channel can be designated Primary; this controls channel ordering and labeling, not routing eligibility.

### Adding a phone microphone

The Audio Mixer includes an **Add phone mic** action. It opens a QR code and copyable URL for `/mic/:roomId`. The phone page provides:

- Microphone device selection when the browser exposes multiple inputs.
- A permission and readiness state.
- Local mute and input-gain controls.
- A clear Connect/Disconnect action.
- Connection status: Waiting, Permission needed, Connecting, Live, Reconnecting, or Disconnected.

The phone publishes audio only. Video is neither requested nor negotiated. The host labels the resulting channel as `Phone Room Mic`; channel renaming is outside this change.

### Mixer layout

Each mixer channel keeps its current label, meter, gain, mute, removal, and device controls. An inline expandable **Effects** section appears within every channel. Only expanded channels consume vertical space. This matches the current expandable custom-settings interaction.

## Audio Architecture

### Signaling and transport

The existing Socket.IO room signaling is extended with explicit phone-mic participant messages. The phone establishes an audio-only `RTCPeerConnection` with the sender host. The host receives the remote `MediaStreamTrack`, wraps it in a `MediaStream`, and registers it through the same channel lifecycle used by local inputs.

Phone signaling is distinct from viewer signaling so a phone contributor cannot be mistaken for an output viewer. Disconnects remove or mark the remote source without changing local channels. The phone stores a generated contributor ID in local storage; reconnecting with that ID restores the logical phone channel and its persisted effects.

### Per-input Web Audio graph

Each input is routed through a channel strip:

`MediaStreamSource -> trim -> high-pass -> bass EQ -> mid EQ -> treble EQ -> presence EQ -> compressor -> expander/gate -> pan -> dry/wet delay and reverb buses -> channel fader/mute -> analyser -> master bus`

The master bus routes through a safety limiter before the existing `MediaStreamAudioDestinationNode`. That destination remains the single outgoing audio track used by viewers and headphone monitoring.

Node ownership lives in a dedicated channel abstraction rather than expanding ad hoc node handling inside the sender component. A channel exposes bounded parameter setters, bypass/reset, disposal, and its output/analyser nodes.

### Effects and safe ranges

All effects start neutral or bypassed.

- **High-pass filter:** Off by default; adjustable cutoff suitable for speech and room-rumble removal.
- **Bass, Mid, Treble:** Three peaking/shelf bands, each adjustable from -12 dB to +12 dB.
- **Presence:** A bounded upper-mid boost/cut intended for speech intelligibility.
- **Compressor:** Bypass plus simplified Threshold and Amount controls mapped to safe `DynamicsCompressorNode` parameters.
- **Expander/noise gate:** A conservative analyser-driven gain envelope provides gentle downward expansion for idle-noise reduction, with attack and release smoothing that avoids abrupt speech chopping.
- **Reverb:** A generated impulse response through `ConvolverNode`, with Room Size and wet/dry Mix.
- **Delay:** Time, Feedback, and wet/dry Mix. Feedback is clamped below unity to prevent runaway output.
- **Pan/balance:** Uses `StereoPannerNode` where available and degrades to centered output otherwise.
- **Reset effects:** Returns the channel to a clean, neutral state.
- **Master limiter:** A final compressor/limiter configuration prevents clipping caused by summed sources.

Audio parameter changes use short automation ramps to avoid zipper noise and clicks. All values are clamped before reaching Web Audio nodes.

### Channel presets

The channel strip provides Flat, Speech, Vocal, Instrument, and Room Mic presets. Presets set an initial combination of filters and dynamics but remain fully editable. Applying a preset never changes device selection, channel gain, mute, primary designation, or phone connection state.

## State and Persistence

Persist locally:

- Preferred primary local device ID and label fallback.
- Primary channel type where meaningful.
- Per-device DSP settings for stable local device IDs.
- Per-channel-type DSP settings for remote phone microphones.

Do not persist active streams, connection identifiers, Socket.IO socket IDs, or temporary WebRTC state. If a stored device ID is unavailable, retain the preference for later display but use the safe default for the current session.

## Failure Handling

- Permission denial leaves the phone page usable and explains how to retry.
- A phone network drop enters Reconnecting and retries with bounded backoff.
- Host-side phone disconnect never stops or rebuilds the local primary stream.
- Duplicate phone connection attempts replace or reject the stale connection deterministically.
- Removed inputs disconnect every owned node and stop only tracks owned by that channel.
- Unsupported `setSinkId`, `StereoPannerNode`, or optional DSP behavior degrades without blocking the broadcast.
- DSP construction failure bypasses processing for that channel and surfaces a concise warning rather than losing its audio.

## Component Boundaries

- **Audio channel/DSP module:** Creates, updates, resets, and disposes one input graph.
- **Mixer state hook or controller:** Owns channels, primary designation, persistence, master bus, and meters.
- **Phone mic sender page:** Owns microphone permission, device selection, local controls, and audio-only peer negotiation.
- **Host phone signaling hook/controller:** Converts remote phone tracks into mixer channels and manages reconnect/disconnect state.
- **Mixer UI:** Renders existing channel controls plus expandable effects and phone-pairing UI.

The sender page coordinates these units but should not contain low-level DSP construction or peer-state transitions inline.

## Verification

Automated checks cover:

- DSP graph construction, neutral defaults, parameter clamping, reset, preset application, and disposal.
- Primary-device preference selection and fallback behavior.
- Mixer state independence between two channels.
- Phone signaling roles, duplicate handling, disconnect, and reconnect lifecycle.
- Production client build.

Manual two-device verification covers:

1. Select the analog mixer USB PnP device as the local primary input.
2. Pair a second phone by QR and select its microphone before connecting.
3. Confirm both meters move and both sources reach the viewer mix.
4. Change gain, mute, EQ, compressor, reverb, delay, and presets on one channel without changing the other.
5. Confirm Bass, Mid, Treble, presence, high-pass, pan, and room-mic behavior by listening on headphones.
6. Disconnect and reconnect the phone while the USB/local source continues uninterrupted.
7. Unplug and reconnect the preferred USB device and confirm there is no unexpected mid-broadcast switch.
8. Drive both sources loudly and confirm the master limiter prevents clipping.

## Success Criteria

- A controlled second phone can join the sender as an audio-only room microphone over Wi-Fi.
- The USB PnP input is preferred when possible but never hard-coded or made mandatory.
- The existing local device selector remains functional.
- At least two inputs mix simultaneously into the outgoing viewer audio track.
- Effects are independently adjustable per input and survive expected reconnects according to the persistence rules.
- Local audio continues when the remote phone disconnects.
- The final mix remains monitorable and protected by a master limiter.
