import React, { useState, useEffect, useRef } from 'react';
/**
 * NotificationCenter Component
 * Phase 4: Real-time Notification System
 */
const NotificationCenter = ({ userId, onClose }) => {
 const [notifications, setNotifications] = useState([]);
 const [unreadCount, setUnreadCount] = useState(0);
 const [filter, setFilter] = useState('all'); // all, unread, read
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const wsRef = useRef(null);
 const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
 const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
 useEffect(() => {
 // Only fetch and connect if user is authenticated
 const token = localStorage.getItem('access_token');
 if (!token) {
 console.log('Not authenticated, skipping notifications');
 setLoading(false);
 return;
 }
 
 // Fetch initial notifications
 fetchNotifications();
 // Connect to WebSocket for real-time updates
 connectWebSocket();
 return () => {
 if (wsRef.current) {
 wsRef.current.close();
 }
 };
 }, [userId]);
 const fetchNotifications = async () => {
 setLoading(true);
 setError('');
 try {
 const response = await fetch(
 `${API_BASE_URL}/api/notifications`,
 {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
 },
 }
 );
 if (!response.ok) throw new Error('Failed to fetch notifications');
 const data = await response.json();
 setNotifications(data.notifications);
 setUnreadCount(data.unread_count);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };
 const connectWebSocket = () => {
 const token = localStorage.getItem('access_token');
 if (!token) {
 console.error('No access token found');
 return;
 }
 const wsUrl = `${WS_BASE_URL}/ws/notifications?token=${token}`;
 try {
 wsRef.current = new WebSocket(wsUrl);
 wsRef.current.onopen = () => {
 console.log('WebSocket connected');
 };
 wsRef.current.onmessage = (event) => {
 const newNotification = JSON.parse(event.data);
 setNotifications(prev => [newNotification, ...prev]);
 setUnreadCount(prev => prev + 1);
 };
 wsRef.current.onerror = (error) => {
 console.error('WebSocket error:', error);
 };
 wsRef.current.onclose = () => {
 console.log('WebSocket disconnected');
 // Only attempt to reconnect if still authenticated
 const token = localStorage.getItem('access_token');
 if (token) {
 setTimeout(() => connectWebSocket(), 5000);
 }
 };
 } catch (err) {
 console.error('Failed to connect WebSocket:', err);
 }
 };
 const handleMarkAsRead = async (notificationId) => {
 try {
 const response = await fetch(
 `${API_BASE_URL}/api/notifications/${notificationId}/read`,
 {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
 },
 }
 );
 if (!response.ok) throw new Error('Failed to mark as read');
 setNotifications(prev =>
 prev.map(notif =>
 notif.id === notificationId
 ? { ...notif, is_read: true }
 : notif
 )
 );
 setUnreadCount(prev => Math.max(0, prev - 1));
 } catch (err) {
 console.error('Error marking as read:', err);
 }
 };
 const handleDelete = async (notificationId) => {
 try {
 const response = await fetch(
 `${API_BASE_URL}/api/notifications/${notificationId}`,
 {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
 },
 }
 );
 if (!response.ok) throw new Error('Failed to delete notification');
 setNotifications(prev =>
 prev.filter(notif => notif.id !== notificationId)
 );
 } catch (err) {
 console.error('Error deleting notification:', err);
 }
 };
 const handleClearAll = async () => {
 try {
 const response = await fetch(
 `${API_BASE_URL}/api/notifications`,
 {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
 },
 }
 );
 if (!response.ok) throw new Error('Failed to clear notifications');
 setNotifications([]);
 setUnreadCount(0);
 } catch (err) {
 console.error('Error clearing notifications:', err);
 }
 };
 const handleMarkAllAsRead = async () => {
 try {
 const response = await fetch(
 `${API_BASE_URL}/api/notifications/mark-all-read`,
 {
 method: 'PUT',
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
 },
 }
 );
 if (!response.ok) throw new Error('Failed to mark all as read');
 setNotifications(prev =>
 prev.map(notif => ({ ...notif, is_read: true }))
 );
 setUnreadCount(0);
 } catch (err) {
 console.error('Error marking all as read:', err);
 }
 };
 const filteredNotifications = notifications.filter(notif => {
 if (filter === 'unread') return !notif.is_read;
 if (filter === 'read') return notif.is_read;
 return true;
 });
 const getNotificationIcon = (type) => {
 const icons = {
 security: '🛡️',
 info: 'ℹ️',
 warning: '⚠️',
 error: '❌',
 success: '✅',
 document: '📄',
 user: '👤',
 system: '⚙️',
 };
 return icons[type] || '📢';
 };
 const getPriorityColor = (priority) => {
 const colors = {
 critical: '#dc3545',
 high: '#ff6b6b',
 medium: '#ffc107',
 low: '#28a745',
 };
 return colors[priority] || '#999';
 };
 return (
 <div >
 <div >
 <div >
 <h2>🔔 Notifications</h2>
 <div >
 {unreadCount > 0 && (
 <button onClick={handleMarkAllAsRead}
 title="Mark all as read"
 >
 ✓ Mark All Read
 </button>
 )}
 <button onClick={handleClearAll}
 title="Clear all notifications"
 >
 🗑️ Clear All
 </button>
 <button onClick={onClose}>✕</button>
 </div>
 </div>
 <div >
 <button onClick={() => setFilter('all')}
 >
 All ({notifications.length})
 </button>
 <button onClick={() => setFilter('unread')}
 >
 Unread ({unreadCount})
 </button>
 <button onClick={() => setFilter('read')}
 >
 Read ({notifications.length - unreadCount})
 </button>
 </div>
 <div >
 {loading ? (
 <p >Loading notifications...</p>
 ) : error ? (
 <p >{error}</p>
 ) : filteredNotifications.length === 0 ? (
 <p >No notifications</p>
 ) : (
 filteredNotifications.map(notif => (
 <div
 key={notif.id} >
 <div ></div>
 <div >
 {getNotificationIcon(notif.type)}
 </div>
 <div >
 <div >
 <h4>{notif.title}</h4>
 {!notif.is_read && <span >New</span>}
 </div>
 <p >{notif.message}</p>
 {notif.details && (
 <p >{notif.details}</p>
 )}
 <div >
 <span >{notif.type}</span>
 <span >
 {formatTime(notif.created_at)}
 </span>
 </div>
 </div>
 <div >
 {!notif.is_read && (
 <button onClick={() => handleMarkAsRead(notif.id)}
 title="Mark as read"
 >
 ✓
 </button>
 )}
 {notif.action_url && (
 <a
 href={notif.action_url} title="Go to"
 >
 →
 </a>
 )}
 <button onClick={() => handleDelete(notif.id)}
 title="Delete"
 >
 🗑️
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 <div >
 <p >
 Connected to real-time notifications
 </p>
 </div>
 </div>
 </div>
 );
};
const formatTime = (timestamp) => {
 const date = new Date(timestamp);
 const now = new Date();
 const diff = now - date;
 const minutes = Math.floor(diff / 60000);
 const hours = Math.floor(diff / 3600000);
 const days = Math.floor(diff / 86400000);
 if (minutes < 1) return 'Just now';
 if (minutes < 60) return `${minutes}m ago`;
 if (hours < 24) return `${hours}h ago`;
 if (days < 7) return `${days}d ago`;
 return date.toLocaleDateString();
};
export default NotificationCenter;
