import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';
import AdminNavigation from '../components/AdminNavigation';
import AgentNavigation from '../components/AgentNavigation';
import TechnicianNavigation from '../components/TechnicianNavigation';
import knowledgeCrystalService from '../services/knowledgeCrystalService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import UploadDocumentModal from '../components/UploadDocumentModal';

export default function KnowledgeCrystal() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const filters = {
        limit: 50,
        skip: 0,
      };

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      const response = await knowledgeCrystalService.getDocuments(filters);
      setDocuments(response.pages || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    try {
      setIsSearching(true);
      const filters = {};

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      const response = await knowledgeCrystalService.searchDocuments(searchQuery, filters);

      // Convert search results to document format
      const searchDocs = response.results.map(result => ({
        _id: result.document_id,
        title: result.title,
        category: result.category,
        tags: result.tags,
        author: result.author,
        mission_id: result.mission_id,
        country: result.country,
        content: result.long_summary,
        similarity_score: result.similarity_score,
      }));

      setDocuments(searchDocs);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle delete
  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await knowledgeCrystalService.deleteDocument(docId);
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  // Handle download
  const handleDownload = async (docId) => {
    try {
      await knowledgeCrystalService.downloadDocument(docId);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  // Handle upload success
  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false);
    fetchDocuments();
  };

  const getNavigation = () => {
    if (user?.role === 'admin') return <AdminNavigation />;
    if (user?.role === 'agent') return <AgentNavigation />;
    if (user?.role === 'technician') return <TechnicianNavigation />;
    return null;
  };

  const headerActions = isAdmin ? (
    <Button
      onClick={() => setIsUploadModalOpen(true)}
      variant="cyber"
    >
      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Upload Document
    </Button>
  ) : null;

  return (
    <DashboardLayout
      title="KNOWLEDGE CRYSTAL"
      subtitle={isAdmin ? 'Manage and organize mission documents' : 'Access mission documents and technical resources'}
      navigation={getNavigation()}
      headerActions={headerActions}
    >
      <div className="knowledge-crystal-container" style={{ padding: '20px', minHeight: '100vh' }}>
        {/* Search and Filter Section */}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '300px', display: 'flex', gap: '10px' }}>
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              variant="default"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Category:</label>
            <Input
              as="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Documents</option>
              <option value="agent">Agent Documents</option>
              <option value="technician">Technician Documents</option>
            </Input>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>No documents found</p>
            {isAdmin && (
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                variant="cyber"
              >
                Upload your first document
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '80px' }}>
            {documents.map((doc) => (
              <Card key={doc._id} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' }}>
                  <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: '600', margin: 0, flex: 1 }}>{doc.title}</h3>
                  <span style={{ backgroundColor: '#e59019', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
                    {doc.category}
                  </span>
                </div>

                {doc.mission_id && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0' }}>Mission ID: {doc.mission_id}</p>
                )}

                {doc.country && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0' }}>Country: {doc.country}</p>
                )}

                {doc.tags && doc.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0' }}>
                    {doc.tags.map((tag, index) => (
                      <span key={index} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>{tag}</span>
                    ))}
                  </div>
                )}

                {doc.content && (
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5', margin: '12px 0' }}>
                    {doc.content.substring(0, 150)}
                    {doc.content.length > 150 ? '...' : ''}
                  </p>
                )}

                {doc.similarity_score && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0' }}>
                    Relevance: {(doc.similarity_score * 100).toFixed(0)}%
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <Button
                    onClick={() => handleDownload(doc._id)}
                    variant="default"
                    style={{ flex: 1 }}
                  >
                    Download
                  </Button>
                  {isAdmin && (
                    <Button
                      onClick={() => handleDelete(doc._id)}
                      variant="destructive"
                      style={{ flex: 1 }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isUploadModalOpen && (
        <UploadDocumentModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </DashboardLayout>
  );
}
