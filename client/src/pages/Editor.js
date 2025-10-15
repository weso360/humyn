import React from 'react';

function Editor() {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Humyn Text Editor</h1>
        <p>Advanced text editing capabilities with AI assistance.</p>
        
        <div className="feature-grid">
          <div className="feature-card">
            <h3>🎨 Rich Text Editing</h3>
            <p>Full-featured text editor with formatting options and real-time collaboration.</p>
          </div>
          <div className="feature-card">
            <h3>🤖 AI Suggestions</h3>
            <p>Get intelligent writing suggestions and style improvements as you type.</p>
          </div>
        </div>
        
        <div className="cta-section">
          <h2>Coming Soon</h2>
          <p>Our advanced AI editor is currently in development.</p>
          <button className="cta-btn">Get Early Access</button>
        </div>
      </div>
    </div>
  );
}

export default Editor;