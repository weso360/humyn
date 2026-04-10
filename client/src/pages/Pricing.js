import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    cadence: '/month',
    description: 'A guided trial for testing tone, formality, and fit.',
    features: [
      '3 humanizations to explore the workflow',
      'Single output variant',
      'Core tone and audience controls',
      'Manual copy and review flow',
    ],
    ctaLabel: 'Start free',
    ctaHref: '/',
  },
  {
    name: 'Premium',
    price: '$9.99',
    cadence: '/month',
    description: 'For repeat users who need speed, optionality, and a better approval loop.',
    features: [
      'Unlimited humanizations',
      'Two and three-variant output',
      'Priority processing',
      'Exportable result payloads',
      'Best fit for teams and client work',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    description: 'For organizations that want API access, governance, and custom rollout help.',
    features: [
      'Everything in Premium',
      'API and workflow integration planning',
      'Custom usage policies',
      'Dedicated support and onboarding',
    ],
    ctaLabel: 'Contact sales',
    ctaHref: '/feature-request',
  },
];

function Pricing() {
  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_premium_monthly',
          userId: 'pricing_page_user',
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      window.alert('Unable to process upgrade. Please try again.');
    }
  };

  return (
    <PageLayout
      eyebrow="Pricing"
      title="Plans that match how often you rewrite"
      description="Start with the free workspace, then move to Premium when you need more variants, faster iteration, and fewer limits."
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">At a glance</span>
          <h3>Most teams start free, then upgrade once revision velocity matters.</h3>
          <div className="spec-list">
            <div>
              <span>Free tier</span>
              <strong>3 guided runs</strong>
            </div>
            <div>
              <span>Premium</span>
              <strong>$9.99/month</strong>
            </div>
            <div>
              <span>Enterprise</span>
              <strong>Custom rollout</strong>
            </div>
          </div>
        </div>
      }
    >
      <section className="tier-grid">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={tier.featured ? 'surface-card tier-card tier-card--featured' : 'surface-card tier-card'}
          >
            <span className="eyebrow">{tier.featured ? 'Recommended' : 'Plan'}</span>
            <h2>{tier.name}</h2>
            <div className="tier-price">
              <strong>{tier.price}</strong>
              <span>{tier.cadence}</span>
            </div>
            <p>{tier.description}</p>

            <ul className="clean-list">
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            {tier.featured ? (
              <button type="button" className="button button--primary button--full" onClick={handleUpgrade}>
                Upgrade now
              </button>
            ) : (
              <Link to={tier.ctaHref} className="button button--ghost button--full">
                {tier.ctaLabel}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="surface-card comparison-strip">
        <div>
          <span className="eyebrow">Need a sanity check?</span>
          <h3>Premium is worth it once one rewrite is no longer enough.</h3>
        </div>
        <p>
          If you routinely compare multiple versions, rewrite for clients, or need a faster review loop,
          the multi-variant workflow pays for itself quickly.
        </p>
      </section>
    </PageLayout>
  );
}

export default Pricing;
