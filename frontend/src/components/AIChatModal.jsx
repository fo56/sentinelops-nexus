import { useState, useRef, useEffect } from 'react';
import knowledgeCrystalService from '../services/knowledgeCrystalService';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export default function AIChatModal({ onClose, userRole }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your Knowledge Crystal AI assistant. I can help you find information from all uploaded documents. ${
        userRole === 'agent' 
          ? 'Ask me about mission documents, previous operations, or country-specific information.' 
          : userRole === 'technician'
          ? 'Ask me about technical documentation, equipment setup, or troubleshooting guides.'
          : 'Ask me anything about the documents in the knowledge base.'
      }`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    // Add empty assistant message that will be populated
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      setIsLoading(true);

      let user_role = 'agent';
      if (userRole === 'agent') {
        user_role = 'agent';
      } else if (userRole === 'technician') {
        user_role = 'technician';
      }

      let aiResponseContent = '';
      let matchedDocs = [];

      await knowledgeCrystalService.chatWithAI({
        query: userMessage,
        user_role: user_role,
        limit: 5,
      }, (chunk) => {
        if (chunk.type === 'sources') {
          matchedDocs = chunk.data;
        } else if (chunk.type === 'content') {
          aiResponseContent += chunk.data;
          
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: aiResponseContent
            };
            return newMessages;
          });
        } else if (chunk.type === 'error') {
          console.error("Stream error:", chunk.data);
        } else if (chunk.type === 'done') {
          // Stream finished, append sources if any
          if (matchedDocs.length > 0) {
            let finalContent = aiResponseContent + '\n\n**Sources:**\n';
            matchedDocs.forEach((doc, index) => {
              finalContent += `${index + 1}. ${doc.title || 'Untitled Document'}\n`;
            });
            
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: finalContent
              };
              return newMessages;
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="AI Assistant" 
      subtitle="Chat with Knowledge Crystal"
      bodyStyle={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: 0 }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '12px',
                alignItems: 'flex-start',
                backgroundColor: message.role === 'user' ? 'var(--primary)' : 'var(--bg-secondary)',
                color: message.role === 'user' ? 'var(--text-inverse)' : 'var(--text-primary)',
                border: message.role === 'user' ? 'none' : '1px solid var(--border-color)',
              }}
            >
              {message.role === 'assistant' && (
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: '1.5rem' }}></span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                {message.content.split('\n').map((line, i) => {
                  const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  return (
                    <p 
                      key={i} 
                      style={{ margin: '4px 0', lineHeight: '1.5' }}
                      dangerouslySetInnerHTML={{ __html: formattedLine }}
                    />
                  );
                })}
              </div>
              {message.role === 'user' && (
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: '1.5rem' }}></span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start' }}>
            <div style={{
              display: 'flex', gap: '12px', maxWidth: '80%', padding: '12px 16px', borderRadius: '12px',
              alignItems: 'flex-start', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ flexShrink: 0 }}>
                <span style={{ fontSize: '1.5rem' }}></span>
              </div>
              <div className="loading-dots" style={{ display: 'flex', gap: '4px', padding: '8px' }}>
                <span>•</span><span>•</span><span>•</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
        <Input
          as="textarea"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about the documents..."
          rows="3"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={!inputMessage.trim() || isLoading}
          style={{ alignSelf: 'flex-end' }}
        >
          {isLoading ? '...' : 'Send'}
        </Button>
      </div>
    </Modal>
  );
}

// Add CSS animation for loading dots
if (typeof document !== 'undefined' && !document.getElementById('loading-dots-style')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'loading-dots-style';
  styleSheet.textContent = `
    @keyframes blink {
      0%, 20% { opacity: 0.2; }
      40% { opacity: 1; }
      100% { opacity: 0.2; }
    }
    .loading-dots span {
      animation: blink 1.4s infinite;
    }
    .loading-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }
    .loading-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }
  `;
  document.head.appendChild(styleSheet);
}
