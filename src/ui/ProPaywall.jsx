import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProPaywall({ currentUser, subscriptionTier, featureName }) {
  const navigate = useNavigate();

  // If they are Pro, don't show the paywall at all
  if (subscriptionTier === 'pro') return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(24, 24, 27, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '3rem',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👑</div>
        <h2 style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '1rem' }}>Pro Feature</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
          The <strong>{featureName}</strong> is an exclusive feature for KinChronicles Pro subscribers. Upgrade today to unlock advanced world-building tools, unlimited characters, and priority support!
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              padding: '1rem 2rem',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--surface-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Go Back
          </button>
          <button 
            onClick={() => {
              if (currentUser) {
                window.location.href = `${import.meta.env.VITE_STRIPE_PAYMENT_LINK}?client_reference_id=${currentUser.id}`;
              } else {
                navigate('/login');
              }
            }}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
            }}
          >
            {currentUser ? '⭐ Upgrade to Pro' : 'Login & Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
