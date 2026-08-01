import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import DashboardLayout from '../components/DashboardLayout';
import AgentNavigation from '../components/AgentNavigation';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real-time ranger stats from backend
      const stats = await apiClient.get('/api/analytics/ranger-stats');

      setAgentData({
        id: user?.id || '',
        name: user?.full_name || '',
        age: stats.age,
        maritalStatus: stats.marital_status,
        score: stats.performance_score,
        role: user?.role || '',
        email: user?.email || '',
        completedMissions: stats.completed_missions,
      });
      
    } catch (err) {
      console.error('Error fetching agent data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [user?.id]);

  return (
    <DashboardLayout
      title="AGENT DASHBOARD"
      subtitle={agentData ? `Welcome, ${agentData.name}` : 'Loading...'}
      navigation={<AgentNavigation />}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading agent data...
        </div>
      )}

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

      {!loading && agentData && (
        <>
          {/* Agent Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <Card variant="glass">
              <div style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                  COMPLETED MISSIONS
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#29a399', margin: '0' }}>
                  {agentData.completedMissions || 0}
                </p>
              </div>
            </Card>
            <Card variant="glass">
              <div style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                  AGENT SCORE
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#ffc107', margin: '0' }}>
                  {agentData.score}
                </p>
              </div>
            </Card>
            <Card variant="glass">
              <div style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                  AGE
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#29a399', margin: '0' }}>
                  {agentData.age}
                </p>
              </div>
            </Card>
            <Card variant="glass">
              <div style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                  MARITAL STATUS
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1rem', fontWeight: '600', color: '#29a399', margin: '0' }}>
                  {agentData.maritalStatus}
                </p>
              </div>
            </Card>
          </div>

          {/* Info Card */}
          <Card variant="default">
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#29a399' }}>
                Welcome to SentinelOps Nexus
              </h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1.5rem 0' }}>
                Use the navigation bar to access:
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', maxWidth: '250px' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', border: '1px solid #29a399', borderRadius: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#29a399' }}>
                      Ops Planner
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                      View and manage your assigned missions
                    </p>
                  </div>
                </div>
                <div style={{ flex: '1 1 200px', maxWidth: '250px' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(41, 163, 153, 0.1)', border: '1px solid #29a399', borderRadius: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#29a399' }}>
                      Facility Ops
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                      Report and track facility issues
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
