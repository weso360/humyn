import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

const editorCards = [
  {
    title: 'Structured editing',
    body: 'Move from raw paste-in text to a revision flow that helps you spot weak phrasing and tighten intent.',
  },
  {
    title: 'Inline AI guidance',
    body: 'Use the humanizer as a first pass, then keep refining tone and cadence in a dedicated editing workspace.',
  },
  {
    title: 'Review-friendly output',
    body: 'Compare options, copy the best section, and hand off text that feels closer to final from the start.',
  },
];

function Editor() {
  return (
    <PageLayout
      eyebrow="Editor"
      title="A richer editing surface is on the roadmap"
      description="The current experience centers on the rewrite workspace, but the next step is a dedicated editor for polishing, comparing, and assembling final copy."
      actions={
        <>
          <Link to="/" className="button button--primary">
            Open rewrite workspace
          </Link>
          <Link to="/feature-request" className="button button--ghost">
            Request early access
          </Link>
        </>
      }
      aside={
        <div className="surface-card summary-card">
          <span className="eyebrow">Preview</span>
          <h3>We are shaping this page into the handoff layer between AI output and publish-ready writing.</h3>
          <p>That means fewer modal workflows and more room for comparison, notes, and final edits.</p>
        </div>
      }
    >
      <section className="capability-grid">
        {editorCards.map((card) => (
          <article key={card.title} className="surface-card capability-card">
            <span className="eyebrow">Planned</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="surface-card roadmap-card">
        <span className="eyebrow">What is next</span>
        <h2>Editor priorities</h2>
        <div className="timeline-grid">
          <article className="surface-card timeline-card">
            <span className="timeline-card__index">01</span>
            <h3>Document view</h3>
            <p>Bring source text, variants, and copy controls into one continuous editing surface.</p>
          </article>
          <article className="surface-card timeline-card">
            <span className="timeline-card__index">02</span>
            <h3>Selection-based rewrites</h3>
            <p>Rewrite a paragraph or sentence in isolation without rerunning the whole document.</p>
          </article>
          <article className="surface-card timeline-card">
            <span className="timeline-card__index">03</span>
            <h3>Approval notes</h3>
            <p>Make it easier for teams to leave comments and choose a final version faster.</p>
          </article>
        </div>
      </section>
    </PageLayout>
  );
}

export default Editor;
