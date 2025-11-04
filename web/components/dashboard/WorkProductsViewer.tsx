'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Database, DollarSign, ChevronRight, ExternalLink } from 'lucide-react';

interface WorkProductsViewerProps {
  events: any[];
}

interface ServiceResult {
  service: string;
  agent: string;
  request?: any;
  response?: any;
  cost: number;
  timestamp: number;
  transactionId?: string;
}

export function WorkProductsViewer({ events }: WorkProductsViewerProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'requests' | 'results' | 'transactions'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Extract service results from events
  const serviceResults: ServiceResult[] = events
    .filter((e) => e.event === 'service-hired')
    .map((e, i) => ({
      service: e.service || 'Unknown Service',
      agent: e.agent || 'Direct',
      request: e.request,
      response: e.response,
      cost: e.cost || 0,
      timestamp: e.timestamp || Date.now(),
      transactionId: e.transactionId,
    }));

  const totalCost = serviceResults.reduce((sum, r) => sum + r.cost, 0);
  const totalServices = serviceResults.length;

  return (
    <motion.div
      className="glass rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Work Products & Transactions</h2>
        <p className="text-sm text-gray-400">
          Detailed view of all service interactions and results
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">SERVICES USED</p>
              <p className="text-2xl font-bold text-white">{totalServices}</p>
            </div>
          </div>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-gray-400">TOTAL COST</p>
              <p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-xs text-gray-400">AVG COST/SERVICE</p>
              <p className="text-2xl font-bold text-white">
                ${totalServices > 0 ? (totalCost / totalServices).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'requests', label: 'Requests' },
          { id: 'results', label: 'Results' },
          { id: 'transactions', label: 'Transactions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              selectedTab === tab.id
                ? 'bg-purple text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {serviceResults.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No service results yet</p>
            <p className="text-sm mt-1">Execute a task to see results here</p>
          </div>
        ) : (
          serviceResults.map((result, index) => (
            <motion.div
              key={index}
              className="glass-light rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">{result.service}</p>
                    <p className="text-xs text-gray-400">
                      Hired by {result.agent} • ${result.cost.toFixed(2)} USDC
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedIndex === index ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-700"
                  >
                    <div className="p-4 space-y-4">
                      {/* Request */}
                      {(selectedTab === 'all' || selectedTab === 'requests') && result.request && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                            Request Payload
                          </p>
                          <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(result.request, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Response */}
                      {(selectedTab === 'all' || selectedTab === 'results') && result.response && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                            Response Data
                          </p>
                          <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(result.response, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Transaction Details */}
                      {(selectedTab === 'all' || selectedTab === 'transactions') && (
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                            Transaction Details
                          </p>
                          <div className="bg-black/30 rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cost:</span>
                              <span className="text-green-400 font-bold">
                                ${result.cost.toFixed(2)} USDC
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Timestamp:</span>
                              <span className="text-gray-300">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {result.transactionId && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">TX ID:</span>
                                <a
                                  href={`https://explorer.solana.com/tx/${result.transactionId}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <span className="font-mono text-xs">
                                    {result.transactionId.substring(0, 8)}...
                                  </span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
