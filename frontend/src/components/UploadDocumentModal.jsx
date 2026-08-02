import { useState } from 'react';
import knowledgeCrystalService from '../services/knowledgeCrystalService';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Label } from './ui/Label';

export default function UploadDocumentModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'agent',
    mission_id: '',
    country: '',
    tags: '',
    file: null,
  });
  const [fileContent, setFileContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData({ ...formData, file });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.file || !fileContent) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);

      const uploadData = {
        title: formData.title,
        file_content: fileContent,
        category: formData.category,
        description: formData.description,
        mission_id: formData.mission_id,
        country: formData.country,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        uploaded_by: 'admin',
        metadata: {
          original_filename: formData.file.name,
          file_size: formData.file.size,
          file_type: formData.file.type,
          description: formData.description,
        },
      };

      await knowledgeCrystalService.uploadDocument(uploadData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Upload Document" 
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{ backgroundColor: '#dc3545', color: 'white', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Label>Document Title <span style={{ color: '#dc3545' }}>*</span></Label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter document title"
            required
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Label>Short Description</Label>
          <Input
            as="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the document"
            rows="3"
          />
        </div>

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Label>Category <span style={{ color: '#dc3545' }}>*</span></Label>
          <Input
            as="select"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            <option value="agent">Agent - Mission Documents</option>
            <option value="technician">Technician - Technical Documentation</option>
          </Input>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {formData.category === 'agent' 
              ? 'Mission-related documents for agents' 
              : 'Technical documentation for technicians'}
          </p>
        </div>

        {/* Mission ID (for agent documents) */}
        {formData.category === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Label>Mission ID (Optional)</Label>
            <Input
              type="text"
              value={formData.mission_id}
              onChange={(e) => setFormData({ ...formData, mission_id: e.target.value })}
              placeholder="e.g., MISSION-2024-001"
            />
          </div>
        )}

        {/* Country (for agent documents) */}
        {formData.category === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Label>Country (Optional)</Label>
            <Input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="e.g., USA, UK, France"
            />
          </div>
        )}

        {/* Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Label>Tags (Optional)</Label>
          <Input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Enter tags separated by commas (e.g., urgent, classified, technical)"
          />
        </div>

        {/* File Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Label>Upload File <span style={{ color: '#dc3545' }}>*</span></Label>
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx,.md"
            required
            style={{ padding: '8px' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Supported formats: TXT, PDF, JPG, PNG, DOC, DOCX, MD
          </p>
          {formData.file && (
            <p style={{ color: 'var(--primary)', fontSize: '0.9rem', margin: 0 }}>
              Selected: {formData.file.name}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={uploading}
            style={{ flex: 1 }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
