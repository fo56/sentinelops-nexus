import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import { X, Clock, User, AlertCircle, CheckCircle, XCircle, Wrench } from 'lucide-react';

const FacilityOpsDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [completedIssues, setCompletedIssues] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  const [showCompletedSidebar, setShowCompletedSidebar] = useState(false);
  const [isRaiseIssueModalOpen, setIsRaiseIssueModalOpen] = useState(false);
  const [isAssignmentConfirmOpen, setIsAssignmentConfirmOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    category: 'other',
    location: '' 
  });

  useEffect(() => {
    fetchIssues();
    if (user?.role === 'admin') {
      fetchTechnicians();
    }
  }, [user]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const activeIssues = await apiClient.get('/facility-ops/issues');
      const completedIssuesData = await apiClient.get('/facility-ops/issues/solved');

      // Normalize issues to ensure they have an 'id' field
      const normalizeIssues = (issues) => 
        issues.map(issue => ({
          ...issue,
          id: issue.id || issue._id // Use id if exists, otherwise fall back to _id
        }));

      setIssues(Array.isArray(activeIssues) ? normalizeIssues(activeIssues) : []);
      setCompletedIssues(Array.isArray(completedIssuesData) ? normalizeIssues(completedIssuesData) : []);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError(err.message);
      setIssues([]);
      setCompletedIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const techList = await apiClient.get('/facility-ops/technicians');
      setTechnicians(Array.isArray(techList) ? techList : []);
    } catch (err) {
      console.error('Error fetching technicians:', err);
      setTechnicians([]);
    }
  };

  const handleOpenAssignmentModal = (issue, technician) => {
    setSelectedIssue(issue);
    setSelectedTechnician(technician);
    setIsAssignmentConfirmOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedIssue || !selectedTechnician) return;
    try {
      setIsAssigning(true);
      await apiClient.post(`/facility-ops/issues/${selectedIssue.id}/assign`, {
        technician_id: selectedTechnician.id,
        notes: `Assigned based on technician score: ${selectedTechnician.score}`
      });
      
      await fetchIssues();
      await fetchTechnicians();
      setIsAssignmentConfirmOpen(false);
      setSelectedIssue(null);
      setSelectedTechnician(null);
    } catch (err) {
      console.error('Error assigning issue:', err);
      alert(err.response?.data?.detail || 'Failed to assign issue');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRaiseIssue = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and description');
      return;
    }
    
    if (formData.title.trim().length < 3) {
      alert('Title must be at least 3 characters long');
      return;
    }
    
    if (formData.description.trim().length < 10) {
      alert('Description must be at least 10 characters long');
      return;
    }
    
    try {
      const issueData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
      };
      
      // Only add location if it has a value
      if (formData.location && formData.location.trim()) {
        issueData.location = formData.location.trim();
      }
      
      console.log('Sending issue data:', issueData); // Debug log
      
      await apiClient.post('/facility-ops/issues', issueData);
      
      await fetchIssues();
      setFormData({ title: '', description: '', priority: 'medium', category: 'other', location: '' });
      setIsRaiseIssueModalOpen(false);
    } catch (err) {
      console.error('Error creating issue:', err);
      console.error('Error response:', err.response?.data); // More detailed error log
      
      // Show more detailed error message
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const errorMessages = errorDetail.map(e => `${e.loc.join('.')}: ${e.msg}`).join('\n');
        alert(`Validation Error:\n${errorMessages}`);
      } else {
        alert(errorDetail || 'Failed to create issue');
      }
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    
    console.log('Attempting to delete issue:', issueId);
    console.log('Current user role:', user?.role);
    
    try {
      // Use id field (not _id) as backend returns id via alias
      const response = await apiClient.delete(`/facility-ops/issues/${issueId}`);
      console.log('Delete response:', response);
      alert('Issue deleted successfully');
      await fetchIssues();
    } catch (err) {
      console.error('Error deleting issue:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete issue';
      alert(`Failed to delete issue: ${errorMsg}`);
    }
  };

  const handleViewIssueDetails = async (issueId) => {
    try {
      const issueDetail = await apiClient.get(`/facility-ops/issues/${issueId}`);
      setSelectedIssueDetail(issueDetail);
    } catch (err) {
      console.error('Error fetching issue details:', err);
      alert('Failed to load issue details');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#e59019', label: 'Pending', icon: Clock },
      in_progress: { color: '#3b82f6', label: 'In Progress', icon: User },
      completed: { color: '#29a399', label: 'Completed', icon: CheckCircle },
      failed: { color: '#ff4444', label: 'Failed', icon: XCircle }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ff6b6b',
      medium: '#e59019',
      low: '#29a399'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      cctv: 'CCTV',
      door_access: 'Door Access',
      computer: 'Computer',
      power_supply: 'Power Supply',
      network: 'Network',
      other: 'Other'
    };
    return labels[category] || 'Other';
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ffffff', margin: '0' }}>
            Facility Issues{' '}
            <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 'normal' }}>
              ({issues.length} active)
            </span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {(user?.role === 'admin' || user?.role === 'agent') && (
            <button
              onClick={() => setIsRaiseIssueModalOpen(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#29a399',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              + Create Issue
            </button>
          )}
          <button
            onClick={() => setShowCompletedSidebar(!showCompletedSidebar)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#202835',
              color: '#29a399',
              border: '1px solid #29a399',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Completed ({completedIssues.length})
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', borderRadius: '0.5rem', color: '#ff4444', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading facility issues...
        </div>
      ) : (
        <>
          {/* Active Issues Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {issues.map((issue) => {
              const statusInfo = getStatusBadge(issue.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={issue.id} variant="default">
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
                          <span style={{ color: '#29a399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                          <AlertCircle size={14} color="#29a399" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#29a399' }}>AI Suggestion</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                          {issue.ai_suggestions[0].suggestion}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleViewIssueDetails(issue.id)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: '#202835',
                          color: '#29a399',
                          border: '1px solid #29a399',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                        }}
                      >
                        View Details
                      </button>
                      {user?.role === 'admin' && issue.status === 'pending' && (
                        <select
                          onChange={(e) => {
                            const techId = e.target.value;
                            if (techId) {
                              const tech = technicians.find(t => t.id === techId);
                              handleOpenAssignmentModal(issue, tech);
                              e.target.value = '';
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            backgroundColor: '#29a399',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
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
                            handleDeleteIssue(issue.id);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'rgba(255, 68, 68, 0.1)',
                            color: '#ff4444',
                            border: '1px solid #ff4444',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {issues.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1.1rem', margin: 0 }}>No active issues</p>
              <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>All facility systems are running smoothly</p>
            </div>
          )}
        </>
      )}

      {/* Completed Issues Sidebar */}
      {showCompletedSidebar && (
        <>
          {/* Backdrop/Overlay */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 39,
            }}
            onClick={() => setShowCompletedSidebar(false)}
          />
          
          {/* Sidebar */}
          <div
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '400px',
              backgroundColor: '#1a1f2e',
              borderLeft: '1px solid #2a3040',
              boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.3)',
              zIndex: 40,
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ffffff', margin: '0' }}>
                  Completed Issues
                </h3>
                <button
                  onClick={() => setShowCompletedSidebar(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {completedIssues.length > 0 ? (
                  completedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#202835',
                        border: '1px solid #2a3040',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleViewIssueDetails(issue.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <CheckCircle size={16} color="#29a399" />
                        <h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0', color: '#29a399' }}>
                          #{issue.issue_number} - {issue.title}
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {getCategoryLabel(issue.category)}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        Completed: {new Date(issue.completed_at).toLocaleString()}
                      </p>
                      {issue.assigned_to_name && (
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          By: {issue.assigned_to_name}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '2rem 0' }}>
                    No completed issues yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Raise Issue Modal */}
      {isRaiseIssueModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setIsRaiseIssueModalOpen(false)}
        >
          <Card
            variant="default"
            style={{
              width: '90%',
              maxWidth: '500px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 1.5rem 0', color: '#ffffff' }}>
                Create New Issue
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CCTV Camera 14 not working"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#202835',
                      border: '1px solid #2a3040',
                      borderRadius: '0.375rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                    Description *
                  </label>
                  <textarea
                    placeholder="Describe the issue in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#202835',
                      border: '1px solid #2a3040',
                      borderRadius: '0.375rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#202835',
                        border: '1px solid #2a3040',
                        borderRadius: '0.375rem',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="cctv">CCTV</option>
                      <option value="door_access">Door Access</option>
                      <option value="computer">Computer</option>
                      <option value="power_supply">Power Supply</option>
                      <option value="network">Network</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#202835',
                        border: '1px solid #2a3040',
                        borderRadius: '0.375rem',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Building B, Floor 2, Room 201"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#202835',
                      border: '1px solid #2a3040',
                      borderRadius: '0.375rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setIsRaiseIssueModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: 'transparent',
                    color: '#29a399',
                    border: '1px solid #29a399',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseIssue}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#29a399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Create Issue
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Assignment Confirmation Modal */}
      {isAssignmentConfirmOpen && selectedIssue && selectedTechnician && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setIsAssignmentConfirmOpen(false)}
        >
          <Card
            variant="default"
            style={{
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#ffffff' }}>
                Confirm Assignment
              </h3>

              <div style={{ backgroundColor: '#202835', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <strong>Issue:</strong>
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#ffffff' }}>
                  #{selectedIssue.issue_number} - {selectedIssue.title}
                </p>

                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <strong>Assign to:</strong>
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#29a399' }}>
                  {selectedTechnician.name}
                </p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Current Score: <span style={{ color: '#29a399', fontWeight: '600' }}>{selectedTechnician.score}</span>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setIsAssignmentConfirmOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: 'transparent',
                    color: '#29a399',
                    border: '1px solid #29a399',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={isAssigning}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#29a399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isAssigning ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    opacity: isAssigning ? 0.6 : 1,
                  }}
                >
                  {isAssigning ? 'Assigning...' : 'Confirm'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Issue Details Modal */}
      {selectedIssueDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setSelectedIssueDetail(null)}
        >
          <Card
            variant="default"
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                    #{selectedIssueDetail.issue_number} - {selectedIssueDetail.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.3rem 0.6rem',
                      backgroundColor: getPriorityColor(selectedIssueDetail.priority),
                      color: '#ffffff',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      {selectedIssueDetail.priority}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {getCategoryLabel(selectedIssueDetail.category)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIssueDetail(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 0.5rem 0' }}>Description</h4>
                <p style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0, lineHeight: '1.6' }}>
                  {selectedIssueDetail.description}
                </p>
              </div>

              {selectedIssueDetail.location && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 0.5rem 0' }}>Location</h4>
                  <p style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>
                    {selectedIssueDetail.location}
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#202835', borderRadius: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 0.25rem 0' }}>Created By</p>
                  <p style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, fontWeight: '500' }}>{selectedIssueDetail.created_by_name}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 0.25rem 0' }}>Created At</p>
                  <p style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, fontWeight: '500' }}>
                    {new Date(selectedIssueDetail.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedIssueDetail.assigned_to_name && (
                  <>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 0.25rem 0' }}>Assigned To</p>
                      <p style={{ fontSize: '0.9rem', color: '#29a399', margin: 0, fontWeight: '500' }}>{selectedIssueDetail.assigned_to_name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 0.25rem 0' }}>Assigned At</p>
                      <p style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, fontWeight: '500' }}>
                        {new Date(selectedIssueDetail.assigned_at).toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Activity Log */}
              {selectedIssueDetail.activity_log && selectedIssueDetail.activity_log.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: '#ffffff', margin: '0 0 1rem 0', fontWeight: '600' }}>Activity Log</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedIssueDetail.activity_log.map((log, index) => (
                      <div key={index} style={{ padding: '0.75rem', backgroundColor: '#202835', borderRadius: '0.375rem', borderLeft: '3px solid #29a399' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#29a399' }}>{log.action}</span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.25rem 0' }}>
                          By: {log.performed_by_name}
                        </p>
                        {log.details && (
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                            {log.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              {selectedIssueDetail.ai_suggestions && selectedIssueDetail.ai_suggestions.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1rem', color: '#ffffff', margin: '0 0 1rem 0', fontWeight: '600' }}>AI Suggestions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedIssueDetail.ai_suggestions.map((suggestion, index) => (
                      <div key={index} style={{ padding: '1rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', borderRadius: '0.375rem', border: '1px solid rgba(41, 163, 153, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <AlertCircle size={16} color="#29a399" />
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#29a399' }}>
                            Confidence: {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, lineHeight: '1.5' }}>
                          {suggestion.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FacilityOpsDashboard;
