import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function RaiseIssueModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assetId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setValidationError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setValidationError('Description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ title: '', description: '', priority: 'medium', assetId: '' });
      setValidationError('');
      onClose();
    } catch (error) {
      setValidationError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 50,
      animation: 'fadeIn 0.2s ease-out',
    },
    modal: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    container: {
      backgroundColor: 'var(--bg-primary)',
      borderRadius: '0.5rem',
      border: '1px solid var(--border-color)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      maxWidth: '32rem',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.5rem',
      borderBottom: '1px solid var(--border-color)',
    },
    title: {
      fontFamily: 'monospace',
      fontSize: '1.125rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
      letterSpacing: '0.05em',
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      padding: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'color 0.2s ease',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    label: {
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: 'var(--text-primary)',
      letterSpacing: '0.05em',
    },
    input: {
      padding: '0.75rem',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: '0.375rem',
      color: 'var(--text-primary)',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
    },
    textarea: {
      padding: '0.75rem',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: '0.375rem',
      color: 'var(--text-primary)',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      resize: 'none',
      minHeight: '4rem',
      transition: 'all 0.2s ease',
    },
    select: {
      padding: '0.75rem',
      backgroundColor: 'var(--bg-tertiary)',
      border: '1px solid var(--border-color)',
      borderRadius: '0.375rem',
      color: 'var(--text-primary)',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
    },
    errorBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      backgroundColor: 'rgba(217, 74, 74, 0.1)',
      border: '1px solid rgba(217, 74, 74, 0.3)',
      borderRadius: '0.375rem',
      color: '#d94a4a',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
    },
    footer: {
      display: 'flex',
      gap: '0.75rem',
      padding: '1.5rem',
      borderTop: '1px solid var(--border-color)',
    },
    button: {
      flex: 1,
      padding: '0.75rem 1rem',
      borderRadius: '0.375rem',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
      letterSpacing: '0.05em',
    },
    cancelButton: {
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
    },
    submitButton: {
      backgroundColor: 'var(--primary)',
      color: 'var(--text-inverse)',
    },
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={styles.overlay}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={styles.modal}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.title}>RAISE NEW ISSUE</h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                ...styles.closeButton,
                opacity: isSubmitting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Error Message */}
            {validationError && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Title Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>TITLE *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Issue title"
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(41, 163, 153, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Description Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>DESCRIPTION *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the issue in detail"
                disabled={isSubmitting}
                style={{
                  ...styles.textarea,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(41, 163, 153, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Priority Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>PRIORITY</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  ...styles.select,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(41, 163, 153, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
              </select>
            </div>

            {/* Asset ID Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>ASSET ID (Optional)</label>
              <input
                type="text"
                name="assetId"
                value={formData.assetId}
                onChange={handleChange}
                placeholder="Asset identifier"
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(41, 163, 153, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </form>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                ...styles.button,
                ...styles.cancelButton,
                opacity: isSubmitting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                ...styles.button,
                ...styles.submitButton,
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'rgba(41, 163, 153, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
              }}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT ISSUE'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
