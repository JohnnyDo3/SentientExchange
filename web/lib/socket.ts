/**
 * WebSocket Client for Real-Time Orchestration
 */

import { io, Socket } from 'socket.io-client';

export interface OrchestrationEvent {
  timestamp: number;
  event: string;
  agent?: string;
  service?: string;
  cost?: number;
  data?: any;
}

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return this.socket;

    // In production, use same origin. In dev, use localhost:8081
    let apiUrl = 'http://localhost:8081';
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      apiUrl = window.location.origin;
    }

    this.socket = io(apiUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    // Setup event handlers
    this.socket.on('connect', () => {
      console.log('🔌 Connected to orchestration server');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    // Forward all events to listeners
    const events = [
      'orchestration-started',
      'task-decomposed',
      'services-discovered',
      'agent-spawned',
      'service-hired',
      'orchestration-update',
      'orchestration-completed',
      'orchestration-error',
    ];

    events.forEach(event => {
      this.socket?.on(event, (data: any) => {
        this.emit(event, data);
      });
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  startOrchestration(query: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('start-orchestration', { query });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

export const socketManager = new SocketManager();
