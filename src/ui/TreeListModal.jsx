import React, { useEffect, useState } from 'react';
import { loadTrees, deleteTree } from '../state/db';

export default function TreeListModal({ currentUser, onClose, onSelect }) {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadTrees(currentUser.id)
        .then(data => {
          setTrees(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [currentUser]);

  const handleDelete = async (e, treeId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this tree?")) {
      try {
        await deleteTree(treeId, currentUser.id);
        setTrees(trees.filter(t => t.id !== treeId));
      } catch (err) {
        alert("Failed to delete tree: " + err.message);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass" style={{
        width: '400px', maxHeight: '80vh', overflowY: 'auto',
        padding: '2rem', borderRadius: '16px', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '1.2rem', cursor: 'pointer'
        }}>✕</button>

        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>My Family Trees</h2>

        {loading && <p>Loading trees...</p>}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        
        {!loading && !error && trees.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>You don't have any saved trees yet.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {trees.map(tree => (
            <div 
              key={tree.id}
              onClick={() => onSelect(tree.id, tree.name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem', background: 'var(--surface-2)',
                borderRadius: '8px', border: '1px solid var(--surface-border)',
                cursor: 'pointer', transition: 'border-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}
            >
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{tree.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Updated: {new Date(tree.updated_at).toLocaleDateString()}
                </span>
              </div>
              <button 
                onClick={(e) => handleDelete(e, tree.id)}
                style={{
                  background: 'none', border: 'none', color: '#ef4444',
                  cursor: 'pointer', padding: '4px', fontWeight: 'bold'
                }}
                title="Delete Tree"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
