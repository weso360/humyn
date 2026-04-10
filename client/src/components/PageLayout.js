import React from 'react';
import SiteShell from './SiteShell';

function PageLayout({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  user,
  usageLabel,
  onLoginClick,
  onLogout,
}) {
  return (
    <SiteShell
      user={user}
      usageLabel={usageLabel}
      onLoginClick={onLoginClick}
      onLogout={onLogout}
    >
      <main className="shell-main">
        <div className="shell-container page-stack">
          <section className="page-hero">
            <div className="page-hero__copy">
              {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
              {actions ? <div className="page-hero__actions">{actions}</div> : null}
            </div>

            {aside ? <div className="page-hero__aside">{aside}</div> : null}
          </section>

          <div className="page-flow">{children}</div>
        </div>
      </main>
    </SiteShell>
  );
}

export default PageLayout;
