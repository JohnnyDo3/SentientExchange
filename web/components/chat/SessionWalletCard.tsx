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

  const balanceNum = parseFloat(balance.replace('$', '')) || 0;
  const initialNum = parseFloat(initialBalance.replace('$', '')) || 0;
  const spentAmount = (initialNum - balanceNum).toFixed(2);
  const percentRemaining = initialNum > 0 ? ((balanceNum / initialNum) * 100).toFixed(0) : '0';

  const isLowBalance = balanceNum < 0.10;

  return (
    <div className="relative" onMouseLeave={() => setShowAddFunds(false)}>
      {/* Compact Header Display */}
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
          isLowBalance
            ? 'bg-red/10 border-red/30'
            : 'bg-gray-900/80 border-gray-700'
        }`}
        onClick={() => setShowAddFunds(!showAddFunds)}
      >
        <Wallet className={`w-4 h-4 ${isLowBalance ? 'text-red' : 'text-purple'}`} />
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg font-bold ${isLowBalance ? 'text-red' : 'text-white'}`}>
            {balance}
          </span>
          <span className="text-xs text-gray-400">USDC</span>
        </div>
        <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isLowBalance ? 'bg-red' : 'bg-gradient-to-r from-purple to-blue'
            }`}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {showAddFunds && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-gray-800 rounded-xl p-4 shadow-xl z-50"
        >
          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500">Initial</p>
              <p className="text-white font-semibold">{initialBalance}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-white font-semibold flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-red" />
                ${spentAmount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-white font-semibold">{percentRemaining}%</p>
            </div>
          </div>

          {isLowBalance && (
            <div className="mb-4 p-2 bg-red/10 border border-red/30 rounded-lg">
              <p className="text-xs text-red">⚠️ Low balance! Add funds to continue.</p>
            </div>
          )}

          {/* Quick Add Buttons */}
          <p className="text-xs text-gray-400 mb-2">Quick Add:</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0.50, 1.00, 2.00, 5.00].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  onAddFunds(amount);
                  setShowAddFunds(false);
                }}
                className="btn-secondary text-xs px-2 py-2"
              >
                +${amount.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-400 mb-2">Custom Amount:</p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.10"
                min="0.10"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
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
                disabled={!customAmount || parseFloat(customAmount) <= 0}
                className="btn-primary px-4 text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Backdrop */}
      {showAddFunds && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAddFunds(false)}
        />
      )}
    </div>
  );
}
