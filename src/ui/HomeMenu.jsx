import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeMenu() {
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <h1 style={{ 
        fontSize: '4rem', 
        marginBottom: '1rem', 
        textAlign: 'center',
        background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        KinChronicles
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px' }}>
        Build beautiful, interactive fictional family trees online. Track lineages, marriages, and dynasties with ease.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/tree')}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            background: 'var(--text-primary)',
            color: 'var(--bg-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
          }}
        >
          Create New Tree
        </button>
        <button 
          onClick={() => navigate('/login')}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            background: 'var(--surface-1)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          Login / Sign Up
        </button>
      </div>
    </div>
  );
}
