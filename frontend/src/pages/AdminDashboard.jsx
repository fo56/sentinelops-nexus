import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import AdminNavigation from '../components/AdminNavigation';
import { useState, useEffect } from 'react';
import apiClient from '../services/api';
// Import all admin pages
import AdminUsers from './Users';
import AdminCreateRanger from './CreateRanger';
import OpsPlanner from './OpsPlanner';
import FacilityOpsComponent from './FacilityOps';

const pageConfig = {
  '/admin/dashboard': { title: 'ADMIN DASHBOARD', subtitle: 'System overview and statistics' },
  '/admin/users': { title: 'USER MANAGEMENT', subtitle: 'Manage system users and their permissions' },
  '/admin/create-ranger': { title: 'CREATE RANGER', subtitle: 'Onboard a new ranger operative' },
  '/admin/ops-planner': { title: 'OPERATIONS PLANNER', subtitle: 'Manage missions from admin perspective' },
  '/admin/facility-ops': { title: 'FACILITY OPERATIONS', subtitle: 'Manage facility issues from admin perspective' },
};

const activityHistory = [
  { id: 1, action: 'Ranger DELTA-7 logged in', timestamp: new Date(Date.now() - 2 * 60000), type: 'login' },
  { id: 2, action: 'Mission #2847 created', timestamp: new Date(Date.now() - 5 * 60000), type: 'mission' },
  { id: 3, action: 'Mission #2847 completed', timestamp: new Date(Date.now() - 12 * 60000), type: 'mission' },
  { id: 4, action: 'Admin COMMANDER-1 logged in', timestamp: new Date(Date.now() - 30 * 60000), type: 'login' },
  { id: 5, action: 'Issue #451 created', timestamp: new Date(Date.now() - 45 * 60000), type: 'issue' },
  { id: 6, action: 'Mission #2846 completed', timestamp: new Date(Date.now() - 1 * 3600000), type: 'mission' },
  { id: 7, action: 'Ranger ALPHA-3 logged in', timestamp: new Date(Date.now() - 1.5 * 3600000), type: 'login' },
  { id: 8, action: 'Issue #450 created', timestamp: new Date(Date.now() - 2 * 3600000), type: 'issue' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activityFilter, setActivityFilter] = useState('all');
  const [stats, setStats] = useState({
    active_agents: 0,
    active_technicians: 0,
    open_missions: 0,
    in_progress_missions: 0,
    completed_missions: 0
  });
  const [loading, setLoading] = useState(true);

  const currentPage = pageConfig[location.pathname] || pageConfig['/admin/dashboard'];

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard-stats');
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

  const getTypeColor = (type) => {
    switch (type) {
      case 'login': return '#29a399';
      case 'mission': return '#e59019';
      case 'issue': return '#ff6b6b';
      default: return '#6c757d';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'login': return 'Login';
      case 'mission': return 'Mission';
      case 'issue': return 'Issue';
      default: return 'Activity';
    }
  };

  const filteredActivity = activityFilter === 'all' 
    ? activityHistory 
    : activityHistory.filter(item => item.type === activityFilter);

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <DashboardLayout
      title={currentPage.title}
      subtitle={currentPage.subtitle}
      navigation={<AdminNavigation />}
    >
      {/* Dashboard Stats - Only on dashboard page */}
      {(location.pathname === '/admin/dashboard' || location.pathname === '/admin/overview') ? (
        <>
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

          {/* Recent Activity Section */}
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
            <Card variant="default" style={{ marginTop: '1.5rem' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #2a3040', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Recent Activity</h3>
                
                {/* Filter Options */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['all', 'logins', 'issues', 'missions'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter === 'all' ? 'all' : filter === 'logins' ? 'login' : filter === 'issues' ? 'issue' : 'mission')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: (filter === 'all' ? activityFilter === 'all' : 
                                         filter === 'logins' ? activityFilter === 'login' :
                                         filter === 'issues' ? activityFilter === 'issue' :
                                         activityFilter === 'mission') ? '#29a399' : 'transparent',
                        border: `1px solid ${(filter === 'all' ? activityFilter === 'all' : 
                                            filter === 'logins' ? activityFilter === 'login' :
                                            filter === 'issues' ? activityFilter === 'issue' :
                                            activityFilter === 'mission') ? '#29a399' : '#2a3040'}`,
                        color: '#ffffff',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '0', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: index < filteredActivity.length - 1 ? '1px solid #2a3040' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#202835';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Status Dot */}
                    <div
                      style={{
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        backgroundColor: getTypeColor(activity.type),
                        flexShrink: 0,
                      }}
                    />

                    {/* Activity Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0', fontSize: '0.875rem', color: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
                        {activity.action}
                      </p>
                    </div>

                    {/* Type Badge */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: `${getTypeColor(activity.type)}33`,
                        color: getTypeColor(activity.type),
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {getTypeLabel(activity.type)}
                      </span>

                      {/* Time */}
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : location.pathname === '/admin/users' ? (
        <AdminUsers />
      ) : location.pathname === '/admin/create-ranger' ? (
        <AdminCreateRanger />
      ) : location.pathname === '/admin/ops-planner' ? (
        <OpsPlanner />
      ) : location.pathname === '/admin/facility-ops' ? (
        <FacilityOpsComponent />
      ) : null}
    </DashboardLayout>
  );
}
