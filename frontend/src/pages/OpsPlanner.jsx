import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, X } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import AgentNavigation from '../components/AgentNavigation';
import AdminNavigation from '../components/AdminNavigation';
import apiClient from '../services/api';
import { MissionCard, CompletedMissionCard } from '../components/OpsPlanner/MissionCard';
import { CreateMissionModal } from '../components/OpsPlanner/CreateMissionModal';
import { AssignAgentModal } from '../components/OpsPlanner/AssignAgentModal';
import { SubmitMissionModal } from '../components/OpsPlanner/SubmitMissionModal';
import { useWebSocket } from '../hooks/useWebSocket';

export default function OpsPlanner() {
  const [missions, setMissions] = useState([]);
  const [failedMissionsData, setFailedMissionsData] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompletedView, setShowCompletedView] = useState(false);
  const [showFailedView, setShowFailedView] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const [selectedMission, setSelectedMission] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Real-time WebSocket connection for live mission updates
  const { messages: wsMessages, isConnected: wsConnected, onReconnect } = useWebSocket('/api/ops-planner/ws');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMissions();
    }
  }, [currentUser]);

  // Auto-refresh board when a WebSocket mission event arrives
  useEffect(() => {
    if (wsMessages.length > 0 && currentUser) {
      const latest = wsMessages[0];
      const missionEventTypes = [
        'mission_created', 'mission_assigned', 'mission_moved',
        'mission_updated', 'mission_deleted', 'mission_completed', 'mission_failed'
      ];
      if (missionEventTypes.includes(latest.type)) {
        fetchMissions();
      }
    }
  }, [wsMessages]);

  // On WebSocket reconnection, rehydrate stale data with a fresh REST fetch
  useEffect(() => {
    onReconnect(() => {
      if (currentUser) {
        fetchMissions();
      }
    });
  }, [onReconnect, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setCurrentUser(response);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchMissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (currentUser?.role === 'agent') {
        const response = await apiClient.get('/api/ops-planner/my-work');
        const allMissions = [
          ...response.assigned_missions.map(m => ({ ...m, id: m._id || m.id })),
          ...response.completed_missions.map(m => ({ ...m, id: m._id || m.id }))
        ];
        setMissions(allMissions);
        setFailedMissionsData(response.failed_missions.map(m => ({ ...m, id: m._id || m.id })));
      } else {
        const response = await apiClient.get('/api/ops-planner/board');
        const allMissions = [];
        response.columns.forEach(column => {
          const mappedMissions = column.missions.map(m => ({
            ...m,
            id: m._id || m.id
          }));
          allMissions.push(...mappedMissions);
        });
        setMissions(allMissions);
      }
    } catch (err) {
      console.error('Error fetching missions:', err);
      setError(err.message);
      setMissions([]);
    } finally {
      setLoading(false);
    }
  };

  const openMissions = missions.filter(m => m.status === 'pending');
  const inProgressMissions = missions.filter(m => m.status === 'in_progress');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const failedMissions = failedMissionsData;

  const handleCreateMission = async (createForm) => {
    try {
      const tagsArray = createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const missionData = {
        ...createForm,
        due_date: createForm.due_date ? new Date(createForm.due_date).toISOString() : undefined,
        tags: tagsArray,
      };
      await apiClient.post('/api/ops-planner/missions', missionData);
      await fetchMissions();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating mission:', err);
      alert('Failed to create mission: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (window.confirm('Are you sure you want to abort this mission?')) {
      try {
        await apiClient.delete(`/api/ops-planner/missions/${missionId}`);
        await fetchMissions();
      } catch (err) {
        console.error('Error deleting mission:', err);
        alert('Failed to delete mission: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleOpenAssignModal = async (mission) => {
    setSelectedMission(mission);
    try {
      const agents = await apiClient.get('/api/ops-planner/agents/available');
      const mappedAgents = agents.map(agent => ({
        ...agent,
        id: agent._id || agent.id
      }));
      const filteredAgents = mission.previous_assigned_agent_id 
        ? mappedAgents.filter(agent => agent.id !== mission.previous_assigned_agent_id)
        : mappedAgents;
      setAvailableAgents(filteredAgents);
      setShowAssignModal(true);
    } catch (err) {
      console.error('Error fetching agents:', err);
      alert('Failed to fetch available agents');
    }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      await apiClient.post(`/api/ops-planner/missions/${selectedMission.id}/assign`, { agent_id: agentId });
      await fetchMissions();
      setShowAssignModal(false);
      setSelectedMission(null);
    } catch (err) {
      console.error('Error assigning mission:', err);
      alert('Failed to assign mission: ' + (err.message || 'Unknown error'));
    }
  };

  const handleOpenSubmitModal = (mission) => {
    setSelectedMission(mission);
    setShowSubmitModal(true);
  };

  const handleSubmitMission = async (submitForm) => {
    try {
      await apiClient.patch(`/api/ops-planner/missions/${selectedMission.id}/status`, {
        status: submitForm.status,
        completion_notes: submitForm.notes
      });
      await fetchMissions();
      setShowSubmitModal(false);
      setSelectedMission(null);
    } catch (err) {
      console.error('Error submitting mission:', err);
      alert('Failed to submit mission: ' + (err.message || 'Unknown error'));
    }
  };

  const getMissionNumber = (missionId) => {
    const sortedMissions = [...missions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    const index = sortedMissions.findIndex(m => m.id === missionId);
    return index >= 0 ? index + 1 : missions.length + 1;
  };

  // AGENT VIEW
  if (currentUser?.role === 'agent') {
    return (
      <DashboardLayout
        title="OPS PLANNER"
        subtitle="Mission Operations"
        navigation={<AgentNavigation />}
      >
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1rem 1rem 1rem', position: 'relative' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>Loading missions...</div>
        ) : showCompletedView ? (
          <>
            <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>ACTIVE MISSIONS</h2>
            </div>
            <div className="modal-overlay" onClick={() => setShowCompletedView(false)}>
              <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 style={{ margin: 0, color: 'var(--status-success)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>COMPLETED ({completedMissions.length})</h2>
                  <button className="modal-close-btn" onClick={() => setShowCompletedView(false)}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {completedMissions.length > 0 ? completedMissions.map(mission => 
                    <CompletedMissionCard key={mission.id} mission={mission} missionNumber={getMissionNumber(mission.id)} />
                  ) : <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '2rem', textAlign: 'center' }}>No completed missions</div>}
                </div>
              </Card>
            </div>
          </>
        ) : showFailedView ? (
          <>
            <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>ACTIVE MISSIONS</h2>
            </div>
            <div className="modal-overlay" onClick={() => setShowFailedView(false)}>
              <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 style={{ margin: 0, color: 'var(--status-error)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>FAILED ({failedMissions.length})</h2>
                  <button className="modal-close-btn" onClick={() => setShowFailedView(false)}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {failedMissions.length > 0 ? failedMissions.map(mission => 
                    <CompletedMissionCard key={mission.id} mission={mission} missionNumber={getMissionNumber(mission.id)} isFailed />
                  ) : <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '2rem', textAlign: 'center' }}>No failed missions</div>}
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>ACTIVE MISSIONS ({inProgressMissions.length})</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-secondary" style={{ borderColor: 'var(--status-success)', color: 'var(--status-success)' }} onClick={() => setShowCompletedView(true)}>
                    View Completed
                  </button>
                  <button className="btn-danger" onClick={() => setShowFailedView(true)}>
                    View Failed
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '0.5rem' }}>
                {inProgressMissions.length > 0 ? (
                  inProgressMissions.map(mission => 
                    <MissionCard 
                      key={mission.id} 
                      mission={mission} 
                      missionNumber={getMissionNumber(mission.id)} 
                      isAgent={true} 
                      onOpenSubmit={handleOpenSubmitModal} 
                    />
                  )
                ) : (
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '1.5rem', fontSize: '0.85rem' }}>No active missions assigned to you</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {showSubmitModal && selectedMission && (
          <SubmitMissionModal 
            onClose={() => { setShowSubmitModal(false); setSelectedMission(null); }}
            onSubmit={handleSubmitMission}
          />
        )}
        </div>
      </DashboardLayout>
    );
  }

  // ADMIN VIEW
  return (
    <DashboardLayout
      title="OPS PLANNER"
      subtitle="Manage missions from admin perspective"
      navigation={<AdminNavigation />}
    >
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1rem 1rem 1rem', position: 'relative' }}>
      {/* Create Mission Button */}
      <button 
        className="btn-primary" 
        onClick={() => setShowCreateModal(true)} 
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.75rem', zIndex: 30, boxShadow: '0 4px 12px rgba(41, 163, 153, 0.3)' }}
      >
        + CREATE MISSION
      </button>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>Loading missions...</div>
      ) : showCompletedView ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: 0.3, pointerEvents: 'none' }}>
            <div><h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>OPEN MISSIONS</h2></div>
          </div>
          <div className="modal-overlay" onClick={() => setShowCompletedView(false)}>
            <Card variant="default" className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 style={{ margin: 0, color: 'var(--status-success)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>COMPLETED ({completedMissions.length})</h2>
                <button className="modal-close-btn" onClick={() => setShowCompletedView(false)}><X size={24} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {completedMissions.length > 0 ? completedMissions.map(mission => 
                  <CompletedMissionCard key={mission.id} mission={mission} missionNumber={getMissionNumber(mission.id)} />
                ) : <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '2rem', textAlign: 'center' }}>No completed missions</div>}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* OPEN MISSIONS Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>
                OPEN MISSIONS ({openMissions.length})
              </h2>
              <button className="btn-secondary" style={{ borderColor: 'var(--status-success)', color: 'var(--status-success)' }} onClick={() => setShowCompletedView(true)}>
                View Completed
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '0.5rem' }}>
              {openMissions.length > 0 ? (
                openMissions.map(mission => 
                  <MissionCard 
                    key={mission.id} 
                    mission={mission} 
                    missionNumber={getMissionNumber(mission.id)}
                    isAgent={false} 
                    onOpenAssign={handleOpenAssignModal}
                    onDelete={handleDeleteMission}
                  />
                )
              ) : (
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '1.5rem', fontSize: '0.85rem' }}>No open missions</div>
              )}
            </div>
          </div>
          
          {/* IN PROGRESS Section */}
          <div>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '400', letterSpacing: '1px' }}>
              IN PROGRESS ({inProgressMissions.length})
            </h2>
            <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '0.5rem' }}>
              {inProgressMissions.length > 0 ? (
                inProgressMissions.map(mission => 
                  <MissionCard 
                    key={mission.id} 
                    mission={mission} 
                    missionNumber={getMissionNumber(mission.id)}
                    isAgent={false} 
                  />
                )
              ) : (
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '1.5rem', fontSize: '0.85rem' }}>No missions in progress</div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showAssignModal && selectedMission && (
        <AssignAgentModal 
          onClose={() => { setShowAssignModal(false); setSelectedMission(null); }}
          onAssign={handleAssignAgent}
          availableAgents={availableAgents}
        />
      )}
      
      {showCreateModal && (
        <CreateMissionModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMission}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
