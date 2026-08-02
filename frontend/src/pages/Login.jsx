import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, AlertTriangle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import SentinelLogo from '../components/SentinelLogo';
import GridBackground from '../components/GridBackground';
import { useAuth } from '../hooks/useAuth';

const baseStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    position: 'relative',
    backgroundColor: 'var(--bg-primary)',
  },
  wrapper: {
    width: '100%',
    maxWidth: '32rem',
    zIndex: 10,
    position: 'relative',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
    animation: 'fadeIn 0.6s ease-out',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    animation: 'fadeIn 0.6s ease-out 0.1s both',
  },
  statusDot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: '50%',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  statusText: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    letterSpacing: '0.1em',
  },
  card: {
    animation: 'fadeIn 0.6s ease-out 0.2s both',
  },
  cardHeader: {
    textAlign: 'center',
    paddingBottom: '1rem',
  },
  cardTitle: {
    fontFamily: 'monospace',
    fontSize: '1.125rem',
    letterSpacing: '0.05em',
  },
  cardDescription: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  roleButton: (isSelected, color) => ({
    padding: '1rem',
    borderRadius: '0.5rem',
    border: `1px solid ${isSelected ? color : 'var(--border-color)'}`,
    backgroundColor: isSelected ? `${color}15` : 'var(--bg-tertiary)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    boxShadow: isSelected ? `0 0 10px ${color}33` : 'none',
  }),
  roleIcon: {
    margin: '0 auto 0.5rem',
    display: 'block',
  },
  roleLabel: (isSelected, color) => ({
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    display: 'block',
    color: isSelected ? color : 'var(--text-secondary)',
  }),
  loginMethodToggle: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
  },
  methodButton: (isActive) => ({
    padding: '0.5rem',
    borderRadius: '0.25rem',
    border: 'none',
    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
    color: isActive ? '#000' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  }),
  errorBox: {
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '0.5rem',
    color: '#ff4444',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    letterSpacing: '0.1em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInfo: {
    padding: '1rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    animation: 'fadeIn 0.6s ease-out 0.3s both',
  },
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('ranger');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, qrLogin } = useAuth();
  const navigate = useNavigate();
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const credentials = selectedRole === 'ranger' ? email : username;
      const isRanger = selectedRole === 'ranger';
      const response = await login(credentials, password, isRanger);
      
      // Route based on user role from database
      if (selectedRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        // Check user role to determine dashboard
        const userRole = response?.role || 'ranger';
        if (userRole === 'technician') {
          navigate('/technician/dashboard');
        } else if (userRole === 'agent') {
          navigate('/agent/dashboard');
        } else {
          navigate('/ranger/dashboard'); // fallback for legacy 'ranger' role
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed: Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!qrToken.trim()) {
      setError('Please enter or scan QR code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await qrLogin(qrToken);
      
      // Route based on user role from database
      const userRole = response?.role || 'ranger';
      if (userRole === 'technician') {
        navigate('/technician/dashboard');
      } else if (userRole === 'agent') {
        navigate('/agent/dashboard');
      } else {
        navigate('/ranger/dashboard'); // fallback for legacy 'ranger' role
      }
    } catch (err) {
      setError(err.message || 'QR authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const rangerColor = 'var(--primary)';
  const adminColor = '#e59019';
  const statusColor = selectedRole === 'ranger' ? '#29a399' : '#e59019';

  return (
    <div style={baseStyles.container}>
      <GridBackground />

      <div style={baseStyles.wrapper}>
        {/* Logo */}
        <div style={baseStyles.logo}>
          <SentinelLogo size="lg" />
        </div>

        {/* Status indicator */}
        <div style={baseStyles.statusIndicator}>
          <div style={{ ...baseStyles.statusDot, backgroundColor: statusColor }} />
          <span style={baseStyles.statusText}>
            {selectedRole === 'ranger' ? 'RANGER OPERATIONS CHANNEL' : 'SECURE ADMIN CHANNEL'}
          </span>
        </div>

        {/* Card */}
        <Card variant="elevated" style={baseStyles.card}>
          <CardHeader style={baseStyles.cardHeader}>
            <CardTitle style={baseStyles.cardTitle}>AUTHENTICATION REQUIRED</CardTitle>
            <CardDescription style={baseStyles.cardDescription}>
              Select your access level and enter credentials
            </CardDescription>
          </CardHeader>

          <CardContent style={baseStyles.cardContent}>
            {/* Role Selection */}
            <div style={baseStyles.roleGrid}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ranger');
                  setLoginMethod('password');
                  setError('');
                  setUsername('');
                  setPassword('');
                  setEmail('');
                  setQrToken('');
                }}
                style={baseStyles.roleButton(selectedRole === 'ranger', rangerColor)}
                onMouseEnter={(e) => {
                  if (selectedRole !== 'ranger') {
                    e.currentTarget.style.borderColor = rangerColor;
                    e.currentTarget.style.backgroundColor = 'rgba(41, 163, 153, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRole !== 'ranger') {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }
                }}
              >
                <Shield
                  size={24}
                  color={selectedRole === 'ranger' ? 'var(--primary)' : 'var(--text-secondary)'}
                  style={baseStyles.roleIcon}
                />
                <span style={baseStyles.roleLabel(selectedRole === 'ranger', rangerColor)}>RANGER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setLoginMethod('password');
                  setError('');
                  setUsername('');
                  setPassword('');
                  setEmail('');
                  setQrToken('');
                }}
                style={baseStyles.roleButton(selectedRole === 'admin', adminColor)}
                onMouseEnter={(e) => {
                  if (selectedRole !== 'admin') {
                    e.currentTarget.style.borderColor = adminColor;
                    e.currentTarget.style.backgroundColor = 'rgba(229, 144, 25, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRole !== 'admin') {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }
                }}
              >
                <AlertTriangle
                  size={24}
                  color={selectedRole === 'admin' ? '#e59019' : 'var(--text-secondary)'}
                  style={baseStyles.roleIcon}
                />
                <span style={baseStyles.roleLabel(selectedRole === 'admin', adminColor)}>ADMIN</span>
              </button>
            </div>

            {/* Ranger-only: Login method toggle */}
            {selectedRole === 'ranger' && (
              <div style={baseStyles.loginMethodToggle}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setError('');
                  }}
                  style={baseStyles.methodButton(loginMethod === 'password')}
                >
                  EMAIL + PASSWORD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('qr');
                    setError('');
                  }}
                  style={baseStyles.methodButton(loginMethod === 'qr')}
                >
                  QR CODE
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={baseStyles.errorBox}>
                <span> {error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Admin login form */}
            {selectedRole === 'admin' && (
              <form onSubmit={handlePasswordLogin} style={baseStyles.form}>
                <div style={baseStyles.formGroup}>
                  <label style={baseStyles.label}>
                    <User size={12} />
                    ADMIN IDENTIFIER
                  </label>
                  <Input
                    type="text"
                    placeholder="admin@sentinelops.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div style={baseStyles.formGroup}>
                  <label style={baseStyles.label}>
                    <Lock size={12} />
                    MASTER ACCESS KEY
                  </label>
                  <div style={baseStyles.passwordWrapper}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={baseStyles.passwordToggle}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="xl"
                  style={{
                    width: '100%',
                    backgroundColor: '#e59019',
                    color: '#000',
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1rem', height: '1rem', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      AUTHENTICATING...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      GRANT ADMIN ACCESS
                      <ChevronRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Ranger password login form */}
            {selectedRole === 'ranger' && loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} style={baseStyles.form}>
                <div style={baseStyles.formGroup}>
                  <label style={baseStyles.label}>
                    <User size={12} />
                    EMAIL ADDRESS
                  </label>
                  <Input
                    type="email"
                    placeholder="ranger@sentinelops.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={baseStyles.formGroup}>
                  <label style={baseStyles.label}>
                    <Lock size={12} />
                    ACCESS KEY
                  </label>
                  <div style={baseStyles.passwordWrapper}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={baseStyles.passwordToggle}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="cyber" size="xl" style={{ width: '100%' }} disabled={isLoading}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1rem', height: '1rem', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      AUTHENTICATING...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      INITIATE ACCESS
                      <ChevronRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Ranger QR login form */}
            {selectedRole === 'ranger' && loginMethod === 'qr' && (
              <form onSubmit={handleQRLogin} style={baseStyles.form}>
                <div style={baseStyles.formGroup}>
                  <label style={baseStyles.label}>QR TOKEN / SCAN CODE</label>
                  <Input
                    type="text"
                    placeholder="Paste QR token here or scan"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    required
                  />
                </div>

                <div style={baseStyles.qrInfo}>
                   Scan your QR code using your device camera
                  <br />
                  <span style={{ fontSize: '0.65rem', marginTop: '0.5rem', display: 'block' }}>
                    Demo token: RANGER-QR-TOKEN
                  </span>
                </div>

                <Button type="submit" variant="cyber" size="xl" style={{ width: '100%' }} disabled={isLoading}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1rem', height: '1rem', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      SCANNING...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      AUTHENTICATE VIA QR
                      <ChevronRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p style={baseStyles.footer}>SENTINEL OPS v2.4.1 // CLASSIFIED ACCESS</p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
