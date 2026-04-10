import React from 'react';
import PageLayout from '../components/PageLayout';

const sections = [
  {
    title: 'Information we collect',
    list: [
      'Account details such as email, name, and profile image.',
      'Usage data about how often features are used.',
      'Text you submit for processing while the request is active.',
    ],
  },
  {
    title: 'How we use data',
    list: [
      'To authenticate users and manage subscriptions.',
      'To process humanization requests and improve the product.',
      'To understand usage patterns and support customers.',
    ],
  },
  {
    title: 'Storage and retention',
    body: 'Processed text is not retained longer than needed for the request workflow. Account data is kept until the account is removed or retention obligations end.',
  },
  {
    title: 'Third-party services',
    body: 'We rely on providers such as Google for authentication and external AI services for processing. Those providers have their own privacy policies and data practices.',
  },
  {
    title: 'Security',
    body: 'We use reasonable safeguards to protect personal information against unauthorized access, disclosure, or loss.',
  },
];

function Privacy() {
  return (
    <PageLayout
      eyebrow="Privacy"
      title="Privacy policy"
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

export default Privacy;
