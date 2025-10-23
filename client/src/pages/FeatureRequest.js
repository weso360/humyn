import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';

function FeatureRequest() {
  const [formData, setFormData] = useState({
    type: 'feature',
    title: '',
    description: '',
    email: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert('Thank you for your submission! We\'ll review it shortly.');
        setFormData({ type: 'feature', title: '', description: '', email: '' });
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <PageHeader />
      <div className="page-content">
        <h1>Humyn Feature Request & Issue Report</h1>
        <p>Help us improve by sharing your ideas or reporting issues.</p>
        
        <form onSubmit={handleSubmit} className="request-form">
          <div className="form-group">
            <label>Type</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="improvement">Improvement Suggestion</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief description of your request"
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed description..."
              rows="6"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email (Optional)</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="your@email.com"
            />
          </div>
          
          <button type="submit">Submit Request</button>
        </form>
      </div>
    </div>
  );
}

export default FeatureRequest;