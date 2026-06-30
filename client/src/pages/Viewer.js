import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export default function Viewer() {
  const { roomId } = useParams();
  const socketRef  = useRef(null);
  const pcRef      = useRef(null);
  const videoRef   = useRef(null);

  const [status, setStatus]   = useState('waiting'); // waiting | connecting | live | offline
  const [streamInfo, setStreamInfo] = useState(null);

  useEffect(() => {
    const SIGNAL_URL = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : `http://192.168.0.12:3001`;
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
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0];
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
        <div className="viewer-waiting">
          <div className="spinner" />
          <p>
            {status === 'waiting'    && `Waiting for sender in room ${roomId}…`}
            {status === 'connecting' && 'Connecting…'}
            {status === 'offline'    && 'Sender disconnected. Waiting…'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#444' }}>
            Room: {roomId}
          </p>
        </div>
      )}

      {status === 'live' && streamInfo && (
        <div className="viewer-status">
          {streamInfo.width}×{streamInfo.height} · {streamInfo.fps}fps · {streamInfo.label}
        </div>
      )}
    </div>
  );
}
