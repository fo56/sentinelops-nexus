import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { AlertCircle, Clock, User, CheckCircle, XCircle, Wrench } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import AdminNavigation from '../components/AdminNavigation';
import AgentNavigation from '../components/AgentNavigation';
import TechnicianNavigation from '../components/TechnicianNavigation';
import apiClient from '../services/api';
import { IssueCard } from '../components/FacilityOps/IssueCard';
import { RaiseIssueModal } from '../components/FacilityOps/RaiseIssueModal';
import { AssignTechnicianModal } from '../components/FacilityOps/AssignTechnicianModal';
import { IssueDetailsPanel } from '../components/FacilityOps/IssueDetailsPanel';

export default function FacilityOps() {
  const [user, setUser] = useState(null);
  const [issues, setIssues] = useState([]);
  const [completedIssues, setCompletedIssues] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompletedSidebar, setShowCompletedSidebar] = useState(false);

  // Modal states
  const [isRaiseIssueModalOpen, setIsRaiseIssueModalOpen] = useState(false);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  
  // Assignment state
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, issue: null, technician: null });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIssues();
      if (user.role === 'admin') {
        fetchTechnicians();
      }
    }
  }, [user]);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get('/facility-ops/issues');
      
      const active = data.filter(i => i.status !== 'completed' && i.status !== 'failed');
      const completed = data.filter(i => i.status === 'completed' || i.status === 'failed');
      
      setIssues(active);
      setCompletedIssues(completed);
    } catch (err) {
      console.error('Error fetching facility issues:', err);
      setError('Failed to load facility issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await apiClient.get('/facility-ops/technicians');
      setTechnicians(data);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleOpenAssignmentModal = (issue, technician) => {
    setAssignmentModal({ isOpen: true, issue, technician });
  };

  const handleConfirmAssignment = async () => {
    const { issue, technician } = assignmentModal;
    if (!issue || !technician) return;

    setIsAssigning(true);
    try {
      await apiClient.post(`/facility-ops/issues/${issue.id}/assign`, { technician_id: technician.id });
      await fetchIssues();
      setAssignmentModal({ isOpen: false, issue: null, technician: null });
    } catch (err) {
      console.error('Error assigning technician:', err);
      alert('Failed to assign technician');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRaiseIssue = async (formData) => {
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
      
      if (formData.location && formData.location.trim()) {
        issueData.location = formData.location.trim();
      }
      
      await apiClient.post('/facility-ops/issues', issueData);
      
      await fetchIssues();
      setIsRaiseIssueModalOpen(false);
    } catch (err) {
      console.error('Error creating issue:', err);
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
    
    try {
      await apiClient.delete(`/facility-ops/issues/${issueId}`);
      alert('Issue deleted successfully');
      await fetchIssues();
    } catch (err) {
      console.error('Error deleting issue:', err);
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
      pending: { color: 'var(--status-warning)', label: 'Pending', icon: Clock },
      in_progress: { color: '#3b82f6', label: 'In Progress', icon: User },
      completed: { color: 'var(--status-success)', label: 'Completed', icon: CheckCircle },
      failed: { color: 'var(--status-error)', label: 'Failed', icon: XCircle }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'var(--status-error)',
      medium: 'var(--status-warning)',
      low: 'var(--primary)'
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

  const getNavigation = () => {
    if (user?.role === 'admin') return <AdminNavigation />;
    if (user?.role === 'agent') return <AgentNavigation />;
    if (user?.role === 'technician') return <TechnicianNavigation />;
    return null;
  };

  return (
    <DashboardLayout
      title="FACILITY OPERATIONS"
      subtitle="Manage facility issues and assignments"
      navigation={getNavigation()}
    >
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
              className="btn-primary"
            >
              + Create Issue
            </button>
          )}
          <button
            onClick={() => setShowCompletedSidebar(!showCompletedSidebar)}
            className="btn-secondary"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            Completed ({completedIssues.length})
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid var(--status-error)', borderRadius: '0.5rem', color: 'var(--status-error)', marginBottom: '1rem' }}>
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
            {issues.map((issue) => (
              <IssueCard 
                key={issue.id}
                issue={issue}
                user={user}
                technicians={technicians}
                getStatusBadge={getStatusBadge}
                getPriorityColor={getPriorityColor}
                getCategoryLabel={getCategoryLabel}
                onViewDetails={handleViewIssueDetails}
                onOpenAssignment={handleOpenAssignmentModal}
                onDelete={handleDeleteIssue}
              />
            ))}
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

      {/* Completed Issues Sidebar Modal */}
      {showCompletedSidebar && (
        <div className="modal-overlay" onClick={() => setShowCompletedSidebar(false)}>
          <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--status-success)' }}>Completed Issues</h3>
              <button className="modal-close-btn" onClick={() => setShowCompletedSidebar(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {completedIssues.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', padding: '2rem' }}>
                  No completed issues found
                </div>
              ) : (
                completedIssues.map((issue) => (
                  <div key={issue.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.5rem', border: `1px solid ${issue.status === 'completed' ? 'var(--status-success)' : 'var(--status-error)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>#{issue.issue_number}</span>
                      <span style={{ fontSize: '0.75rem', color: issue.status === 'completed' ? 'var(--status-success)' : 'var(--status-error)' }}>
                        {issue.status.toUpperCase()}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffffff', fontSize: '0.95rem' }}>{issue.title}</h4>
                    <button
                      onClick={() => handleViewIssueDetails(issue.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                    >
                      View Details →
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      {isRaiseIssueModalOpen && (
        <RaiseIssueModal 
          onClose={() => setIsRaiseIssueModalOpen(false)}
          onSubmit={handleRaiseIssue}
        />
      )}

      <AssignTechnicianModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, issue: null, technician: null })}
        selectedIssue={assignmentModal.issue}
        selectedTechnician={assignmentModal.technician}
        onConfirm={handleConfirmAssignment}
        isAssigning={isAssigning}
      />

      <IssueDetailsPanel
        issue={selectedIssueDetail}
        onClose={() => setSelectedIssueDetail(null)}
      />
    </div>
    </DashboardLayout>
  );
}
