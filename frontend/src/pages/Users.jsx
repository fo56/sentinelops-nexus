import { Search, Lock, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import DashboardLayout from '../components/DashboardLayout';
import AdminNavigation from '../components/AdminNavigation';
import { useState, useEffect } from 'react';
import apiClient from '../services/api';

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/users');
      const data = Array.isArray(response) ? response : response.users || [];
      
      // Transform API response to match UI expectations
      const transformedUsers = data.map((user) => ({
        id: user._id || user.id,
        name: user.full_name || user.username || user.name,
        email: user.email,
        role: user.role || 'Agent',
        status: user.status || 'active',
        dateCreated: user.created_at || new Date().toISOString(),
        token: user.token || 'N/A',
      }));
      
      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users from database');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (id) => {
    try {
      const user = users.find(u => u.id === id);
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      
      await apiClient.put(`/admin/users/${id}`, { status: newStatus });
      
      setUsers(users.map(u => 
        u.id === id 
          ? { ...u, status: newStatus }
          : u
      ));
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiClient.delete(`/admin/users/${id}`);
        setUsers(users.filter(user => user.id !== id));
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user');
      }
    }
  };

  return (
    <DashboardLayout title="USER MANAGEMENT" subtitle="Manage system users and their permissions" navigation={<AdminNavigation />}>
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading users from database...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', borderRadius: '0.5rem', color: '#ff4444', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      {!loading && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#202835',
                border: '1px solid #2a3040',
                borderRadius: '0.5rem',
              }}
            >
              <Search size={18} color="rgba(255, 255, 255, 0.6)" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Users Table */}
          <Card variant="default">
            <CardContent style={{ padding: '0' }}>
              <div
                style={{
                  overflowX: 'auto',
                }}
              >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#202835' }}>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    NAME
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    EMAIL
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    ROLE
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    TOKEN
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    DATE CREATED
                  </th>
                  <th
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      fontSize: '0.75rem',
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid #2a3040',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#202835';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '1rem', color: '#ffffff', fontWeight: '500' }}>{user.name}</td>
                    <td style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '1rem', color: '#ffffff' }}>
                      <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(41, 163, 153, 0.15)', color: '#29a399', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: '500' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: user.status === 'active' ? 'rgba(41, 163, 153, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                          color: user.status === 'active' ? '#29a399' : '#ff4444',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#29a399', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                      {user.token}
                    </td>
                    <td style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {new Date(user.dateCreated).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            minWidth: '90px',
                            backgroundColor: 'transparent',
                            border: `1px solid ${user.status === 'active' ? '#e59019' : '#29a399'}`,
                            color: user.status === 'active' ? '#e59019' : '#29a399',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            fontFamily: "'JetBrains Mono', monospace",
                            transition: 'all 0.2s',
                            letterSpacing: '0.05em',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = user.status === 'active' ? 'rgba(229, 144, 25, 0.15)' : 'rgba(41, 163, 153, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {user.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            minWidth: '70px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ff6b6b',
                            color: '#ff6b6b',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            fontFamily: "'JetBrains Mono', monospace",
                            transition: 'all 0.2s',
                            letterSpacing: '0.05em',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </CardContent>
          </Card>

          {filteredUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              No users found matching your search.
            </div>
          )}
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
