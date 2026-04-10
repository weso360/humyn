import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <PageLayout
      eyebrow="Billing"
      title="Premium is now active"
      description="Your subscription was activated successfully. You will be sent back to the workspace automatically."
    >
      <section className="surface-card success-card">
        <span className="eyebrow">Unlocked</span>
        <h2>You now have access to the full rewrite workflow.</h2>
        <ul className="clean-list">
          <li>Unlimited humanizations</li>
          <li>Multiple output variants</li>
          <li>Priority processing</li>
          <li>Export-ready results</li>
        </ul>
        <div className="page-hero__actions">
          <Link to="/" className="button button--primary">
            Return to workspace
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

export default Success;
