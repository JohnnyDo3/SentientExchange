/**
 * WebSocket Client for Real-Time Orchestration
 */

import { io, Socket } from 'socket.io-client';

// Define specific event data types
export interface OrchestrationStartedData {
  orchestrationId: string;
  query: string;
  timestamp: number;
}

export interface TaskDecomposedData {
  orchestrationId: string;
  tasks: Array<{ id: string; description: string; priority: number }>;
  timestamp: number;
}

export interface ServicesDiscoveredData {
  orchestrationId: string;
  services: Array<{ id: string; name: string; capabilities: string[]; cost: number }>;
  timestamp: number;
}

export interface AgentSpawnedData {
  orchestrationId: string;
  agentId: string;
  agentType: string;
  assignedTask: string;
  timestamp: number;
}

export interface ServiceHiredData {
  orchestrationId: string;
  serviceId: string;
  serviceName: string;
  cost: number;
  timestamp: number;
}

export interface OrchestrationUpdateData {
  orchestrationId: string;
  progress: number;
  currentTask: string;
  timestamp: number;
}

export interface OrchestrationCompletedData {
  orchestrationId: string;
  result: unknown;
  totalCost: number;
  duration: number;
  timestamp: number;
}

export interface OrchestrationErrorData {
  orchestrationId: string;
  error: string;
  timestamp: number;
}

// Union type for all possible event data
export type EventData =
  | OrchestrationStartedData
  | TaskDecomposedData
  | ServicesDiscoveredData
  | AgentSpawnedData
  | ServiceHiredData
  | OrchestrationUpdateData
  | OrchestrationCompletedData
  | OrchestrationErrorData;

export interface OrchestrationEvent {
  timestamp: number;
  event: string;
  agent?: string;
  service?: string;
  cost?: number;
  data?: EventData;
}

type EventCallback = (data: EventData) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();

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
      this.socket?.on(event, (data: EventData) => {
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

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: EventData) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

export const socketManager = new SocketManager();
