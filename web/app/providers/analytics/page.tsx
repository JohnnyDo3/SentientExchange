'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, DollarSign, Users, Star } from 'lucide-react';
import { Service } from '@/lib/types';
import { mockServices } from '@/lib/mock-services';
import ServiceMetrics from '@/components/providers/ServiceMetrics';
import ParticleScene from '@/components/3d/ParticleScene';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ServiceAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('service');

  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    if (serviceId) {
      // TODO: Fetch from API
      const found = mockServices.find(s => s.id === serviceId);
      setService(found || null);
    }
  }, [serviceId]);

  if (!service) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold mb-2">Service Not Found</h1>
          <p className="text-gray-400 mb-6">The service you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/providers/my-services')}
            className="px-6 py-3 bg-gradient-to-r from-purple to-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform"
          >
            Back to My Services
          </button>
        </div>
      </div>
    );
  }

  const price = parseFloat(service.pricing.perRequest.replace('$', ''));
  const revenue = (service.reputation.totalJobs * price).toFixed(2);

  // Generate mock detailed analytics data
  const revenueData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    revenue: Math.random() * 5 + 1
  }));

  const requestsByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    requests: Math.floor(Math.random() * 30) + 5
  }));

  const topUsers = [
    { name: 'ResearchBot_Alpha', requests: 245, spent: '$12.25' },
    { name: 'DataAnalyzer_Pro', requests: 198, spent: '$9.90' },
    { name: 'ContentCurator_v2', requests: 156, spent: '$7.80' },
    { name: 'InsightEngine_AI', requests: 123, spent: '$6.15' },
    { name: 'QueryMaster_Plus', requests: 98, spent: '$4.90' }
  ];

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleScene />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to My Services</span>
          </button>

          {/* Service Info */}
          <div className="flex items-start gap-4 mb-8">
            <div
              className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
              style={{
                background: `linear-gradient(135deg, ${service.color || '#a855f7'}20, ${service.color || '#a855f7'}40)`,
                border: `2px solid ${service.color || '#a855f7'}60`
              }}
            >
              {service.image || '🔮'}
            </div>
            <div>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold gradient-text">
                {service.name}
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mt-2">
                Detailed Analytics & Performance
              </p>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-6 pb-16 space-y-8">
          {/* Overview Metrics */}
          <ServiceMetrics
            totalRevenue={parseFloat(revenue)}
            totalRequests={service.reputation.totalJobs}
            avgRating={service.reputation.rating}
            revenueTrend={23}
            requestsTrend={45}
            ratingTrend={0.2}
          />

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass rounded-xl md:rounded-2xl p-6 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green" />
              Revenue Over Time (Last 30 Days)
            </h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Requests by Hour */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass rounded-xl md:rounded-2xl p-6 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple" />
              Requests by Hour (Today)
            </h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestsByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar dataKey="requests" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass rounded-xl md:rounded-2xl p-6 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Top Users
            </h3>
            <div className="space-y-3">
              {topUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-sm text-gray-400">{user.requests} requests</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green">{user.spent}</div>
                    <div className="text-xs text-gray-500">total spent</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass rounded-xl md:rounded-2xl p-6 border border-gray-800"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              Recent Reviews
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-gray-500">• 2 days ago</span>
                </div>
                <p className="text-gray-300">"Fast and accurate results. Exactly what I needed!"</p>
                <p className="text-sm text-gray-500 mt-2">— ResearchBot_Alpha</p>
              </div>
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-gray-600 fill-gray-600" />
                  <span className="text-sm text-gray-500">• 5 days ago</span>
                </div>
                <p className="text-gray-300">"Very reliable service. Only minor improvement needed in response time."</p>
                <p className="text-sm text-gray-500 mt-2">— DataAnalyzer_Pro</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    }>
      <ServiceAnalyticsContent />
    </Suspense>
  );
}
