import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserProfile } from '../state/supabase';
import { saveChronicle, loadChronicles, deleteChronicle, loadNameLists } from '../state/db';

export default function ChronicleSimulator() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Setup State
  const [yearsToSimulate, setYearsToSimulate] = useState(100);
  const [foundingFirstName, setFoundingFirstName] = useState('Aegon');
  const [foundingLastName, setFoundingLastName] = useState('Targaryen');
  const [minMarriageAge, setMinMarriageAge] = useState(16);
  const [allowPolygamy, setAllowPolygamy] = useState(false);
  const [interwovenProbability, setInterwovenProbability] = useState(0.5);
  const [successionLaw, setSuccessionLaw] = useState('agnatic');
  const [lifeExpectancy, setLifeExpectancy] = useState(50);
  const [fertilityModifier, setFertilityModifier] = useState(1.0);
  
  // Name Lists Setup
  const [userLists, setUserLists] = useState([]);
  const [selectedMaleList, setSelectedMaleList] = useState('');
  const [selectedFemaleList, setSelectedFemaleList] = useState('');
  const [selectedDynastyList, setSelectedDynastyList] = useState('');
  
  // App State
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chronicleEvents, setChronicleEvents] = useState(null);
  const [chronicleTree, setChronicleTree] = useState(null);
  const [rawNodes, setRawNodes] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);
  const [chronicleName, setChronicleName] = useState('Untitled Chronicle');
  const [isSaving, setIsSaving] = useState(false);
  const [savedChronicles, setSavedChronicles] = useState([]);
  const [showSavedMenu, setShowSavedMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
      if (session?.user) {
        fetchSavedChronicles(session.user.id);
        fetchNameLists(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      if (session?.user) {
        fetchSavedChronicles(session.user.id);
        fetchNameLists(session.user.id);
      } else {
        setSavedChronicles([]);
        setUserLists([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchSavedChronicles = async (userId) => {
    const data = await loadChronicles(userId);
    setSavedChronicles(data);
  };

  const fetchNameLists = async (userId) => {
    const lists = await loadNameLists(userId);
    setUserLists(lists);
  };

  const buildHierarchy = (nodes, edges) => {
    if (!nodes || nodes.length === 0) return null;
    
    // Create a map of all nodes
    const nodeMap = {};
    nodes.forEach(n => {
      nodeMap[n.id] = { ...n, children: [], spouses: [] };
    });

    // Attach spouses and children based on edges
    edges.forEach(e => {
      if (e.data?.relationType === 'married') {
        const source = nodeMap[e.source];
        const target = nodeMap[e.target];
        if (source && target) {
          source.spouses.push(target);
        }
      } else if (e.data?.relationType === 'biological') {
        const parent = nodeMap[e.source];
        const child = nodeMap[e.target];
        if (parent && child) {
          parent.children.push(child);
        }
      }
    });

    // The founder is the first node (usually)
    return nodeMap[nodes[0].id];
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setProgress(0);
    setChronicleEvents(null);
    setChronicleTree(null);

    const worker = new Worker(new URL('../engine/dynastyWorker.js', import.meta.url));
    
    worker.onmessage = (e) => {
      const { type, year, payload } = e.data;
      if (type === 'PROGRESS_UPDATE') {
        setProgress(Math.round((year / yearsToSimulate) * 100));
      } else if (type === 'SIMULATION_COMPLETE') {
        setIsSimulating(false);
        setChronicleEvents(payload.events);
        setRawNodes(payload.nodes);
        setRawEdges(payload.edges);
        setChronicleTree(buildHierarchy(payload.nodes, payload.edges));
        setChronicleName(`Chronicle of House ${foundingLastName}`);
        worker.terminate();
      }
    };

    const maleNamesData = userLists.find(l => l.id === selectedMaleList)?.data?.names || [];
    const maleNames = maleNamesData.filter(n => n.gender === 'male' || n.gender === 'any').map(n => n.name);

    const femaleNamesData = userLists.find(l => l.id === selectedFemaleList)?.data?.names || [];
    const femaleNames = femaleNamesData.filter(n => n.gender === 'female' || n.gender === 'any').map(n => n.name);

    const dynastyNamesData = userLists.find(l => l.id === selectedDynastyList)?.data?.names || [];
    const dynastyNames = dynastyNamesData.map(n => n.name);

    worker.postMessage({
      yearsToSimulate: Number(yearsToSimulate),
      foundingFirstName,
      foundingLastName,
      minMarriageAge: Number(minMarriageAge),
      allowPolygamy,
      interwovenProbability: Number(interwovenProbability),
      successionLaw,
      lifeExpectancy: Number(lifeExpectancy),
      fertilityModifier: Number(fertilityModifier),
      maleNames: maleNames.length > 0 ? maleNames : null,
      femaleNames: femaleNames.length > 0 ? femaleNames : null,
      dynastyNames: dynastyNames.length > 0 ? dynastyNames : null
    });
  };

  const handleSave = async () => {
    if (!currentUser) return alert("You must be logged in to save.");
    const name = prompt("Enter a name for this Chronicle:", chronicleName);
    if (!name) return;
    
    setIsSaving(true);
    try {
      await saveChronicle(currentUser.id, null, name, { events: chronicleEvents, nodes: rawNodes, edges: rawEdges });
      await fetchSavedChronicles(currentUser.id);
      setChronicleName(name);
      alert("Chronicle saved successfully!");
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLoad = async (chronicle) => {
    if (!chronicle.data || !chronicle.data.events) {
      alert("Invalid chronicle data.");
      return;
    }
    setChronicleEvents(chronicle.data.events);
    if (chronicle.data.nodes && chronicle.data.edges) {
      setRawNodes(chronicle.data.nodes);
      setRawEdges(chronicle.data.edges);
      setChronicleTree(buildHierarchy(chronicle.data.nodes, chronicle.data.edges));
    }
    setChronicleName(chronicle.name);
    setShowSavedMenu(false);
  };
  
  const handleDelete = async (chronicleId) => {
    if (window.confirm("Are you sure you want to delete this chronicle?")) {
      await deleteChronicle(chronicleId, currentUser?.id);
      await fetchSavedChronicles(currentUser?.id);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary">🏠 Home</button>
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#f59e0b' }}>✨ Dynasty Simulator</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {currentUser && (
            <button onClick={() => setShowSavedMenu(true)} className="btn btn-secondary">
              📂 My Chronicles
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Side: Setup Panel */}
        <div style={{ width: '350px', background: 'var(--surface-1)', borderRight: '1px solid var(--surface-border)', padding: '1.5rem', overflowY: 'auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem' }}>Simulation Parameters</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Timeframe (Years)</label>
              <input type="number" value={yearsToSimulate} onChange={e => setYearsToSimulate(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Founder First Name</label>
              <input type="text" value={foundingFirstName} onChange={e => setFoundingFirstName(e.target.value)} style={inputStyle} />
            </div>
            
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>House Name</label>
              <input type="text" value={foundingLastName} onChange={e => setFoundingLastName(e.target.value)} style={inputStyle} />
            </div>

            <hr style={{ borderColor: 'var(--surface-border)', margin: '0.5rem 0' }} />

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Male Name List</label>
              <select value={selectedMaleList} onChange={e => setSelectedMaleList(e.target.value)} style={inputStyle}>
                <option value="">Default (Fantasy Fallback)</option>
                {userLists.filter(l => l.type === 'character').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Female Name List</label>
              <select value={selectedFemaleList} onChange={e => setSelectedFemaleList(e.target.value)} style={inputStyle}>
                <option value="">Default (Fantasy Fallback)</option>
                {userLists.filter(l => l.type === 'character').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Dynasty Name List</label>
              <select value={selectedDynastyList} onChange={e => setSelectedDynastyList(e.target.value)} style={inputStyle}>
                <option value="">Default (Fantasy Fallback)</option>
                {userLists.filter(l => l.type === 'dynasty').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <hr style={{ borderColor: 'var(--surface-border)', margin: '0.5rem 0' }} />

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Succession Law</label>
              <select value={successionLaw} onChange={e => setSuccessionLaw(e.target.value)} style={inputStyle}>
                <option value="agnatic">Agnatic Primogeniture</option>
                <option value="male_preference">Male-Preference</option>
                <option value="absolute">Absolute Primogeniture</option>
                <option value="ultimogeniture">Ultimogeniture</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Life Expectancy</label>
              <input type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Fertility Modifier (1.0 = Base)</label>
              <input type="number" step="0.1" value={fertilityModifier} onChange={e => setFertilityModifier(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Min Marriage Age</label>
              <input type="number" value={minMarriageAge} onChange={e => setMinMarriageAge(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Interwoven Marriages</label>
              <input type="number" step="0.1" min="0" max="1" value={interwovenProbability} onChange={e => setInterwovenProbability(e.target.value)} title="Probability to marry within the generated tree instead of an outsider" style={inputStyle} />
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={allowPolygamy} onChange={e => setAllowPolygamy(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                Allow Polygamy
              </label>
            </div>

            <button 
              onClick={startSimulation} 
              disabled={isSimulating}
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                color: 'white',
                fontWeight: 'bold',
                cursor: isSimulating ? 'wait' : 'pointer',
                opacity: isSimulating ? 0.7 : 1
              }}
            >
              {isSimulating ? 'Simulating...' : '🚀 Generate Chronicle'}
            </button>
          </div>
        </div>

        {/* Right Side: Log View */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isSimulating ? (
            <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center', marginTop: '100px' }}>
              <h2>Writing History...</h2>
              <div style={{ width: '100%', height: '20px', background: 'var(--surface-border)', borderRadius: '10px', marginTop: '1rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(45deg, #f59e0b, #d97706)', transition: 'width 0.2s' }} />
              </div>
              <p style={{ marginTop: '0.5rem' }}>{progress}%</p>
            </div>
          ) : chronicleEvents ? (
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', flexShrink: 0 }}>
                <h1 style={{ margin: 0 }}>{chronicleName}</h1>
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                  {isSaving ? 'Saving...' : '☁️ Save Chronicle'}
                </button>
              </div>

              {/* Top Half: Simple Tree View */}
              {chronicleTree && (
                <div style={{ flex: '1 1 50%', minHeight: '300px', overflowY: 'auto', overflowX: 'auto', borderBottom: '2px dashed var(--surface-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Family Tree</h3>
                  <div className="simple-tree-container">
                    <SimpleTreeView node={chronicleTree} currentYear={yearsToSimulate} />
                  </div>
                </div>
              )}
              
              {/* Bottom Half: Event Log */}
              <div style={{ flex: '1 1 50%', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Event Log</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {chronicleEvents.map((evt, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      padding: '0.75rem 1rem', 
                      background: 'var(--surface-1)', 
                      borderRadius: '8px', 
                      borderLeft: evt.text.includes('ascended') ? '4px solid #f59e0b' : evt.text.includes('died') ? '4px solid #ef4444' : evt.text.includes('born') ? '4px solid #10b981' : '4px solid var(--surface-border)'
                    }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', minWidth: '80px' }}>Year {evt.year}</div>
                      <div>{evt.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '100px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <h2>No Chronicle Generated</h2>
              <p>Adjust your parameters on the left and click "Generate Chronicle" to begin writing history.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Saved Menu Modal */}
      {showSavedMenu && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'var(--surface-1)', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>My Chronicles</h2>
            {savedChronicles.length === 0 ? (
              <p>No saved chronicles found.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {savedChronicles.map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleLoad(c)}>{c.name}</span>
                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowSavedMenu(false)} className="btn btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleTreeView({ node, currentYear }) {
  if (!node) return null;

  const age = (node.data?.deathYear !== null && node.data?.deathYear !== undefined ? node.data.deathYear : currentYear) - node.data?.birthYear;

  return (
    <ul style={{ listStyleType: 'none', paddingLeft: '20px', margin: 0, borderLeft: '1px dashed var(--surface-border)' }}>
      <li style={{ padding: '0.25rem 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '12px', height: '1px', background: 'var(--surface-border)', position: 'absolute', left: '-20px'
          }} />
          <div style={{ 
            background: node.data?.titles === 'Head of House' ? 'linear-gradient(45deg, #f59e0b, #d97706)' : 'var(--surface-1)', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '16px',
            border: `1px solid ${node.data?.titles === 'Head of House' ? '#f59e0b' : 'var(--surface-border)'}`,
            color: node.data?.titles === 'Head of House' ? 'white' : 'inherit',
            fontWeight: node.data?.titles === 'Head of House' ? 'bold' : 'normal',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.9rem'
          }}>
            {node.data?.titles === 'Head of House' && '👑'} 
            {node.data?.regnalName ? node.data.regnalName : node.data?.firstName} {node.data?.lastName}
            <span style={{ color: node.data?.gender === 'male' ? '#3b82f6' : '#ec4899', marginLeft: '0.25rem', fontSize: '1.1em' }}>
              {node.data?.gender === 'male' ? '♂' : '♀'}
            </span>
            
            {node.data?.deathYear !== undefined && node.data?.deathYear !== null ? (
              <span style={{ opacity: 0.7, fontSize: '0.8em', marginLeft: '0.5rem' }}>
                (b. Year {node.data.birthYear} - d. Year {node.data.deathYear}, aged {age})
              </span>
            ) : (
              <span style={{ opacity: 0.7, fontSize: '0.8em', marginLeft: '0.5rem', color: '#10b981' }}>
                (b. Year {node.data.birthYear} - alive, aged {age})
              </span>
            )}
          </div>
          
          {/* Spouses */}
          {node.spouses && node.spouses.length > 0 && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {node.spouses.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-color)',
                  border: '1px dashed #ec4899',
                  color: '#ec4899',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  ⚭ {s.data?.firstName} {s.data?.lastName}
                  <span style={{ marginLeft: '0.25rem' }}>
                    {s.data?.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {node.children && node.children.length > 0 && (
          <div style={{ marginTop: '0.25rem' }}>
            {node.children.map((child, idx) => (
              <SimpleTreeView key={idx} node={child} currentYear={currentYear} />
            ))}
          </div>
        )}
      </li>
    </ul>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid var(--surface-border)',
  background: 'var(--bg-color)',
  color: 'white',
  boxSizing: 'border-box'
};
