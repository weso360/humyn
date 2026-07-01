import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Sender from './pages/Sender';
import Viewer from './pages/Viewer';
import PhoneMic from './pages/PhoneMic';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/send/:roomId" element={<Sender />} />
        <Route path="/view/:roomId" element={<Viewer />} />
        <Route path="/mic/:roomId" element={<PhoneMic />} />
      </Routes>
    </Router>
  );
}

export default App;
