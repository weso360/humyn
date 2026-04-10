import React from 'react';
import PageLayout from '../components/PageLayout';

const principles = [
  {
    title: 'Transparency',
    body: 'We want the product to improve writing quality, not conceal accountability or intent.',
  },
  {
    title: 'Responsible use',
    body: 'Users remain responsible for how rewritten content is used, published, and represented.',
  },
  {
    title: 'Privacy',
    body: 'The product should minimize retained content and protect user information with sensible defaults.',
  },
  {
    title: 'Integrity',
    body: 'We discourage deceptive or harmful uses, including impersonation, misinformation, or academic dishonesty.',
  },
];

function Ethics() {
  return (
    <PageLayout
      eyebrow="Ethics"
      title="Our approach to responsible AI writing support"
      description="Humyn is built to help people communicate more clearly, not to remove responsibility from the person publishing the words."
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">Best practice</span>
          <p>Use the tool to clarify, refine, and personalize writing that you still stand behind as the author.</p>
        </div>
      }
    >
      <section className="capability-grid">
        {principles.map((principle) => (
          <article key={principle.title} className="surface-card capability-card">
            <span className="eyebrow">Principle</span>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>

      <section className="surface-card policy-card">
        <span className="eyebrow">Prohibited uses</span>
        <h2>What we do not support</h2>
        <ul className="clean-list">
          <li>Creating false or misleading information.</li>
          <li>Academic dishonesty, plagiarism, or hidden impersonation.</li>
          <li>Illegal, abusive, or harmful content generation.</li>
          <li>Using rewritten output to avoid accountability for the substance of the message.</li>
        </ul>
      </section>
    </PageLayout>
  );
}

export default Ethics;
