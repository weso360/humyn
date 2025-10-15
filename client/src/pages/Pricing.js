import React from 'react';

function Pricing() {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Humyn Pricing Plans</h1>
        <p>Choose the plan that works best for you.</p>
        
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Free</h3>
            <div className="price">$0<span>/month</span></div>
            <ul>
              <li>3 humanizations per day</li>
              <li>Basic tone options</li>
              <li>Standard processing</li>
            </ul>
            <button className="pricing-btn">Get Started</button>
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
            <button className="pricing-btn">Upgrade Now</button>
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
    </div>
  );
}

export default Pricing;