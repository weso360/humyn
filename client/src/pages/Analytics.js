import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        setError('Access denied');
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader />
        <div className="page-content">
          <div className="loading">Loading analytics...</div>
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
        <h1>Analytics Dashboard</h1>
        <p className="last-updated">Real-time platform metrics</p>

        <div className="analytics-grid">
          <div className="metric-card">
            <h3>Total Users</h3>
            <div className="metric-value">{analytics.totalUsers}</div>
            <div className="metric-breakdown">
              <span>Free: {analytics.freeUsers}</span>
              <span>Premium: {analytics.premiumUsers}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Total Humanizations</h3>
            <div className="metric-value">{analytics.totalHumanizations}</div>
            <div className="metric-breakdown">
              <span>Today: {analytics.humanizationsToday}</span>
              <span>This Week: {analytics.humanizationsWeek}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Revenue</h3>
            <div className="metric-value">${analytics.monthlyRevenue}</div>
            <div className="metric-breakdown">
              <span>MRR: ${analytics.mrr}</span>
              <span>Subscriptions: {analytics.activeSubscriptions}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Usage Stats</h3>
            <div className="metric-value">{analytics.avgUsagePerUser}</div>
            <div className="metric-breakdown">
              <span>Avg per user</span>
              <span>Peak: {analytics.peakUsage}/day</span>
            </div>
          </div>
        </div>

        <div className="analytics-sections">
          <section>
            <h2>Recent Users</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Usage</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentUsers.map(user => (
                    <tr key={user._id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={`plan-badge ${user.plan}`}>
                          {user.plan.toUpperCase()}
                        </span>
                      </td>
                      <td>{user.usageCount}/{user.maxUsage}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Top Users by Usage</h2>
            <div className="usage-list">
              {analytics.topUsers.map((user, index) => (
                <div key={user._id} className="usage-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="user-email">{user.email}</span>
                  <span className="usage-count">{user.usageCount} uses</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Analytics;