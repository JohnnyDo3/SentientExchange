'use client';

import { motion } from 'framer-motion';
import { Wallet, Plus, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface SessionWalletCardProps {
  sessionId: string;
  balance: string; // e.g., "$0.45"
  initialBalance: string;
  onAddFunds: (amount: number) => void;
}

export default function SessionWalletCard({
  sessionId,
  balance,
  initialBalance,
  onAddFunds
}: SessionWalletCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const balanceNum = parseFloat(balance.replace('$', ''));
  const initialNum = parseFloat(initialBalance.replace('$', ''));
  const spentAmount = (initialNum - balanceNum).toFixed(2);
  const percentRemaining = ((balanceNum / initialNum) * 100).toFixed(0);

  const isLowBalance = balanceNum < 0.10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${
        isLowBalance
          ? 'bg-red/10 border-red/30'
          : 'bg-dark-card border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple" />
          <span className="font-semibold text-white">Session Wallet</span>
        </div>
        <button
          onClick={() => setShowAddFunds(!showAddFunds)}
          className="btn-secondary text-sm px-3 py-1"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Funds
        </button>
      </div>

      {/* Balance Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{balance}</span>
          <span className="text-sm text-gray-400">USDC</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isLowBalance ? 'bg-red' : 'bg-gradient-to-r from-purple to-blue'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Initial</p>
          <p className="text-white font-semibold">{initialBalance}</p>
        </div>
        <div>
          <p className="text-gray-500">Spent</p>
          <p className="text-white font-semibold flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-red" />
            ${spentAmount}
          </p>
        </div>
      </div>

      {isLowBalance && (
        <div className="mt-3 pt-3 border-t border-red/30">
          <p className="text-sm text-red">⚠️ Low balance! Add funds to continue.</p>
        </div>
      )}

      {/* Add Funds Form */}
      {showAddFunds && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-gray-800"
        >
          <p className="text-sm text-gray-400 mb-2">Add USDC to session wallet:</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.10"
              min="0.10"
              placeholder="Amount (e.g., 1.00)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 px-3 py-2 bg-dark border border-gray-700 rounded-lg text-white"
            />
            <button
              onClick={() => {
                const amount = parseFloat(customAmount);
                if (amount > 0) {
                  onAddFunds(amount);
                  setCustomAmount('');
                  setShowAddFunds(false);
                }
              }}
              className="btn-primary px-4"
            >
              Add
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            {[0.50, 1.00, 2.00, 5.00].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  onAddFunds(amount);
                  setShowAddFunds(false);
                }}
                className="btn-secondary text-xs px-3 py-1"
              >
                +${amount.toFixed(2)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
