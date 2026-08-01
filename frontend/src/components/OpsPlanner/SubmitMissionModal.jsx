import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';

export const SubmitMissionModal = ({ onClose, onSubmit }) => {
  const [submitForm, setSubmitForm] = useState({
    status: 'completed',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(submitForm);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Submit Mission</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Mission Status <span style={{ color: 'var(--status-warning)' }}>*</span>
            </label>
            <select 
              className="form-select" 
              value={submitForm.status} 
              onChange={(e) => setSubmitForm({ ...submitForm, status: e.target.value })} 
              required
            >
              <option value="completed">✓ Completed</option>
              <option value="failed">✗ Failed</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Notes (Optional)
            </label>
            <textarea 
              className="form-textarea" 
              value={submitForm.notes} 
              onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })} 
              placeholder="Add any additional notes..." 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              SUBMIT
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
