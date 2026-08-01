import React from 'react';
import { Card } from '../ui/Card';
import { AlertCircle, Wrench } from 'lucide-react';

export const IssueCard = ({ 
  issue, 
  user,
  technicians,
  getStatusBadge,
  getPriorityColor,
  getCategoryLabel,
  onViewDetails,
  onOpenAssignment,
  onDelete
}) => {
  const statusInfo = getStatusBadge(issue.status);
  const StatusIcon = statusInfo.icon;
  
  return (
    <Card variant="default">
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>
                #{issue.issue_number}
              </span>
              <span style={{
                padding: '0.2rem 0.5rem',
                backgroundColor: getPriorityColor(issue.priority),
                color: '#ffffff',
                borderRadius: '0.25rem',
                fontSize: '0.65rem',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}>
                {issue.priority}
              </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
              {issue.title}
            </h3>
            <p style={{ margin: '0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              {getCategoryLabel(issue.category)}
              {issue.location && ` • ${issue.location}`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', backgroundColor: statusInfo.color + '20', borderRadius: '0.25rem' }}>
            <StatusIcon size={14} color={statusInfo.color} />
            <span style={{ fontSize: '0.75rem', color: statusInfo.color, fontWeight: '600' }}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
          {issue.description}
        </p>

        <div style={{ borderTop: '1px solid #2a3040', paddingTop: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
            <span>Created by:</span>
            <span style={{ color: '#ffffff' }}>{issue.created_by_name}</span>
          </div>
          {issue.assigned_to_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              <span>Assigned to:</span>
              <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Wrench size={12} />
                {issue.assigned_to_name}
              </span>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        {issue.ai_suggestions && issue.ai_suggestions.length > 0 && (
          <div style={{ backgroundColor: 'rgba(41, 163, 153, 0.1)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid rgba(41, 163, 153, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={14} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>AI Suggestion</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              {issue.ai_suggestions[0].suggestion}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onViewDetails(issue.id)}
            className="btn-secondary"
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
          >
            View Details
          </button>
          {user?.role === 'admin' && issue.status === 'pending' && (
            <select
              className="form-select"
              onChange={(e) => {
                const techId = e.target.value;
                if (techId) {
                  const tech = technicians.find(t => t.id === techId);
                  onOpenAssignment(issue, tech);
                  e.target.value = '';
                }
              }}
              style={{ flex: 1, padding: '0.5rem', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <option value="">Assign...</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} (Score: {tech.score})
                </option>
              ))}
            </select>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(issue.id);
              }}
              className="btn-danger"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
