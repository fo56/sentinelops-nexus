import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';

export const RaiseIssueModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    category: 'other',
    location: '' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Raise New Facility Issue</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Issue Title <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Main Door Access Failed"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Category
            </label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="cctv">CCTV & Cameras</option>
              <option value="door_access">Door & Access Control</option>
              <option value="computer">Computer Systems</option>
              <option value="power_supply">Power Supply</option>
              <option value="network">Network Infrastructure</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Priority Level
            </label>
            <select
              className="form-select"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Low - Non-urgent maintenance</option>
              <option value="medium">Medium - Needs attention soon</option>
              <option value="high">High - Critical system failure</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Location (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Sector 7, Level 2"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Detailed Description <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <textarea
              required
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Submit Issue
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
