import React, { useState } from 'react';
import PageLayout from '../components/PageLayout';

function FeatureRequest() {
  const [formData, setFormData] = useState({
    type: 'feature',
    title: '',
    description: '',
    email: '',
  });
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report. Please try again.');
      }

      setFormData({
        type: 'feature',
        title: '',
        description: '',
        email: '',
      });
      setStatus({
        type: 'success',
        message: 'Thanks. Your submission is in the queue and ready for review.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Feedback"
      title="Send feature ideas, bug reports, and workflow pain points"
      description="Use this form to tell us what is missing, what broke, or where the current front end still feels rough."
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">Best submissions</span>
          <ul className="clean-list">
            <li>Describe the job you were trying to get done.</li>
            <li>Explain what the current flow forced you to do instead.</li>
            <li>Include an email if you want us to follow up.</li>
          </ul>
        </div>
      }
    >
      {status.type !== 'idle' ? (
        <section className={status.type === 'success' ? 'notice-card' : 'notice-card notice-card--error'}>
          <strong>{status.type === 'success' ? 'Submission sent' : 'Submission failed'}</strong>
          <p>{status.message}</p>
        </section>
      ) : null}

      <section className="workspace-grid">
        <form className="surface-card editor-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Submission form</span>
            <h2>Tell us what would make the product better</h2>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field__label">Type</span>
              <select value={formData.type} onChange={handleChange('type')}>
                <option value="feature">Feature request</option>
                <option value="bug">Bug report</option>
                <option value="improvement">Improvement suggestion</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="Optional follow-up email"
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Title</span>
            <input
              type="text"
              value={formData.title}
              onChange={handleChange('title')}
              placeholder="Short summary of the request or issue"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Description</span>
            <textarea
              value={formData.description}
              onChange={handleChange('description')}
              rows="10"
              placeholder="What happened, what you expected, and how this affects your workflow."
              required
            />
          </label>

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>

        <aside className="workspace-rail">
          <div className="surface-card rail-card">
            <span className="eyebrow">Examples</span>
            <h3>Helpful notes we can act on quickly</h3>
            <ul className="clean-list">
              <li>"I wanted side-by-side diffing for multiple variants."</li>
              <li>"The analytics page should export a CSV of recent usage."</li>
              <li>"I hit a payment error after clicking upgrade."</li>
            </ul>
          </div>
        </aside>
      </section>
    </PageLayout>
  );
}

export default FeatureRequest;
