import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { User, Trash2 } from 'lucide-react';

export const MissionCard = ({ 
  mission, 
  missionNumber, 
  isAgent = false,
  onOpenAssign,
  onDelete,
  onOpenSubmit
}) => {
  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'insane': return { bg: 'rgba(255, 68, 68, 0.2)', color: '#ff4444' };
      case 'hard': return { bg: 'rgba(255, 200, 68, 0.2)', color: '#ffc844' };
      default: return { bg: 'rgba(68, 200, 68, 0.2)', color: '#44c844' };
    }
  };

  const difficultyStyle = getDifficultyColor(mission.difficulty);
  
  return (
    <Card variant="default" className="mission-card" style={{ backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>
      <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Mission Number Badge */}
        <div className="badge-outline" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)', backgroundColor: 'rgba(41, 163, 153, 0.2)' }}>
          #Mission {missionNumber}
        </div>
        
        {/* Title and Difficulty */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.75rem', paddingRight: '70px', paddingTop: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.3' }}>{mission.title}</h4>
          <span className="badge" style={{ backgroundColor: difficultyStyle.bg, color: difficultyStyle.color }}>
            {mission.difficulty?.toUpperCase() || 'SEARCH'}
          </span>
        </div>
        
        {/* Description */}
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem', lineHeight: '1.3' }}>
          {mission.description?.length > 100 ? mission.description.substring(0, 100) + '...' : mission.description}
        </p>
        
        {/* Tags */}
        {mission.tags && mission.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {mission.tags.map((tag, index) => (
              <span key={index} className="badge-outline" style={{ color: 'var(--primary)', borderColor: 'rgba(41, 163, 153, 0.3)', backgroundColor: 'rgba(41, 163, 153, 0.15)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Dates */}
        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          {mission.due_date && (
            <p style={{ margin: '0.3rem 0', color: 'var(--status-warning)' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Due:</span> {new Date(mission.due_date).toLocaleDateString()} {new Date(mission.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <p style={{ margin: '0.3rem 0', color: 'rgba(255, 255, 255, 0.5)' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Created:</span> {new Date(mission.created_at).toLocaleDateString()}
          </p>
        </div>
        
        {/* Admin View - Pending Status Buttons */}
        {!isAgent && mission.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={() => onOpenAssign(mission)} style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem' }}>
              <User size={12} /> ASSIGN AGENT
            </button>
            <button className="btn-danger" onClick={() => onDelete(mission.id)} style={{ flex: 0.6, padding: '0.5rem', fontSize: '0.7rem' }}>
              <Trash2 size={12} /> DELETE
            </button>
          </div>
        )}
        
        {/* Admin View - In Progress Status */}
        {!isAgent && mission.status === 'in_progress' && mission.assigned_agent_name && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', borderRadius: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '600', border: '1px solid rgba(41, 163, 153, 0.3)' }}>
            Assigned to: {mission.assigned_agent_name}
          </div>
        )}
        
        {/* Agent View - Submit Button */}
        {isAgent && mission.status === 'in_progress' && (
          <button className="btn-primary" onClick={() => onOpenSubmit(mission)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.7rem' }}>
            SUBMIT MISSION
          </button>
        )}
      </div>
    </Card>
  );
};

export const CompletedMissionCard = ({ mission, missionNumber, isFailed = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div onMouseEnter={() => setShowDetails(true)} onMouseLeave={() => setShowDetails(false)} style={{ position: 'relative', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${isFailed ? 'var(--status-error)' : 'var(--status-success)'}`, borderRadius: '0.375rem', cursor: 'pointer', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="badge-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', backgroundColor: 'rgba(41, 163, 153, 0.2)' }}>
            #M{missionNumber}
          </span>
          <h4 style={{ margin: 0, color: isFailed ? 'var(--status-error)' : 'var(--status-success)', fontSize: '0.95rem', fontWeight: '600' }}>{mission.title}</h4>
        </div>
        <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
          {mission.completed_at ? new Date(mission.completed_at).toLocaleDateString() : 'N/A'}
        </p>
      </div>
      {showDetails && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', zIndex: 10 }}>
          <p style={{ margin: '0 0 0.5rem 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>{mission.description}</p>
          {mission.completion_notes && (
            <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>Notes: {mission.completion_notes}</p>
          )}
        </div>
      )}
    </div>
  );
};
