import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export function useWebSocket(endpoint) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxRetries = 5;
  const retryCount = useRef(0);
  const joinedRoomsRef = useRef(new Set());
  const onReconnectRef = useRef(null);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const joinMission = useCallback((missionId) => {
    sendMessage({ type: 'join_mission', mission_id: missionId });
    joinedRoomsRef.current.add(missionId);
  }, [sendMessage]);

  const leaveMission = useCallback((missionId) => {
    sendMessage({ type: 'leave_mission', mission_id: missionId });
    joinedRoomsRef.current.delete(missionId);
  }, [sendMessage]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('No access token found for WebSocket');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_BASE_URL}${endpoint}?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        const wasReconnect = retryCount.current > 0;
        retryCount.current = 0;
        
        // On reconnection, re-join previously joined rooms
        if (wasReconnect) {
          joinedRoomsRef.current.forEach((missionId) => {
            ws.send(JSON.stringify({ type: 'join_mission', mission_id: missionId }));
          });
          // Trigger rehydration callback so consumers can re-fetch stale data
          if (onReconnectRef.current) {
            onReconnectRef.current();
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [data, ...prev]);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError(err);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Exponential backoff reconnect if we have a token
        const currentToken = localStorage.getItem('access_token');
        if (currentToken && retryCount.current < maxRetries) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          console.log(`Reconnecting in ${timeout}ms...`);
          reconnectTimeoutRef.current = setTimeout(connect, timeout);
          retryCount.current += 1;
        } else if (retryCount.current >= maxRetries) {
          setError(new Error('Max connection retries reached.'));
        }
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setError(err);
    }
  }, [endpoint]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Method to clear accumulated messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Register a reconnection callback for rehydration
  const onReconnect = useCallback((callback) => {
    onReconnectRef.current = callback;
  }, []);

  return {
    messages,
    isConnected,
    error,
    clearMessages,
    setMessages,
    sendMessage,
    joinMission,
    leaveMission,
    onReconnect
  };
}
