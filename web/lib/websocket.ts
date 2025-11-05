import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectWebSocket() {
  if (socket?.connected) return socket;

  // Determine API URL based on environment
  let apiUrl = 'http://localhost:8081'; // Default for development

  if (typeof window !== 'undefined') {
    // In production, use same origin for API (Railway serves both web and API)
    if (window.location.hostname !== 'localhost') {
      apiUrl = window.location.origin; // Use production URL
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      apiUrl = process.env.NEXT_PUBLIC_API_URL;
    }
  }

  socket = io(apiUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return connectWebSocket();
  }
  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
