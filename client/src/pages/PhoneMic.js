import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getSignalUrl } from '../signalUrl';

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

export default function PhoneMic() {
  const { roomId } = useParams();
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const contributorIdRef = useRef('');
  const hostIdRef = useRef('');

  const [status, setStatus] = useState('ready');
  const [label, setLabel] = useState('2nd Room Mic');
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach(track => track.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const stream = streamRef.current;
    const track = stream?.getAudioTracks?.()[0];
    if (track) {
      track.enabled = !muted;
    }
  }, [muted]);

  useEffect(() => {
    const stream = streamRef.current;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!stream || !AudioCtx) return undefined;

    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const timer = window.setInterval(() => {
      analyser.getByteFrequencyData(buffer);
      const average = buffer.reduce((sum, value) => sum + value, 0) / buffer.length / 255;
      setLevel(average);
    }, 120);

    return () => {
      clearInterval(timer);
      source.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
    };
  }, [status]);

  const ensurePeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    streamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && hostIdRef.current) {
        socketRef.current?.emit('phone-mic-ice-candidate', {
          targetId: hostIdRef.current,
          contributorId: contributorIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('live');
      if (pc.connectionState === 'connecting') setStatus('connecting');
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setStatus('waiting');
      }
    };

    return pc;
  };

  const joinRoom = async () => {
    setError('');
    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = stream;
    } catch (err) {
      setError('Microphone permission is required on this phone.');
      setStatus('error');
      return;
    }

    const SIGNAL_URL = getSignalUrl();
    const socket = io(SIGNAL_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('phone-mic-join', { roomId, contributorId: contributorIdRef.current || undefined, label }, (response) => {
        if (!response?.ok) {
          setError('Could not join this stream room.');
          setStatus('error');
          return;
        }
        contributorIdRef.current = response.contributorId;
        setStatus(response.hostAvailable ? 'waiting' : 'waiting-host');
      });
    });

    socket.on('phone-mic-offer', async ({ hostId, contributorId, sdp }) => {
      try {
        contributorIdRef.current = contributorId;
        hostIdRef.current = hostId;
        setStatus('connecting');
        const pc = ensurePeer();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('phone-mic-answer', {
          hostId,
          contributorId,
          sdp: pc.localDescription,
        });
      } catch (_) {
        setError('The phone mic could not finish connecting.');
        setStatus('error');
      }
    });

    socket.on('phone-mic-ice-candidate', async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    });

    socket.on('sender-disconnected', () => {
      setStatus('waiting-host');
    });
  };

  return (
    <div className="phone-mic-page">
      <div className="phone-mic-card">
        <div className="phone-mic-kicker">StreamLink Room Mic</div>
        <h1>{roomId}</h1>
        <p className="phone-mic-copy">Use this phone as the separately controlled second-room microphone for the live stream.</p>

        <label className="phone-mic-field">
          <span>Label</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={32} placeholder="2nd Room Mic" />
        </label>

        <button className="phone-mic-start" onClick={joinRoom} disabled={status !== 'ready' && status !== 'error'}>
          {status === 'ready' || status === 'error' ? 'Start room mic' : 'Room mic active'}
        </button>

        <div className="phone-mic-status">
          <span className={`phone-mic-dot state-${status}`} />
          {status === 'ready' && 'Ready to join'}
          {status === 'requesting' && 'Requesting mic access'}
          {status === 'waiting-host' && 'Waiting for host stream'}
          {status === 'waiting' && 'Joined room, waiting for host mix'}
          {status === 'connecting' && 'Connecting to host'}
          {status === 'live' && 'Live in the host mixer'}
          {status === 'error' && 'Could not connect'}
        </div>

        <div className="phone-mic-meter">
          <div className="phone-mic-meter-fill" style={{ width: `${Math.min(100, level * 140)}%` }} />
        </div>

        <button className={`phone-mic-toggle${muted ? ' is-muted' : ''}`} onClick={() => setMuted((value) => !value)} disabled={!streamRef.current}>
          {muted ? 'Unmute phone mic' : 'Mute phone mic'}
        </button>

        {error && <p className="phone-mic-error">{error}</p>}
      </div>
    </div>
  );
}
