import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectWebSocket() {
  if (socket?.connected) return socket;

  socket = io('http://localhost:3333', {
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
