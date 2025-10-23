import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home after 3 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="page-container">
      <PageHeader />
      <div className="page-content">
        <div className="success-content">
          <h1>🎉 Welcome to Premium!</h1>
          <p>Your subscription has been activated successfully.</p>
          
          <div className="premium-features">
            <h2>You now have access to:</h2>
            <ul>
              <li>✨ Unlimited humanizations</li>
              <li>🔄 Multiple text variants</li>
              <li>⚡ Priority processing</li>
              <li>🎨 Advanced tone controls</li>
            </ul>
          </div>
          
          <p>Redirecting you to the app in 3 seconds...</p>
          
          <button 
            className="cta-btn" 
            onClick={() => navigate('/')}
          >
            Start Using Premium Features
          </button>
        </div>
      </div>
    </div>
  );
}

export default Success;