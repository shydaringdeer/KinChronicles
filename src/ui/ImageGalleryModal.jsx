import React, { useState, useEffect } from 'react';
import { listImages, deleteImage } from '../state/db';

export default function ImageGalleryModal({ isOpen, onClose, currentUser, onSelectImage }) {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadImages();
    }
  }, [isOpen, currentUser]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const data = await listImages(currentUser.id);
      setImages(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load images from gallery");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (filePath) => {
    if (!window.confirm("Are you sure you want to permanently delete this image from the server?")) return;
    try {
      await deleteImage(filePath);
      setImages(images.filter(img => img.path !== filePath));
    } catch (err) {
      console.error(err);
      alert("Failed to delete image.");
    }
  };

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
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
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

        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Media Library</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Select a previously uploaded image to reuse it, or delete images you no longer need.
        </p>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading your gallery...</div>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', borderRadius: '12px' }}>
            You haven't uploaded any images to your secure folder yet.<br />
            (Images uploaded prior to this update are stored in the legacy folder).
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            overflowY: 'auto',
            paddingRight: '1rem'
          }}>
            {images.map((img) => (
              <div key={img.path} style={{
                position: 'relative',
                background: 'var(--bg-color)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <img 
                  src={img.url} 
                  alt="Gallery Item" 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => {
                      onSelectImage(img.url);
                      onClose();
                    }}
                    style={{
                      background: 'var(--accent-primary)',
                      color: '#18181b',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}
                  >
                    Select
                  </button>
                  <button 
                    onClick={() => handleDelete(img.path)}
                    style={{
                      background: 'transparent',
                      color: '#ef4444',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title="Delete permanently"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
