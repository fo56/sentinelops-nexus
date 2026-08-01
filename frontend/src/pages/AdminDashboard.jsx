import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import DashboardLayout from '../components/DashboardLayout';
import AdminNavigation from '../components/AdminNavigation';
import apiClient from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    active_agents: 0,
    active_technicians: 0,
    open_missions: 0,
    in_progress_missions: 0,
    completed_missions: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/analytics/dashboard-stats');
      setStats(response);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  // Fetch stats on mount and set up auto-refresh every 5 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <DashboardLayout
      title="ADMIN DASHBOARD"
      subtitle="System Overview & Analytics"
      navigation={<AdminNavigation />}
    >
      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
        <Card variant="glass">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>ACTIVE AGENTS</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#29a399', margin: '0' }}>
              {loading ? '...' : stats.active_agents}
            </p>
          </div>
        </Card>
        <Card variant="glass">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>ACTIVE TECHNICIANS</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#e59019', margin: '0' }}>
              {loading ? '...' : stats.active_technicians}
            </p>
          </div>
        </Card>
        <Card variant="glass">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>OPEN MISSIONS</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#ff6b6b', margin: '0' }}>
              {loading ? '...' : stats.open_missions}
            </p>
          </div>
        </Card>
        <Card variant="glass">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>IN PROGRESS</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#ffc107', margin: '0' }}>
              {loading ? '...' : stats.in_progress_missions}
            </p>
          </div>
        </Card>
        <Card variant="glass">
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>COMPLETED</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: '700', color: '#29a399', margin: '0' }}>
              {loading ? '...' : stats.completed_missions}
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
