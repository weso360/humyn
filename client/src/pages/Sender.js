import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';

const PRESETS = [
  { id: 'ultra',  label: '🔥 Ultra',     desc: '4K · 60fps',    width: 3840, height: 2160, fps: 60  },
  { id: 'high',   label: '⚡ High',       desc: '1080p · 120fps',width: 1920, height: 1080, fps: 120 },
  { id: 'medium', label: '✅ Medium',     desc: '1080p · 60fps', width: 1920, height: 1080, fps: 60  },
  { id: 'smooth', label: '🎬 Smooth',     desc: '1080p · 30fps', width: 1920, height: 1080, fps: 30  },
  { id: 'low',    label: '🔋 Low',        desc: '720p · 60fps',  width: 1280, height: 720,  fps: 60  },
  { id: 'data',   label: '📡 Data Saver', desc: '480p · 30fps',  width: 854,  height: 480,  fps: 30  },
];

const RESOLUTIONS = [
  { label: '4K (2160p)', width: 3840, height: 2160 },
  { label: '1080p HD',   width: 1920, height: 1080 },
  { label: '720p HD',    width: 1280, height: 720  },
  { label: '480p',       width: 854,  height: 480  },
];

const FPS_OPTIONS = [24, 25, 30, 48, 50, 60, 90, 120];

const AUDIO_PRESETS = [
  { id: 'studio', label: '🎙 Studio',   desc: '48kHz · Stereo',  sampleRate: 48000, channels: 2, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  { id: 'voice',  label: '🎤 Voice',    desc: '48kHz · Mono EC', sampleRate: 48000, channels: 1, echoCancellation: true,  noiseSuppression: true,  autoGainControl: true  },
  { id: 'music',  label: '🎵 Music',    desc: '44.1kHz · Stereo',sampleRate: 44100, channels: 2, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  { id: 'none',   label: '🔇 Off',      desc: 'No audio',        sampleRate: 48000, channels: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
];

const SAMPLE_RATES    = [48000, 44100, 16000];
const CHANNEL_OPTIONS = [{ label: 'Stereo', value: 2 }, { label: 'Mono', value: 1 }];

const WB_PRESETS = [
  { label: 'Auto',        value: 'auto' },
  { label: '☀️ Daylight', value: '5600' },
  { label: '☁️ Cloudy',   value: '6500' },
  { label: '💡 Tungsten', value: '3200' },
  { label: '🔵 Fluor.',   value: '4000' },
  { label: '🕯 Candle',   value: '2700' },
];

const ZOOM_STEPS = [1, 2, 3, 5];

// Software LUT-style looks — layered on top of the user's brightness/contrast/saturation sliders
const LUT_PRESETS = [
  { id: 'none',      label: 'Natural',   extra: ''                                        },
  { id: 'cinematic', label: 'Cinematic', extra: 'contrast(1.1) saturate(0.85) sepia(0.12)' },
  { id: 'vivid',      label: 'Vivid',     extra: 'saturate(1.45) contrast(1.15)'            },
  { id: 'moody',     label: 'Moody',     extra: 'contrast(1.2) saturate(0.7) brightness(0.9)' },
  { id: 'warm',      label: 'Warm',      extra: 'sepia(0.28) saturate(1.1) hue-rotate(-6deg)' },
  { id: 'cool',      label: 'Cool',      extra: 'hue-rotate(8deg) saturate(1.05)'          },
  { id: 'bw',        label: 'B&W',       extra: 'grayscale(1) contrast(1.1)'               },
  { id: 'vintage',   label: 'Vintage',   extra: 'sepia(0.4) contrast(0.9) saturate(0.8)'   },
];

const buildFilterString = (fx) => {
  // When a custom .cube LUT is active, color grading happens in the WebGL pass instead — only
  // pass brightness/contrast/saturation through here, skip the built-in preset's CSS approximation.
  if (fx.lut === 'custom') return `brightness(${fx.brightness}) contrast(${fx.contrast}) saturate(${fx.saturation})`;
  const preset = LUT_PRESETS.find(l => l.id === fx.lut) || LUT_PRESETS[0];
  return `brightness(${fx.brightness}) contrast(${fx.contrast}) saturate(${fx.saturation}) ${preset.extra}`.trim();
};

// ─── Custom .cube LUT support (Adobe/Blackmagic 3D LUT format) ──────────────────
export const parseCubeLut = (text) => {
  const lines = text.split(/\r?\n/);
  let size = 0;
  const data = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('LUT_3D_SIZE')) { size = parseInt(line.split(/\s+/)[1], 10); continue; }
    if (line.startsWith('LUT_1D_SIZE')) return null; // 1D LUTs not supported
    if (/^[A-Z]/.test(line)) continue; // TITLE, DOMAIN_MIN, DOMAIN_MAX, etc.
    const parts = line.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every(n => !Number.isNaN(n))) data.push(parts);
  }
  if (!size || data.length !== size * size * size) return null;
  return { size, data };
};

// Packs the N^3 RGB triplets into a 2D atlas (N*N wide, N tall) suitable for a WebGL texture —
// column = blueIndex*N + redIndex, row = greenIndex. Matches .cube's R-fastest, G, then B order.
export const buildLutAtlas = ({ size, data }) => {
  const width = size * size, height = size;
  const pixels = new Uint8Array(width * height * 4);
  let idx = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [rr, gg, bb] = data[idx++];
        const x = b * size + r, y = g;
        const p = (y * width + x) * 4;
        pixels[p]     = Math.round(Math.min(1, Math.max(0, rr)) * 255);
        pixels[p + 1] = Math.round(Math.min(1, Math.max(0, gg)) * 255);
        pixels[p + 2] = Math.round(Math.min(1, Math.max(0, bb)) * 255);
        pixels[p + 3] = 255;
      }
    }
  }
  return { width, height, pixels, size };
};

const LUT_VERTEX_SRC = `
  attribute vec2 aPos;
  varying vec2 vUV;
  void main() {
    vUV = (aPos + 1.0) * 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const LUT_FRAGMENT_SRC = `
  precision mediump float;
  varying vec2 vUV;
  uniform sampler2D uSource;
  uniform sampler2D uLut;
  uniform float uLutSize;
  uniform float uUseLut;
  uniform float uLutStrength;

  vec3 sampleLut(vec3 color) {
    float size = uLutSize;
    float sliceW = 1.0 / size;
    float bIdx = clamp(color.b, 0.0, 1.0) * (size - 1.0);
    float bFloor = floor(bIdx);
    float bCeil = min(bFloor + 1.0, size - 1.0);
    float mixF = bIdx - bFloor;

    float rCoord = (clamp(color.r, 0.0, 1.0) * (size - 1.0) + 0.5) / (size * size);
    float gCoord = (clamp(color.g, 0.0, 1.0) * (size - 1.0) + 0.5) / size;

    vec2 uv1 = vec2(rCoord + bFloor * sliceW, gCoord);
    vec2 uv2 = vec2(rCoord + bCeil * sliceW, gCoord);

    vec3 c1 = texture2D(uLut, uv1).rgb;
    vec3 c2 = texture2D(uLut, uv2).rgb;
    return mix(c1, c2, mixF);
  }

  void main() {
    vec4 src = texture2D(uSource, vUV);
    vec3 outColor = src.rgb;
    if (uUseLut > 0.5) {
      outColor = mix(src.rgb, sampleLut(src.rgb), uLutStrength);
    }
    gl_FragColor = vec4(outColor, src.a);
  }
`;

// WebGL clears its default drawing buffer after compositing. The visible canvas still looks
// correct, but captureStream() can otherwise read a cleared (black) frame in Chrome and OBS.
export const WEBGL_CAPTURE_OPTIONS = Object.freeze({
  preserveDrawingBuffer: true,
  alpha: false,
});

const compileShader = (gl, type, src) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
};

const createLutProgram = (gl) => {
  const vs = compileShader(gl, gl.VERTEX_SHADER, LUT_VERTEX_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, LUT_FRAGMENT_SRC);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
};

// STUN alone fails across symmetric NATs / restrictive networks (hotel wifi, some carriers,
// corporate firewalls) — TURN relays the media when a direct peer path can't be found. Swap in
// your own TURN provider's credentials via REACT_APP_TURN_* env vars for production use; falls
// back to the Open Relay Project's free public TURN servers otherwise.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: process.env.REACT_APP_TURN_URLS?.split(',') || [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: process.env.REACT_APP_TURN_USERNAME || 'openrelayproject',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'openrelayproject',
    },
  ]
};

export default function Sender() {
  const { roomId } = useParams();
  const socketRef  = useRef(null);
  const streamRef  = useRef(null);
  const peersRef   = useRef({});
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null); // hidden base 2D canvas — brightness/contrast/saturation/zoom/pan/built-in LUT
  const glCanvasRef = useRef(null); // visible canvas — composites base canvas through the custom-LUT WebGL shader
  const glRef      = useRef(null); // { gl, program, uniforms, sourceTex, lutTex, lutSize }
  const customLutRef = useRef(null); // { width, height, pixels, size } from an uploaded .cube file
  const rafRef     = useRef(null);
  const fxRef      = useRef({ brightness: 1, contrast: 1, saturation: 1, lut: 'none', digitalZoom: 1, panX: 0, panY: 0, lutStrength: 1 });
  const processedStreamRef = useRef(null);
  // Smoothed (eased) values the draw loop actually uses — chase the slider targets in fxRef for a fluid zoom/pan feel
  const zoomAnimRef = useRef(1);
  const panXAnimRef = useRef(0);
  const panYAnimRef = useRef(0);

  // Video
  const [preset, setPreset]       = useState(PRESETS[2]);
  const [customRes, setCustomRes] = useState(RESOLUTIONS[1]);
  const [customFps, setCustomFps] = useState(60);
  const [useCustom, setUseCustom] = useState(false);
  const [facingMode, setFacing]   = useState('environment');
  const presetRef    = useRef(preset);
  const useCustomRef = useRef(useCustom);

  // Camera controls
  const [zoom, setZoom]                   = useState(1);
  const [maxZoom, setMaxZoom]             = useState(5);
  const [focusAuto, setFocusAuto]         = useState(true);
  const [focusDist, setFocusDist]         = useState(0);
  const [exposureAuto, setExposureAuto]   = useState(true);
  const [exposureComp, setExposureComp]   = useState(0);
  const [wbPreset, setWbPreset]           = useState('auto');
  const [torchOn, setTorchOn]             = useState(false);

  // Digital effects (canvas pipeline — works on any camera, hardware or not)
  const [fx, setFx] = useState({ brightness: 1, contrast: 1, saturation: 1, lut: 'none', digitalZoom: 1, panX: 0, panY: 0, lutStrength: 1 });
  const [customLutName, setCustomLutName] = useState('');
  const [lutError, setLutError] = useState('');

  // Audio
  const [audioPreset, setAudioPreset]         = useState(AUDIO_PRESETS[1]);
  const [customAudio, setCustomAudio]         = useState({ sampleRate: 48000, channels: 2, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  const [useCustomAudio, setUseCustomAudio]   = useState(false);

  // Audio mixer — multiple inputs (camera mic + any extras) mixed via Web Audio into one output track
  const audioCtxRef       = useRef(null);
  const mixDestRef        = useRef(null); // MediaStreamAudioDestinationNode — .stream's audio track is what's sent to viewers
  const masterGainNodeRef = useRef(null);
  const audioNodesRef     = useRef({}); // id -> { source, gainNode, analyser, stream }
  const monitorAudioElRef = useRef(null); // hidden <audio> for headphone monitoring (never sent to viewers)
  const [audioInputs, setAudioInputs]         = useState([]); // [{ id, label, gain, muted, isCamera }]
  const [levels, setLevels]                   = useState({}); // id -> 0..1 meter level
  const [masterGain, setMasterGain]           = useState(1);
  const [monitorEnabled, setMonitorEnabled]   = useState(false);
  const [monitorDeviceId, setMonitorDeviceId] = useState('');
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [audioInputError, setAudioInputError] = useState('');
  const CAMERA_MIC_ID = 'camera-mic';

  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const dest = ctx.createMediaStreamDestination();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(dest);
    audioCtxRef.current = ctx;
    mixDestRef.current = dest;
    masterGainNodeRef.current = master;
    return ctx;
  }, []);

  const removeAudioInputNode = useCallback((id) => {
    const n = audioNodesRef.current[id];
    if (n) {
      try { n.source.disconnect(); n.gainNode.disconnect(); n.analyser.disconnect(); } catch (_) {}
      n.stream.getTracks().forEach(t => t.stop());
      delete audioNodesRef.current[id];
    }
    setAudioInputs(prev => prev.filter(i => i.id !== id));
  }, []);

  const addAudioInputNode = useCallback((id, stream, label, isCamera, deviceId) => {
    const ctx = ensureAudioGraph();
    const track = stream.getAudioTracks()[0];
    if (!ctx || !track) return;
    const source = ctx.createMediaStreamSource(stream);
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.connect(masterGainNodeRef.current);
    audioNodesRef.current[id] = { source, gainNode, analyser, stream };
    setAudioInputs(prev => [...prev.filter(i => i.id !== id), { id, label, gain: 1, muted: false, isCamera, deviceId }]);
  }, [ensureAudioGraph]);

  // Rewires the camera's own mic into the mixer whenever startCamera gets a fresh track (new device/restart)
  const syncCameraAudioInput = useCallback((stream, label) => {
    const track = stream.getAudioTracks()[0];
    const existing = audioNodesRef.current[CAMERA_MIC_ID];
    if (!track) { if (existing) removeAudioInputNode(CAMERA_MIC_ID); return; }
    if (existing && existing.stream.getAudioTracks()[0] === track) return; // unchanged, no-op
    if (existing) removeAudioInputNode(CAMERA_MIC_ID);
    addAudioInputNode(CAMERA_MIC_ID, stream, label || 'Camera Mic', true, track.getSettings().deviceId);
  }, [addAudioInputNode, removeAudioInputNode]);

  const addExtraAudioInput = useCallback(async (deviceId, label) => {
    setAudioInputError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
      addAudioInputNode(`extra-${deviceId}-${Date.now()}`, stream, label, false, deviceId);
    } catch (err) {
      setAudioInputError('Could not open that audio device.');
    }
  }, [addAudioInputNode]);

  // Keep each GainNode's actual gain in sync with the mute/volume state (single source of truth)
  useEffect(() => {
    audioInputs.forEach(inp => {
      const n = audioNodesRef.current[inp.id];
      if (n) n.gainNode.gain.value = inp.muted ? 0 : inp.gain;
    });
  }, [audioInputs]);

  useEffect(() => {
    if (masterGainNodeRef.current) masterGainNodeRef.current.gain.value = masterGain;
  }, [masterGain]);

  // Poll analyser levels for the per-input meters (throttled — full 60fps isn't needed for a VU meter)
  useEffect(() => {
    const id = setInterval(() => {
      const next = {};
      Object.entries(audioNodesRef.current).forEach(([key, n]) => {
        const buf = new Uint8Array(n.analyser.frequencyBinCount);
        n.analyser.getByteFrequencyData(buf);
        next[key] = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
      });
      setLevels(next);
    }, 120);
    return () => clearInterval(id);
  }, []);

  // Headphone monitoring — plays the same mix sent to viewers, routed to a chosen output device,
  // entirely separate from the stream so the streamer can listen without affecting what viewers hear.
  useEffect(() => {
    ensureAudioGraph();
    if (!monitorAudioElRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      monitorAudioElRef.current = el;
    }
  }, [ensureAudioGraph]);

  useEffect(() => {
    const el = monitorAudioElRef.current;
    if (!el || !mixDestRef.current) return;
    el.srcObject = mixDestRef.current.stream;
    el.muted = !monitorEnabled;
    if (monitorEnabled) el.play().catch(() => {});
  }, [monitorEnabled, audioInputs.length]);

  useEffect(() => {
    const el = monitorAudioElRef.current;
    if (!el || typeof el.setSinkId !== 'function' || !monitorDeviceId) return;
    el.setSinkId(monitorDeviceId).catch(() => {});
  }, [monitorDeviceId]);

  // Device selection
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selVideoId, setSelVideoId]     = useState('');
  const [selAudioId, setSelAudioId]     = useState('');
  const selVideoIdRef                   = useRef('');
  const selAudioIdRef                   = useRef('');
  const [refreshingDevices, setRefreshingDevices] = useState(false);

  // Re-scans the device list — e.g. when Continuity Camera connects late or drops and reconnects.
  const refreshDevices = useCallback(async () => {
    setRefreshingDevices(true);
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devs.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devs.filter(d => d.kind === 'audioinput'));
      setAudioOutputDevices(devs.filter(d => d.kind === 'audiooutput'));
    } catch (_) {}
    setRefreshingDevices(false);
  }, []);

  // Auto-refresh the device list whenever the OS reports a device connect/disconnect —
  // catches Continuity Camera showing up late without needing a manual refresh.
  useEffect(() => {
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices);
  }, [refreshDevices]);

  // Connection quality — tracked per-viewer so one weak connection doesn't get averaged away
  // by others, and so each viewer's own encoding can be throttled independently.
  const [connQuality, setConnQuality]   = useState(null);
  const perPeerStatsRef                 = useRef({}); // viewerId -> { timer, prevBytes, prevTime, lowStreak, currentCapKbps }
  const [autoQuality, setAutoQuality]   = useState(true);
  const [autoDowngradeNotice, setAutoDowngradeNotice] = useState('');
  const autoQualityRef                  = useRef(true);
  const lowBitrateStreakRef             = useRef(0);
  const lastDowngradeRef                = useRef(0);

  // UI
  const [status, setStatus]           = useState('idle');
  const [viewerCount, setViewerCount] = useState(0);
  const [actualRes, setActualRes]     = useState('');
  const [viewerUrl, setViewerUrl]     = useState('');
  const [caps, setCaps]               = useState({}); // MediaTrackCapabilities snapshot
  const [activeTab, setActiveTab]     = useState('video');
  const [copied, setCopied]           = useState(false);
  const [showQr, setShowQr]           = useState(false);
  const [camError, setCamError]       = useState(null);
  const [roomTaken, setRoomTaken]     = useState(false);
  const [panelOpen, setPanelOpen]     = useState(true);
  const qrCanvasRef                   = useRef(null);

  // Local recording — records exactly what's being sent to viewers (processed video + mixed audio)
  const recorderRef       = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);

  useEffect(() => {
    const { protocol, hostname, port } = window.location;
    const hostWithPort = port ? `${hostname}:${port}` : hostname;
    setViewerUrl(`${protocol}//${hostWithPort}/view/${roomId}`);
  }, [roomId]);

  const copyUrl = () => {
    navigator.clipboard.writeText(viewerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Sync device ID state → refs so callbacks always see latest value
  useEffect(() => { selVideoIdRef.current = selVideoId; }, [selVideoId]);
  useEffect(() => { selAudioIdRef.current = selAudioId; }, [selAudioId]);
  useEffect(() => { fxRef.current = fx; }, [fx]);
  useEffect(() => { autoQualityRef.current = autoQuality; }, [autoQuality]);
  useEffect(() => { presetRef.current = preset; }, [preset]);
  useEffect(() => { useCustomRef.current = useCustom; }, [useCustom]);

  // Canvas draw loop: reads raw camera frames, applies brightness/contrast/saturation/LUT + digital zoom crop.
  // Runs continuously once the camera is live so the canvas.captureStream() output (sent to viewers) stays current.
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      ctx.filter = buildFilterString(fxRef.current);

      // Ease current zoom/pan toward the slider targets each frame — gives a smooth, cinematic
      // glide instead of an instant jump whenever the sliders move.
      zoomAnimRef.current += (fxRef.current.digitalZoom - zoomAnimRef.current) * 0.12;
      panXAnimRef.current += (fxRef.current.panX - panXAnimRef.current) * 0.12;
      panYAnimRef.current += (fxRef.current.panY - panYAnimRef.current) * 0.12;

      const z = zoomAnimRef.current;
      if (z > 1.001) {
        const sw = video.videoWidth / z, sh = video.videoHeight / z;
        const roomX = video.videoWidth - sw, roomY = video.videoHeight - sh;
        const sx = roomX / 2 + panXAnimRef.current * (roomX / 2);
        const sy = roomY / 2 + panYAnimRef.current * (roomY / 2);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
    renderGL();
    rafRef.current = requestAnimationFrame(drawFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time WebGL setup — compiles the LUT shader and creates the source/LUT textures.
  const initGL = useCallback(() => {
    const canvas = glCanvasRef.current;
    if (!canvas || glRef.current) return;
    const gl = canvas.getContext('webgl', WEBGL_CAPTURE_OPTIONS)
      || canvas.getContext('experimental-webgl', WEBGL_CAPTURE_OPTIONS);
    if (!gl) return;
    const program = createLutProgram(gl);
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    glRef.current = {
      gl, program,
      sourceTex: makeTex(),
      lutTex: makeTex(),
      uSource: gl.getUniformLocation(program, 'uSource'),
      uLut: gl.getUniformLocation(program, 'uLut'),
      uLutSize: gl.getUniformLocation(program, 'uLutSize'),
      uUseLut: gl.getUniformLocation(program, 'uUseLut'),
      uLutStrength: gl.getUniformLocation(program, 'uLutStrength'),
      lutSize: 0,
    };
  }, []);

  // Composites the base 2D canvas (brightness/contrast/zoom/pan/built-in look) through the
  // WebGL shader — applies the uploaded 3D LUT when one is active, otherwise passes through unchanged.
  const renderGL = useCallback(() => {
    const base = canvasRef.current;
    const glCanvas = glCanvasRef.current;
    const g = glRef.current;
    if (!base || !glCanvas || !g || !base.width || !base.height) return;
    if (glCanvas.width !== base.width || glCanvas.height !== base.height) {
      glCanvas.width = base.width;
      glCanvas.height = base.height;
    }
    const { gl, program, sourceTex, lutTex, uSource, uLut, uLutSize, uUseLut, uLutStrength } = g;
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.useProgram(program);

    // FLIP_Y is needed for the canvas source image (matches how <canvas>/<video> are read), but
    // must be OFF for the LUT atlas — that's a raw pixel buffer, not an image, and flipping it
    // scrambles the row order that encodes the green-channel index.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);
    gl.uniform1i(uSource, 0);

    const hasLut = fxRef.current.lut === 'custom' && customLutRef.current;
    if (hasLut) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, lutTex);
      if (g.lutSize !== customLutRef.current.size) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, customLutRef.current.width, customLutRef.current.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, customLutRef.current.pixels);
        g.lutSize = customLutRef.current.size;
      }
      gl.uniform1i(uLut, 1);
      gl.uniform1f(uLutSize, customLutRef.current.size);
      gl.uniform1f(uUseLut, 1.0);
      gl.uniform1f(uLutStrength, fxRef.current.lutStrength);
    } else {
      gl.uniform1f(uUseLut, 0.0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, []);

  useEffect(() => {
    initGL();
    if (glCanvasRef.current && !processedStreamRef.current) {
      processedStreamRef.current = glCanvasRef.current.captureStream(30);
    }
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame, initGL]);

  const getProcessedVideoTrack = useCallback(() => processedStreamRef.current?.getVideoTracks()[0] || null, []);

  // Records exactly what viewers receive — the processed (LUT/zoom/effects) video plus the mixed
  // audio bus — as a local safety net in case the stream drops or for post-production use.
  const startRecording = useCallback(() => {
    const videoTrack = getProcessedVideoTrack();
    const audioTrack = mixDestRef.current?.stream.getAudioTracks()[0];
    if (!videoTrack) return;
    const recordStream = new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const recorder = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined);
    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamlink-${roomId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingSecs(0);
    recordingTimerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
  }, [getProcessedVideoTrack, roomId]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  }, []);

  const uploadLut = useCallback((file) => {
    setLutError('');
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCubeLut(String(reader.result));
      if (!parsed) {
        setLutError('Could not read that .cube file — check it\'s a valid 3D LUT.');
        return;
      }
      customLutRef.current = buildLutAtlas(parsed);
      if (glRef.current) glRef.current.lutSize = 0; // force re-upload to GPU next frame
      setCustomLutName(file.name);
      setFx(f => ({ ...f, lut: 'custom' }));
    };
    reader.onerror = () => setLutError('Failed to read the file.');
    reader.readAsText(file);
  }, []);

  const removeLut = useCallback(() => {
    customLutRef.current = null;
    setCustomLutName('');
    setLutError('');
    setFx(f => (f.lut === 'custom' ? { ...f, lut: 'none' } : f));
  }, []);

  useEffect(() => {
    if (!showQr || !qrCanvasRef.current || !viewerUrl) return;
    QRCode.toCanvas(qrCanvasRef.current, viewerUrl, {
      width: 280,
      margin: 1,
      color: { dark: '#f0f0f8', light: '#0e0e16' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [showQr, viewerUrl]);

  const getActive = useCallback(() => {
    if (useCustom) return { width: customRes.width, height: customRes.height, fps: customFps };
    return { width: preset.width, height: preset.height, fps: preset.fps };
  }, [useCustom, customRes, customFps, preset]);

  const getAudioConstraints = useCallback((ap, ca, useCA) => {
    const a = useCA ? ca : ap;
    if (a.id === 'none') return false;
    return {
      sampleRate:       { ideal: a.sampleRate },
      channelCount:     { ideal: a.channels },
      echoCancellation: a.echoCancellation,
      noiseSuppression: a.noiseSuppression,
      autoGainControl:  a.autoGainControl,
    };
  }, []);

  const applyAdvanced = useCallback(async (track, opts = {}) => {
    if (!track?.applyConstraints) return;
    const c = {};
    if (opts.zoom !== undefined)    c.zoom = opts.zoom;
    c.focusMode         = opts.focusAuto ? 'continuous' : 'manual';
    if (!opts.focusAuto)            c.focusDistance = opts.focusDist ?? 0;
    c.exposureMode      = opts.exposureAuto ? 'continuous' : 'manual';
    if (!opts.exposureAuto)         c.exposureCompensation = opts.exposureComp ?? 0;
    c.whiteBalanceMode  = opts.wbPreset === 'auto' ? 'continuous' : 'manual';
    if (opts.wbPreset !== 'auto')   c.colorTemperature = Number(opts.wbPreset);
    if (opts.torchOn !== undefined) c.torch = opts.torchOn;
    try { await track.applyConstraints({ advanced: [c] }); } catch (_) {}
  }, []);

  const startCamera = useCallback(async (width, height, fps, facing, audioC, opts = {}) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      // Use specific device ID if selected, otherwise fall back to facingMode
      const aspectRatio = width / height;
      const videoConstraint = selVideoIdRef.current
        ? { deviceId: { exact: selVideoIdRef.current }, width: { ideal: width }, height: { ideal: height }, aspectRatio: { exact: aspectRatio }, frameRate: { ideal: fps, max: fps } }
        : { facingMode: facing, width: { ideal: width }, height: { ideal: height }, aspectRatio: { exact: aspectRatio }, frameRate: { ideal: fps, max: fps } };

      // Inject selected audio device ID if chosen
      let effectiveAudioC = audioC;
      if (selAudioIdRef.current && audioC !== false) {
        effectiveAudioC = typeof audioC === 'object' ? { ...audioC, deviceId: { exact: selAudioIdRef.current } } : { deviceId: { exact: selAudioIdRef.current } };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: effectiveAudioC,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const vt = stream.getVideoTracks()[0];
      const s  = vt.getSettings();
      const fpsRounded = Math.round(s.frameRate || 0);
      setActualRes(`${s.width}×${s.height} · ${fpsRounded}fps`);
      setCamError(null);

      // Re-enumerate after permissions granted so device labels are populated
      refreshDevices();

      // Tell viewers what they're actually seeing
      const label = useCustom
        ? `${customRes.label} · ${customFps}fps`
        : preset.label.replace(/^[^\s]+\s/, '');
      socketRef.current?.emit('stream-info', {
        roomId,
        width:  s.width,
        height: s.height,
        fps:    fpsRounded,
        label,
      });

      const trackCaps = vt.getCapabilities?.() || {};
      setCaps(trackCaps);
      if (trackCaps?.zoom?.max) setMaxZoom(Math.floor(trackCaps.zoom.max));

      await applyAdvanced(vt, opts);

      // Rewire the camera's mic into the audio mixer graph (no-op if the track hasn't actually changed)
      const camLabel = useCustom ? `${customRes.label} · ${customFps}fps` : preset.label.replace(/^[^\s]+\s/, '');
      syncCameraAudioInput(stream, `Camera Mic (${camLabel})`);

      // Video senders get the processed (canvas) track; audio senders get the mixed track from the audio mixer.
      const processedTrack = processedStreamRef.current?.getVideoTracks()[0];
      const mixedAudioTrack = mixDestRef.current?.stream.getAudioTracks()[0];
      Object.values(peersRef.current).forEach(pc =>
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === 'video' && processedTrack) { sender.replaceTrack(processedTrack); return; }
          if (sender.track?.kind === 'audio' && mixedAudioTrack) { sender.replaceTrack(mixedAudioTrack); return; }
          const t = stream.getTracks().find(t => t.kind === sender.track?.kind);
          if (t) sender.replaceTrack(t);
        })
      );

      return stream;
    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const notFound = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';
      setCamError({
        title: denied ? 'Camera blocked' : notFound ? 'No camera found' : 'Camera error',
        body:  denied
          ? 'Allow camera access in your browser settings, then refresh.'
          : notFound
            ? 'No camera detected on this device.'
            : err.message,
      });
      return null;
    }
  }, [applyAdvanced, useCustom, customRes, customFps, preset, roomId, syncCameraAudioInput, refreshDevices]);

  const applyLive = useCallback(async (opts) => {
    const vt = streamRef.current?.getVideoTracks()[0];
    await applyAdvanced(vt, opts);
  }, [applyAdvanced]);

  // Polls stats for ONE viewer's connection independently — a mesh topology (one RTCPeerConnection
  // per viewer) means each viewer's downlink is genuinely separate, so a struggling viewer gets its
  // own sender bitrate capped via setParameters rather than punishing everyone else's quality.
  const startStatsPolling = useCallback((pc, viewerId) => {
    const bucket = { prevBytes: 0, prevTime: 0, lowStreak: 0, highStreak: 0, capKbps: null };
    perPeerStatsRef.current[viewerId] = bucket;

    bucket.timer = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        stats.forEach(r => {
          if (r.type === 'outbound-rtp' && r.kind === 'video') {
            const now = Date.now();
            if (bucket.prevTime > 0 && r.bytesSent >= bucket.prevBytes) {
              const mbps = (r.bytesSent - bucket.prevBytes) * 8 / ((now - bucket.prevTime) / 1000) / 1_000_000;
              setConnQuality({ bitrate: mbps });

              // Per-viewer throttle: cap just this connection's bitrate first — cheap, fast,
              // and doesn't affect any other viewer or the shared camera resolution.
              if (mbps < 0.4) { bucket.lowStreak += 1; bucket.highStreak = 0; }
              else if (bucket.capKbps && mbps * 1000 > bucket.capKbps * 1.5) { bucket.highStreak += 1; bucket.lowStreak = 0; }
              else { bucket.lowStreak = 0; bucket.highStreak = 0; }

              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && bucket.lowStreak >= 2) {
                const nextCap = Math.max(150, Math.round((bucket.capKbps || 2500) * 0.6));
                const params = sender.getParameters();
                params.encodings = params.encodings?.length ? params.encodings : [{}];
                params.encodings[0].maxBitrate = nextCap * 1000;
                sender.setParameters(params).catch(() => {});
                bucket.capKbps = nextCap;
                bucket.lowStreak = 0;
              } else if (sender && bucket.highStreak >= 3 && bucket.capKbps) {
                // Connection recovered — let this viewer's quality climb back up.
                const params = sender.getParameters();
                if (params.encodings?.[0]) delete params.encodings[0].maxBitrate;
                sender.setParameters(params).catch(() => {});
                bucket.capKbps = null;
                bucket.highStreak = 0;
              }

              // Global auto-downgrade: if this viewer's connection can't sustain even a modest
              // bitrate for a sustained stretch, step the shared camera preset down one tier.
              if (autoQualityRef.current && !useCustomRef.current) {
                const idx = PRESETS.findIndex(p => p.id === presetRef.current.id);
                const canDowngrade = idx >= 0 && idx < PRESETS.length - 1;
                const cooledDown = now - lastDowngradeRef.current > 15000;

                if (lowBitrateStreakRef.current >= 3 && canDowngrade && cooledDown) {
                  const next = PRESETS[idx + 1];
                  lowBitrateStreakRef.current = 0;
                  lastDowngradeRef.current = now;
                  setAutoDowngradeNotice(`Auto-dropped to ${next.desc} — weak connection`);
                  setTimeout(() => setAutoDowngradeNotice(''), 5000);
                  applyPreset(next);
                } else if (mbps < 0.4) {
                  lowBitrateStreakRef.current += 1;
                } else {
                  lowBitrateStreakRef.current = 0;
                }
              }
            }
            bucket.prevBytes = r.bytesSent;
            bucket.prevTime = now;
          }
        });
      } catch (_) {}
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStatsPolling = useCallback((viewerId) => {
    clearInterval(perPeerStatsRef.current[viewerId]?.timer);
    delete perPeerStatsRef.current[viewerId];
  }, []);

  const createPeer = useCallback((viewerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[viewerId] = pc;
    // Send the processed (canvas) video track — carries brightness/contrast/LUT/digital zoom to viewers.
    const processedTrack = getProcessedVideoTrack();
    if (processedTrack) pc.addTrack(processedTrack, streamRef.current);
    if (!processedTrack) streamRef.current?.getVideoTracks().forEach(t => pc.addTrack(t, streamRef.current));
    // Send the mixed audio track — combines every audio input (camera mic + any extras) with their gain/mute applied.
    const mixedAudioTrack = mixDestRef.current?.stream.getAudioTracks()[0];
    if (mixedAudioTrack) pc.addTrack(mixedAudioTrack, mixDestRef.current.stream);
    else streamRef.current?.getAudioTracks().forEach(t => pc.addTrack(t, streamRef.current));
    pc.onicecandidate = e => e.candidate && socketRef.current?.emit('ice-candidate', { targetId: viewerId, candidate: e.candidate });
    pc.onconnectionstatechange = () => {
      const states = Object.values(peersRef.current).map(p => p.connectionState);
      setStatus(states.some(s => s === 'connected') ? 'live' : 'connecting');
      setViewerCount(states.filter(s => s === 'connected').length);
      if (pc.connectionState === 'connected') startStatsPolling(pc, viewerId);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        stopStatsPolling(viewerId);
        if (Object.keys(perPeerStatsRef.current).length === 0) setConnQuality(null);
      }
    };
    return pc;
  }, [startStatsPolling, stopStatsPolling, getProcessedVideoTrack]);

  useEffect(() => {
    const SIGNAL_URL = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : `${window.location.protocol}//${window.location.hostname}:3001`;
    const socket = io(SIGNAL_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    const tokenKey = `streamlink-sender-token-${roomId}`;
    socket.on('connect', () => {
      setStatus('connecting');
      const storedToken = localStorage.getItem(tokenKey) || undefined;
      socket.emit('sender-join', { roomId, token: storedToken }, (res) => {
        if (!res?.ok) {
          setRoomTaken(true);
          return;
        }
        setRoomTaken(false);
        if (res.token) localStorage.setItem(tokenKey, res.token);
        const { width, height, fps } = PRESETS[2];
        startCamera(width, height, fps, 'environment', getAudioConstraints(AUDIO_PRESETS[1], {}, false), { zoom: 1, focusAuto: true, exposureAuto: true, wbPreset: 'auto', torchOn: false });
      });
    });
    socket.on('create-offer', async ({ viewerId }) => {
      const pc = createPeer(viewerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { viewerId, sdp: pc.localDescription });
    });
    socket.on('answer', async ({ viewerId, sdp }) => {
      const pc = peersRef.current[viewerId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });
    socket.on('ice-candidate', async ({ fromId, candidate }) => {
      const pc = peersRef.current[fromId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      Object.values(perPeerStatsRef.current).forEach(b => clearInterval(b.timer));
      perPeerStatsRef.current = {};
      clearInterval(recordingTimerRef.current);
      recorderRef.current?.stop();
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      streamRef.current?.getTracks().forEach(t => t.stop());
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentOpts = useCallback(() => ({ zoom, focusAuto, focusDist, exposureAuto, exposureComp, wbPreset, torchOn }), [zoom, focusAuto, focusDist, exposureAuto, exposureComp, wbPreset, torchOn]);

  const restart = useCallback(async (overrides = {}) => {
    const { width, height, fps } = getActive();
    const audioC = getAudioConstraints(audioPreset, customAudio, useCustomAudio);
    await startCamera(width, height, fps, facingMode, audioC, { ...currentOpts(), ...overrides });
  }, [getActive, getAudioConstraints, audioPreset, customAudio, useCustomAudio, facingMode, startCamera, currentOpts]);

  const applyPreset = async (p) => {
    setPreset(p); setUseCustom(false);
    await startCamera(p.width, p.height, p.fps, facingMode, getAudioConstraints(audioPreset, customAudio, useCustomAudio), currentOpts());
  };

  const applyCustomVideo = async (res, fps) => {
    setUseCustom(true);
    await startCamera(res.width, res.height, fps, facingMode, getAudioConstraints(audioPreset, customAudio, useCustomAudio), currentOpts());
  };

  const handleZoom = async (v) => { setZoom(v); await applyLive({ ...currentOpts(), zoom: v }); };
  const handleFocus = async (auto, dist) => { setFocusAuto(auto); if (dist !== undefined) setFocusDist(dist); await applyLive({ ...currentOpts(), focusAuto: auto, focusDist: dist ?? focusDist }); };
  const handleExposure = async (auto, comp) => { setExposureAuto(auto); if (comp !== undefined) setExposureComp(comp); await applyLive({ ...currentOpts(), exposureAuto: auto, exposureComp: comp ?? exposureComp }); };
  const handleWB = async (val) => { setWbPreset(val); await applyLive({ ...currentOpts(), wbPreset: val }); };
  const handleTorch = async () => { const next = !torchOn; setTorchOn(next); await applyLive({ ...currentOpts(), torchOn: next }); };
  const handleFacing = async (f) => { setFacing(f); await restart({ facingMode: f }); };

  const applyAudioPreset = async (ap) => {
    setAudioPreset(ap); setUseCustomAudio(false);
    const { width, height, fps } = getActive();
    await startCamera(width, height, fps, facingMode, getAudioConstraints(ap, customAudio, false), currentOpts());
  };

  const applyCustomAudio = async (newAudio) => {
    setCustomAudio(newAudio); setUseCustomAudio(true);
    const { width, height, fps } = getActive();
    await startCamera(width, height, fps, facingMode, getAudioConstraints(audioPreset, newAudio, true), currentOpts());
  };

  const micMuted = audioInputs.find(i => i.id === CAMERA_MIC_ID)?.muted || false;
  const toggleMic = () => {
    setAudioInputs(prev => prev.map(i => i.id === CAMERA_MIC_ID ? { ...i, muted: !i.muted } : i));
  };

  const dotClass = status === 'live' ? 'hud-dot live' : status === 'connecting' ? 'hud-dot connecting' : 'hud-dot';
  const statusText = status === 'live' ? `LIVE · ${viewerCount}` : status === 'connecting' ? 'WAITING' : 'READY';

  const has = {
    zoom:     !!(caps?.zoom?.max && caps.zoom.max > 1),
    focus:    Array.isArray(caps?.focusMode)        && caps.focusMode.includes('manual'),
    exposure: Array.isArray(caps?.exposureMode)     && caps.exposureMode.includes('manual'),
    wb:       Array.isArray(caps?.whiteBalanceMode) && caps.whiteBalanceMode.includes('manual'),
    torch:    !!caps?.torch,
  };
  const noCamControls = !has.zoom && !has.focus && !has.exposure && !has.wb && !has.torch;

  return (
    <div className={`sender-page${panelOpen ? ' panel-open' : ''}`}>

      {/* ── VIEWFINDER ── */}
      <div className="sender-video-wrap">
        {/* Raw camera feed — hidden, decodes frames for the canvas below */}
        <video ref={videoRef} autoPlay playsInline muted className="sender-raw-video" />
        {/* Base processing layer (brightness/contrast/zoom/pan/built-in look) — hidden, feeds the WebGL LUT pass */}
        <canvas ref={canvasRef} className="sender-raw-video" />
        {/* Final composited feed (+ custom .cube LUT) — this is what's shown and sent to viewers */}
        <canvas ref={glCanvasRef} className="sender-canvas"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

        {roomTaken && (
          <div className="cam-error">
            <div className="cam-error-icon">🔒</div>
            <div className="cam-error-title">Room already streaming</div>
            <div className="cam-error-body">Someone else is already sending to room {roomId}. Pick a different room, or wait for them to stop.</div>
          </div>
        )}

        {!roomTaken && camError && (
          <div className="cam-error">
            <div className="cam-error-icon">⚠</div>
            <div className="cam-error-title">{camError.title}</div>
            <div className="cam-error-body">{camError.body}</div>
            <button className="cam-error-retry" onClick={() => restart()}>Retry</button>
          </div>
        )}

        {/* Top HUD */}
        <div className="hud-top">
          <div className="hud-badge">
            <div className={dotClass} />
            {statusText}
          </div>
          <div className="hud-room">{roomId}</div>
        </div>

        {/* Zoom strip — only when hardware supports it */}
        {has.zoom && (
          <div className="zoom-strip">
            {ZOOM_STEPS.filter(z => z <= maxZoom).map(z => (
              <button key={z} className={`zoom-pill${zoom === z ? ' active' : ''}`} onClick={() => handleZoom(z)}>
                {z}×
              </button>
            ))}
          </div>
        )}

        {/* Bottom HUD */}
        <div className="hud-bottom">
          <div className="hud-stat-group">
            <span className="hud-stat">{actualRes}</span>
            {connQuality && (
              <span className={`hud-quality ${connQuality.bitrate >= 2 ? 'good' : connQuality.bitrate >= 0.5 ? 'ok' : 'poor'}`}>
                {connQuality.bitrate >= 1 ? `${connQuality.bitrate.toFixed(1)} Mbps` : `${Math.round(connQuality.bitrate * 1000)} Kbps`}
              </span>
            )}
            {isRecording && (
              <span className="hud-rec-badge">
                <span className="hud-rec-dot" /> REC {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:{String(recordingSecs % 60).padStart(2, '0')}
              </span>
            )}
            {autoDowngradeNotice && <span className="hud-quality ok">{autoDowngradeNotice}</span>}
          </div>
          <div className="hud-actions">
            <button className={`hud-icon-btn${isRecording ? ' active' : ''}`} onClick={() => (isRecording ? stopRecording() : startRecording())} aria-label={isRecording ? 'Stop recording' : 'Start local recording'}>
              {isRecording ? '⏹' : '⏺'}
            </button>
            <button className={`hud-icon-btn${micMuted ? ' mic-muted' : ''}`} onClick={toggleMic} aria-label={micMuted ? 'Unmute mic' : 'Mute mic'}>
              {micMuted ? '🔇' : '🎙'}
            </button>
            {has.torch && (
              <button className={`hud-icon-btn${torchOn ? ' active' : ''}`} onClick={handleTorch} aria-label="Toggle torch">
                🔦
              </button>
            )}
            <button className="hud-icon-btn" onClick={() => handleFacing(facingMode === 'environment' ? 'user' : 'environment')} aria-label="Flip camera">
              🔄
            </button>
            <button
              className={`hud-icon-btn settings-btn${panelOpen ? ' active' : ''}`}
              onClick={() => setPanelOpen(o => !o)}
              aria-label={panelOpen ? 'Close settings' : 'Open settings'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTROL SIDEBAR (overlays the viewfinder from the right) ── */}
      <aside className={`ctrl-sidebar${panelOpen ? ' open' : ''}`} aria-hidden={!panelOpen}>
        <div className="sidebar-header">
          <div className="tab-bar">
            {[['video','📹 Video'], ['camera','🎛 Camera'], ['audio','🔊 Audio']].map(([id, label]) => (
              <button key={id} className={`tab-btn${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <button className="sidebar-close" onClick={() => setPanelOpen(false)} aria-label="Close settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="tab-content">

          {/* ── VIDEO TAB ── */}
          {activeTab === 'video' && <>
            <div className="device-picker">
              <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Camera Source
                <button className="device-refresh-btn" onClick={refreshDevices} disabled={refreshingDevices}>
                  {refreshingDevices ? '…' : '↻'} Refresh
                </button>
              </div>
              {videoDevices.length > 0 ? (
                <select className="ctrl-select ctrl-select-full" value={selVideoId}
                  onChange={e => {
                    const id = e.target.value;
                    setSelVideoId(id);
                    selVideoIdRef.current = id;
                    restart();
                  }}>
                  <option value="">Auto (facing mode)</option>
                  {videoDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="device-picker-note">No extra cameras detected. If you're waiting on Continuity Camera or a phone app, tap Refresh once it's connected.</p>
              )}
            </div>
            <div className="preset-grid">
              {PRESETS.map(p => (
                <button key={p.id} className={`preset-btn${!useCustom && preset.id === p.id ? ' active' : ''}`} onClick={() => applyPreset(p)}>
                  <span className="preset-label">{p.label}</span>
                  <span className="preset-desc">{p.desc}</span>
                </button>
              ))}
            </div>

            <button className={`toggle-btn${autoQuality ? ' on' : ''}`} style={{ width: '100%', marginBottom: '0.7rem' }}
              onClick={() => setAutoQuality(a => !a)}>
              {autoQuality ? '📶 Auto Quality: On' : '📶 Auto Quality: Off'}
            </button>
            {autoQuality && (
              <p className="device-picker-note" style={{ marginTop: '-0.4rem', marginBottom: '0.7rem' }}>
                Automatically drops one preset tier if your connection can't sustain the current bitrate.
              </p>
            )}

            <details className="custom-details">
              <summary>Custom resolution & FPS</summary>
              <div className="custom-details-body">
                <div className="ctrl-row">
                  <select className="ctrl-select" value={customRes.label}
                    onChange={e => { const r = RESOLUTIONS.find(r => r.label === e.target.value); setCustomRes(r); applyCustomVideo(r, customFps); }}>
                    {RESOLUTIONS.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                  </select>
                  <select className="ctrl-select" value={customFps}
                    onChange={e => { const f = Number(e.target.value); setCustomFps(f); applyCustomVideo(customRes, f); }}>
                    {FPS_OPTIONS.map(f => <option key={f} value={f}>{f} fps</option>)}
                  </select>
                </div>
              </div>
            </details>
          </>}

          {/* ── CAMERA TAB ── */}
          {activeTab === 'camera' && <>

            {noCamControls && (
              <div className="cam-unsupported">
                <div className="cam-unsupported-title">No optical controls available</div>
                <div className="cam-unsupported-body">
                  This camera doesn't expose hardware zoom, focus, exposure or torch through the browser. Optical controls work on most phone cameras — try opening StreamLink on your phone. Meanwhile, use Digital Effects below — they work on any camera.
                </div>
              </div>
            )}

            {/* Digital Effects — software pipeline, works regardless of hardware support */}
            <div className="section-label" style={{ marginBottom: '0.4rem' }}>Digital Effects</div>
            <div className="preset-grid">
              {LUT_PRESETS.map(l => (
                <button key={l.id} className={`preset-btn${fx.lut === l.id ? ' active' : ''}`}
                  style={{ padding: '0.5rem 0.2rem' }}
                  onClick={() => setFx(f => ({ ...f, lut: l.id }))}>
                  <span className="preset-label" style={{ fontSize: '0.72rem' }}>{l.label}</span>
                </button>
              ))}
              {customLutName && (
                <button className={`preset-btn${fx.lut === 'custom' ? ' active' : ''}`}
                  style={{ padding: '0.5rem 0.2rem' }}
                  onClick={() => setFx(f => ({ ...f, lut: 'custom' }))}>
                  <span className="preset-label" style={{ fontSize: '0.72rem' }}>✨ Custom</span>
                </button>
              )}
            </div>

            <div className="lut-upload-row">
              <label className="lut-upload-btn">
                {customLutName ? 'Replace .cube LUT' : 'Upload .cube LUT'}
                <input type="file" accept=".cube" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLut(f); e.target.value = ''; }} />
              </label>
              {customLutName && (
                <button className="lut-remove-btn" onClick={removeLut} aria-label="Remove custom LUT">✕</button>
              )}
            </div>
            {customLutName && <p className="lut-filename">Loaded: {customLutName}</p>}
            {lutError && <p className="lut-error">{lutError}</p>}

            {fx.lut === 'custom' && (
              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">LUT Strength</span>
                  <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, lutStrength: 1 }))}>{Math.round(fx.lutStrength * 100)}%</button>
                </div>
                <input type="range" className="cam-slider" min={0} max={1} step={0.02} value={fx.lutStrength}
                  onChange={e => setFx(f => ({ ...f, lutStrength: Number(e.target.value) }))} />
              </div>
            )}

            <div className="cam-block">
              <div className="cam-block-header">
                <span className="cam-label">Brightness</span>
                <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, brightness: 1 }))}>{fx.brightness.toFixed(2)}×</button>
              </div>
              <input type="range" className="cam-slider" min={0.5} max={1.8} step={0.02} value={fx.brightness}
                onChange={e => setFx(f => ({ ...f, brightness: Number(e.target.value) }))} />
            </div>

            <div className="cam-block">
              <div className="cam-block-header">
                <span className="cam-label">Contrast</span>
                <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, contrast: 1 }))}>{fx.contrast.toFixed(2)}×</button>
              </div>
              <input type="range" className="cam-slider" min={0.5} max={1.8} step={0.02} value={fx.contrast}
                onChange={e => setFx(f => ({ ...f, contrast: Number(e.target.value) }))} />
            </div>

            <div className="cam-block">
              <div className="cam-block-header">
                <span className="cam-label">Saturation</span>
                <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, saturation: 1 }))}>{fx.saturation.toFixed(2)}×</button>
              </div>
              <input type="range" className="cam-slider" min={0} max={2} step={0.02} value={fx.saturation}
                onChange={e => setFx(f => ({ ...f, saturation: Number(e.target.value) }))} />
            </div>

            <div className="cam-block">
              <div className="cam-block-header">
                <span className="cam-label">Digital Zoom</span>
                <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, digitalZoom: 1 }))}>{fx.digitalZoom.toFixed(2)}×</button>
              </div>
              <input type="range" className="cam-slider" min={1} max={5} step={0.02} value={fx.digitalZoom}
                onChange={e => setFx(f => ({ ...f, digitalZoom: Number(e.target.value) }))} />
            </div>

            {fx.digitalZoom > 1.01 && <>
              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">Pan Horizontal</span>
                  <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, panX: 0 }))}>{fx.panX > 0 ? '+' : ''}{fx.panX.toFixed(2)}</button>
                </div>
                <input type="range" className="cam-slider" min={-1} max={1} step={0.02} value={fx.panX}
                  onChange={e => setFx(f => ({ ...f, panX: Number(e.target.value) }))} />
                <div className="cam-block-header">
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Left</span>
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Right</span>
                </div>
              </div>

              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">Pan Vertical</span>
                  <button className="cam-value" title="Reset" onClick={() => setFx(f => ({ ...f, panY: 0 }))}>{fx.panY > 0 ? '+' : ''}{fx.panY.toFixed(2)}</button>
                </div>
                <input type="range" className="cam-slider" min={-1} max={1} step={0.02} value={fx.panY}
                  onChange={e => setFx(f => ({ ...f, panY: Number(e.target.value) }))} />
                <div className="cam-block-header">
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Up</span>
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Down</span>
                </div>
              </div>
            </>}

            <button className="btn-full" onClick={() => setFx({ brightness: 1, contrast: 1, saturation: 1, lut: 'none', digitalZoom: 1, panX: 0, panY: 0, lutStrength: 1 })}>
              Reset effects
            </button>

            {/* Zoom */}
            {has.zoom && (
              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">Zoom</span>
                  <span className="cam-value">{zoom.toFixed(1)}×</span>
                </div>
                <input type="range" className="cam-slider" min={1} max={maxZoom} step={0.1} value={zoom}
                  onChange={e => handleZoom(Number(e.target.value))} />
              </div>
            )}

            {/* Focus */}
            {has.focus && (
              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">Focus</span>
                  <button className={`auto-toggle${focusAuto ? ' on' : ''}`} onClick={() => handleFocus(!focusAuto, focusDist)}>
                    {focusAuto ? 'Auto' : 'Manual'}
                  </button>
                </div>
                <input type="range" className="cam-slider" min={0} max={1} step={0.01} value={focusDist}
                  disabled={focusAuto} onChange={e => handleFocus(false, Number(e.target.value))} />
                <div className="cam-block-header">
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Near</span>
                  <span className="cam-label" style={{ fontSize: '0.58rem' }}>Far</span>
                </div>
              </div>
            )}

            {/* Exposure */}
            {has.exposure && (
              <div className="cam-block">
                <div className="cam-block-header">
                  <span className="cam-label">Exposure</span>
                  <button className={`auto-toggle${exposureAuto ? ' on' : ''}`} onClick={() => handleExposure(!exposureAuto, exposureComp)}>
                    {exposureAuto ? 'Auto' : 'Manual'}
                  </button>
                </div>
                <input type="range" className="cam-slider" min={-3} max={3} step={0.1} value={exposureComp}
                  disabled={exposureAuto} onChange={e => handleExposure(false, Number(e.target.value))} />
                <div className="cam-block-header">
                  <span className="cam-value" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>
                    {exposureAuto ? 'Auto' : `${exposureComp > 0 ? '+' : ''}${exposureComp.toFixed(1)} EV`}
                  </span>
                </div>
              </div>
            )}

            {/* White Balance */}
            {has.wb && (
              <div>
                <div className="section-label" style={{ marginBottom: '0.4rem' }}>White Balance</div>
                <div className="wb-grid">
                  {WB_PRESETS.map(w => (
                    <button key={w.value} className={`preset-btn${wbPreset === w.value ? ' active' : ''}`}
                      style={{ padding: '0.5rem 0.2rem' }} onClick={() => handleWB(w.value)}>
                      <span className="preset-label" style={{ fontSize: '0.7rem' }}>{w.label}</span>
                      {w.value !== 'auto' && <span className="preset-desc">{w.value}K</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {/* ── AUDIO TAB ── */}
          {activeTab === 'audio' && <>
            <div className="preset-grid">
              {AUDIO_PRESETS.map(ap => (
                <button key={ap.id} className={`preset-btn${!useCustomAudio && audioPreset.id === ap.id ? ' active' : ''}`}
                  onClick={() => applyAudioPreset(ap)}>
                  <span className="preset-label">{ap.label}</span>
                  <span className="preset-desc">{ap.desc}</span>
                </button>
              ))}
            </div>

            <details className="custom-details">
              <summary>Custom audio settings</summary>
              <div className="custom-details-body">
                <div className="ctrl-row">
                  <select className="ctrl-select" value={useCustomAudio ? customAudio.sampleRate : audioPreset.sampleRate}
                    onChange={e => applyCustomAudio({ ...customAudio, sampleRate: Number(e.target.value) })}>
                    {SAMPLE_RATES.map(r => <option key={r} value={r}>{r / 1000}kHz</option>)}
                  </select>
                  <select className="ctrl-select" value={useCustomAudio ? customAudio.channels : audioPreset.channels}
                    onChange={e => applyCustomAudio({ ...customAudio, channels: Number(e.target.value) })}>
                    {CHANNEL_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="toggle-row">
                  {[['echoCancellation','Echo Cancel'],['noiseSuppression','Noise Suppress'],['autoGainControl','Auto Gain']].map(([key, label]) => {
                    const val = useCustomAudio ? customAudio[key] : audioPreset[key];
                    return (
                      <button key={key} className={`toggle-btn${val ? ' on' : ''}`}
                        onClick={() => applyCustomAudio({ ...customAudio, [key]: !customAudio[key] })}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>

            <button className={`btn-full${micMuted ? ' muted' : ''}`} onClick={toggleMic}>
              {micMuted ? '🔇  Mic muted — tap to unmute' : '🎙  Mic live — tap to mute'}
            </button>

            {/* ── AUDIO MIXER — multiple inputs, individually gained/muted, mixed into one output track ── */}
            <div className="section-label" style={{ marginTop: '1rem', marginBottom: '0.4rem' }}>Audio Mixer</div>

            {audioInputs.map(inp => {
              const level = levels[inp.id] || 0;
              return (
                <div key={inp.id} className="mixer-row">
                  <div className="mixer-row-top">
                    <span className="mixer-label">{inp.isCamera ? '📷 ' : '🎚 '}{inp.label}</span>
                    <div className="mixer-row-actions">
                      <button className={`mixer-mute-btn${inp.muted ? ' on' : ''}`}
                        onClick={() => setAudioInputs(prev => prev.map(i => i.id === inp.id ? { ...i, muted: !i.muted } : i))}>
                        {inp.muted ? '🔇' : '🔊'}
                      </button>
                      <button className="mixer-remove-btn" onClick={() => removeAudioInputNode(inp.id)} aria-label="Remove input">✕</button>
                    </div>
                  </div>
                  <div className="mixer-meter-track">
                    <div className="mixer-meter-fill" style={{ width: `${Math.min(100, level * 130)}%` }} />
                  </div>
                  <input type="range" className="cam-slider" min={0} max={2} step={0.02} value={inp.gain}
                    onChange={e => setAudioInputs(prev => prev.map(i => i.id === inp.id ? { ...i, gain: Number(e.target.value) } : i))} />
                  {inp.isCamera && audioDevices.length > 0 && (
                    <select className="ctrl-select ctrl-select-full" style={{ marginTop: '0.5rem' }} value={selAudioId}
                      onChange={e => {
                        const id = e.target.value;
                        setSelAudioId(id);
                        selAudioIdRef.current = id;
                        restart();
                      }}>
                      <option value="">Default microphone</option>
                      {audioDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 8)}`}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}

            {audioDevices.filter(d => !audioInputs.some(i => i.deviceId === d.deviceId)).length > 0 && (
              <details className="custom-details">
                <summary>+ Add audio input</summary>
                <div className="custom-details-body">
                  {audioDevices.filter(d => !audioInputs.some(i => i.deviceId === d.deviceId)).map(d => (
                    <button key={d.deviceId} className="btn-full" style={{ marginBottom: '0.4rem' }}
                      onClick={() => addExtraAudioInput(d.deviceId, d.label || `Mic ${d.deviceId.slice(0, 8)}`)}>
                      + {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                    </button>
                  ))}
                </div>
              </details>
            )}
            {audioInputError && <p className="lut-error">{audioInputError}</p>}

            <div className="cam-block" style={{ marginTop: '0.7rem' }}>
              <div className="cam-block-header">
                <span className="cam-label">Master Volume</span>
                <button className="cam-value" title="Reset" onClick={() => setMasterGain(1)}>{Math.round(masterGain * 100)}%</button>
              </div>
              <input type="range" className="cam-slider" min={0} max={2} step={0.02} value={masterGain}
                onChange={e => setMasterGain(Number(e.target.value))} />
            </div>

            {/* ── MONITORING — listen to your own mix on headphones, independent of what viewers receive ── */}
            <div className="section-label" style={{ marginTop: '1rem', marginBottom: '0.4rem' }}>Monitor (Headphones)</div>
            <button className={`btn-full${monitorEnabled ? ' muted' : ''}`} onClick={() => setMonitorEnabled(m => !m)}>
              {monitorEnabled ? '🎧  Monitoring on — tap to stop' : '🎧  Tap to monitor mix'}
            </button>
            {audioOutputDevices.length > 0 && (
              <select className="ctrl-select ctrl-select-full" style={{ marginTop: '0.5rem' }}
                value={monitorDeviceId} onChange={e => setMonitorDeviceId(e.target.value)}>
                <option value="">Default output</option>
                {audioOutputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Output ${d.deviceId.slice(0, 8)}`}</option>
                ))}
              </select>
            )}
          </>}

          {/* OBS URL */}
          <div className="obs-bar">
            <span className="obs-bar-url">{viewerUrl}</span>
            <button className="obs-qr-btn" onClick={() => setShowQr(true)} aria-label="Show QR code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h2" />
              </svg>
            </button>
            <button className={`obs-copy-btn${copied ? ' copied' : ''}`} onClick={copyUrl}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {actualRes && <p className="quality-info">{actualRes}</p>}

        </div>
      </aside>

      {/* ── QR MODAL ── */}
      {showQr && (
        <div className="qr-overlay" onClick={() => setShowQr(false)}>
          <div className="qr-sheet" onClick={e => e.stopPropagation()}>
            <div className="qr-sheet-title">Scan to view</div>
            <div className="qr-sheet-sub">Open on any device · drop into OBS Browser Source</div>
            <div className="qr-canvas-wrap">
              <canvas ref={qrCanvasRef} className="qr-canvas" />
            </div>
            <div className="qr-room">{roomId}</div>
            <div className="qr-url">{viewerUrl}</div>
            <div className="qr-actions">
              <button className="qr-action-btn" onClick={copyUrl}>
                {copied ? '✓ Copied' : 'Copy URL'}
              </button>
              <button className="qr-action-btn primary" onClick={() => setShowQr(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
