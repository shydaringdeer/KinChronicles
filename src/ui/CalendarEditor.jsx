import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserProfile } from '../state/supabase';
import { saveCalendar, loadCalendars } from '../state/db';
import ProPaywall from './ProPaywall';

export default function CalendarEditor() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const [calendars, setCalendars] = useState([]);
  const [currentCalendarId, setCurrentCalendarId] = useState(null);
  const [name, setName] = useState('Untitled Calendar');
  const [months, setMonths] = useState([
    { id: 1, name: 'Month 1', days: 30 }
  ]);
  const [daysOfWeek, setDaysOfWeek] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [eras, setEras] = useState([{ id: 1, name: 'First Era', startYear: 0 }]);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        getUserProfile(user.id).then(({ profile }) => {
          if (profile) setSubscriptionTier(profile.subscription_tier);
          loadUserCalendars(user.id);
        });
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const loadUserCalendars = async (userId) => {
    const cals = await loadCalendars(userId);
    setCalendars(cals);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentUser) return alert("Must be logged in to save.");
    setIsSaving(true);
    try {
      const dataToSave = { months, daysOfWeek, eras };
      const saved = await saveCalendar(currentUser.id, currentCalendarId, name, dataToSave);
      setCurrentCalendarId(saved.id);
      alert("Calendar saved successfully!");
      loadUserCalendars(currentUser.id);
    } catch (err) {
      alert("Failed to save calendar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadCalendar = (cal) => {
    setCurrentCalendarId(cal.id);
    setName(cal.name);
    if (cal.data) {
      setMonths(cal.data.months || []);
      setDaysOfWeek(cal.data.daysOfWeek || []);
      setEras(cal.data.eras || []);
    }
  };

  const addMonth = () => {
    setMonths([...months, { id: Date.now(), name: `Month ${months.length + 1}`, days: 30 }]);
  };

  const totalDaysInYear = months.reduce((acc, m) => acc + (parseInt(m.days) || 0), 0);

  if (isLoading) return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <ProPaywall currentUser={currentUser} subscriptionTier={subscriptionTier} featureName="Calendar Creator" />
      
      {/* Sidebar Settings */}
      <div style={{ width: '350px', background: 'var(--surface-1)', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} style={{ background: 'var(--surface-border)', color: 'white', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>🏠 Home</button>
            <button onClick={() => navigate('/tree')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', flex: 1 }}>Family Tree</button>
            <button onClick={() => navigate('/timeline')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', flex: 1 }}>Timelines</button>
          </div>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            style={{ width: '100%', fontSize: '1.5rem', fontWeight: 'bold', background: 'transparent', color: 'white', border: 'none', outline: 'none' }} 
          />
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Months Configuration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Months</h3>
              <button onClick={addMonth} style={{ background: 'var(--surface-border)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {months.map((m, index) => (
                <div key={m.id} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={m.name}
                    onChange={(e) => {
                      const newM = [...months];
                      newM[index].name = e.target.value;
                      setMonths(newM);
                    }}
                    style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'white' }}
                  />
                  <input 
                    type="number" 
                    value={m.days}
                    onChange={(e) => {
                      const newM = [...months];
                      newM[index].days = parseInt(e.target.value) || 0;
                      setMonths(newM);
                    }}
                    style={{ width: '60px', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'white' }}
                  />
                  <button 
                    onClick={() => setMonths(months.filter(x => x.id !== m.id))}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >✕</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Total Days per Year: {totalDaysInYear}
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Days of the Week</h3>
            <textarea 
              value={daysOfWeek.join(', ')}
              onChange={(e) => setDaysOfWeek(e.target.value.split(',').map(s => s.trim()))}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'white', resize: 'vertical' }}
              placeholder="Mon, Tue, Wed..."
            />
          </div>

          {/* Load Existing */}
          {calendars.length > 0 && (
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your Calendars</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {calendars.map(cal => (
                  <button 
                    key={cal.id} 
                    onClick={() => loadCalendar(cal)}
                    style={{ padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {cal.name}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', color: '#18181b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isSaving ? 'Saving...' : '☁️ Save Calendar'}
          </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Calendar Preview</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          {months.map(m => (
            <div key={m.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--surface-border)' }}>
                <h3 style={{ margin: 0 }}>{m.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({m.days} days)</span></h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(daysOfWeek.length, 1)}, 1fr)`, gap: '4px', marginBottom: '8px' }}>
                  {daysOfWeek.map((day, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{day}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(daysOfWeek.length, 1)}, 1fr)`, gap: '4px' }}>
                  {Array.from({ length: m.days || 0 }).map((_, i) => (
                    <div key={i} style={{ 
                      aspectRatio: '1/1', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: 'var(--bg-color)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
