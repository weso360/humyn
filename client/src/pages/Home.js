import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Home() {
  const [joinCode, setJoinCode] = useState('');
  const [mounted, setMounted]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const createRoom = () => navigate(`/send/${generateRoomId()}`);

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) navigate(`/view/${code}`);
  };

  return (
    <div className={`home${mounted ? ' mounted' : ''}`}>
      <div className="home-aurora" aria-hidden="true" />
      <div className="home-logo">
        <div className="home-logo-dot" />
        <h1>StreamLink</h1>
      </div>
      <p className="tagline">Phone camera → OBS. 4K. No app. No lag.</p>

      <div className="home-card">
        <button className="home-create-btn" onClick={createRoom}>
          <span className="home-create-btn-label">Start Streaming</span>
          <span className="home-create-btn-arrow">→</span>
        </button>

        <div className="home-divider"><span>or join a room</span></div>

        <div className="home-join-row">
          <input
            className="home-input"
            placeholder="ROOM CODE"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            maxLength={8}
          />
          <button
            className="home-join-btn"
            onClick={joinRoom}
            disabled={joinCode.trim().length < 4}
          >
            View →
          </button>
        </div>

        <p className="home-hint">
          Open on your phone to stream · Paste viewer URL into OBS as a Browser Source
        </p>
      </div>

      <p className="home-trust">
        Works with <span>OBS</span> · <span>vMix</span> · <span>Streamlabs</span> · Any browser source
      </p>
    </div>
  );
}
