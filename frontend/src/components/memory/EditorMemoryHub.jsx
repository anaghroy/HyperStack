import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getProjectMemoryAPI, addProjectMemoryAPI, queryProjectMemoryAPI } from '../../services/api';
import { Plus, MessageSquare, Save, Lightbulb, Clock, User, Book } from 'lucide-react';
import toast from 'react-hot-toast';

const EditorMemoryHub = () => {
  const { activeProject } = useSelector((state) => state.project);
  
  const [memories, setMemories] = useState([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  
  // Add mode state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContext, setNewContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Chat/Query state
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    if (activeProject?._id) {
      fetchMemories();
    }
  }, [activeProject]);

  const fetchMemories = async () => {
    setIsLoadingMemories(true);
    try {
      const data = await getProjectMemoryAPI(activeProject._id);
      setMemories(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load project memory');
    } finally {
      setIsLoadingMemories(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!newTitle.trim() || !newContext.trim()) {
      toast.error('Please provide both title and context');
      return;
    }
    
    setIsSaving(true);
    try {
      await addProjectMemoryAPI(activeProject._id, newTitle, newContext);
      toast.success('Decision recorded!');
      setIsAdding(false);
      setNewTitle('');
      setNewContext('');
      fetchMemories(); // Refresh list
    } catch (error) {
      console.error(error);
      toast.error('Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    const userMsg = { role: 'user', content: query };
    setChatHistory(prev => [...prev, userMsg]);
    setQuery('');
    setIsQuerying(true);

    try {
      const res = await queryProjectMemoryAPI(activeProject._id, userMsg.content);
      setChatHistory(prev => [...prev, { role: 'ai', content: res.answer }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error retrieving that memory.' }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  if (!activeProject) {
    return <div style={{ padding: '20px', color: '#6b7280' }}>Please select a project first.</div>;
  }

  return (
    <div className="editor-memory-hub" style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      
      {/* Left Pane - Decision Log */}
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Lightbulb size={18} color="var(--color-accent)" />
            Decision Log
          </h2>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            style={{ background: 'var(--color-accent)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500 }}
          >
            {isAdding ? 'Cancel' : <><Plus size={14} /> Log Decision</>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isAdding && (
            <div style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Decision Title (e.g. Switched to Redis)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '8px', borderRadius: '4px', fontSize: '13px', outline: 'none' }}
              />
              <textarea 
                placeholder="Why was this decision made? What is the context?"
                value={newContext}
                onChange={e => setNewContext(e.target.value)}
                rows={4}
                style={{ width: '100%', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '8px', borderRadius: '4px', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
              <button 
                onClick={handleSaveMemory}
                disabled={isSaving}
                style={{ background: 'var(--color-accent)', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          )}

          {isLoadingMemories ? (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px', fontSize: '13px' }}>Loading memory...</div>
          ) : memories.length === 0 && !isAdding ? (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '40px 20px', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Book size={32} opacity={0.5} />
              No architectural decisions have been logged for this project yet.
            </div>
          ) : (
            memories.map((mem) => (
              <div key={mem._id} style={{ background: 'var(--color-bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', position: 'relative' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>{mem.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {mem.context}
                </p>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {new Date(mem.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - AI Memory Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--color-accent)" />
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Query Memory</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chatHistory.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
              <Lightbulb size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Ask about your project's history</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
                HyperStack remembers the architectural decisions you've logged. Try asking: <br/><br/>
                <em style={{ color: 'var(--color-accent)' }}>"Why did we use Redis instead of Memcached here?"</em>
              </p>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  {msg.role === 'user' ? <><User size={12}/> You</> : <><Lightbulb size={12} color="var(--color-accent)"/> HyperStack Memory</>}
                </div>
                <div style={{ 
                  background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)', 
                  color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  maxWidth: '80%',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isQuerying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '8px' }}>
              <div className="typing-indicator">Searching memory...</div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <div style={{ display: 'flex', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about architectural decisions (Press Enter to send)..."
              style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              rows={2}
            />
            <button 
              onClick={handleQuery}
              disabled={!query.trim() || isQuerying}
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', padding: '0 20px', cursor: (!query.trim() || isQuerying) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (!query.trim() || isQuerying) ? 0.6 : 1 }}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorMemoryHub;
