import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Shield, User, Bell } from 'lucide-react';
import SentinelLogo from './SentinelLogo';
import GridBackground from './GridBackground';
import { useAuth } from '../hooks/useAuth';

export default function DashboardLayout({ children, title, subtitle, navigation, headerActions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/ranger/dashboard';
  const isOnDashboard = location.pathname === dashboardPath;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative'
    }}>
      <GridBackground />
      
      {/* Top Navigation Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#0c0e12',
        backdropFilter: 'blur(10px)',
        backgroundImage: 'linear-gradient(rgba(41, 163, 153, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(41, 163, 153, 0.04) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 1rem',
          height: '4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        }}>
          {/* Left Side - Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <Link to={dashboardPath} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <SentinelLogo size="sm" showText={true} />
            </Link>
          </div>

          {/* Right Side - Notifications, User Info, Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* Notifications Button */}
            <Link
              to="/notifications"
              style={{
                position: 'relative',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.3s ease',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            >
              <Bell size={18} />
              <div style={{
                position: 'absolute',
                top: '0.25rem',
                right: '0.25rem',
                width: '0.5rem',
                height: '0.5rem',
                backgroundColor: 'var(--accent-amber)',
                borderRadius: '50%'
              }} />
            </Link>

            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(41, 163, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {user?.role === 'admin' ? (
                  <Shield size={16} style={{ color: 'var(--accent-amber)' }} />
                ) : (
                  <User size={16} style={{ color: 'var(--primary)' }} />
                )}
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  margin: 0
                }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button - No Box */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgba(255, 68, 68, 0.6)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.3s ease',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 68, 68, 0.85)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 68, 68, 0.6)';
              }}
            >
              <LogOut size={16} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div style={{
        backgroundColor: '#0c0e12',
        position: 'relative',
        zIndex: 10,
        backgroundImage: 'linear-gradient(rgba(41, 163, 153, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(41, 163, 153, 0.08) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.75rem',
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.3)',
                marginTop: '0.1rem',
                margin: 0
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Bar - Full width below title */}
      {navigation && (
        <div style={{
          backgroundColor: '#0c0e12',
          position: 'relative',
          zIndex: 10,
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          backgroundImage: 'linear-gradient(rgba(41, 163, 153, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(41, 163, 153, 0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 1rem',
            position: 'relative',
            zIndex: 10,
            width: '100%'
          }}>
            {navigation}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem 1rem',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        flex: 1
      }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '1rem',
        marginTop: 'auto',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: 0
          }}>
            SENTINEL OPS // SECURE CHANNEL
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              backgroundColor: '#29a399',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              ONLINE
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
