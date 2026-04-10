import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteShell from '../components/SiteShell';

const capabilityCards = [
  {
    title: 'Shape the voice',
    body: 'Tune tone, formality, and audience without rewriting the same draft ten different ways.',
  },
  {
    title: 'Keep the signal',
    body: 'Preserve the message while removing stiff phrasing, awkward transitions, and brittle AI cadence.',
  },
  {
    title: 'Review the delta',
    body: 'Compare source copy against the rewrite, inspect the changelog, and export structured output.',
  },
];

const workflowSteps = [
  {
    id: '01',
    title: 'Drop in the draft',
    body: 'Paste the raw draft, email, paragraph, or product copy that needs a more natural rhythm.',
  },
  {
    id: '02',
    title: 'Guide the rewrite',
    body: 'Set the intended tone, audience, and formality level so the output matches the room it enters.',
  },
  {
    id: '03',
    title: 'Ship the strongest version',
    body: 'Copy a single variant, export the full result set, or keep iterating with a clearer brief.',
  },
];

function AuthModal({
  open,
  authMode,
  authLoading,
  onClose,
  onModeChange,
  onSubmit,
}) {
  useEffect(() => {
    if (!open || !window.google) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const buttonElement = document.getElementById('google-signin-btn');
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
        });
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          x
        </button>
        <span className="eyebrow">Access workspace</span>
        <h2 id="auth-modal-title">
          {authMode === 'login' ? 'Log in to Humyn' : 'Create your Humyn account'}
        </h2>
        <p className="modal-copy">
          Save your usage, unlock premium workflows, and keep every rewrite in one place.
        </p>

        <div id="google-signin-btn" className="google-signin-slot" />

        <div className="divider">
          <span>or use email</span>
        </div>

        <form
          className="stacked-form"
          onSubmit={(event) => {
            event.preventDefault();
            const email = event.target.email.value;
            const password = event.target.password.value;
            const confirmPassword = event.target.confirmPassword?.value;

            if (authMode === 'signup' && password !== confirmPassword) {
              window.alert('Passwords do not match.');
              return;
            }

            onSubmit(email, password);
          }}
        >
          <input
            type="email"
            name="email"
            placeholder="Email address"
            required
            disabled={authLoading}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            disabled={authLoading}
          />
          {authMode === 'signup' ? (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              required
              disabled={authLoading}
            />
          ) : null}

          <button type="submit" className="button button--primary button--full" disabled={authLoading}>
            {authLoading
              ? 'Working...'
              : authMode === 'login'
                ? 'Log in'
                : 'Create account'}
          </button>
        </form>

        <p className="modal-switch">
          {authMode === 'login' ? 'Need an account?' : 'Already signed up?'}
          <button
            type="button"
            className="text-button"
            onClick={() => onModeChange(authMode === 'login' ? 'signup' : 'login')}
          >
            {authMode === 'login' ? 'Create one' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function UpgradeModal({ open, onClose, onUpgrade, onLoginClick }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card--accent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          x
        </button>
        <span className="eyebrow">Premium access</span>
        <h2 id="upgrade-modal-title">Unlock the full rewrite workflow</h2>
        <p className="modal-copy">
          Premium removes the free cap, enables multiple variants, and gives you a faster revision loop.
        </p>

        <div className="feature-list">
          <div className="feature-list__item">Unlimited humanizations</div>
          <div className="feature-list__item">Two and three-variant outputs</div>
          <div className="feature-list__item">Priority processing</div>
          <div className="feature-list__item">Advanced export and review workflow</div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button button--primary button--full" onClick={onUpgrade}>
            Upgrade for $9.99/month
          </button>
          <button type="button" className="button button--ghost button--full" onClick={onLoginClick}>
            Already subscribed? Log in
          </button>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [sourceText, setSourceText] = useState('');
  const [tone, setTone] = useState('Conversational');
  const [formality, setFormality] = useState('Medium');
  const [audience, setAudience] = useState('general');
  const [variants, setVariants] = useState('1');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedUsage = localStorage.getItem('usageCount');

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      if (savedUsage) {
        setUsageCount(Number.parseInt(savedUsage, 10) || 0);
      }
    } catch (storageError) {
      console.error('Unable to load saved session:', storageError);
    }

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '913247466895-17ti5ijgjb84faobcksq4hjq8s8id8f5.apps.googleusercontent.com',
        callback: handleGoogleLogin,
      });
    }
  }, []);

  const handleGoogleLogin = async (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const authResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        }),
      });

      const data = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(data.error || 'Google login failed.');
      }

      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      setShowAuth(false);
    } catch (loginError) {
      console.error('Google login error:', loginError);
      window.alert(loginError.message || 'Unable to complete Google login.');
    }
  };

  const handleAuth = async (email, password) => {
    setAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      const data = JSON.parse(text);

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      setShowAuth(false);
    } catch (authError) {
      console.error('Auth error:', authError);
      window.alert(authError.message || 'Unable to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('usageCount');
    setUsageCount(0);
  };

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_premium_monthly',
          userId: user?.id || 'anonymous',
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (upgradeError) {
      console.error('Upgrade error:', upgradeError);
      window.alert('Unable to process the upgrade right now.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (user && user.plan === 'free' && usageCount >= user.maxUsage) {
      setError('Free tier limit reached. Upgrade to Premium for unlimited usage.');
      setLoading(false);
      return;
    }

    if (!user && usageCount >= 3) {
      setShowUpgrade(true);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_text: sourceText,
          tone,
          formality,
          audience,
          variants: Number.parseInt(variants, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      setResult(data);

      if (!user || user.plan === 'free') {
        const nextUsageCount = usageCount + 1;
        setUsageCount(nextUsageCount);
        localStorage.setItem('usageCount', nextUsageCount.toString());
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (event) => {
    const nextValue = event.target.value;

    if ((!user || user.plan === 'free') && nextValue !== '1') {
      setShowUpgrade(true);
      return;
    }

    setVariants(nextValue);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportAsJSON = () => {
    if (!result) {
      return;
    }

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'humyn-result.json';
    link.click();
  };

  const usageLimit = user?.plan === 'free' ? user.maxUsage : 3;
  const usageLabel = user
    ? user.plan === 'free'
      ? `${usageCount}/${usageLimit} free runs used`
      : 'Unlimited workspace access'
    : `${Math.max(usageLimit - usageCount, 0)} free tries left`;

  return (
    <SiteShell
      user={user}
      usageLabel={usageLabel}
      onLoginClick={() => setShowAuth(true)}
      onLogout={handleLogout}
    >
      <main className="shell-main">
        <div className="shell-container home-flow">
          <section className="hero-panel">
            <div className="hero-panel__copy">
              <span className="eyebrow">Rewrite with more signal</span>
              <h1>Turn brittle AI copy into writing that sounds deliberate, warm, and human.</h1>
              <p>
                Humyn gives you a cleaner front-end workspace for transforming stiff AI output into
                language that feels like it came from a real person with context, judgment, and intent.
              </p>

              <div className="hero-panel__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    const field = document.getElementById('sourceText');
                    if (field) {
                      field.focus();
                    }
                  }}
                >
                  Start rewriting
                </button>
                <Link to="/pricing" className="button button--ghost">
                  Compare plans
                </Link>
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <span>Workspace</span>
                  <strong>1-click compare and copy flow</strong>
                </div>
                <div className="hero-stat">
                  <span>Free tier</span>
                  <strong>3 guided rewrites to try the tool</strong>
                </div>
                <div className="hero-stat">
                  <span>Premium</span>
                  <strong>Multi-variant output and faster iteration</strong>
                </div>
              </div>
            </div>

            <aside className="hero-panel__aside surface-card">
              <div className="aside-meter">
                <span className="eyebrow">Session status</span>
                <strong>{user ? `Signed in as ${user.plan}` : 'Guest session'}</strong>
                <p>{usageLabel}</p>
              </div>

              <div className="aside-list">
                <div>
                  <span className="aside-list__label">Best for</span>
                  <p>Emails, landing pages, internal updates, outreach, and polished drafts.</p>
                </div>
                <div>
                  <span className="aside-list__label">What changes</span>
                  <p>Sentence rhythm, clarity, formality, and transitions while preserving intent.</p>
                </div>
                <div>
                  <span className="aside-list__label">What stays stable</span>
                  <p>Meaning, audience fit, and the ability to compare source text against output.</p>
                </div>
              </div>
            </aside>
          </section>

          <section className="workspace-grid">
            <form className="surface-card editor-form" onSubmit={handleSubmit}>
              <div className="section-heading">
                <span className="eyebrow">Rewrite workspace</span>
                <h2>Guide the transformation</h2>
                <p>
                  Paste the draft, choose the voice you want, and let the system return cleaner,
                  more natural language.
                </p>
              </div>

              <label className="field">
                <span className="field__label">Source text</span>
                <textarea
                  id="sourceText"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Paste the AI-heavy text you want to make feel more human."
                  rows="11"
                  maxLength="10000"
                  required
                />
                <small>{sourceText.length}/10,000 characters</small>
              </label>

              <div className="field-grid">
                <label className="field">
                  <span className="field__label">Tone</span>
                  <select value={tone} onChange={(event) => setTone(event.target.value)}>
                    <option value="Conversational">Conversational</option>
                    <option value="Professional">Professional</option>
                    <option value="Empathetic">Empathetic</option>
                    <option value="Humorous">Humorous</option>
                    <option value="Concise">Concise</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Formality</span>
                  <select value={formality} onChange={(event) => setFormality(event.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Audience</span>
                  <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                    <option value="general">General public</option>
                    <option value="colleague">Colleague</option>
                    <option value="manager">Manager</option>
                    <option value="customer">Customer</option>
                    <option value="friend">Friend</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Variants</span>
                  <select value={variants} onChange={handleVariantChange}>
                    <option value="1">1 output</option>
                    <option value="2">2 outputs (Premium)</option>
                    <option value="3">3 outputs (Premium)</option>
                  </select>
                </label>
              </div>

              <div className="editor-form__footer">
                <div className="editor-form__hint">
                  <strong>Current access:</strong>
                  <span>{usageLabel}</span>
                </div>

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={loading || !sourceText.trim()}
                >
                  {loading ? 'Humanizing...' : 'Humanize text'}
                </button>
              </div>
            </form>

            <aside className="workspace-rail">
              <div className="surface-card rail-card">
                <span className="eyebrow">Before you run it</span>
                <h3>Prompts that usually get the best rewrite</h3>
                <ul className="clean-list">
                  <li>Paste a complete paragraph instead of isolated fragments.</li>
                  <li>Pick the audience closest to the real reader you have in mind.</li>
                  <li>Use lower formality for conversational outreach and updates.</li>
                </ul>
              </div>

              <div className="surface-card rail-card rail-card--accent">
                <span className="eyebrow">Premium edge</span>
                <h3>Review multiple versions side by side</h3>
                <p>
                  Premium unlocks two and three-variant output, making it easier to choose the
                  strongest line of attack for the same draft.
                </p>
                <button type="button" className="button button--ghost" onClick={() => setShowUpgrade(true)}>
                  See premium options
                </button>
              </div>
            </aside>
          </section>

          {error ? (
            <section className="notice-card notice-card--error">
              <strong>Request blocked</strong>
              <p>{error}</p>
              {error.includes('Free tier limit reached') ? (
                <button type="button" className="button button--primary" onClick={handleUpgrade}>
                  Upgrade to continue
                </button>
              ) : null}
            </section>
          ) : null}

          {result ? (
            <section className="results-shell">
              <div className="section-heading section-heading--row">
                <div>
                  <span className="eyebrow">Output</span>
                  <h2>Your rewritten draft</h2>
                </div>
                <button type="button" className="button button--ghost" onClick={exportAsJSON}>
                  Export JSON
                </button>
              </div>

              <div className="result-grid">
                {(result.output_variants || []).map((variant, index) => (
                  <article key={variant.variant_id || index} className="surface-card result-card">
                    <div className="result-card__header">
                      <div>
                        <span className="eyebrow">Variant {index + 1}</span>
                        <h3>{variant.tone || tone}</h3>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() => copyToClipboard(variant.text)}
                      >
                        Copy text
                      </button>
                    </div>

                    <div className="comparison-grid">
                      <div className="comparison-block">
                        <span className="comparison-block__label">Source</span>
                        <p>{sourceText}</p>
                      </div>
                      <div className="comparison-block comparison-block--output">
                        <span className="comparison-block__label">Humanized</span>
                        <p>{variant.text}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="meta-grid">
                <div className="surface-card meta-card">
                  <span className="eyebrow">Changelog</span>
                  <h3>What the model changed</h3>
                  <ul className="clean-list">
                    {(result.changelog || []).map((change, index) => (
                      <li key={index}>{change}</li>
                    ))}
                  </ul>
                </div>

                <div className="surface-card meta-card">
                  <span className="eyebrow">Style profile</span>
                  <h3>Rewrite settings captured in output</h3>
                  <div className="spec-list">
                    <div>
                      <span>Tone</span>
                      <strong>{result.style_profile?.tone || tone}</strong>
                    </div>
                    <div>
                      <span>Formality</span>
                      <strong>{result.style_profile?.formality || formality}</strong>
                    </div>
                    <div>
                      <span>Audience</span>
                      <strong>{result.style_profile?.audience || audience}</strong>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <strong>{Math.round((result.confidence_score || 0) * 100)}%</strong>
                    </div>
                  </div>
                  {result.disclosure ? (
                    <div className="meta-card__note">
                      <span className="aside-list__label">Disclosure</span>
                      <p>{result.disclosure}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="capability-grid">
            {capabilityCards.map((card) => (
              <article key={card.title} className="surface-card capability-card">
                <span className="eyebrow">Capability</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </section>

          <section className="story-band">
            <div className="section-heading">
              <span className="eyebrow">Process</span>
              <h2>A tighter path from raw draft to publishable copy</h2>
            </div>

            <div className="timeline-grid">
              {workflowSteps.map((step) => (
                <article key={step.id} className="surface-card timeline-card">
                  <span className="timeline-card__index">{step.id}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <AuthModal
        open={showAuth}
        authMode={authMode}
        authLoading={authLoading}
        onClose={() => setShowAuth(false)}
        onModeChange={setAuthMode}
        onSubmit={handleAuth}
      />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={handleUpgrade}
        onLoginClick={() => {
          setShowUpgrade(false);
          setShowAuth(true);
        }}
      />
    </SiteShell>
  );
}

export default Home;
