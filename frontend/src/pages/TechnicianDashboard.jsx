import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import { Wrench, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState([]);
  const [completedIssues, setCompletedIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [outcome, setOutcome] = useState('success');
  const [notes, setNotes] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [technicianScore, setTechnicianScore] = useState(100);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  useEffect(() => {
    fetchMyIssues();
    fetchTechnicianData();
  }, []);

  const fetchMyIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch issues assigned to this technician
      const activeIssues = await apiClient.get('/facility-ops/issues');
      const completedIssuesData = await apiClient.get('/facility-ops/issues/solved');

      setMyIssues(Array.isArray(activeIssues) ? activeIssues : []);
      setCompletedIssues(Array.isArray(completedIssuesData) ? completedIssuesData : []);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError(err.message);
      setMyIssues([]);
      setCompletedIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianData = async () => {
    try {
      const stats = await apiClient.get('/auth/ranger-stats');
      setTechnicianScore(stats.performance_score || 100);
    } catch (err) {
      console.error('Error fetching technician data:', err);
    }
  };

  const handleSubmitOutcome = async () => {
    if (!notes.trim()) {
      alert('Please provide work completion notes');
      return;
    }

    try {
      await apiClient.post(`/facility-ops/issues/${selectedIssue._id}/outcome`, {
        outcome: outcome,
        notes: notes,
        resolution_details: resolutionDetails || null
      });

      await fetchMyIssues();
      await fetchTechnicianData();
      
      setShowOutcomeModal(false);
      setSelectedIssue(null);
      setNotes('');
      setResolutionDetails('');
      setOutcome('success');
      
      alert(`Work outcome submitted successfully! Your score has been ${outcome === 'success' ? 'increased by 50' : 'decreased by 25'} points.`);
    } catch (err) {
      console.error('Error submitting outcome:', err);
      alert(err.response?.data?.detail || 'Failed to submit outcome');
    }
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
    <DashboardLayout title="TECHNICIAN DASHBOARD" subtitle="Manage your assigned facility issues">
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Score Card */}
        <div style={{ marginBottom: '2rem' }}>
          <Card variant="glass">
            <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 0.5rem 0' }}>
                  Your Performance Score
                </p>
                <p style={{ fontSize: '2.5rem', fontWeight: '700', color: '#29a399', margin: '0' }}>
                  {technicianScore}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', margin: '0.5rem 0 0 0' }}>
                  +50 for success | -25 for failure
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 0.5rem 0' }}>
                  Active Issues
                </p>
                <p style={{ fontSize: '2rem', fontWeight: '600', color: '#e59019', margin: '0' }}>
                  {myIssues.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #ff4444',
              borderRadius: '0.5rem',
              color: '#ff4444',
              marginBottom: '1rem',
            }}
          >
            Error: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading your assigned issues...
          </div>
        ) : (
          <>
            {/* My Assigned Issues */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ffffff', margin: '0 0 1.5rem 0' }}>
                My Assigned Issues
              </h3>
              
              {myIssues.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                  {myIssues.map((issue) => (
                    <Card key={issue._id} variant="default">
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
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                              {issue.title}
                            </h4>
                            <p style={{ margin: '0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {getCategoryLabel(issue.category)}
                              {issue.location && ` • ${issue.location}`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', backgroundColor: '#3b82f620', borderRadius: '0.25rem' }}>
                            <Clock size={14} color="#3b82f6" />
                            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600' }}>
                              In Progress
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
                          {issue.description}
                        </p>

                        <div style={{ borderTop: '1px solid #2a3040', paddingTop: '1rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem' }}>
                            <span>Assigned:</span>
                            <span style={{ color: '#ffffff' }}>
                              {new Date(issue.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            <span>Assigned by:</span>
                            <span style={{ color: '#ffffff' }}>{issue.created_by_name}</span>
                          </div>
                        </div>

                        {/* AI Suggestions */}
                        {issue.ai_suggestions && issue.ai_suggestions.length > 0 && (
                          <div style={{ backgroundColor: 'rgba(41, 163, 153, 0.1)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid rgba(41, 163, 153, 0.3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <AlertCircle size={14} color="#29a399" />
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#29a399' }}>AI Recommendation</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: '1.4' }}>
                              {issue.ai_suggestions[0].suggestion}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setShowOutcomeModal(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#29a399',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Wrench size={16} />
                          Submit Work Outcome
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card variant="default">
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                    <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No Active Issues</p>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>You don't have any assigned issues at the moment</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Completed Issues */}
            {completedIssues.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ffffff', margin: '0 0 1.5rem 0' }}>
                  My Completed Issues
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {completedIssues.map((issue) => (
                    <Card key={issue._id} variant="default">
                      <div style={{ padding: '1rem' }}>
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
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Outcome Submission Modal */}
        {showOutcomeModal && selectedIssue && (
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
            onClick={() => setShowOutcomeModal(false)}
          >
            <Card
              variant="default"
              style={{
                width: '90%',
                maxWidth: '600px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '600', margin: '0 0 1.5rem 0', color: '#ffffff' }}>
                  Submit Work Outcome
                </h3>

                <div style={{ backgroundColor: '#202835', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Issue:
                  </p>
                  <p style={{ margin: '0', fontSize: '1rem', fontWeight: '600', color: '#ffffff' }}>
                    #{selectedIssue.issue_number} - {selectedIssue.title}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                      Work Outcome *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button
                        onClick={() => setOutcome('success')}
                        style={{
                          padding: '1rem',
                          backgroundColor: outcome === 'success' ? '#29a399' : '#202835',
                          color: outcome === 'success' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          border: outcome === 'success' ? '2px solid #29a399' : '1px solid #2a3040',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <CheckCircle size={24} />
                        Success
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>+50 points</span>
                      </button>
                      <button
                        onClick={() => setOutcome('failed')}
                        style={{
                          padding: '1rem',
                          backgroundColor: outcome === 'failed' ? '#ff4444' : '#202835',
                          color: outcome === 'failed' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          border: outcome === 'failed' ? '2px solid #ff4444' : '1px solid #2a3040',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <XCircle size={24} />
                        Failed
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>-25 points</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                      Work Completion Notes *
                    </label>
                    <textarea
                      placeholder="Describe what you did to resolve the issue..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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

                  {outcome === 'success' && (
                    <div>
                      <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '0.5rem' }}>
                        Resolution Details (Optional)
                      </label>
                      <textarea
                        placeholder="Additional details about how the issue was resolved..."
                        value={resolutionDetails}
                        onChange={(e) => setResolutionDetails(e.target.value)}
                        rows="3"
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
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setShowOutcomeModal(false)}
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
                    onClick={handleSubmitOutcome}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: outcome === 'success' ? '#29a399' : '#ff4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                    }}
                  >
                    Submit Outcome
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
