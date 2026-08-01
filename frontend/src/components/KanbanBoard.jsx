import { Trash2, UserPlus, FileUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Card } from './ui/Card';

export default function KanbanBoard({ 
  items = [],
  type = 'missions', // 'missions' or 'issues'
  onDelete,
  onAssign,
  onUploadDoc,
  onCreateNew,
  availableAgents = [],
  completedItems = [],
  onViewCompleted
}) {
  const [expandedCard, setExpandedCard] = useState(null);
  const [activeAssignDropdown, setActiveAssignDropdown] = useState(null);

  const openItems = items.filter(item => item.status === 'open');
  const inProgressItems = items.filter(item => item.status === 'in-progress');

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#e59019';
      case 'in-progress': return '#ffc107';
      case 'completed': return '#29a399';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffc107';
      case 'low': return '#29a399';
      default: return '#6c757d';
    }
  };

  const CardItem = ({ item, column }) => (
    <div className="kanban-card">
      {/* Top Right Buttons */}
      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        {type === 'missions' && column === 'open' && (
          <button
            onClick={() => onUploadDoc?.(item)}
            title="Upload document"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
          >
            <FileUp size={16} />
          </button>
        )}
        {type === 'missions' && column === 'in-progress' && (
          <button
            onClick={() => onUploadDoc?.(item)}
            title="Upload document"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
          >
            <FileUp size={16} />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div style={{ marginRight: '2rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#ffffff' }}>
          {item.title || item.name}
        </h4>

        {/* Status Badge */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge" style={{
            backgroundColor: `${getStatusColor(item.status)}33`,
            color: getStatusColor(item.status)
          }}>
            {item.status}
          </span>
          {item.priority && (
            <span className="badge" style={{
              backgroundColor: `${getPriorityColor(item.priority)}33`,
              color: getPriorityColor(item.priority)
            }}>
              {item.priority} priority
            </span>
          )}
        </div>

        {/* Expandable Details - Show on hover */}
        {expandedCard === item.id ? (
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
            <p style={{ margin: '0.25rem 0', fontFamily: "'JetBrains Mono', monospace" }}>
              {item.description || item.details || 'No details provided'}
            </p>
            {item.createdAt && (
              <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Created: {new Date(item.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.description || item.details || 'No description'}
          </p>
        )}

        <div style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.75rem' }} onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}>
          {expandedCard === item.id ? 'Show less' : 'Show more'}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {column === 'open' && (
          <>
            <button
              onClick={() => onDelete?.(item.id || item._id)}
              title="Delete"
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'rgba(255, 107, 107, 0.15)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: '#ff6b6b',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s'
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => setActiveAssignDropdown(activeAssignDropdown === item.id ? null : item.id)}
                title="Assign to agent"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'rgba(41, 163, 153, 0.15)',
                  border: '1px solid rgba(41, 163, 153, 0.3)',
                  color: 'var(--primary)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s'
                }}
              >
                <UserPlus size={14} />
                Assign
                <ChevronDown size={12} />
              </button>

              {/* Assignment Dropdown */}
              {activeAssignDropdown === item.id && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  marginTop: '0.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: '10',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                }}>
                  {availableAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onAssign?.(item.id || item._id, agent.id);
                        setActiveAssignDropdown(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      {agent.name}
                    </button>
                  ))}
                  {availableAgents.length === 0 && (
                    <div style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', fontSize: '0.8rem' }}>
                      No agents available
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {column === 'in-progress' && (
          <div style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: 'rgba(41, 163, 153, 0.15)',
            border: '1px solid rgba(41, 163, 153, 0.3)',
            color: 'var(--primary)',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Assigned to: {item.assignedTo || 'Unassigned'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header with Tabs and Create Button */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flex: 1 }}>
          <button
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--primary)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            OPEN ({openItems.length})
          </button>
          <button
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '2px solid transparent',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            IN PROGRESS ({inProgressItems.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onViewCompleted}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            COMPLETED ({completedItems.length})
          </button>
          <button
            onClick={onCreateNew}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            + CREATE {type === 'missions' ? 'MISSION' : 'ISSUE'}
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Open Column */}
        <div className="kanban-column">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#e59019', marginBottom: '1rem', marginTop: '0' }}>
            OPEN
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {openItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                No open {type}
              </div>
            ) : (
              openItems.map(item => (
                <CardItem key={item.id || item._id} item={item} column="open" />
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="kanban-column">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#ffc107', marginBottom: '1rem', marginTop: '0' }}>
            IN PROGRESS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {inProgressItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                No {type} in progress
              </div>
            ) : (
              inProgressItems.map(item => (
                <CardItem key={item.id || item._id} item={item} column="in-progress" />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
