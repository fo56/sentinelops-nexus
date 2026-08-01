import React from 'react';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';

export const AssignAgentModal = ({ 
  onClose, 
  onAssign, 
  availableAgents 
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Assign Agent to Mission</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Agents sorted by score (highest first) • Only FREE agents shown
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
          {availableAgents.length > 0 ? (
            availableAgents.map(agent => (
              <button 
                key={agent.id} 
                onClick={() => onAssign(agent.id)} 
                className="kanban-card" 
                style={{ 
                  margin: 0, 
                  textAlign: 'left', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{agent.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{agent.email}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Completed: {agent.completed_missions} • Failed: {agent.failed_missions}
                  </div>
                </div>
                <div className="badge-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', backgroundColor: 'rgba(41, 163, 153, 0.2)' }}>
                  Score: {agent.score}
                </div>
              </button>
            ))
          ) : (
            <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
              No available agents. All agents are currently busy or unavailable.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
