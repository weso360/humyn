import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/editor', label: 'Editor' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/feature-request', label: 'Feedback' },
];

function SiteShell({
  children,
  user,
  usageLabel,
  onLoginClick,
  onLogout,
}) {
  const accountName = user?.name || user?.email;

  return (
    <div className="site-shell">
      <div className="site-backdrop" aria-hidden="true" />

      <header className="site-header">
        <div className="shell-container site-header-inner">
          <Link to="/" className="brand-mark">
            <span className="brand-mark__badge">H</span>
            <span>
              <strong>Humyn</strong>
              <small>Writing that feels lived-in</small>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'site-nav__link is-active' : 'site-nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-account">
            {user ? (
              <div className="account-chip">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={accountName}
                    className="account-chip__avatar"
                  />
                ) : null}
                <div className="account-chip__meta">
                  <span className="plan-pill">{user.plan}</span>
                  <strong>{accountName}</strong>
                  {usageLabel ? <small>{usageLabel}</small> : null}
                </div>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={onLogout}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="site-account-actions">
                <Link to="/pricing" className="button button--ghost button--small">
                  View plans
                </Link>
                {onLoginClick ? (
                  <button
                    type="button"
                    className="button button--primary button--small"
                    onClick={onLoginClick}
                  >
                    Log in
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="shell-container site-footer__grid">
          <div className="site-footer__brand">
            <span className="eyebrow">Humyn</span>
            <h2>Sharpen the writing without sanding off the human voice.</h2>
            <p>
              A cleaner workspace for rewriting AI-heavy drafts into copy that
              sounds credible, personal, and ready to publish.
            </p>
          </div>

          <div className="site-footer__links">
            <span className="footer-heading">Product</span>
            <Link to="/">Workspace</Link>
            <Link to="/editor">Editor</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/feature-request">Feedback</Link>
          </div>

          <div className="site-footer__links">
            <span className="footer-heading">Trust</span>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/ethics">Ethics</Link>
          </div>
        </div>

        <div className="shell-container site-footer__bottom">
          <p>Built for teams that want useful AI help without lifeless copy.</p>
          <p>
            &copy; {new Date().getFullYear()} Humyn
            {' · '}
            <a
              href="https://aivora.uk"
              target="_blank"
              rel="noreferrer"
            >
              Created by Aivora Media
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default SiteShell;
