import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, AlertTriangle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import SentinelLogo from '../components/SentinelLogo';
import GridBackground from '../components/GridBackground';
import { useAuth } from '../hooks/useAuth';


/**
 * Reusable login form component for both admin and ranger password flows.
 * Accepts field configuration and renders a consistent form layout.
 */
function LoginForm({ fields, onSubmit, isLoading, submitLabel, submitStyle, showPassword, onTogglePassword }) {
  return (
    <form onSubmit={onSubmit} className="login-form">
      {fields.map((field) => (
        <div key={field.name} className="login-form-group">
          <label className="login-label">
            {field.icon}
            {field.label}
          </label>
          {field.type === 'password' ? (
            <div className="login-password-wrapper">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={field.placeholder}
                value={field.value}
                onChange={field.onChange}
                required
              />
              <button type="button" onClick={onTogglePassword} className="login-password-toggle">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          ) : (
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={field.value}
              onChange={field.onChange}
              required
            />
          )}
        </div>
      ))}

      <Button type="submit" variant={submitStyle?.variant || 'cyber'} size="xl" style={{ width: '100%', ...submitStyle?.css }} disabled={isLoading}>
        {isLoading ? (
          <span className="login-btn-content">
            <div className="login-spinner" />
            AUTHENTICATING...
          </span>
        ) : (
          <span className="login-btn-content">
            {submitLabel}
            <ChevronRight size={18} />
          </span>
        )}
      </Button>
    </form>
  );
}


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

  const resetForm = () => {
    setError('');
    setUsername('');
    setPassword('');
    setEmail('');
    setQrToken('');
  };

  const routeByRole = (response, fallbackRole) => {
    const userRole = response?.role || fallbackRole;
    const routes = {
      admin: '/admin/dashboard',
      technician: '/technician/dashboard',
      agent: '/agent/dashboard',
    };
    navigate(routes[userRole] || '/ranger/dashboard');
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const credentials = selectedRole === 'ranger' ? email : username;
      const isRanger = selectedRole === 'ranger';
      const response = await login(credentials, password, isRanger);
      
      if (selectedRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        routeByRole(response, 'ranger');
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
      routeByRole(response, 'ranger');
    } catch (err) {
      setError(err.message || 'QR authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = selectedRole === 'ranger' ? '#29a399' : '#e59019';

  // Field configurations for the shared LoginForm component
  const adminFields = [
    { name: 'username', label: 'ADMIN IDENTIFIER', type: 'text', placeholder: 'admin@sentinelops.com', icon: <User size={12} />, value: username, onChange: (e) => setUsername(e.target.value) },
    { name: 'password', label: 'MASTER ACCESS KEY', type: 'password', placeholder: 'Enter password', icon: <Lock size={12} />, value: password, onChange: (e) => setPassword(e.target.value) },
  ];

  const rangerFields = [
    { name: 'email', label: 'EMAIL ADDRESS', type: 'email', placeholder: 'ranger@sentinelops.com', icon: <User size={12} />, value: email, onChange: (e) => setEmail(e.target.value) },
    { name: 'password', label: 'ACCESS KEY', type: 'password', placeholder: 'Enter password', icon: <Lock size={12} />, value: password, onChange: (e) => setPassword(e.target.value) },
  ];

  return (
    <div className="login-container">
      <GridBackground />

      <div className="login-wrapper">
        <div className="login-logo">
          <SentinelLogo size="lg" />
        </div>

        <div className="login-status">
          <div className="login-status-dot" style={{ backgroundColor: statusColor }} />
          <span className="login-status-text">
            {selectedRole === 'ranger' ? 'RANGER OPERATIONS CHANNEL' : 'SECURE ADMIN CHANNEL'}
          </span>
        </div>

        <Card variant="elevated" className="login-card">
          <CardHeader className="login-card-header">
            <CardTitle className="login-card-title">AUTHENTICATION REQUIRED</CardTitle>
            <CardDescription className="login-card-description">
              Select your access level and enter credentials
            </CardDescription>
          </CardHeader>

          <CardContent className="login-card-content">
            {/* Role Selection */}
            <div className="login-role-grid">
              <button
                type="button"
                onClick={() => { setSelectedRole('ranger'); setLoginMethod('password'); resetForm(); }}
                className={`login-role-btn ${selectedRole === 'ranger' ? 'active-ranger' : ''}`}
              >
                <Shield
                  size={24}
                  color={selectedRole === 'ranger' ? 'var(--primary)' : 'var(--text-secondary)'}
                  className="login-role-icon"
                />
                <span className={`login-role-label ${selectedRole === 'ranger' ? 'active-ranger' : ''}`}>RANGER</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('admin'); setLoginMethod('password'); resetForm(); }}
                className={`login-role-btn admin-hover ${selectedRole === 'admin' ? 'active-admin' : ''}`}
              >
                <AlertTriangle
                  size={24}
                  color={selectedRole === 'admin' ? '#e59019' : 'var(--text-secondary)'}
                  className="login-role-icon"
                />
                <span className={`login-role-label ${selectedRole === 'admin' ? 'active-admin' : ''}`}>ADMIN</span>
              </button>
            </div>

            {/* Ranger-only: Login method toggle */}
            {selectedRole === 'ranger' && (
              <div className="login-method-toggle">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setError(''); }}
                  className={`login-method-btn ${loginMethod === 'password' ? 'active' : ''}`}
                >
                  EMAIL + PASSWORD
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('qr'); setError(''); }}
                  className={`login-method-btn ${loginMethod === 'qr' ? 'active' : ''}`}
                >
                  QR CODE
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="login-error">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} className="login-error-close">×</button>
              </div>
            )}

            {/* Admin login form */}
            {selectedRole === 'admin' && (
              <LoginForm
                fields={adminFields}
                onSubmit={handlePasswordLogin}
                isLoading={isLoading}
                submitLabel="GRANT ADMIN ACCESS"
                submitStyle={{ variant: 'default', css: { backgroundColor: '#e59019', color: '#000' } }}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            )}

            {/* Ranger password login form */}
            {selectedRole === 'ranger' && loginMethod === 'password' && (
              <LoginForm
                fields={rangerFields}
                onSubmit={handlePasswordLogin}
                isLoading={isLoading}
                submitLabel="INITIATE ACCESS"
                submitStyle={{ variant: 'cyber' }}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            )}

            {/* Ranger QR login form */}
            {selectedRole === 'ranger' && loginMethod === 'qr' && (
              <form onSubmit={handleQRLogin} className="login-form">
                <div className="login-form-group">
                  <label className="login-label">QR TOKEN / SCAN CODE</label>
                  <Input
                    type="text"
                    placeholder="Paste QR token here or scan"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    required
                  />
                </div>

                <div className="login-qr-info">
                  Scan your QR code using your device camera
                  <br />
                  <span className="login-qr-demo">Demo token: RANGER-QR-TOKEN</span>
                </div>

                <Button type="submit" variant="cyber" size="xl" style={{ width: '100%' }} disabled={isLoading}>
                  {isLoading ? (
                    <span className="login-btn-content">
                      <div className="login-spinner" />
                      SCANNING...
                    </span>
                  ) : (
                    <span className="login-btn-content">
                      AUTHENTICATE VIA QR
                      <ChevronRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="login-footer">SENTINEL OPS v2.4.1 // CLASSIFIED ACCESS</p>
      </div>
    </div>
  );
}
