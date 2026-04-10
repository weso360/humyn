import React from 'react';
import PageLayout from '../components/PageLayout';

const sections = [
  {
    title: 'Acceptance of terms',
    body: 'By accessing and using Humyn, you agree to these terms and to any policies referenced from them.',
  },
  {
    title: 'Service scope',
    body: 'Humyn provides AI-assisted text transformation tools intended to help users make drafts sound more natural and audience-aware.',
  },
  {
    title: 'User responsibilities',
    list: [
      'You are responsible for the content you submit and publish.',
      'You must not use the service for illegal, harmful, or deceptive activity.',
      'You must respect intellectual property, privacy, and platform policies.',
    ],
  },
  {
    title: 'Availability and limits',
    body: 'We may update, suspend, or discontinue parts of the service as the product evolves.',
  },
  {
    title: 'Liability',
    body: 'Humyn is provided as-is. We are not liable for damages arising from use of or inability to use the service, subject to applicable law.',
  },
];

function Terms() {
  return (
    <PageLayout
      eyebrow="Terms"
      title="Terms of service"
      description="Last updated: December 2024"
    >
      <section className="policy-stack">
        {sections.map((section, index) => (
          <article key={section.title} className="surface-card policy-card">
            <span className="eyebrow">Section {index + 1}</span>
            <h2>{section.title}</h2>
            {section.body ? <p>{section.body}</p> : null}
            {section.list ? (
              <ul className="clean-list">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </PageLayout>
  );
}

export default Terms;
