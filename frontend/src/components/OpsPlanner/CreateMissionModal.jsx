import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';

export const CreateMissionModal = ({ onClose, onCreate }) => {
  const [createForm, setCreateForm] = useState({ 
    title: '', 
    description: '', 
    difficulty: 'search',
    due_date: '',
    tags: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(createForm);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create New Mission</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Mission Title <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={createForm.title} 
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} 
              required 
              placeholder="e.g., Secure Facility Alpha" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Description <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <textarea 
              className="form-textarea" 
              value={createForm.description} 
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} 
              required 
              placeholder="Complete security sweep of Facility Alpha" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Difficulty <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <select 
              className="form-select" 
              value={createForm.difficulty} 
              onChange={(e) => setCreateForm({ ...createForm, difficulty: e.target.value })} 
              required 
            >
              <option value="search">Search</option>
              <option value="hard">Hard</option>
              <option value="insane">Insane</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Due Date <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={createForm.due_date} 
              onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} 
              required 
              min={new Date().toISOString().slice(0, 16)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Tags <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(comma-separated)</span>
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={createForm.tags} 
              onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })} 
              placeholder="security, facility, urgent" 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              CREATE
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              CANCEL
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
