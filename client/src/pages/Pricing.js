import React from 'react';
import '../components/PricingCard.css';

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
          userId: 'pricing_page_user'
        })
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Unable to process upgrade. Please try again.');
    }
  };

  return (
    <div className="container">
      <section className="hero-section">
        <h1 className="hero-title">Simple, Transparent Pricing</h1>
        <p className="hero-subtitle">
          Choose the plan that works best for your content needs.
        </p>
      </section>
      
      <div className="pricing-container">
        
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Free</h3>
            <div className="price">$0<span>/month</span></div>
            <ul>
              <li>3 humanizations per day</li>
              <li>Basic tone options</li>
              <li>Standard processing</li>
            </ul>
            <button className="pricing-btn" onClick={() => window.location.href = '/'}>Get Started</button>
          </div>
          
          <div className="pricing-card featured">
            <h3>Premium</h3>
            <div className="price">$9.99<span>/month</span></div>
            <ul>
              <li>Unlimited humanizations</li>
              <li>Multiple text variants</li>
              <li>Priority processing</li>
              <li>Advanced tone controls</li>
              <li>Export options</li>
            </ul>
            <button className="pricing-btn" onClick={handleUpgrade}>Upgrade Now</button>
          </div>
          
          <div className="pricing-card">
            <h3>Enterprise</h3>
            <div className="price">Custom</div>
            <ul>
              <li>Everything in Premium</li>
              <li>API access</li>
              <li>Custom integrations</li>
              <li>Dedicated support</li>
            </ul>
            <button className="pricing-btn">Contact Sales</button>
          </div>
        </div>
      </div>
  );
}

export default Pricing;