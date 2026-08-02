"""
WebSocket Connection Manager
Real-time updates for mission board using WebSocket
"""
from typing import List, Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time mission updates
    
    Features:
    - Connect/disconnect clients
    - Broadcast updates to all connected clients
    - Send updates to specific mission rooms
    - Track active connections
    """

    def __init__(self):
        # Store active connections: {client_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Store mission room subscriptions: {mission_id: [client_ids]}
        self.mission_rooms: Dict[str, List[str]] = {}
        
        # Store client info: {client_id: {user, role, etc}}
        self.client_info: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str, user_info: dict):
        """
        Connect a new WebSocket client
        
        Args:
            websocket: WebSocket connection
            client_id: Unique client identifier
            user_info: User information (email, role, name)
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_info[client_id] = user_info
        
        logger.info(f" WebSocket connected: {client_id} (User: {user_info.get('email')})")
        
        # Send welcome message
        await self.send_personal_message(
            {
                "type": "connection_established",
                "message": "Connected to Mission Board real-time updates",
                "client_id": client_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            websocket
        )

    def disconnect(self, client_id: str):
        """
        Disconnect a WebSocket client
        
        Args:
            client_id: Client identifier to disconnect
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
        if client_id in self.client_info:
            user_info = self.client_info[client_id]
            del self.client_info[client_id]
            logger.info(f" WebSocket disconnected: {client_id} (User: {user_info.get('email')})")
        
        # Remove from all mission rooms
        for mission_id in list(self.mission_rooms.keys()):
            if client_id in self.mission_rooms[mission_id]:
                self.mission_rooms[mission_id].remove(client_id)
                if not self.mission_rooms[mission_id]:
                    del self.mission_rooms[mission_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send message to a specific WebSocket connection
        
        Args:
            message: Message data (dict)
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast(self, message: dict):
        """
        Broadcast message to all connected clients
        
        Args:
            message: Message data to broadcast
        """
        disconnected_clients = []
        
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected_clients.append(client_id)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def join_mission_room(self, client_id: str, mission_id: str):
        """
        Add client to a mission room for targeted updates
        
        Args:
            client_id: Client identifier
            mission_id: Mission ID to join
        """
        if mission_id not in self.mission_rooms:
            self.mission_rooms[mission_id] = []
        
        if client_id not in self.mission_rooms[mission_id]:
            self.mission_rooms[mission_id].append(client_id)
            logger.info(f" Client {client_id} joined mission room: {mission_id}")

    async def leave_mission_room(self, client_id: str, mission_id: str):
        """
        Remove client from a mission room
        
        Args:
            client_id: Client identifier
            mission_id: Mission ID to leave
        """
        if mission_id in self.mission_rooms and client_id in self.mission_rooms[mission_id]:
            self.mission_rooms[mission_id].remove(client_id)
            
            if not self.mission_rooms[mission_id]:
                del self.mission_rooms[mission_id]
            
            logger.info(f" Client {client_id} left mission room: {mission_id}")

    def get_active_connections_count(self) -> int:
        """Get count of active WebSocket connections"""
        return len(self.active_connections)

    def get_mission_room_info(self) -> Dict[str, int]:
        """Get information about active mission rooms"""
        return {
            mission_id: len(clients)
            for mission_id, clients in self.mission_rooms.items()
        }


# Global connection manager instance
manager = ConnectionManager()
