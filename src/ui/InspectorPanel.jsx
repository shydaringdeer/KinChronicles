import React, { useContext, useState, useRef } from 'react';
import { TreeContext } from './TreeContext';
import { uploadImage } from '../state/db';
import ImageGalleryModal from './ImageGalleryModal';

export default function InspectorPanel({ currentUser, selectedNode, selectedEdge, onUpdateNode, onUpdateEdge, onDeleteNode, onDeleteEdge, onClose }) {
  const { dynasties, setDynasties } = useContext(TreeContext);
  const [editingDynastyId, setEditingDynastyId] = useState(null); // null, 'new', or dynasty.id
  const [newDynasty, setNewDynasty] = useState({ name: '', branch: '', coaUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const portraitInputRef = useRef(null);

  const handleDynastySelect = (e) => {
    const val = e.target.value;
    if (val === '') {
      onUpdateNode(selectedNode.id, { dynastyId: null, lastName: '', cadetBranch: '' });
      return;
    }
    const d = dynasties.find(dyn => dyn.id === val);
    if (d) {
      onUpdateNode(selectedNode.id, { dynastyId: d.id, lastName: d.name, cadetBranch: d.branch || '' });
    }
  };

  const handleEditDynasty = () => {
    const d = dynasties.find(dyn => dyn.id === data.dynastyId);
    if (d) {
      setNewDynasty({ name: d.name, branch: d.branch || '', coaUrl: d.coaUrl || '' });
      setEditingDynastyId(d.id);
    }
  };

  const handleSaveDynasty = () => {
    if (!newDynasty.name.trim()) return alert("House name is required");
    
    if (editingDynastyId === 'new') {
      const id = `dyn-${Date.now()}`;
      const d = { id, name: newDynasty.name.trim(), branch: newDynasty.branch.trim(), coaUrl: newDynasty.coaUrl };
      setDynasties([...dynasties, d]);
      onUpdateNode(selectedNode.id, { dynastyId: id, lastName: d.name, cadetBranch: d.branch });
    } else {
      // Editing existing
      const updatedDynasties = dynasties.map(d => 
        d.id === editingDynastyId ? { ...d, name: newDynasty.name.trim(), branch: newDynasty.branch.trim(), coaUrl: newDynasty.coaUrl } : d
      );
      setDynasties(updatedDynasties);
      if (selectedNode.data.dynastyId === editingDynastyId) {
        onUpdateNode(selectedNode.id, { lastName: newDynasty.name.trim(), cadetBranch: newDynasty.branch.trim() });
      }
    }
    
    setEditingDynastyId(null);
    setNewDynasty({ name: '', branch: '', coaUrl: '' });
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // Don't compress SVGs or non-images
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        resolve(file);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file); // fallback
              return;
            }
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(newFile);
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => resolve(file); // fallback if parsing fails
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState(null); // 'portrait' or 'coa'

  const handleCoaUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        const publicUrl = await uploadImage(compressed, currentUser?.id);
        setNewDynasty(prev => ({ ...prev, coaUrl: publicUrl }));
      } catch (err) {
        alert("Failed to upload image. Error: " + (err.message || JSON.stringify(err)));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePortraitUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        const publicUrl = await uploadImage(compressed, currentUser?.id);
        onUpdateNode(selectedNode.id, { portraitUrl: publicUrl });
      } catch (err) {
        alert("Failed to upload portrait. Error: " + (err.message || JSON.stringify(err)));
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!selectedNode && !selectedEdge) return null;

  if (selectedEdge) {
    const isSpouse = selectedEdge.sourceHandle === 'right' || selectedEdge.targetHandle === 'left';
    const currentRelType = selectedEdge.data?.relationType || (isSpouse ? 'married' : 'biological');

    const handleRelationChange = (e) => {
      onUpdateEdge(selectedEdge.id, { relationType: e.target.value });
    };

    return (
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          backgroundColor: 'var(--surface-1)',
          borderLeft: '1px solid var(--surface-border)',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
          zIndex: 50,
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Line Settings</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Relationship Type</label>
          <select 
            value={currentRelType} 
            onChange={handleRelationChange}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          >
            {isSpouse ? (
              <>
                <option value="married">Married (Solid)</option>
                <option value="betrothed">Betrothed (Dashed)</option>
                <option value="lovers">Lovers / Paramours (Dotted)</option>
              </>
            ) : (
              <>
                <option value="biological">Biological (Solid)</option>
                <option value="adopted">Adopted (Dashed)</option>
                <option value="illegitimate">Illegitimate (Dotted)</option>
              </>
            )}
          </select>
        </div>

        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5', fontSize: '0.85rem' }}>
          You can double-click anywhere on this line on the canvas to instantly add a draggable waypoint!
        </p>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={() => onDeleteEdge(selectedEdge.id)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete Line
          </button>
        </div>
      </div>
    );
  }

  if (selectedNode.type === 'waypoint') {
    return (
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          backgroundColor: 'var(--surface-1)',
          borderLeft: '1px solid var(--surface-border)',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
          zIndex: 50,
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Waypoint</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Drag this waypoint on the canvas to manually route lines around characters.
        </p>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            Delete Waypoint
          </button>
        </div>
      </div>
    );
  }

  const data = selectedNode.data || {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    onUpdateNode(selectedNode.id, { [name]: value });
  };

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '320px',
        height: '100%',
        backgroundColor: 'var(--surface-1)',
        borderLeft: '1px solid var(--surface-border)',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
        zIndex: 50,
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Edit Character</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            fontSize: '1.2rem'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Portrait (Image URL or Upload)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="text" 
            name="portraitUrl"
            value={data.portraitUrl || ''} 
            onChange={handleChange}
            placeholder="https://..."
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white', minWidth: 0 }}
            disabled={isUploading}
          />
          <button 
            onClick={() => {
              setGalleryTarget('portrait');
              setIsGalleryOpen(true);
            }} 
            disabled={isUploading} 
            style={{ padding: '0.75rem', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', background: 'var(--surface-border)', border: 'none', color: 'white' }}
            title="Choose from Gallery"
          >
            🖼️
          </button>
          <button 
            onClick={() => portraitInputRef.current?.click()} 
            disabled={isUploading} 
            style={{ padding: '0.75rem', borderRadius: '8px', cursor: isUploading ? 'not-allowed' : 'pointer', background: 'var(--surface-border)', border: 'none', color: 'white' }}
            title="Upload New"
          >
            📁
          </button>
          <input type="file" ref={portraitInputRef} onChange={handlePortraitUpload} accept="image/*" style={{ display: 'none' }} />
        </div>
        {data.portraitUrl && !isUploading && (
          <img src={data.portraitUrl} alt="Portrait Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '50%', alignSelf: 'center', marginTop: '0.5rem' }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>First Name</label>
        <input 
          type="text" 
          name="firstName"
          value={data.firstName || ''} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Regnal Number</label>
        <input 
          type="number" 
          name="regnalNumber"
          value={data.regnalNumber || ''} 
          onChange={handleChange}
          placeholder="e.g. 1, 2, 3..."
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>House / Dynasty</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {data.dynastyId && !editingDynastyId && (
              <button 
                onClick={handleEditDynasty}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-primary)',
                  cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'
                }}
              >
                ✏️ Edit
              </button>
            )}
            <button 
              onClick={() => {
                if (editingDynastyId) {
                  setEditingDynastyId(null);
                } else {
                  setEditingDynastyId('new');
                  setNewDynasty({ name: '', branch: '', coaUrl: '' });
                }
              }}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'
              }}
            >
              {editingDynastyId ? 'Cancel' : '+ New'}
            </button>
          </div>
        </div>

        {editingDynastyId ? (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input 
              type="text" placeholder="House Name (e.g. Stark)"
              value={newDynasty.name} onChange={e => setNewDynasty({...newDynasty, name: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white' }}
            />
            <input 
              type="text" placeholder="Branch (e.g. Karstark - Optional)"
              value={newDynasty.branch} onChange={e => setNewDynasty({...newDynasty, branch: e.target.value})}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="text" placeholder="COA URL (or upload)" value={newDynasty.coaUrl} onChange={e => setNewDynasty({...newDynasty, coaUrl: e.target.value})} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white', minWidth: 0 }} disabled={isUploading} />
              <button 
                onClick={() => {
                  setGalleryTarget('coa');
                  setIsGalleryOpen(true);
                }} 
                disabled={isUploading} 
                style={{ padding: '0.5rem', borderRadius: '4px', cursor: isUploading ? 'not-allowed' : 'pointer', background: 'var(--surface-border)', border: 'none', color: 'white' }}
                title="Choose from Gallery"
              >
                🖼️
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading} 
                style={{ padding: '0.5rem', borderRadius: '4px', cursor: isUploading ? 'not-allowed' : 'pointer', background: 'var(--surface-border)', border: 'none', color: 'white' }}
                title="Upload New"
              >
                📁
              </button>
              <input type="file" ref={fileInputRef} onChange={handleCoaUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
            {isUploading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uploading image...</span>}
            {newDynasty.coaUrl && !isUploading && <img src={newDynasty.coaUrl} alt="COA Preview" style={{ width: '40px', height: '40px', objectFit: 'contain', alignSelf: 'center' }} />}
            <button onClick={handleSaveDynasty} disabled={isUploading} style={{ padding: '0.5rem', background: isUploading ? 'var(--surface-border)' : '#10b981', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: isUploading ? 'not-allowed' : 'pointer' }}>Save Dynasty</button>
          </div>
        ) : (
          <select 
            value={data.dynastyId || ''} 
            onChange={handleDynastySelect}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          >
            <option value="">-- No House --</option>
            {dynasties.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} {d.branch ? `(${d.branch})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gender</label>
        <select 
          name="gender"
          value={data.gender || 'unknown'} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)'
          }}
        >
          <option value="unknown">Unknown</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Card Style (Border Color)</label>
        <select 
          name="cardColor"
          value={data.cardColor || 'default'} 
          onChange={handleChange}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)'
          }}
        >
          <option value="default">Default</option>
          <option value="gold">Gold (Royalty / Leader)</option>
          <option value="crimson">Crimson (Military / Aggressive)</option>
          <option value="violet">Violet (Mystic / Scholar)</option>
          <option value="emerald">Emerald (Nature / Wealth)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Birth Year</label>
          <input 
            type="text" 
            name="birthYear"
            value={data.birthYear || ''} 
            onChange={handleChange}
            placeholder="e.g. 1066"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Death Year</label>
          <input 
            type="text" 
            name="deathYear"
            value={data.deathYear || ''} 
            onChange={handleChange}
            placeholder="e.g. 1100"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reign Start</label>
          <input 
            type="text" 
            name="reignStart"
            value={data.reignStart || ''} 
            onChange={handleChange}
            placeholder="e.g. 1080"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reign End</label>
          <input 
            type="text" 
            name="reignEnd"
            value={data.reignEnd || ''} 
            onChange={handleChange}
            placeholder="e.g. 1100"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Traits (comma separated)</label>
        <textarea 
          name="traits"
          value={data.traits || ''} 
          onChange={handleChange}
          rows={2}
          style={{
            padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-body)', resize: 'vertical'
          }}
          placeholder="e.g. Brave, Stubborn, Ambitious"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Biography / Notes</label>
        <textarea 
          name="bio"
          value={data.bio || ''} 
          onChange={handleChange}
          rows={4}
          style={{
            padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'var(--font-body)', resize: 'vertical'
          }}
          placeholder="Write their history, secrets, and lore..."
        />
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
        >
          Delete Character
        </button>
      </div>

      <ImageGalleryModal 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        currentUser={currentUser}
        onSelectImage={(url) => {
          if (galleryTarget === 'portrait') {
            onUpdateNode(selectedNode.id, { portraitUrl: url });
          } else if (galleryTarget === 'coa') {
            setNewDynasty(prev => ({ ...prev, coaUrl: url }));
          }
        }}
      />
    </div>
  );
}
