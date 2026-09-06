import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeMenu() {
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-color)',
      color: 'var(--text-primary)'
    }}>
      {/* Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-brand">KinChronicles</div>
        <button 
          onClick={() => navigate('/login')}
          className="btn btn-secondary"
        >
          Login / Sign Up
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg"></div>
        <h1 className="hero-title">Forge Your Dynasty's Legacy</h1>
        <p className="hero-subtitle">
          Build beautiful, interactive fictional family trees online. Track lineages, alliances, marriages, and dynasties with a sleek, professional interface built for worldbuilders.
        </p>
        
        <div className="hero-cta-container">
          <button 
            onClick={() => navigate('/tree')}
            className="btn btn-primary"
            style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}
          >
            Start Building Free
          </button>
          <button 
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-secondary"
            style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}
          >
            Explore Features
          </button>
        </div>


      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '1rem' }}>
          Everything You Need to Worldbuild
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          From sprawling royal lineages to intricate timelines, our tools are designed to bring your fictional worlds to life.
        </p>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon">🌳</div>
            <h3 className="feature-title">Interactive Family Trees</h3>
            <p className="feature-desc">
              Visually map out complex bloodlines, marriages, and cadet branches. Add portraits, biographies, and custom house crests to every character.
            </p>
            <button 
              onClick={() => navigate('/tree')}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
            >
              Open Tree Builder
            </button>
          </div>

          {/* Feature 2 */}
          <div className="feature-card pro">
            <div className="feature-icon">👑</div>
            <h3 className="feature-title">Timeline Builder</h3>
            <p className="feature-desc">
              Track historical events, eras, and reign lengths. Correlate your family tree characters with specific moments in your world's history.
            </p>
            <button 
              onClick={() => navigate('/timeline')}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start', background: 'linear-gradient(45deg, #f59e0b, #d97706)', color: 'white', border: 'none' }}
            >
              Explore Timelines (Pro)
            </button>
          </div>

          {/* Feature 3 */}
          <div className="feature-card pro">
            <div className="feature-icon">📅</div>
            <h3 className="feature-title">Custom Calendars</h3>
            <p className="feature-desc">
              Design bespoke calendar systems with custom months, days, and eras. Assign exact dates to character births, deaths, and reigns.
            </p>
            <button 
              onClick={() => navigate('/calendar')}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start', background: 'linear-gradient(45deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none' }}
            >
              Create Calendars (Pro)
            </button>
          </div>

          {/* Feature 4: Name Lists */}
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3 className="feature-title">Name Lists</h3>
            <p className="feature-desc">
              Create and manage lists of character names and dynasty/house names. Use them to randomize names directly within your family trees!
            </p>
            <button 
              onClick={() => navigate('/names')}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start' }}
            >
              Manage Name Lists
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '3rem 2rem',
        borderTop: '1px solid var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        color: 'var(--text-muted)'
      }}>
        <div className="nav-brand" style={{ fontSize: '1.2rem' }}>KinChronicles</div>
        <p>© {new Date().getFullYear()} KinChronicles. All rights reserved.</p>
      </footer>
    </div>
  );
}
