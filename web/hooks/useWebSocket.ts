'use client';

import { useEffect, useState } from 'react';
import { connectWebSocket, getSocket } from '@/lib/websocket';

export interface MarketStats {
  agentsActive: number;
  servicesListed: number;
  transactionsToday: number;
  volumeToday: number;
}

export interface Transaction {
  id: string;
  agent: string;
  service: string;
  price: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export function useWebSocket() {
  const [stats, setStats] = useState<MarketStats>({
    agentsActive: 47,
    servicesListed: 23,
    transactionsToday: 1247,
    volumeToday: 24.94,
  });

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connectWebSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for stats updates
    socket.on('stats:update', (data: MarketStats) => {
      setStats(data);
    });

    // Listen for new transactions
    socket.on('transaction:new', (transaction: Transaction) => {
      setRecentTransactions(prev => [transaction, ...prev].slice(0, 20));
    });

    // Request initial data
    socket.emit('stats:request');
    socket.emit('transactions:recent', { limit: 20 });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('stats:update');
      socket.off('transaction:new');
    };
  }, []);

  return { stats, recentTransactions, isConnected };
}
