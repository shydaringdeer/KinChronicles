import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserProfile } from '../state/supabase';
import { saveManuscript, loadManuscripts, deleteManuscriptApi } from '../state/db';
import PricingModal from './PricingModal';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { v4 as uuidv4 } from 'uuid';

const createBlankBook = () => ({
  id: uuidv4(),
  title: 'Untitled Manuscript',
  author: 'Unknown Author',
  copyright: `Copyright © ${new Date().getFullYear()} by Unknown Author\n\nAll rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, without the prior written permission of the author.\n\nPublisher: [Publisher Name]\nISBN: [ISBN Number]\n\nThis is a work of fiction. Names, characters, places, and incidents either are the product of the author's imagination or are used fictitiously.`,
  nodes: [
    {
      id: uuidv4(),
      type: 'part',
      title: 'Part I: The Beginning',
      children: [
        {
          id: uuidv4(),
          type: 'chapter',
          title: 'Chapter 1',
          children: [
            {
              id: uuidv4(),
              type: 'scene',
              title: 'Scene 1',
              content: '<h2>Chapter 1</h2><p>Start writing here...</p>'
            }
          ]
        }
      ]
    }
  ]
});

export default function ManuscriptEditor() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        getUserProfile(session.user.id).then(({ profile }) => {
          if (profile) setSubscriptionTier(profile.subscription_tier || 'free');
          setAuthLoaded(true);
        });
      } else {
        setAuthLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        getUserProfile(session.user.id).then(({ profile }) => {
          if (profile) setSubscriptionTier(profile.subscription_tier || 'free');
          setAuthLoaded(true);
        });
      } else {
        setSubscriptionTier('free');
        setAuthLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoaded && subscriptionTier !== 'pro') {
      setIsPricingModalOpen(true);
    }
  }, [authLoaded, subscriptionTier]);
  
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    if (authLoaded && subscriptionTier === 'pro' && currentUser) {
      loadManuscripts(currentUser.id).then(manuscripts => {
        if (manuscripts.length > 0) {
          setLibrary(manuscripts);
        } else {
          // Initialize with a blank book
          const blank = createBlankBook();
          saveManuscript(currentUser.id, null, blank.title, blank.author, blank.copyright, blank.nodes).then((savedBook) => {
            setLibrary([savedBook]);
            setActiveManuscriptId(savedBook.id);
          }).catch(console.error);
        }
      });
    }
  }, [authLoaded, subscriptionTier, currentUser]);

  const [activeManuscriptId, setActiveManuscriptId] = useState(() => {
    return localStorage.getItem('kinchronicles_active_manuscript') || null;
  });

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const printIframeRef = useRef(null);

  const book = library.find(b => b.id === activeManuscriptId) || library[0];


  useEffect(() => {
    if (activeManuscriptId) {
      localStorage.setItem('kinchronicles_active_manuscript', activeManuscriptId);
    }
  }, [activeManuscriptId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser && subscriptionTier === 'pro' && book) {
        saveManuscript(currentUser.id, book.id, book.title, book.author, book.copyright, book.nodes).catch(console.error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [library, currentUser, subscriptionTier, book]);




  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Recursively find a node by ID
  function findNode(nodes, id) {
    if (!nodes) return null;
    for (let node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const updateBook = (updates) => {
    setLibrary(prev => prev.map(b => b.id === book.id ? { ...b, ...updates } : b));
  };

  const calculateWordCount = (nodes) => {
    let count = 0;
    const countWordsInHtml = (html) => {
      if (!html) return 0;
      const text = html.replace(/<[^>]*>?/gm, ' ');
      const words = text.trim().split(/\s+/);
      return words.filter(word => word.length > 0).length;
    };
    const traverse = (n) => {
      if (!n) return;
      n.forEach(node => {
        if (node.type === 'scene' && node.content) count += countWordsInHtml(node.content);
        if (node.children) traverse(node.children);
      });
    };
    traverse(nodes);
    return count;
  };

  const totalWordCount = book ? calculateWordCount(book.nodes) : 0;
  const selectedNode = selectedNodeId ? findNode(book.nodes, selectedNodeId) : null;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: selectedNode?.content || '',
    editorProps: {
      attributes: {
        style: 'min-height: 400px; outline: none;'
      }
    },
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getHTML());
    }
  }, [selectedNodeId]);

  // Recursively update a node
  const updateNode = (nodes, id, updates) => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return { ...node, children: updateNode(node.children, id, updates) };
      }
      return node;
    });
  };

  const handleContentChange = (content) => {
    if (!selectedNodeId) return;
    updateBook({ nodes: updateNode(book.nodes, selectedNodeId, { content }) });
  };

  const handleTitleChange = (id, title) => {
    updateBook({ nodes: updateNode(book.nodes, id, { title }) });
  };

  const addNode = (parentId, type) => {
    const newNode = {
      id: uuidv4(),
      type,
      title: `New ${type}`,
      children: type !== 'scene' ? [] : undefined,
      content: type === 'scene' ? '<p>Start writing here...</p>' : undefined
    };

    if (!parentId) {
      if (type === 'part') updateBook({ nodes: [...book.nodes, newNode] });
      return;
    }

    const updateChildren = (nodes) => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...(node.children || []), newNode] };
        }
        if (node.children) {
          return { ...node, children: updateChildren(node.children) };
        }
        return node;
      });
    };
    updateBook({ nodes: updateChildren(book.nodes) });
    
    if (type === 'scene') setSelectedNodeId(newNode.id);
  };

  const deleteNode = (id) => {
    if (confirm('Are you sure you want to delete this section?')) {
      const removeNode = (nodes) => {
        return nodes.filter(n => n.id !== id).map(n => ({
          ...n,
          children: n.children ? removeNode(n.children) : undefined
        }));
      };
      updateBook({ nodes: removeNode(book.nodes) });
      if (selectedNodeId === id) setSelectedNodeId(null);
    }
  };

  const createNewManuscript = async () => {
    if (!currentUser) return;
    const newBook = createBlankBook();
    try {
      const savedBook = await saveManuscript(currentUser.id, null, newBook.title, newBook.author, newBook.copyright, newBook.nodes);
      setLibrary(prev => [...prev, savedBook]);
      setActiveManuscriptId(savedBook.id);
      setSelectedNodeId(null);
    } catch (e) {
      console.error("Error creating manuscript:", e);
    }
  };

  const deleteManuscript = async () => {
    if (library.length <= 1) {
      alert("You cannot delete your only manuscript.");
      return;
    }
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
      try {
        await deleteManuscriptApi(book.id, currentUser.id);
        const newLib = library.filter(b => b.id !== book.id);
        setLibrary(newLib);
        setActiveManuscriptId(newLib[0].id);
        setSelectedNodeId(null);
      } catch (e) {
        console.error("Error deleting manuscript:", e);
      }
    }
  };

  const getFlatContent = (nodes) => {
    let content = [];
    nodes.forEach(node => {
      if (node.type === 'part') {
        content.push(`<div class="part-page"><h1 class="part-title">${node.title}</h1></div>`);
      } else if (node.type === 'chapter') {
        content.push(`<div class="chapter-page"><h2 class="chapter-title">${node.title}</h2>`);
      } else if (node.type === 'scene') {
        content.push(`<div class="scene-content">${node.content || ''}</div>`);
      }
      if (node.children) content = content.concat(getFlatContent(node.children));
      if (node.type === 'chapter') content.push(`</div>`);
    });
    return content.join('');
  };

  const generateRealPDF = () => {
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${book.title}</title>
          <style>
            @page { margin: 1in; }
            body { 
              font-family: 'Times New Roman', serif; 
              line-height: 1.6; 
              font-size: 12pt; 
              color: black; 
              background: white;
            }
            .title-page {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              text-align: center;
              page-break-after: always;
            }
            .book-title {
              font-size: 36pt;
              font-weight: bold;
              margin-bottom: 2rem;
            }
            .book-author {
              font-size: 18pt;
            }
            .part-page {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              text-align: center;
              page-break-before: always;
              page-break-after: always;
            }
            .part-title {
              font-size: 28pt;
              font-weight: bold;
            }
            .chapter-page {
              page-break-before: always;
            }
            .chapter-title {
              font-size: 20pt;
              text-align: center;
              margin-top: 2rem;
              margin-bottom: 3rem;
            }
            .scene-content {
              margin-bottom: 2rem;
              page-break-inside: auto;
            }
            p {
              margin-bottom: 1em;
              page-break-inside: avoid;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
          </style>
        </head>
        <body>
          <div class="title-page">
            <div class="book-title">${book.title || 'Untitled Manuscript'}</div>
            <div class="book-author">By ${book.author || 'Unknown Author'}</div>
          </div>
          ${book.copyright ? `<div style="page-break-before: always; height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 2in;"><div style="font-size: 10pt; color: #333; white-space: pre-wrap; line-height: 1.4;">${book.copyright}</div></div>` : ''}
          ${getFlatContent(book.nodes)}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: `${level * 15}px`, marginTop: '5px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px',
          background: selectedNodeId === node.id ? 'var(--surface-border)' : 'transparent',
          borderRadius: '4px',
          cursor: node.type === 'scene' ? 'pointer' : 'default'
        }}>
          {node.type === 'part' && '📚'}
          {node.type === 'chapter' && '🔖'}
          {node.type === 'scene' && '📄'}
          
          <input 
            value={node.title}
            onChange={(e) => handleTitleChange(node.id, e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-primary)',
              flex: 1, fontWeight: node.type === 'part' ? 'bold' : 'normal',
              outline: 'none'
            }}
            onClick={() => node.type === 'scene' && setSelectedNodeId(node.id)}
          />

          <div style={{ display: 'flex', gap: '2px', opacity: 0.6 }}>
            {node.type === 'part' && <button onClick={() => addNode(node.id, 'chapter')} style={btnMicroStyle} title="Add Chapter">+</button>}
            {node.type === 'chapter' && <button onClick={() => addNode(node.id, 'scene')} style={btnMicroStyle} title="Add Scene">+</button>}
            <button onClick={() => deleteNode(node.id)} style={{...btnMicroStyle, color: '#ef4444'}} title="Delete">x</button>
          </div>
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  const btnMicroStyle = {
    background: 'transparent', border: 'none', color: 'var(--text-primary)',
    cursor: 'pointer', padding: '0 4px', fontSize: '12px'
  };
  
  const ToolbarButton = ({ onClick, isActive, children }) => (
    <button 
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick} 
      style={{ 
        padding: '6px 10px', 
        background: isActive ? '#e2e8f0' : 'transparent', 
        color: 'black',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: isActive ? 'bold' : 'normal'
      }}
    >
      {children}
    </button>
  );

  if (!authLoaded) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', color: 'white' }}>Loading...</div>;
  }

  if (!book && subscriptionTier === 'pro') {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', color: 'white' }}>Loading Manuscript...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Topbar */}
      <div style={{
        background: 'var(--surface-1)', padding: '1rem', borderBottom: '1px solid var(--surface-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary">🏠 Home</button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Manuscript Writer</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {totalWordCount.toLocaleString()} words
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => addNode(null, 'part')} className="btn btn-secondary">+ Add Part</button>
          <button onClick={generateRealPDF} className="btn btn-primary" style={{ background: '#10b981', border: 'none' }}>📥 Save as PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '300px', background: 'var(--surface-0)', borderRight: '1px solid var(--surface-border)',
          display: 'flex', flexDirection: 'column'
        }}>
          
          {/* Library Switcher */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface-1)' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Library</label>
            <select 
              value={activeManuscriptId} 
              onChange={e => {
                setActiveManuscriptId(e.target.value);
                setSelectedNodeId(null);
              }}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white' }}
            >
              {library.map(b => (
                <option key={b.id} value={b.id}>{b.title || 'Untitled'}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button onClick={createNewManuscript} style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>+ New</button>
              <button onClick={deleteManuscript} style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>

          {/* Metadata Section */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manuscript Title</label>
            <input 
              value={book.title || ''} 
              onChange={e => updateBook({ title: e.target.value })} 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white' }}
            />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Author</label>
            <input 
              value={book.author || ''} 
              onChange={e => updateBook({ author: e.target.value })} 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white' }}
            />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Copyright Page</label>
            <textarea 
              value={book.copyright || ''} 
              onChange={e => updateBook({ copyright: e.target.value })} 
              rows={6}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'white', resize: 'vertical', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {renderTree(book.nodes)}
          </div>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
          {selectedNode && selectedNode.type === 'scene' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-1)' }}>
                <h3 style={{ margin: 0 }}>{selectedNode.title}</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1rem', background: 'var(--bg-color)' }}>
                <div style={{ 
                  width: '100%', maxWidth: '800px', margin: '0 auto', background: 'white', color: 'black', 
                  minHeight: 'calc(100% - 4rem)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', padding: '3rem 4rem',
                  fontSize: '1.1rem', lineHeight: '1.6'
                }}>
                  {/* TipTap Toolbar */}
                  {editor && (
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>B</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>I</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>U</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>S</ToolbarButton>
                      <div style={{ width: '1px', background: '#eee', margin: '0 4px' }}></div>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>H1</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
                      <div style={{ width: '1px', background: '#eee', margin: '0 4px' }}></div>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>• List</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>1. List</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>Quote</ToolbarButton>
                      <div style={{ width: '1px', background: '#eee', margin: '0 4px' }}></div>
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>Left</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>Center</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>Right</ToolbarButton>
                      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}>Justify</ToolbarButton>
                    </div>
                  )}
                  {/* TipTap Editor Content */}
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              Select a scene from the sidebar to start writing.
            </div>
          )}
        </div>
      </div>

      {/* Hidden iframe for native printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="PDF Export" />

      {/* Pro Lock */}
      {authLoaded && subscriptionTier !== 'pro' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 9999
        }} />
      )}
      <PricingModal 
        isOpen={isPricingModalOpen} 
        onClose={() => navigate('/')} 
        currentUser={currentUser}
        subscriptionTier={subscriptionTier}
      />
    </div>
  );
}
