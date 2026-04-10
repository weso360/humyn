import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import FeatureRequest from './pages/FeatureRequest';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Ethics from './pages/Ethics';
import Success from './pages/Success';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Editor from './pages/Editor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/feature-request" element={<FeatureRequest />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/ethics" element={<Ethics />} />
        <Route path="/success" element={<Success />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Router>
  );
}

export default App;
