import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';
import FeatureRequest from './pages/FeatureRequest';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Ethics from './pages/Ethics';
import Success from './pages/Success';

function HomePage() {
  const [sourceText, setSourceText] = useState('');
  const [tone, setTone] = useState('Conversational');
  const [formality, setFormality] = useState('Medium');
  const [audience, setAudience] = useState('general');
  const [variants, setVariants] = useState(1);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [usageCount, setUsageCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedUsage = localStorage.getItem('usageCount');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedUsage) setUsageCount(parseInt(savedUsage));
    
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '913247466895-17ti5ijgjb84faobcksq4hjq8s8id8f5.apps.googleusercontent.com',
        callback: handleGoogleLogin
      });
    }
  }, []);

  const handleGoogleLogin = (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const googleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        plan: 'free',
        maxUsage: 5,
        provider: 'google'
      };
      setUser(googleUser);
      localStorage.setItem('user', JSON.stringify(googleUser));
      setShowAuth(false);
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleAuth = async (email, password) => {
    if (authMode === 'login') {
      // Mock login
      const mockUser = { email, plan: 'free', maxUsage: 5 };
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } else {
      // Mock signup
      const mockUser = { email, plan: 'free', maxUsage: 5 };
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    }
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
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
          priceId: 'price_premium_monthly', // Replace with your actual Stripe price ID
          userId: user?.id || 'anonymous'
        })
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Unable to process upgrade. Please try again.');
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    // Check usage limits for free users only
    if (user && user.plan === 'free' && usageCount >= user.maxUsage) {
      setError('Free tier limit reached. Upgrade to Premium for unlimited usage.');
      setLoading(false);
      return;
    }

    // Allow anonymous usage with basic features
    if (!user) {
      // Create temporary anonymous user for basic usage
      const tempUser = { plan: 'anonymous', maxUsage: 3 };
      if (usageCount >= tempUser.maxUsage) {
        setShowUpgrade(true);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_text: sourceText,
          tone,
          formality,
          audience,
          variants: parseInt(variants)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
      
      // Update usage count for free and anonymous users
      if (!user || user.plan === 'free') {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('usageCount', newCount.toString());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'humanized-text.json';
    link.click();
  };

  const AuthModal = () => {
    useEffect(() => {
      if (showAuth && window.google) {
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with'
          }
        );
      }
    }, []);

    return (
      <div className="auth-modal">
        <div className="auth-content">
          <h2>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
          
          <div id="google-signin-btn" className="google-btn"></div>
          
          <div className="divider">
            <span>or</span>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            handleAuth(email, password);
          }}>
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
          </form>
          <p>
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
          <button className="close-btn" onClick={() => setShowAuth(false)}>×</button>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Humyn</h1>
            <p>AI Text Humanizer</p>
          </div>
          <div className="auth-section">
            {user ? (
              <div className="user-info">
                {user.picture && <img src={user.picture} alt="Profile" className="profile-pic" />}
                <span className="plan-badge">{user.plan.toUpperCase()}</span>
                <span>{user.name || user.email}</span>
                {user.plan === 'free' && <span className="usage">({usageCount}/{user.maxUsage} uses)</span>}
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="login-btn">Login / Sign Up</button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero-section">
          <h1 className="hero-title">Transform AI Text into Human Content</h1>
          <p className="hero-subtitle">
            Make your AI-generated content sound natural and engaging with our advanced humanization technology.
          </p>
        </section>
        
        <form onSubmit={handleSubmit} className="input-form">
          <div className="form-group">
            <label htmlFor="sourceText">Source Text *</label>
            <textarea
              id="sourceText"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your text here to humanize..."
              rows="6"
              required
              maxLength="10000"
            />
            <small>{sourceText.length}/10,000 characters</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="Conversational">Conversational</option>
                <option value="Professional">Professional</option>
                <option value="Empathetic">Empathetic</option>
                <option value="Humorous">Humorous</option>
                <option value="Concise">Concise</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="formality">Formality</label>
              <select id="formality" value={formality} onChange={(e) => setFormality(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="audience">Audience</label>
              <select id="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="general">General Public</option>
                <option value="colleague">Colleague</option>
                <option value="manager">Manager</option>
                <option value="customer">Customer</option>
                <option value="friend">Friend</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="variants">Variants {(!user || user?.plan === 'free') && '(Premium Feature)'}</label>
              <select 
                id="variants" 
                value={variants} 
                onChange={(e) => {
                  if ((!user || user?.plan === 'free') && e.target.value > 1) {
                    setShowUpgrade(true);
                    return;
                  }
                  setVariants(e.target.value);
                }}
              >
                <option value="1">1</option>
                <option value="2">2 {(!user || user?.plan === 'free') ? '(Premium)' : ''}</option>
                <option value="3">3 {(!user || user?.plan === 'free') ? '(Premium)' : ''}</option>
              </select>
            </div>
          </div>







          <button type="submit" disabled={loading || !sourceText.trim()}>
            {loading ? 'Humanizing...' : 'Humanize Text'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>Results</h2>
              <div className="export-buttons">
                <button onClick={exportAsJSON}>Export JSON</button>
              </div>
            </div>

            <div className="variants">
              {result.output_variants.map((variant, index) => (
                <div key={variant.variant_id} className="variant">
                  <div className="variant-header">
                    <h3>Variant {index + 1} - {variant.tone}</h3>
                    <button onClick={() => copyToClipboard(variant.text)}>Copy</button>
                  </div>
                  <div className="text-comparison">
                    <div className="original">
                      <h4>Original</h4>
                      <p>{sourceText}</p>
                    </div>
                    <div className="humanized">
                      <h4>Humanized</h4>
                      <p>{variant.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="metadata">
              <div className="changelog">
                <h3>Changes Made</h3>
                <ul>
                  {result.changelog.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </div>

              <div className="style-profile">
                <h3>Style Profile</h3>
                <ul>
                  <li>Tone: {result.style_profile.tone}</li>
                  <li>Formality: {result.style_profile.formality}</li>
                  <li>Audience: {result.style_profile.audience}</li>
                  <li>Confidence: {(result.confidence_score * 100).toFixed(0)}%</li>
                </ul>
              </div>


            </div>
          </div>
        )}

        {/* Marketing Content Sections */}
        <div className="marketing-content">
          <section className="intro-section">
            <h2>Transform AI Text into Natural, Human-Like Content</h2>
            <p>
              Our AI Humanizer stands out as the leading platform designed for transforming AI-generated text into authentic, human-like content. 
              Commonly known as the AI Humanizer or AI to Human Text Converter, our tool excels in rephrasing text created by AI writers, 
              eliminating any robotic undertones while maintaining original meaning and SEO value.
            </p>
          </section>

          <section className="features-section">
            <h2>Key Features & Benefits</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>🎯 Bypass AI Detection</h3>
                <p>Content appears entirely human-written, seamlessly bypassing AI detection systems.</p>
              </div>
              <div className="feature-card">
                <h3>✨ 100% Original Content</h3>
                <p>Guaranteed plagiarism-free output with unique, authentic text every time.</p>
              </div>
              <div className="feature-card">
                <h3>🔍 SEO-Friendly</h3>
                <p>Retains essential keywords and maintains SEO value for better search rankings.</p>
              </div>
              <div className="feature-card">
                <h3>⚡ Lightning Fast</h3>
                <p>Quick results without compromising on content quality or accuracy.</p>
              </div>
              <div className="feature-card">
                <h3>🛡️ Privacy Protected</h3>
                <p>Your content remains completely safe and confidential at all times.</p>
              </div>
              <div className="feature-card">
                <h3>🌍 Multi-Language</h3>
                <p>Supports various languages for global content humanization needs.</p>
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <h2>How to Humanize AI Text</h2>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Input Your Text</h3>
                <p>Paste your AI-generated content into the text area above.</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3>Choose Settings</h3>
                <p>Select your preferred tone, formality level, and audience type.</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3>Humanize & Export</h3>
                <p>Click "Humanize Text" and get natural, human-like content instantly.</p>
              </div>
            </div>
          </section>

          <section className="who-benefits">
            <h2>Who Can Benefit?</h2>
            <div className="benefits-grid">
              <div className="benefit-item">📝 Content Creators & Writers</div>
              <div className="benefit-item">📈 Marketing Professionals</div>
              <div className="benefit-item">🎓 Students & Researchers</div>
              <div className="benefit-item">💼 Business Executives</div>
              <div className="benefit-item">🌐 Web Developers</div>
              <div className="benefit-item">📱 Social Media Managers</div>
              <div className="benefit-item">📰 Bloggers & Journalists</div>
              <div className="benefit-item">🛒 E-Commerce Experts</div>
            </div>
          </section>
        </div>
        
        {showAuth && <AuthModal />}
        
        {showUpgrade && (
          <div className="upgrade-modal">
            <div className="upgrade-content">
              <h2>🚀 Unlock Premium Features</h2>
              <div className="feature-list">
                <div className="feature">✨ Unlimited humanizations</div>
                <div className="feature">🔄 Multiple text variants (2-3 options)</div>
                <div className="feature">⚡ Priority processing</div>
                <div className="feature">🎨 Advanced tone controls</div>
              </div>
              <div className="upgrade-actions">
                <button className="upgrade-btn" onClick={handleUpgrade}>Upgrade to Premium - $9.99/month</button>
                <button className="login-link" onClick={() => setShowAuth(true)}>Already have an account? Login</button>
              </div>
              <button className="close-btn" onClick={() => setShowUpgrade(false)}>×</button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Tools</h3>
            <Link to="/editor">Editor</Link>
          </div>
          <div className="footer-section">
            <h3>Pricing</h3>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="footer-section">
            <h3>Support</h3>
            <Link to="/feature-request">Feature Request & Issue Report</Link>
          </div>
          <div className="footer-section">
            <h3>Legal</h3>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/ethics">Ethics Statement</Link>
          </div>
          <div className="footer-section">
            <h3>Account</h3>
            <button onClick={() => setShowAuth(true)}>Log in</button>
            <button onClick={() => setShowAuth(true)}>Sign up</button>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Humyn. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/feature-request" element={<FeatureRequest />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/ethics" element={<Ethics />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </Router>
  );
}

export default App;