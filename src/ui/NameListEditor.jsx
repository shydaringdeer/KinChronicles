import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserProfile } from '../state/supabase';
import { saveNameList, loadNameLists, deleteNameList } from '../state/db';

export default function NameListEditor({ isModal = false, onClose }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [nameLists, setNameLists] = useState([]);
  const [currentList, setCurrentList] = useState(null); // The currently edited list object
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Add State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkGender, setBulkGender] = useState('any'); // male, female, any (for character lists)

  // Single Add State
  const [singleInput, setSingleInput] = useState('');
  const [singleGender, setSingleGender] = useState('any');

  // View State
  const [sortOrder, setSortOrder] = useState('original'); // original, asc, desc

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        getUserProfile(user.id).then(({ profile }) => {
          if (profile) setSubscriptionTier(profile.subscription_tier);
          loadUserData(user.id);
        });
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const loadUserData = async (userId) => {
    const lists = await loadNameLists(userId);
    setNameLists(lists);
    setIsLoading(false);
  };

  const characterLists = nameLists.filter(l => l.type === 'character');
  const dynastyLists = nameLists.filter(l => l.type === 'dynasty');

  const handleCreateList = (type) => {
    if (!currentUser) return alert("Must be logged in to create name lists.");
    
    // Check constraints
    if (subscriptionTier !== 'pro') {
      const count = type === 'character' ? characterLists.length : dynastyLists.length;
      if (count >= 5) {
        return alert(`Free tier is limited to 5 ${type} name lists. Upgrade to Pro for unlimited lists!`);
      }
    }

    const defaultName = `New ${type === 'character' ? 'Character' : 'Dynasty'} List`;
    const listName = window.prompt("Enter a name for your new list:", defaultName);
    
    if (listName === null) return; // User cancelled

    const newList = {
      id: null,
      name: listName.trim() || defaultName,
      type,
      data: { names: [] }
    };
    setCurrentList(newList);
    setBulkInput('');
  };

  const handleSaveList = async () => {
    if (!currentUser || !currentList) return;
    
    if (subscriptionTier !== 'pro') {
      const maxNames = currentList.type === 'character' ? 100 : 50;
      if (currentList.data.names.length > maxNames) {
        return alert(`Free tier is limited to ${maxNames} names per ${currentList.type} list. You have ${currentList.data.names.length}. Upgrade to Pro for unlimited names!`);
      }
    }

    setIsSaving(true);
    try {
      const saved = await saveNameList(currentUser.id, currentList.id, currentList.name, currentList.type, currentList.data);
      setCurrentList(saved);
      alert("Name list saved successfully!");
      loadUserData(currentUser.id);
    } catch (err) {
      alert("Failed to save list: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!listId || !window.confirm("Are you sure you want to delete this list?")) return;
    try {
      await deleteNameList(listId, currentUser.id);
      if (currentList?.id === listId) {
        setCurrentList(null);
      }
      loadUserData(currentUser.id);
    } catch (err) {
      alert("Failed to delete list: " + err.message);
    }
  };

  const handleBulkAdd = () => {
    if (!bulkInput.trim() || !currentList) return;
    
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l);
    const newNames = lines.map(name => {
      if (currentList.type === 'character') {
        return { name, gender: bulkGender };
      } else {
        return { name }; // Dynasty just needs name
      }
    });

    const combined = [...currentList.data.names, ...newNames];
    
    if (subscriptionTier !== 'pro') {
      const maxNames = currentList.type === 'character' ? 100 : 50;
      if (combined.length > maxNames) {
        alert(`Adding these would exceed your free limit of ${maxNames} names. Keeping only the first ${maxNames}.`);
        combined.length = maxNames; // truncate
      }
    }

    setCurrentList(prev => ({
      ...prev,
      data: { ...prev.data, names: combined }
    }));
    setBulkInput('');
  };

  const handleSingleAdd = (e) => {
    e.preventDefault();
    if (!singleInput.trim() || !currentList) return;

    const newName = { 
      name: singleInput.trim(),
      ...(currentList.type === 'character' ? { gender: singleGender } : {})
    };

    if (subscriptionTier !== 'pro') {
      const maxNames = currentList.type === 'character' ? 100 : 50;
      if (currentList.data.names.length >= maxNames) {
        return alert(`Free tier is limited to ${maxNames} names per ${currentList.type} list. Upgrade to Pro for unlimited names!`);
      }
    }

    setCurrentList(prev => ({
      ...prev,
      data: { ...prev.data, names: [...prev.data.names, newName] }
    }));
    setSingleInput('');
  };

  const getSortedNames = () => {
    if (!currentList) return [];
    let names = currentList.data.names.map((n, i) => ({ ...n, originalIndex: i }));
    if (sortOrder === 'asc') {
      names.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'desc') {
      names.sort((a, b) => b.name.localeCompare(a.name));
    }
    return names;
  };

  const handleRemoveName = (index) => {
    const updatedNames = [...currentList.data.names];
    updatedNames.splice(index, 1);
    setCurrentList(prev => ({
      ...prev,
      data: { ...prev.data, names: updatedNames }
    }));
  };

  if (isLoading) return <div className="flex-center" style={{ height: '100vh', color: 'var(--text-primary)' }}>Loading...</div>;

  const content = (
    <div style={isModal ? { 
      display: 'flex', height: '80vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', 
      borderRadius: '12px', overflow: 'hidden', width: '100%', maxWidth: '1200px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    } : { 
      display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' 
    }}>
      {/* Sidebar */}
      <div style={{ width: '300px', borderRight: '1px solid var(--surface-border)', backgroundColor: 'var(--surface-1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isModal ? 0 : '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Name Lists</h2>
            {isModal && <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>}
          </div>
          {!isModal && (
            <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ width: '100%' }}>
              ← Back to Home
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Character Names</h3>
              <button onClick={() => handleCreateList('character')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>+ New</button>
            </div>
            {characterLists.map(list => (
              <div 
                key={list.id} 
                onClick={() => setCurrentList(list)}
                style={{
                  padding: '0.75rem',
                  backgroundColor: currentList?.id === list.id ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}
              >
                {list.name}
              </div>
            ))}
            {characterLists.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No character lists.</div>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Dynasty/House Names</h3>
              <button onClick={() => handleCreateList('dynasty')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>+ New</button>
            </div>
            {dynastyLists.map(list => (
              <div 
                key={list.id} 
                onClick={() => setCurrentList(list)}
                style={{
                  padding: '0.75rem',
                  backgroundColor: currentList?.id === list.id ? 'var(--surface-2)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}
              >
                {list.name}
              </div>
            ))}
            {dynastyLists.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No dynasty lists.</div>}
          </div>
        </div>
      </div>

      {/* Editor Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', overflowY: 'auto', padding: '2rem' }}>
        {!currentList ? (
          <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>
            Select or create a Name List to start editing.
          </div>
        ) : (
          <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <input 
                type="text" 
                value={currentList.name}
                onChange={e => setCurrentList({ ...currentList, name: e.target.value })}
                style={{ fontSize: '2rem', fontWeight: 'bold', background: 'transparent', border: 'none', borderBottom: '2px solid var(--surface-border)', color: 'var(--text-primary)', padding: '0.5rem 0', width: '60%' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                {currentList.id && (
                  <button onClick={() => handleDeleteList(currentList.id)} className="btn btn-secondary" style={{ color: '#ef4444' }}>Delete</button>
                )}
                <button onClick={handleSaveList} disabled={isSaving} className="btn btn-primary">
                  {isSaving ? 'Saving...' : 'Save List'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Add Single Name</h3>
                <form onSubmit={handleSingleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input 
                    type="text" 
                    value={singleInput}
                    onChange={e => setSingleInput(e.target.value)}
                    placeholder="Enter name..."
                    style={{ width: '100%' }}
                  />
                  {currentList.type === 'character' && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label>Gender:</label>
                      <select value={singleGender} onChange={e => setSingleGender(e.target.value)} style={{ flex: 1 }}>
                        <option value="any">Any / Neutral</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Add Name</button>
                </form>
              </div>

              <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Quick Add Names</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Paste a list of names, one per line.</p>
                
                <textarea 
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  placeholder="Name 1&#10;Name 2&#10;Name 3..."
                  style={{ width: '100%', height: '80px', marginBottom: '1rem' }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {currentList.type === 'character' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={bulkGender} onChange={e => setBulkGender(e.target.value)} style={{ width: 'auto' }}>
                        <option value="any">Any / Neutral</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  ) : (
                    <div />
                  )}
                  <button onClick={handleBulkAdd} className="btn btn-secondary">Add List</button>
                </div>
              </div>
            </div>

            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Names in List ({currentList.data.names.length})</h3>
                  {subscriptionTier !== 'pro' && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                      Free Tier Limit: {currentList.type === 'character' ? 100 : 50}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sort:</label>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: '0.25rem 0.5rem', width: 'auto' }}>
                    <option value="original">Date Added</option>
                    <option value="asc">A to Z</option>
                    <option value="desc">Z to A</option>
                  </select>
                </div>
              </div>
              
              {currentList.data.names.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No names added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {getSortedNames().map((n) => (
                    <div key={n.originalIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <strong>{n.name}</strong>
                        {currentList.type === 'character' && n.gender && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({n.gender})</span>
                        )}
                      </div>
                      <button onClick={() => handleRemoveName(n.originalIndex)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        {content}
      </div>
    );
  }

  return content;
}
