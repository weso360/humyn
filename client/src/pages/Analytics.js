import React, { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/analytics', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Access denied');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (requestError) {
        setError(requestError.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <PageLayout
        eyebrow="Analytics"
        title="Platform analytics"
        description="Loading current metrics."
      >
        <section className="surface-card empty-state">
          <h2>Loading analytics...</h2>
          <p>Fetching the latest usage, revenue, and account data.</p>
        </section>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        eyebrow="Analytics"
        title="Platform analytics"
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
      eyebrow="Analytics"
      title="A clearer read on product usage and revenue"
      description="Monitor adoption, rewrite volume, and paid growth from one front-end dashboard."
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">Snapshot</span>
          <div className="spec-list">
            <div>
              <span>Total users</span>
              <strong>{analytics.totalUsers}</strong>
            </div>
            <div>
              <span>MRR</span>
              <strong>${analytics.mrr}</strong>
            </div>
            <div>
              <span>Runs today</span>
              <strong>{analytics.humanizationsToday}</strong>
            </div>
          </div>
        </div>
      }
    >
      <section className="metric-grid">
        <article className="surface-card metric-card">
          <span className="eyebrow">Users</span>
          <h2>{analytics.totalUsers}</h2>
          <p>Free: {analytics.freeUsers}</p>
          <p>Premium: {analytics.premiumUsers}</p>
        </article>

        <article className="surface-card metric-card">
          <span className="eyebrow">Humanizations</span>
          <h2>{analytics.totalHumanizations}</h2>
          <p>Today: {analytics.humanizationsToday}</p>
          <p>This week: {analytics.humanizationsWeek}</p>
        </article>

        <article className="surface-card metric-card">
          <span className="eyebrow">Revenue</span>
          <h2>${analytics.monthlyRevenue}</h2>
          <p>MRR: ${analytics.mrr}</p>
          <p>Active subscriptions: {analytics.activeSubscriptions}</p>
        </article>

        <article className="surface-card metric-card">
          <span className="eyebrow">Usage depth</span>
          <h2>{analytics.avgUsagePerUser}</h2>
          <p>Average runs per user</p>
          <p>Peak: {analytics.peakUsage}/day</p>
        </article>
      </section>

      <section className="data-layout">
        <article className="surface-card data-card">
          <div className="section-heading section-heading--row">
            <div>
              <span className="eyebrow">Recent users</span>
              <h2>Latest signups</h2>
            </div>
          </div>

          <div className="table-wrap">
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
                {analytics.recentUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>
                      <span className="plan-pill">{user.plan}</span>
                    </td>
                    <td>
                      {user.usageCount}/{user.maxUsage}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface-card data-card">
          <span className="eyebrow">Power users</span>
          <h2>Top accounts by usage</h2>
          <div className="rank-list">
            {analytics.topUsers.map((user, index) => (
              <div key={user._id} className="rank-list__item">
                <span className="rank-list__index">#{index + 1}</span>
                <div>
                  <strong>{user.email}</strong>
                  <small>{user.plan} plan</small>
                </div>
                <span>{user.usageCount} uses</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageLayout>
  );
}

export default Analytics;
