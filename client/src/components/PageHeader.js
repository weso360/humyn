import React from 'react';
import { Link } from 'react-router-dom';

function PageHeader() {
  return (
    <header className="page-header">
      <div className="page-header-content">
        <Link to="/" className="logo">Humyn</Link>
        <nav className="page-nav">
          <Link to="/editor">Editor</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/">Home</Link>
        </nav>
      </div>
    </header>
  );
}

export default PageHeader;