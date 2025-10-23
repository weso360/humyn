import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        setError('Access denied');
      }
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setReports(reports.filter(report => report._id !== id));
      } else {
        alert('Failed to delete report');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'feature': return '#3b82f6';
      case 'bug': return '#dc2626';
      case 'improvement': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader />
        <div className="page-content">
          <div className="loading">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader />
        <div className="page-content">
          <div className="error-message">
            <h3>Access Denied</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader />
      <div className="page-content">
        <h1>Feature Requests & Issue Reports</h1>
        <p className="last-updated">Manage user feedback and issues</p>

        <div className="reports-summary">
          <div className="summary-card">
            <h3>Total Reports</h3>
            <div className="summary-value">{reports.length}</div>
          </div>
          <div className="summary-card">
            <h3>Feature Requests</h3>
            <div className="summary-value">{reports.filter(r => r.type === 'feature').length}</div>
          </div>
          <div className="summary-card">
            <h3>Bug Reports</h3>
            <div className="summary-value">{reports.filter(r => r.type === 'bug').length}</div>
          </div>
          <div className="summary-card">
            <h3>Improvements</h3>
            <div className="summary-value">{reports.filter(r => r.type === 'improvement').length}</div>
          </div>
        </div>

        <div className="reports-list">
          {reports.length === 0 ? (
            <div className="no-reports">
              <p>No reports submitted yet.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report._id} className="report-card">
                <div className="report-header">
                  <div className="report-meta">
                    <span 
                      className="report-type" 
                      style={{ backgroundColor: getTypeColor(report.type) }}
                    >
                      {report.type.toUpperCase()}
                    </span>
                    <span className="report-date">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    <span className="report-time">
                      {new Date(report.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(report._id)}
                  >
                    ✕ Resolve & Delete
                  </button>
                </div>
                
                <h3 className="report-title">{report.title}</h3>
                <p className="report-description">{report.description}</p>
                
                <div className="report-footer">
                  <span className="report-email">
                    From: {report.email || 'Anonymous'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;