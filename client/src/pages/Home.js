import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Home() {
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const createRoom = () => navigate(`/send/${generateRoomId()}`);

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 4) navigate(`/view/${code}`);
  };

  return (
    <div className="home">
      <div className="home-logo">
        <div className="home-logo-dot" />
        <h1>StreamLink</h1>
      </div>
      <p className="tagline">Phone camera → OBS. 4K. No app. No lag.</p>

      <div className="home-card">
        <button className="home-create-btn" onClick={createRoom}>
          Start Streaming
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
          <button className="home-join-btn" onClick={joinRoom}>View →</button>
        </div>

        <p className="home-hint">
          Open on your phone to stream · Paste viewer URL into OBS as a Browser Source
        </p>
      </div>
    </div>
  );
}
