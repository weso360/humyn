import React from 'react';
import PageHeader from '../components/PageHeader';

function Ethics() {
  return (
    <div className="page-container">
      <PageHeader />
      <div className="page-content">
        <h1>Ethics Statement</h1>
        <p className="last-updated">Our commitment to responsible AI use</p>
        
        <section>
          <h2>Our Mission</h2>
          <p>AI Humanizer is committed to promoting responsible and ethical use of artificial intelligence in content creation while maintaining transparency and user trust.</p>
        </section>
        
        <section>
          <h2>Ethical Principles</h2>
          <div className="principle">
            <h3>🎯 Transparency</h3>
            <p>We believe in clear communication about our AI capabilities and limitations.</p>
          </div>
          <div className="principle">
            <h3>🛡️ Responsibility</h3>
            <p>Users are responsible for how they use our humanized content and must comply with applicable laws.</p>
          </div>
          <div className="principle">
            <h3>🤝 Integrity</h3>
            <p>We encourage honest use of AI assistance and discourage deceptive practices.</p>
          </div>
          <div className="principle">
            <h3>🔒 Privacy</h3>
            <p>We protect user data and do not store processed content unnecessarily.</p>
          </div>
        </section>
        
        <section>
          <h2>Prohibited Uses</h2>
          <ul>
            <li>Creating misleading or false information</li>
            <li>Academic dishonesty or plagiarism</li>
            <li>Generating harmful or illegal content</li>
            <li>Impersonating others or creating fake identities</li>
          </ul>
        </section>
        
        <section>
          <h2>Best Practices</h2>
          <ul>
            <li>Use AI humanization to improve clarity and readability</li>
            <li>Maintain authorship and accountability for your content</li>
            <li>Consider disclosure when appropriate for your context</li>
            <li>Respect intellectual property and copyright laws</li>
          </ul>
        </section>
        
        <section>
          <h2>Reporting Concerns</h2>
          <p>If you encounter misuse of our service or have ethical concerns, please contact us at ethics@humyn.com</p>
        </section>
      </div>
    </div>
  );
}

export default Ethics;