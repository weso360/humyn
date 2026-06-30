import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

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

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export default function Sender() {
  const { roomId } = useParams();
  const socketRef  = useRef(null);
  const streamRef  = useRef(null);
  const peersRef   = useRef({});
  const videoRef   = useRef(null);

  // Video
  const [preset, setPreset]       = useState(PRESETS[2]);
  const [customRes, setCustomRes] = useState(RESOLUTIONS[1]);
  const [customFps, setCustomFps] = useState(60);
  const [useCustom, setUseCustom] = useState(false);
  const [facingMode, setFacing]   = useState('environment');

  // Camera controls
  const [zoom, setZoom]                   = useState(1);
  const [maxZoom, setMaxZoom]             = useState(5);
  const [focusAuto, setFocusAuto]         = useState(true);
  const [focusDist, setFocusDist]         = useState(0);
  const [exposureAuto, setExposureAuto]   = useState(true);
  const [exposureComp, setExposureComp]   = useState(0);
  const [wbPreset, setWbPreset]           = useState('auto');
  const [torchOn, setTorchOn]             = useState(false);

  // Audio
  const [audioPreset, setAudioPreset]         = useState(AUDIO_PRESETS[1]);
  const [customAudio, setCustomAudio]         = useState({ sampleRate: 48000, channels: 2, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  const [useCustomAudio, setUseCustomAudio]   = useState(false);
  const [micMuted, setMicMuted]               = useState(false);

  // UI
  const [status, setStatus]           = useState('idle');
  const [viewerCount, setViewerCount] = useState(0);
  const [actualRes, setActualRes]     = useState('');
  const [viewerUrl, setViewerUrl]     = useState('');
  const [activeTab, setActiveTab]     = useState('video');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const port = window.location.port || '3000';
    setViewerUrl(`http://192.168.0.12:${port}/view/${roomId}`);
  }, [roomId]);

  const copyUrl = () => {
    navigator.clipboard.writeText(viewerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: fps, max: fps } },
        audio: audioC,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const vt = stream.getVideoTracks()[0];
      const s  = vt.getSettings();
      setActualRes(`${s.width}×${s.height} · ${Math.round(s.frameRate || 0)}fps`);

      const caps = vt.getCapabilities?.();
      if (caps?.zoom?.max) setMaxZoom(Math.floor(caps.zoom.max));

      await applyAdvanced(vt, opts);

      Object.values(peersRef.current).forEach(pc =>
        pc.getSenders().forEach(sender => {
          const t = stream.getTracks().find(t => t.kind === sender.track?.kind);
          if (t) sender.replaceTrack(t);
        })
      );

      stream.getAudioTracks().forEach(t => { t.enabled = !micMuted; });
      return stream;
    } catch (err) {
      alert(`Camera error: ${err.message}`);
      return null;
    }
  }, [applyAdvanced, micMuted]);

  const applyLive = useCallback(async (opts) => {
    const vt = streamRef.current?.getVideoTracks()[0];
    await applyAdvanced(vt, opts);
  }, [applyAdvanced]);

  const createPeer = useCallback((viewerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[viewerId] = pc;
    streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current));
    pc.onicecandidate = e => e.candidate && socketRef.current?.emit('ice-candidate', { targetId: viewerId, candidate: e.candidate });
    pc.onconnectionstatechange = () => {
      const states = Object.values(peersRef.current).map(p => p.connectionState);
      setStatus(states.some(s => s === 'connected') ? 'live' : 'connecting');
      setViewerCount(states.filter(s => s === 'connected').length);
    };
    return pc;
  }, []);

  useEffect(() => {
    const SIGNAL_URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://192.168.0.12:3001';
    const socket = io(SIGNAL_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => { socket.emit('sender-join', { roomId }); setStatus('connecting'); });
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

    const { width, height, fps } = PRESETS[2];
    startCamera(width, height, fps, 'environment', getAudioConstraints(AUDIO_PRESETS[1], {}, false), { zoom: 1, focusAuto: true, exposureAuto: true, wbPreset: 'auto', torchOn: false });

    return () => {
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

  const toggleMic = () => {
    const next = !micMuted; setMicMuted(next);
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const dotClass = status === 'live' ? 'hud-dot live' : status === 'connecting' ? 'hud-dot connecting' : 'hud-dot';
  const statusText = status === 'live' ? `LIVE · ${viewerCount}` : status === 'connecting' ? 'WAITING' : 'READY';

  return (
    <div className="sender-page">

      {/* ── VIEWFINDER ── */}
      <div className="sender-video-wrap">
        <video ref={videoRef} autoPlay playsInline muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

        {/* Top HUD */}
        <div className="hud-top">
          <div className="hud-badge">
            <div className={dotClass} />
            {statusText}
          </div>
          <div className="hud-room">{roomId}</div>
        </div>

        {/* Zoom strip */}
        <div className="zoom-strip">
          {ZOOM_STEPS.filter(z => z <= maxZoom).map(z => (
            <button key={z} className={`zoom-pill${zoom === z ? ' active' : ''}`} onClick={() => handleZoom(z)}>
              {z}×
            </button>
          ))}
        </div>

        {/* Bottom HUD */}
        <div className="hud-bottom">
          <span className="hud-stat">{actualRes}</span>
          <div className="hud-actions">
            <button className={`hud-icon-btn${micMuted ? ' mic-muted' : ''}`} onClick={toggleMic}>
              {micMuted ? '🔇' : '🎙'}
            </button>
            <button className={`hud-icon-btn${torchOn ? ' active' : ''}`} onClick={handleTorch}>
              🔦
            </button>
            <button className="hud-icon-btn" onClick={() => handleFacing(facingMode === 'environment' ? 'user' : 'environment')}>
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTROL DRAWER ── */}
      <div className="ctrl-drawer">

        {/* Tabs */}
        <div className="tab-bar">
          {[['video','📹 Video'], ['camera','🎛 Camera'], ['audio','🔊 Audio']].map(([id, label]) => (
            <button key={id} className={`tab-btn${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="tab-content">

          {/* ── VIDEO TAB ── */}
          {activeTab === 'video' && <>
            <div className="preset-grid">
              {PRESETS.map(p => (
                <button key={p.id} className={`preset-btn${!useCustom && preset.id === p.id ? ' active' : ''}`} onClick={() => applyPreset(p)}>
                  <span className="preset-label">{p.label}</span>
                  <span className="preset-desc">{p.desc}</span>
                </button>
              ))}
            </div>

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

            {/* Zoom */}
            <div className="cam-block">
              <div className="cam-block-header">
                <span className="cam-label">Zoom</span>
                <span className="cam-value">{zoom.toFixed(1)}×</span>
              </div>
              <input type="range" className="cam-slider" min={1} max={maxZoom} step={0.1} value={zoom}
                onChange={e => handleZoom(Number(e.target.value))} />
            </div>

            {/* Focus */}
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

            {/* Exposure */}
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

            {/* White Balance */}
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
          </>}

          {/* OBS URL */}
          <div className="obs-bar">
            <span className="obs-bar-url">{viewerUrl}</span>
            <button className={`obs-copy-btn${copied ? ' copied' : ''}`} onClick={copyUrl}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {actualRes && <p className="quality-info">{actualRes}</p>}

        </div>
      </div>
    </div>
  );
}
