import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserProfile } from '../state/supabase';
import { saveTimeline, loadTimelines, loadTrees, loadCalendars } from '../state/db';
import ProPaywall from './ProPaywall';

export default function TimelineEditor() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  // Timeline State
  const [timelines, setTimelines] = useState([]);
  const [currentTimelineId, setCurrentTimelineId] = useState(null);
  const [name, setName] = useState('Untitled Timeline');
  const [events, setEvents] = useState([]);
  const [baseCalendarId, setBaseCalendarId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Character Linking State
  const [userTrees, setUserTrees] = useState([]);
  const [userCalendars, setUserCalendars] = useState([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [eventToLink, setEventToLink] = useState(null); // ID of the event being linked
  const [selectedTreeId, setSelectedTreeId] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        getUserProfile(user.id).then(({ profile }) => {
          if (profile) setSubscriptionTier(profile.subscription_tier);
          loadUserTimelines(user.id);
          loadTrees(user.id).then(trees => setUserTrees(trees));
          loadCalendars(user.id).then(cals => setUserCalendars(cals));
        });
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const loadUserTimelines = async (userId) => {
    const data = await loadTimelines(userId);
    setTimelines(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentUser) return alert("Must be logged in to save.");
    setIsSaving(true);
    try {
      const saved = await saveTimeline(currentUser.id, currentTimelineId, name, { events, baseCalendarId });
      setCurrentTimelineId(saved.id);
      alert("Timeline saved successfully!");
      loadUserTimelines(currentUser.id);
    } catch (err) {
      alert("Failed to save timeline: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadTimeline = (timeline) => {
    setCurrentTimelineId(timeline.id);
    setName(timeline.name);
    if (timeline.data) {
      setEvents(timeline.data.events || []);
      setBaseCalendarId(timeline.data.baseCalendarId || '');
    }
  };

  const addEvent = () => {
    setEvents([...events, { 
      id: Date.now(), 
      title: 'New Event', 
      date: 'Year 0', 
      structuredDate: { eraId: '', year: 0, monthId: '', day: 1 },
      description: '', 
      linkedCharacter: null 
    }]);
  };

  const handleLinkCharacter = (eventId) => {
    setEventToLink(eventId);
    setSelectedTreeId(userTrees.length > 0 ? userTrees[0].id : '');
    setIsLinkModalOpen(true);
  };

  const confirmLink = (character) => {
    setEvents(events.map(ev => {
      if (ev.id === eventToLink) {
        return { 
          ...ev, 
          linkedCharacter: { 
            treeId: selectedTreeId, 
            id: character.id, 
            name: `${character.data.firstName} ${character.data.lastName || ''}`.trim(),
            portraitUrl: character.data.portraitUrl
          } 
        };
      }
      return ev;
    }));
    setIsLinkModalOpen(false);
    setEventToLink(null);
  };

  const removeLink = (eventId) => {
    setEvents(events.map(ev => ev.id === eventId ? { ...ev, linkedCharacter: null } : ev));
  };

  const baseCalendar = userCalendars.find(c => c.id === baseCalendarId);
  const calendarMonths = baseCalendar?.data?.months || [];
  const calendarEras = baseCalendar?.data?.eras || [];

  const sortEvents = () => {
    if (!baseCalendarId) {
      alert("Sorting requires a Base Calendar to be selected.");
      return;
    }
    
    const sorted = [...events].sort((a, b) => {
      // Push non-structured events to the bottom
      if (!a.structuredDate) return 1;
      if (!b.structuredDate) return -1;
      
      const eraA = calendarEras.findIndex(e => e.id.toString() === a.structuredDate.eraId);
      const eraB = calendarEras.findIndex(e => e.id.toString() === b.structuredDate.eraId);
      if (eraA !== eraB) return eraA - eraB;
      
      if (a.structuredDate.year !== b.structuredDate.year) return (a.structuredDate.year || 0) - (b.structuredDate.year || 0);
      
      const monthA = calendarMonths.findIndex(m => m.id.toString() === a.structuredDate.monthId);
      const monthB = calendarMonths.findIndex(m => m.id.toString() === b.structuredDate.monthId);
      if (monthA !== monthB) return monthA - monthB;
      
      return (a.structuredDate.day || 1) - (b.structuredDate.day || 1);
    });
    
    setEvents(sorted);
  };

  if (isLoading) return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <ProPaywall currentUser={currentUser} subscriptionTier={subscriptionTier} featureName="Timeline Builder" />
      
      {/* Sidebar Settings */}
      <div style={{ width: '350px', background: 'var(--surface-1)', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} style={{ background: 'var(--surface-border)', color: 'white', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>🏠 Home</button>
            <button onClick={() => navigate('/tree')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', flex: 1 }}>Family Tree</button>
            <button onClick={() => navigate('/calendar')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', flex: 1 }}>Calendars</button>
          </div>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            style={{ width: '100%', fontSize: '1.5rem', fontWeight: 'bold', background: 'transparent', color: 'white', border: 'none', outline: 'none' }} 
          />
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Base Calendar</h3>
            <select 
              value={baseCalendarId} 
              onChange={e => setBaseCalendarId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
            >
              <option value="">None (Free-text Dates)</option>
              {userCalendars.map(cal => (
                <option key={cal.id} value={cal.id}>{cal.name}</option>
              ))}
            </select>
          </div>

          {timelines.length > 0 && (
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your Timelines</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {timelines.map(tl => (
                  <button 
                    key={tl.id} 
                    onClick={() => loadTimeline(tl)}
                    style={{ padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {tl.name}
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
            {isSaving ? 'Saving...' : '☁️ Save Timeline'}
          </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem auto' }}>
          <h2 style={{ margin: 0, color: 'var(--text-secondary)' }}>Timeline Editor</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {baseCalendarId && (
              <button 
                onClick={sortEvents} 
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ↕ Sort
              </button>
            )}
            <button 
              onClick={addEvent} 
              style={{ background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Add Event
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', borderLeft: '4px solid var(--surface-border)', paddingLeft: '2rem' }}>
          {events.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No events yet. Click "Add Event" to begin.</div>
          )}
          {events.map((ev, index) => (
            <div key={ev.id} style={{ position: 'relative', background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{
                position: 'absolute', left: '-2.85rem', top: '2rem', width: '20px', height: '20px', 
                borderRadius: '50%', background: 'var(--accent-primary)', border: '4px solid var(--bg-color)'
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={ev.title}
                  onChange={(e) => {
                    const newE = [...events];
                    newE[index].title = e.target.value;
                    setEvents(newE);
                  }}
                  style={{ flex: 1, fontSize: '1.25rem', fontWeight: 'bold', background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                  placeholder="Event Title"
                />
                
                {baseCalendarId && ev.structuredDate ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={ev.structuredDate.eraId}
                      onChange={(e) => {
                        const newE = [...events];
                        newE[index].structuredDate.eraId = e.target.value;
                        setEvents(newE);
                      }}
                      style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: '#f59e0b', fontWeight: 'bold' }}
                    >
                      <option value="">Select Era...</option>
                      {calendarEras.map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                    </select>

                    <input 
                      type="number"
                      placeholder="Year"
                      value={ev.structuredDate.year || ''}
                      onChange={(e) => {
                        const newE = [...events];
                        newE[index].structuredDate.year = parseInt(e.target.value) || 0;
                        setEvents(newE);
                      }}
                      style={{ width: '80px', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: '#f59e0b', fontWeight: 'bold', textAlign: 'center' }}
                    />

                    <select
                      value={ev.structuredDate.monthId}
                      onChange={(e) => {
                        const newE = [...events];
                        newE[index].structuredDate.monthId = e.target.value;
                        setEvents(newE);
                      }}
                      style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: '#f59e0b', fontWeight: 'bold' }}
                    >
                      <option value="">Select Month...</option>
                      {calendarMonths.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>

                    <input 
                      type="number"
                      placeholder="Day"
                      value={ev.structuredDate.day || ''}
                      onChange={(e) => {
                        const selectedMonth = calendarMonths.find(m => m.id.toString() === ev.structuredDate.monthId);
                        const maxDays = selectedMonth ? selectedMonth.days : 31;
                        let val = parseInt(e.target.value) || 1;
                        if (val > maxDays) val = maxDays;
                        
                        const newE = [...events];
                        newE[index].structuredDate.day = val;
                        setEvents(newE);
                      }}
                      style={{ width: '70px', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: '#f59e0b', fontWeight: 'bold', textAlign: 'center' }}
                    />
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={ev.date}
                    onChange={(e) => {
                      const newE = [...events];
                      newE[index].date = e.target.value;
                      setEvents(newE);
                    }}
                    style={{ width: '150px', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '4px', color: '#f59e0b', fontWeight: 'bold', textAlign: 'right' }}
                    placeholder="Date / Year"
                  />
                )}
              </div>

              <textarea 
                value={ev.description}
                onChange={(e) => {
                  const newE = [...events];
                  newE[index].description = e.target.value;
                  setEvents(newE);
                }}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-secondary)', resize: 'vertical', marginBottom: '1rem' }}
                placeholder="Describe what happened..."
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {ev.linkedCharacter ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                    {ev.linkedCharacter.portraitUrl && <img src={ev.linkedCharacter.portraitUrl} alt="Portrait" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>{ev.linkedCharacter.name}</span>
                    <button onClick={() => removeLink(ev.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleLinkCharacter(ev.id)}
                    style={{ background: 'transparent', border: '1px dashed var(--surface-border)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    + Link Character
                  </button>
                )}

                <button 
                  onClick={() => setEvents(events.filter(x => x.id !== ev.id))}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Delete Event
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Link Character Modal */}
      {isLinkModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface-1)', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', border: '1px solid var(--surface-border)' }}>
            <h2 style={{ marginTop: 0 }}>Link a Character</h2>
            
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Family Tree:</label>
            <select 
              value={selectedTreeId} 
              onChange={e => setSelectedTreeId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px', marginBottom: '1.5rem' }}
            >
              {userTrees.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
              {selectedTreeId && userTrees.find(t => t.id === selectedTreeId)?.data?.nodes?.filter(n => n.type === 'person').map(n => (
                <div 
                  key={n.id}
                  onClick={() => confirmLink(n)}
                  style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  {n.data.portraitUrl ? (
                    <img src={n.data.portraitUrl} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-1)' }} />
                  )}
                  <span>{n.data.firstName} {n.data.lastName}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsLinkModalOpen(false)}
              style={{ width: '100%', padding: '1rem', background: 'transparent', border: '1px solid var(--surface-border)', color: 'white', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
