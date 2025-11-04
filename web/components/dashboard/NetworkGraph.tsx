'use client';

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

interface NetworkGraphProps {
  events: any[];
}

interface NodeData {
  label: string;
  type: 'orchestrator' | 'agent' | 'service';
  status?: 'idle' | 'active' | 'completed';
  data?: any;
  cost?: number;
}

export function NetworkGraph({ events }: NetworkGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);

  // Build nodes and edges directly from events - REAL-TIME
  useEffect(() => {
    const newNodes: Node<NodeData>[] = [
      {
        id: 'orchestrator',
        type: 'default',
        position: { x: 400, y: 50 },
        data: {
          label: '🎯 Master Orchestrator',
          type: 'orchestrator',
          status: 'active',
        },
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: '2px solid #a78bfa',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: 220,
        },
      },
    ];

    const newEdges: Edge[] = [];
    const agentPositions = new Map<string, number>();
    const servicePositions = new Map<string, number>();
    let agentIndex = 0;
    let serviceIndex = 0;

    // Process events in order
    for (const event of events) {
      if (event.event === 'agent-spawned') {
        const agentId = event.agent || event.name || `agent-${agentIndex}`;

        if (!agentPositions.has(agentId)) {
          agentPositions.set(agentId, agentIndex);

          newNodes.push({
            id: agentId,
            type: 'default',
            position: {
              x: 100 + agentIndex * 250,
              y: 220,
            },
            data: {
              label: `🤖 ${event.name || event.agent}`,
              type: 'agent',
              status: 'active',
              data: event,
            },
            style: {
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: '2px solid #ec4899',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              fontWeight: '600',
              width: 200,
            },
          });

          newEdges.push({
            id: `orchestrator-${agentId}`,
            source: 'orchestrator',
            target: agentId,
            animated: true,
            style: { stroke: '#a78bfa', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#a78bfa',
            },
          });

          agentIndex++;
        }
      }

      if (event.event === 'service-hired') {
        const serviceId = event.service || `service-${serviceIndex}`;
        const agentId = event.agent;

        if (!servicePositions.has(serviceId)) {
          servicePositions.set(serviceId, serviceIndex);

          newNodes.push({
            id: serviceId,
            type: 'default',
            position: {
              x: 80 + serviceIndex * 220,
              y: 450,
            },
            data: {
              label: `⚡ ${event.service || 'Service'}`,
              type: 'service',
              status: 'active',
              data: event,
              cost: event.cost,
            },
            style: {
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: '2px solid #0ea5e9',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              fontWeight: '600',
              width: 180,
            },
          });

          serviceIndex++;
        }

        // Add edge from agent to service
        const edgeId = `${agentId}-${serviceId}`;
        if (!newEdges.find(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: agentId || 'orchestrator',
            target: serviceId,
            animated: true,
            label: event.cost ? `💰 $${event.cost.toFixed(2)}` : '',
            style: { stroke: '#0ea5e9', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#0ea5e9',
            },
            labelStyle: { fill: '#0ea5e9', fontWeight: 'bold', fontSize: 12 },
            labelBgStyle: { fill: '#000', fillOpacity: 0.7 },
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [events, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="relative w-full h-[600px] glass rounded-2xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#333" gap={16} />
        <Controls className="glass" />
      </ReactFlow>

      {/* Node Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            className="absolute top-4 right-4 glass rounded-xl p-4 max-w-md max-h-96 overflow-y-auto z-10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedNode.data.label}
                </h3>
                <p className="text-sm text-gray-400 capitalize">
                  {selectedNode.data.type}
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedNode.data.cost !== undefined && (
              <div className="mb-3 px-3 py-2 bg-black/30 rounded-lg">
                <p className="text-xs text-gray-400">COST</p>
                <p className="text-lg font-bold text-green-400">
                  ${selectedNode.data.cost.toFixed(2)} USDC
                </p>
              </div>
            )}

            {selectedNode.data.data && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase font-semibold">
                  Event Data
                </p>
                <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selectedNode.data.data, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
