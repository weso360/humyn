# StreamLink

Turn a phone (or any webcam/capture device) into a wireless camera feed for OBS — sub-second WebRTC delivery, no app to install, no capture card required.

**This is not a broadcast/streaming platform.** StreamLink doesn't publish to YouTube/Twitch itself. It gives you two browser pages:

- **Sender** (`/send/:roomId`) — open this on the device with the camera (phone, laptop, capture device). This is where you pick resolution/fps, camera/mic devices, digital effects (LUTs, zoom, brightness), and the audio mixer.
- **Viewer** (`/view/:roomId`) — this URL is what you paste into **OBS as a Browser Source**. OBS pulls the live feed from this page; StreamLink never streams anywhere on its own. You do your actual broadcasting (to YouTube, Twitch, wherever) from OBS as normal, with the Sender's feed as just another Browser Source input alongside your other cameras/scenes.

## How a session works

1. Open `/send/<room-code>` on the camera device → grant camera/mic permission.
2. Copy the generated viewer URL (or scan the QR code) → paste it into an OBS Browser Source.
3. OBS now shows the live camera feed, with all effects (LUT, zoom, brightness/contrast) and the audio mix already baked in.
4. Adjust camera/audio settings live from the Sender page's sidebar — changes apply instantly without needing to touch OBS.

## Features

**Video**
- Resolution/FPS presets (4K60 down to 480p30) plus custom resolution
- Device picker — pick any enumerated camera (built-in, Continuity Camera, Iriun, NDI, capture cards), with a manual refresh + auto-detect on connect/disconnect
- Digital effects pipeline (GPU/WebGL): brightness, contrast, saturation, built-in color looks, **custom `.cube` 3D LUT upload** with adjustable strength, smooth digital zoom + pan
- Local recording of exactly what's being sent (`.webm` download)
- Auto Quality — automatically steps down a resolution tier if the connection can't sustain the current bitrate, plus per-viewer bitrate throttling so one weak connection doesn't drag down others

**Audio**
- Full mixer: multiple simultaneous audio inputs (camera mic + any other device), each with independent volume/mute and a live level meter
- Headphone monitoring — listen to the exact mix being sent, routed to any output device, without affecting the outgoing stream
- Presets for studio/voice/music plus custom sample rate/channels/echo-cancellation

**Reliability**
- STUN + TURN (fallback to a public relay, or bring your own via `REACT_APP_TURN_*` env vars) so connections survive symmetric NATs and restrictive networks
- Room-hijack protection — a room's viewer link can't be used by someone else to take over as the sender
- Auto-reconnect on refresh (same-tab sender reclaim via a stored token)

**Viewer page**
- Redesigned waiting/connecting/offline states with auto-reconnect
- Picture-in-Picture toggle
- Live resolution/fps/quality readout

## Quick Start

### Backend (signaling server)

```bash
npm install
npm start
# Signaling server runs on http://localhost:3001
```

### Frontend

```bash
cd client
npm install
npm start
# App runs on http://localhost:3000
```

### Development (both at once)

```bash
npm run dev
```

## Testing

```bash
# Server-side: signaling / sender-hijack-protection tests
npm test

# Client-side: LUT parser / atlas builder tests
cd client && npm test
```

## Configuration

### Environment Variables

```bash
PORT=3001                          # Signaling server port
NODE_ENV=production                # Environment mode

# Optional — override the default public TURN relay with your own provider
REACT_APP_TURN_URLS=turn:your-turn-host:3478
REACT_APP_TURN_USERNAME=your-username
REACT_APP_TURN_CREDENTIAL=your-credential
```

Without `REACT_APP_TURN_*` set, the app falls back to the Open Relay Project's free public TURN servers — fine for testing, not guaranteed for production-scale reliability.

## Architecture

- **Signaling only, no media relay.** `server.js` is a thin Socket.IO relay for room membership, SDP offer/answer, and ICE candidates. Actual video/audio never touches the server — it's peer-to-peer (or via TURN when direct P2P fails).
- **Mesh topology.** The Sender opens one dedicated `RTCPeerConnection` per viewer (not an SFU), so each viewer's connection quality and bitrate can be managed independently.
- **Effects pipeline.** Camera frames are drawn to a hidden 2D canvas (brightness/contrast/zoom/pan/built-in looks via `ctx.filter`), then composited through a WebGL shader pass for custom `.cube` LUT color grading. `canvas.captureStream()` on the final canvas is what actually gets sent to viewers — so every visual effect is baked into the outgoing stream, not just a local preview.
- **Audio mixer.** Every audio input (camera mic + any extras) runs through a Web Audio graph — `MediaStreamAudioSourceNode → GainNode → AnalyserNode → master GainNode → MediaStreamAudioDestinationNode` — and it's that single mixed destination track that's sent to viewers.

## File Structure

```
streamlink/
├── server.js                    # Socket.IO signaling server (rooms, offer/answer/ICE relay)
├── server.test.js               # Sender hijack-protection tests
├── package.json                 # Server dependencies
├── client/                      # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.js          # Room creation / join
│   │   │   ├── Sender.js        # Camera/mic capture, effects, mixer, WebRTC sender
│   │   │   ├── Sender.lut.test.js
│   │   │   └── Viewer.js        # The page you add as an OBS Browser Source
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
└── README.md
```

## License

MIT License - see LICENSE file for details.
