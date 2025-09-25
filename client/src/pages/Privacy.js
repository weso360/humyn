import React from 'react';

function Privacy() {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: December 2024</p>
        
        <section>
          <h2>Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.</p>
          <ul>
            <li>Account information (email, name)</li>
            <li>Usage data and analytics</li>
            <li>Text content you submit for processing</li>
          </ul>
        </section>
        
        <section>
          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Process your text humanization requests</li>
            <li>Communicate with you about your account</li>
            <li>Analyze usage patterns to enhance user experience</li>
          </ul>
        </section>
        
        <section>
          <h2>Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
        </section>
        
        <section>
          <h2>Data Retention</h2>
          <p>We do not store your text content after processing. Account information is retained until you delete your account.</p>
        </section>
        
        <section>
          <h2>Third-Party Services</h2>
          <p>We use third-party services for authentication (Google) and AI processing (OpenAI). These services have their own privacy policies.</p>
        </section>
        
        <section>
          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at privacy@aihumanizer.com</p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;