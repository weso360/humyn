import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';

const reportColors = {
  feature: '#0f766e',
  bug: '#c2410c',
  improvement: '#7c3aed',
};

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/reports', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Access denied');
        }

        const data = await response.json();
        setReports(data);
      } catch (requestError) {
        setError(requestError.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      setReports((current) => current.filter((report) => report._id !== id));
    } catch (deleteError) {
      window.alert(deleteError.message || 'Network error');
    }
  };

  if (loading) {
    return (
      <PageLayout
        eyebrow="Reports"
        title="Feedback inbox"
        description="Loading user-submitted reports."
      >
        <section className="surface-card empty-state">
          <h2>Loading reports...</h2>
          <p>Pulling the latest feature requests, bugs, and improvements.</p>
        </section>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        eyebrow="Reports"
        title="Feedback inbox"
        description="This area is limited to authorized accounts."
      >
        <section className="notice-card notice-card--error">
          <strong>Access denied</strong>
          <p>{error}</p>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      eyebrow="Reports"
      title="Feature requests and issue reports in one queue"
      description="Keep track of incoming product feedback without losing the type, timing, or contact context."
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">Queue summary</span>
          <div className="spec-list">
            <div>
              <span>Total</span>
              <strong>{reports.length}</strong>
            </div>
            <div>
              <span>Features</span>
              <strong>{reports.filter((report) => report.type === 'feature').length}</strong>
            </div>
            <div>
              <span>Bugs</span>
              <strong>{reports.filter((report) => report.type === 'bug').length}</strong>
            </div>
            <div>
              <span>Improvements</span>
              <strong>{reports.filter((report) => report.type === 'improvement').length}</strong>
            </div>
          </div>
        </div>
      }
    >
      <section className="report-list">
        {reports.length === 0 ? (
          <article className="surface-card empty-state">
            <h2>No reports submitted yet</h2>
            <p>The queue is clear for now.</p>
          </article>
        ) : (
          reports.map((report) => (
            <article key={report._id} className="surface-card report-card">
              <div className="report-card__header">
                <div className="report-card__meta">
                  <span
                    className="report-tag"
                    style={{ backgroundColor: reportColors[report.type] || '#64748b' }}
                  >
                    {report.type}
                  </span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  <span>{new Date(report.createdAt).toLocaleTimeString()}</span>
                </div>

                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => handleDelete(report._id)}
                >
                  Resolve
                </button>
              </div>

              <h2>{report.title}</h2>
              <p>{report.description}</p>
              <div className="report-card__footer">
                <span>{report.email || 'Anonymous submission'}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </PageLayout>
  );
}

export default Reports;
