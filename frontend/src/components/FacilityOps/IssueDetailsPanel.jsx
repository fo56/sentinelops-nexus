import React from 'react';
import { Card } from '../ui/Card';
import { X, Clock, User, CheckCircle, XCircle } from 'lucide-react';

export const IssueDetailsPanel = ({ issue, onClose }) => {
  if (!issue) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="default" className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Issue Details</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <h4 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '1rem' }}>{issue.title}</h4>
            
            <div style={{ marginBottom: '2rem' }}>
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Description</h5>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {issue.description}
              </p>
            </div>

            {issue.ai_suggestions && issue.ai_suggestions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h5 style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '1rem' }}>AI Diagnostics & Suggestions</h5>
                {issue.ai_suggestions.map((suggestion, index) => (
                  <div key={index} style={{ padding: '1rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', border: '1px solid rgba(41, 163, 153, 0.3)', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                    <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {suggestion.suggestion}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                      <span>Est. Time: {suggestion.estimated_time_minutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {issue.resolution_notes && (
              <div>
                <h5 style={{ color: 'var(--status-success)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Resolution Notes</h5>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(41, 163, 153, 0.05)', border: '1px solid var(--status-success)', borderRadius: '0.375rem' }}>
                  <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {issue.resolution_notes}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Status</h5>
              <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                {issue.status.toUpperCase()}
              </span>
            </div>
            
            <div>
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Priority</h5>
              <span className="badge-outline" style={{ textTransform: 'uppercase', color: issue.priority === 'high' ? 'var(--status-error)' : 'var(--status-warning)', borderColor: issue.priority === 'high' ? 'var(--status-error)' : 'var(--status-warning)' }}>
                {issue.priority}
              </span>
            </div>
            
            <div>
              <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Created By</h5>
              <p style={{ color: 'var(--text-primary)', margin: 0 }}>{issue.created_by_name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                {new Date(issue.created_at).toLocaleString()}
              </p>
            </div>
            
            {issue.assigned_to_name && (
              <div>
                <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Assigned To</h5>
                <p style={{ color: 'var(--primary)', margin: 0 }}>{issue.assigned_to_name}</p>
                {issue.assigned_at && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                    {new Date(issue.assigned_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            
            {issue.completed_at && (
              <div>
                <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Completed At</h5>
                <p style={{ color: 'var(--status-success)', margin: 0 }}>
                  {new Date(issue.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
