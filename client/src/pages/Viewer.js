import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getSignalUrl } from '../signalUrl';

// See matching comment in Sender.js — TURN fallback for networks where a direct P2P path fails.
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

export function resolveRemoteStream(event, currentStream, MediaStreamCtor = MediaStream) {
  if (event.streams?.[0]) return event.streams[0];
  const stream = currentStream || new MediaStreamCtor();
  if (!stream.getTracks().some(track => track.id === event.track.id)) stream.addTrack(event.track);
  return stream;
}

export default function Viewer() {
  const { roomId } = useParams();
  const socketRef  = useRef(null);
  const pcRef      = useRef(null);
  const videoRef   = useRef(null);
  const remoteStreamRef = useRef(null);

  const [status, setStatus]   = useState('waiting'); // waiting | connecting | live | offline
  const [streamInfo, setStreamInfo] = useState(null);

  const togglePiP = () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (videoRef.current?.requestPictureInPicture) {
      videoRef.current.requestPictureInPicture().catch(() => {});
    }
  };

  useEffect(() => {
    const SIGNAL_URL = getSignalUrl();
    const socket = io(SIGNAL_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    // --- Create peer connection for receiving ---
    const createPeer = () => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const remoteStream = resolveRemoteStream(e, remoteStreamRef.current);
        remoteStreamRef.current = remoteStream;
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play().catch(() => {});
          setStatus('live');
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && pc._senderId) {
          socket.emit('ice-candidate', {
            targetId: pc._senderId,
            candidate: e.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setStatus('waiting');
        }
      };

      return pc;
    };

    socket.on('connect', () => {
      socket.emit('viewer-join', { roomId });
    });

    // Sender came online (or was already online)
    socket.on('sender-available', () => {
      setStatus('connecting');
      socket.emit('request-offer', { roomId });
    });

    // Received offer from sender
    socket.on('offer', async ({ senderId, sdp }) => {
      const pc = createPeer();
      pc._senderId = senderId;  // store so ICE candidates go to the right place

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', { senderId, sdp: pc.localDescription });
    });

    // ICE candidate from sender
    socket.on('ice-candidate', async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // ignore stale candidates
        }
      }
    });

    // Sender disconnected
    socket.on('sender-disconnected', () => {
      setStatus('offline');
      remoteStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    });

    // Stream quality metadata
    socket.on('stream-info', (info) => {
      setStreamInfo(info);
    });

    return () => {
      pcRef.current?.close();
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <div className="viewer-page">
      {/* Video always in DOM so srcObject assignment works in OBS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: status === 'live' ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {status !== 'live' && (
        <div className={`viewer-waiting state-${status}`}>
          <div className="viewer-halo" aria-hidden="true" />
          <div className="viewer-badge">
            <span className={`viewer-badge-dot status-${status}`} />
            {status === 'waiting'    && 'Waiting for sender'}
            {status === 'connecting' && 'Connecting'}
            {status === 'offline'    && 'Sender offline'}
          </div>
          <div className="viewer-room">{roomId}</div>
          <p className="viewer-sub">
            {status === 'waiting'    && 'Open StreamLink on your phone and use this room code to go live.'}
            {status === 'connecting' && 'Negotiating peer connection…'}
            {status === 'offline'    && 'Stream ended. Auto-reconnecting when sender returns.'}
          </p>
          <div className="viewer-retry" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
      )}

      {status === 'live' && streamInfo && (
        <div className="viewer-status">
          <span className="viewer-status-dot" />
          {streamInfo.width}×{streamInfo.height} · {streamInfo.fps}fps{streamInfo.label ? ` · ${streamInfo.label}` : ''}
        </div>
      )}

      {status === 'live' && document.pictureInPictureEnabled && (
        <button className="viewer-pip-btn" onClick={togglePiP} aria-label="Picture in picture">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  );
}
