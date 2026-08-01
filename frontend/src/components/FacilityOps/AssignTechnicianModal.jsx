import React from 'react';
import { Card } from '../ui/Card';
import { X, Wrench } from 'lucide-react';

export const AssignTechnicianModal = ({ 
  isOpen, 
  onClose, 
  selectedIssue, 
  selectedTechnician, 
  onConfirm, 
  isAssigning 
}) => {
  if (!isOpen || !selectedIssue || !selectedTechnician) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Confirm Assignment</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Are you sure you want to assign <strong style={{ color: 'var(--primary)' }}>{selectedTechnician.name}</strong> to:
          </p>
          
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>{selectedIssue.title}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>#{selectedIssue.issue_number}</span>
              <span style={{ textTransform: 'capitalize' }}>{selectedIssue.priority} Priority</span>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', border: '1px solid rgba(41, 163, 153, 0.3)', borderRadius: '0.375rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.85rem' }}>Technician Stats</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Performance Score: {selectedTechnician.score}</span>
              <span>Active Tasks: {selectedTechnician.active_tasks || 0}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onConfirm}
            disabled={isAssigning}
            className="btn-primary"
            style={{ flex: 1, opacity: isAssigning ? 0.7 : 1 }}
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </button>
          <button
            onClick={onClose}
            disabled={isAssigning}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
};
