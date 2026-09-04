import React, { useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';

export default function ExportModal({ nodes, edges, dynasties = [], onClose }) {
  const [pngBlob, setPngBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);

  // Generate PNG Blob securely
  useEffect(() => {
    const generatePng = async () => {
      const nodesBounds = getNodesBounds(nodes);
      const transform = getViewportForBounds(nodesBounds, 1920, 1080, 0.1, 2);
      const element = document.querySelector('.react-flow__viewport');
      
      if (!element) {
        setIsGenerating(false);
        return;
      }
      
      try {
        const dataUrl = await toPng(element, {
          backgroundColor: '#27272a',
          width: 1920,
          height: 1080,
          style: {
            width: '1920px',
            height: '1080px',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          }
        });
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setPngBlob(blob);
      } catch (err) {
        console.error("Failed to generate PNG", err);
      }
      setIsGenerating(false);
    };
    
    generatePng();
  }, [nodes]);

  const saveFileNative = async (blob, suggestedName, mimeType, extension) => {
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: extension.toUpperCase() + ' File',
            accept: { [mimeType]: ['.' + extension] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', suggestedName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert("Failed to save: " + err.message);
      }
    }
  };

  const handleDownloadJson = () => {
    const data = JSON.stringify({ nodes, edges, dynasties }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    saveFileNative(blob, 'family-tree.json', 'application/json', 'json');
  };

  const handleDownloadPng = () => {
    if (pngBlob) {
      saveFileNative(pngBlob, 'family-tree.png', 'image/png', 'png');
    }
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  };

  const modalStyle = {
    background: 'var(--surface-0)',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '95%',
    color: 'var(--text-primary)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  };

  const btnStyle = {
    padding: '0.75rem 1.25rem',
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    width: '100%',
    display: 'block'
  };

  const primaryBtnStyle = {
    ...btnStyle,
    background: 'var(--text-primary)',
    color: 'var(--bg-color)'
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h2 style={{ margin: 0, textAlign: 'center' }}>Download Export Files</h2>
        
        {/* JSON Section */}
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Data Backup (JSON)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Download the raw data file to import and edit later.
          </p>
          <button onClick={handleDownloadJson} style={primaryBtnStyle}>
            Download .json File
          </button>
        </div>
        
        <hr style={{ borderTop: '1px solid var(--surface-border)', width: '100%', margin: '0' }} />
        
        {/* PNG Section */}
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Image Export (PNG)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Download a high-resolution image of your family tree.
          </p>
          {isGenerating ? (
            <button disabled style={{ ...btnStyle, opacity: 0.7, cursor: 'not-allowed' }}>
              Generating High-Res Image...
            </button>
          ) : pngBlob ? (
            <button onClick={handleDownloadPng} style={{ ...primaryBtnStyle, background: 'var(--edge-spouse)' }}>
              Download .png File
            </button>
          ) : (
            <button disabled style={{ ...btnStyle, color: 'red' }}>
              Failed to generate image
            </button>
          )}
        </div>

        <button 
          onClick={onClose} 
          style={{ ...btnStyle, marginTop: '0.5rem', background: 'transparent' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
