import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';
import AdminNavigation from '../components/AdminNavigation';
import AgentNavigation from '../components/AgentNavigation';
import TechnicianNavigation from '../components/TechnicianNavigation';
import knowledgeCrystalService from '../services/knowledgeCrystalService';
import { Card } from '../components/ui/Card';
import UploadDocumentModal from '../components/UploadDocumentModal';
import AIChatModal from '../components/AIChatModal';

export default function KnowledgeCrystal() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
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
    <button 
      onClick={() => setIsUploadModalOpen(true)}
      style={styles.uploadButton}
    >
      <span style={styles.uploadIcon}>+</span> Upload Document
    </button>
  ) : null;

  return (
    <DashboardLayout
      title="KNOWLEDGE CRYSTAL"
      subtitle={isAdmin ? 'Manage and organize mission documents' : 'Access mission documents and technical resources'}
      navigation={getNavigation()}
      headerActions={headerActions}
    >
      <div className="knowledge-crystal-container" style={styles.container}>
        {/* Search and Filter Section */}
        <div style={styles.searchSection}>
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={styles.searchInput}
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching}
              style={styles.searchButton}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>Category:</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Documents</option>
              <option value="agent">Agent Documents</option>
              <option value="technician">Technician Documents</option>
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No documents found</p>
            {isAdmin && (
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                style={styles.emptyButton}
              >
                Upload your first document
              </button>
            )}
          </div>
        ) : (
          <div style={styles.documentsGrid}>
            {documents.map((doc) => (
              <Card key={doc._id} style={styles.documentCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{doc.title}</h3>
                  <span style={styles.categoryBadge}>
                    {doc.category}
                  </span>
                </div>

                {doc.mission_id && (
                  <p style={styles.cardMeta}>Mission ID: {doc.mission_id}</p>
                )}
                
                {doc.country && (
                  <p style={styles.cardMeta}>Country: {doc.country}</p>
                )}

                {doc.tags && doc.tags.length > 0 && (
                  <div style={styles.tagsContainer}>
                    {doc.tags.map((tag, index) => (
                      <span key={index} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                )}

                {doc.content && (
                  <p style={styles.cardContent}>
                    {doc.content.substring(0, 150)}
                    {doc.content.length > 150 ? '...' : ''}
                  </p>
                )}

                {doc.similarity_score && (
                  <p style={styles.cardMeta}>
                    Relevance: {(doc.similarity_score * 100).toFixed(0)}%
                  </p>
                )}

                <div style={styles.cardActions}>
                  <button 
                    onClick={() => handleDownload(doc._id)}
                    style={styles.downloadButton}
                  >
                    Download
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(doc._id)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* AI Chat Button */}
        <button 
          onClick={() => setIsChatModalOpen(true)}
          style={styles.chatButton}
          title="Chat with AI"
        >
          <span style={styles.chatIcon}>💬</span>
        </button>
      </div>

      {/* Modals */}
      {isUploadModalOpen && (
        <UploadDocumentModal 
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {isChatModalOpen && (
        <AIChatModal 
          onClose={() => setIsChatModalOpen(false)}
          userRole={user?.role}
        />
      )}
    </DashboardLayout>
  );
}

const styles = {
  container: {
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: 'transparent',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#29a399',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  subtitle: {
    color: '#8b92b0',
    margin: '8px 0 0 0',
    fontSize: '0.95rem',
  },
  uploadButton: {
    backgroundColor: '#29a399',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  uploadIcon: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  searchSection: {
    marginBottom: '30px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBar: {
    flex: '1',
    minWidth: '300px',
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: '1',
    padding: '12px 16px',
    backgroundColor: '#1a1f3a',
    border: '1px solid #2d3354',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
  },
  searchButton: {
    backgroundColor: '#e59019',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  filterLabel: {
    color: '#8b92b0',
    fontSize: '0.95rem',
  },
  filterSelect: {
    padding: '10px 16px',
    backgroundColor: '#1a1f3a',
    border: '1px solid #2d3354',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '80px',
  },
  documentCard: {
    backgroundColor: '#1a1f3a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #2d3354',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '10px',
  },
  cardTitle: {
    color: '#29a399',
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#e59019',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardMeta: {
    color: '#8b92b0',
    fontSize: '0.85rem',
    margin: '6px 0',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    margin: '12px 0',
  },
  tag: {
    backgroundColor: '#2d3354',
    color: '#29a399',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
  },
  cardContent: {
    color: '#c5c7d4',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: '12px 0',
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#29a399',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #2d3354',
    borderTop: '4px solid #29a399',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#8b92b0',
    marginTop: '16px',
    fontSize: '1rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '20px',
  },
  emptyText: {
    color: '#8b92b0',
    fontSize: '1.2rem',
  },
  emptyButton: {
    backgroundColor: '#29a399',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
  },
  chatButton: {
    position: 'fixed',
    bottom: '30px',
    left: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#29a399',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(41, 163, 153, 0.4)',
    transition: 'all 0.3s ease',
    zIndex: 1000,
  },
  chatIcon: {
    fontSize: '1.8rem',
  },
};
