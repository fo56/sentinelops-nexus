import React, { useState } from 'react';
import { adminService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function CreateRanger({ onUserCreated }) {
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    age: '',
    maritalStatus: 'single',
    criminalRecord: false,
    healthIssues: false,
    role: 'technician',
  });
  const [createdUser, setCreatedUser] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!createForm.fullName || !createForm.email || !createForm.password || !createForm.age) {
      alert('Please fill in all required fields');
      return;
    }
    
    const age = parseInt(createForm.age);
    if (isNaN(age) || age < 18 || age > 100) {
      alert('Age must be a number between 18 and 100');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Creating user with data:', {
        email: createForm.email,
        fullName: createForm.fullName,
        age: age,
        maritalStatus: createForm.maritalStatus,
        criminalRecord: createForm.criminalRecord,
        healthIssues: createForm.healthIssues,
        role: createForm.role
      });
      
      // Call actual API
      const result = await adminService.createRangerUser(
        createForm.email,
        createForm.password,
        createForm.fullName,
        age,
        createForm.maritalStatus,
        createForm.criminalRecord,
        createForm.healthIssues,
        createForm.role
      );
      
      console.log('User created response:', result);
      
      setCreatedUser({
        email: result.email,
        fullName: result.full_name,
        age: age,
        maritalStatus: createForm.maritalStatus,
        criminalRecord: createForm.criminalRecord,
        healthIssues: createForm.healthIssues,
        role: result.role,
        qr_token: result.qr_token,
        qr_expires_at: result.qr_token_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        qr_image_url: result.qr_image_url
      });
      setShowQR(true);
      setCreateForm({ email: '', password: '', fullName: '', age: '', maritalStatus: 'single', criminalRecord: false, healthIssues: false, role: 'technician' });
      
      // Call parent callback if provided
      if (onUserCreated) {
        onUserCreated(result);
      }
    } catch (err) {
      console.error('Failed to create user:', err);
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    console.log('Download QR clicked');
    console.log('createdUser:', createdUser);
    console.log('qr_image_url exists:', !!createdUser?.qr_image_url);
    
    if (createdUser?.qr_image_url) {
      try {
        const link = document.createElement('a');
        // qr_image_url already contains the data:image/png;base64, prefix
        link.href = createdUser.qr_image_url;
        link.download = `qr-${createdUser.email}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('QR download triggered');
      } catch (err) {
        console.error('Error downloading QR:', err);
        alert(`Failed to download QR: ${err.message}`);
      }
    } else {
      console.error('QR code image not available in createdUser:', createdUser);
      alert('QR code image not available. Please try creating the user again.');
    }
  };

  const handleCopyQRToken = () => {
    navigator.clipboard.writeText(createdUser?.qr_token);
    alert('QR token copied to clipboard!');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1rem' }}>
      {createdUser && showQR && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          animation: 'fadeIn 0.3s ease',
        }}>
          <Card variant="default" style={{
            maxWidth: '500px',
            width: '90%',
            padding: '2rem',
            animation: 'slideUp 0.3s ease',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '400', margin: '0 0 1.5rem 0', color: '#29a399', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              User Created Successfully
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              {createdUser.qr_image_url && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img
                    src={createdUser.qr_image_url}
                    alt="QR Code"
                    style={{ maxWidth: '200px', height: 'auto' }}
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.25rem 0' }}>
                    <strong>Email:</strong>
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', color: '#ffffff', margin: '0' }}>
                    {createdUser.email}
                  </p>
                </div>
                
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.25rem 0' }}>
                    <strong>Role:</strong>
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', color: '#ffffff', margin: '0', textTransform: 'capitalize' }}>
                    {createdUser.role}
                  </p>
                </div>
                
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.25rem 0' }}>
                    <strong>QR Expires:</strong>
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem', color: '#ffffff', margin: '0' }}>
                    {new Date(createdUser.qr_expires_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 0.5rem 0' }}>
                    <strong>QR Token:</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <code style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#0c0e12',
                      border: '1px solid #2a3040',
                      borderRadius: '0.375rem',
                      color: '#29a399',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.8rem',
                      wordBreak: 'break-all',
                    }}>
                      {createdUser.qr_token}
                    </code>
                    <Button
                      onClick={handleCopyQRToken}
                      variant="default"
                      size="sm"
                      style={{
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                onClick={handleDownloadQR}
                variant="default"
                size="default"
                style={{
                  flex: 1,
                }}
              >
                Download QR Code
              </Button>
              <Button
                onClick={() => setShowQR(false)}
                variant="outline"
                size="default"
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                }}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card variant="default" style={{
        maxWidth: '520px',
        margin: '0 auto',
        padding: '1.5rem',
        animation: 'slideUp 0.3s ease',
      }}>
        <form onSubmit={handleCreateUser}>
          {/* Email and Full Name Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.5rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Email Address
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="ranger@sentinelops.com"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #3a4050',
                  borderRadius: '0.375rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '300',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#29a399';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(85, 125, 120, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3a4050';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.5rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Full Name
              </label>
              <input
                type="text"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                placeholder="John Ranger"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #3a4050',
                  borderRadius: '0.375rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '300',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#29a399';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(85, 125, 120, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3a4050';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Row */}
          <div style={{ marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.5rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Password
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #3a4050',
                  borderRadius: '0.375rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '300',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#29a399';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(85, 125, 120, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3a4050';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.75rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              Role
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="role-technician"
                  checked={createForm.role === 'technician'}
                  onChange={() => setCreateForm({ ...createForm, role: 'technician' })}
                  disabled={loading}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#29a399',
                  }}
                />
                <label htmlFor="role-technician" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Technician
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="role-agent"
                  checked={createForm.role === 'agent'}
                  onChange={() => setCreateForm({ ...createForm, role: 'agent' })}
                  disabled={loading}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#29a399',
                  }}
                />
                <label htmlFor="role-agent" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Agent
                </label>
              </div>
            </div>
          </div>

          {/* Age Row */}
          <div style={{ marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.5rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Age
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={createForm.age}
                onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
                placeholder="Age (18-100)"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #3a4050',
                  borderRadius: '0.375rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '300',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#29a399';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(85, 125, 120, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3a4050';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Marital Status Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '400', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.75rem', letterSpacing: '0.5px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              Marital Status
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="status-single"
                  checked={createForm.maritalStatus === 'single'}
                  onChange={() => setCreateForm({ ...createForm, maritalStatus: 'single' })}
                  disabled={loading}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#29a399',
                  }}
                />
                <label htmlFor="status-single" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Single
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="status-married"
                  checked={createForm.maritalStatus === 'married'}
                  onChange={() => setCreateForm({ ...createForm, maritalStatus: 'married' })}
                  disabled={loading}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#29a399',
                  }}
                />
                <label htmlFor="status-married" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  Married
                </label>
              </div>
            </div>
          </div>

          {/* Checkboxes Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="criminalRecord"
                checked={createForm.criminalRecord}
                onChange={(e) => setCreateForm({ ...createForm, criminalRecord: e.target.checked })}
                disabled={loading}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#29a399',
                }}
              />
              <label htmlFor="criminalRecord" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Has Criminal Record
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="healthIssues"
                checked={createForm.healthIssues}
                onChange={(e) => setCreateForm({ ...createForm, healthIssues: e.target.checked })}
                disabled={loading}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#29a399',
                }}
              />
              <label htmlFor="healthIssues" style={{ fontSize: '0.9rem', fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                Has Health Issues
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            style={{ width: '100%' }}
          >
            {loading ? 'Creating...' : 'Create User & Generate QR'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
