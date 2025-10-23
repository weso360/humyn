import React from 'react';
import PageHeader from '../components/PageHeader';

function Terms() {
  return (
    <div className="page-container">
      <PageHeader />
      <div className="page-content">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: December 2024</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using AI Humanizer, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </section>
        
        <section>
          <h2>2. Use License</h2>
          <p>Permission is granted to temporarily use AI Humanizer for personal and commercial purposes. This license shall automatically terminate if you violate any of these restrictions.</p>
        </section>
        
        <section>
          <h2>3. Service Description</h2>
          <p>AI Humanizer provides text transformation services to make AI-generated content appear more human-like. We reserve the right to modify or discontinue the service at any time.</p>
        </section>
        
        <section>
          <h2>4. User Responsibilities</h2>
          <ul>
            <li>You are responsible for all content you submit to our service</li>
            <li>You must not use the service for illegal or harmful purposes</li>
            <li>You must respect intellectual property rights</li>
          </ul>
        </section>
        
        <section>
          <h2>5. Limitations</h2>
          <p>In no event shall AI Humanizer be liable for any damages arising out of the use or inability to use the service.</p>
        </section>
        
        <section>
          <h2>6. Contact Information</h2>
          <p>For questions about these Terms of Service, please contact us at legal@humyn.com</p>
        </section>
      </div>
    </div>
  );
}

export default Terms;