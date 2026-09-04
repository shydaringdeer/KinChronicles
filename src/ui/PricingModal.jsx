import React from 'react';

export default function PricingModal({ isOpen, onClose, currentUser, subscriptionTier }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        <h2 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '0.5rem', 
          textAlign: 'center',
          background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          KinChronicles Pro Features
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
          Take your world-building to the next level with unlimited characters and premium tools.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Free Tier */}
          <div style={{
            background: 'var(--bg-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            border: '1px solid var(--surface-border)',
            display: 'flex',
            flexDirection: 'column',
            opacity: subscriptionTier === 'pro' ? 0.5 : 1
          }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Free Tier</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>$0<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}> / forever</span></div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, color: 'var(--text-secondary)', lineHeight: '2' }}>
              <li>✓ Build beautiful family trees</li>
              <li>✓ Up to 150 characters per tree</li>
              <li>✓ Auto-layout and spouse routing</li>
              <li>✓ Image exporting</li>
              <li>✓ Cloud saving</li>
            </ul>

            <button 
              onClick={onClose}
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {subscriptionTier === 'free' ? 'Current Plan' : 'Included in Pro'}
            </button>
          </div>

          {/* Pro Tier */}
          <div style={{
            background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--bg-color) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            border: '2px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.1)'
          }}>
            {subscriptionTier === 'free' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Most Popular
              </div>
            )}
            
            {subscriptionTier === 'pro' && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#10b981',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Your Current Plan
              </div>
            )}

            <h3 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '1rem' }}>Pro Tier</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>$5.00<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}> / month</span></div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, color: 'var(--text-primary)', lineHeight: '2' }}>
              <li><span style={{ color: '#10b981' }}>✓</span> Everything in Free, plus:</li>
              <li><span style={{ color: '#10b981' }}>✓</span> <strong>Unlimited characters</strong> per tree</li>
              <li><span style={{ color: '#10b981' }}>✓</span> <strong>Timeline Generation</strong> (Coming Soon)</li>
              <li><span style={{ color: '#10b981' }}>✓</span> <strong>Novel Writer Module</strong> (Coming Soon)</li>
              <li><span style={{ color: '#10b981' }}>✓</span> Priority Support</li>
            </ul>

            <button 
              onClick={async () => {
                if (!currentUser) {
                  alert("Please log in first!");
                  return;
                }
                
                if (subscriptionTier === 'pro') {
                  try {
                    const res = await fetch('/api/portal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: currentUser.id })
                    });
                    const data = await res.json();
                    
                    if (res.ok && data.url) {
                      window.location.href = data.url;
                    } else if (data.error === 'no_stripe_account') {
                      alert(data.message);
                    } else {
                      alert(`Backend Error: ${data.error || 'Unknown error'}`);
                    }
                  } catch (err) {
                    console.error("Portal error:", err);
                    alert(`Network error connecting to billing portal: ${err.message}`);
                  }
                } else {
                  window.location.href = `${import.meta.env.VITE_STRIPE_PAYMENT_LINK}?client_reference_id=${currentUser.id}`;
                }
              }}
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: subscriptionTier === 'pro' ? 'var(--surface-1)' : 'linear-gradient(45deg, #f59e0b, #d97706)',
                color: subscriptionTier === 'pro' ? 'var(--text-primary)' : 'white',
                border: subscriptionTier === 'pro' ? '1px solid var(--surface-border)' : 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                transition: 'transform 0.2s',
                boxShadow: subscriptionTier === 'pro' ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              {subscriptionTier === 'pro' ? 'Manage Subscription' : '⭐ Upgrade to Pro'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
