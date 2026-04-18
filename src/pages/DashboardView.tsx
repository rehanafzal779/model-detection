import React, { useState, useEffect } from 'react';
import { FileText, Clock, AlertCircle, CheckCircle2, TrendingUp, Activity, Award, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Worker, Activity as ActivityType } from '../types';
import dashboardService from '../services/dashboardService';

interface DashboardViewProps {
  stats: any;
  activities:  ActivityType[];
  topCitizens: any[];
  topWorkers: Worker[];
  trendData: any[];
  statusDistribution: any[];
  reports: any[];
  onNavigateToWorkers?: () => void;
  onViewAllCitizens?: () => void;
}

export function DashboardView({ 
  stats:  propStats, 
  activities: propActivities, 
  topCitizens: propTopCitizens, 
  topWorkers: propTopWorkers, 
  trendData: propTrendData,
  statusDistribution: propStatusDistribution,
  reports,
  onNavigateToWorkers,
  onViewAllCitizens
}: DashboardViewProps) {
  // ✨ NEW: State for backend data
  const [backendStats, setBackendStats] = useState<any>(null);
  const [backendTopCitizens, setBackendTopCitizens] = useState<any[]>([]);
  const [backendTopWorkers, setBackendTopWorkers] = useState<any[]>([]);
  const [backendTrendData, setBackendTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✨ NEW: Load data from backend on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, topCitizensData, topWorkersData, trendsData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getTopCitizens(5),
        dashboardService.getTopWorkers(5),
        dashboardService.getTrendData(7)
      ]);

      if (statsData.success) {
        setBackendStats(statsData.data);
      }

      if (topCitizensData.success) {
        setBackendTopCitizens(topCitizensData.data);
      }

      if (topWorkersData.success) {
        setBackendTopWorkers(topWorkersData.data);
      }

      if (trendsData.success) {
        setBackendTrendData(trendsData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✨ Use backend data if available, otherwise use props
  const stats = backendStats?. reports || propStats;
  const topCitizens = backendTopCitizens. length > 0 ? backendTopCitizens : propTopCitizens;
  const topWorkers = backendTopWorkers.length > 0 ?  backendTopWorkers. map((w: any) => ({
    id: w.id,
    name: w.name,
    tasksCompleted: w.tasks_completed,
    avgCompletionTime: 2.5, // You can calculate this from backend
    rating: w.rating,
    email: w.email || '',
    phone: w.phone || '',
    zone: w.zone || '',
    active: true
  })) : propTopWorkers;
  const trendData = backendTrendData.length > 0 ?  backendTrendData : propTrendData;
  const statusDistribution = propStatusDistribution;
  const activities = propActivities;

  // 🎨 YOUR EXACT EXISTING UI - NO CHANGES BELOW
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={stats.total}
          icon={FileText}
          color="blue"
          trend="+12%"
        />
        <KPICard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="red"
          trend="-5%"
        />
        <KPICard
          title="Assigned"
          value={stats.assigned}
          icon={AlertCircle}
          color="yellow"
          trend="+8%"
        />
        <KPICard
          title="Resolved"
          value={stats. resolved}
          icon={CheckCircle2}
          color="green"
          trend="+15%"
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white mb-1">Report Trends</h3>
              <p className="text-sm text-slate-400">Last 7 days activity</p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Line type="monotone" dataKey="reports" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#06b6d4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white mb-1">Status Distribution</h3>
              <p className="text-sm text-slate-400">Current breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {statusDistribution.map((entry:  any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor:  '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusDistribution.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-300">{item.name}:  {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Activity & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {activities. slice(0, 3).map((activity: ActivityType) => (
              <div key={activity.id} className="flex gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  activity.type === 'resolved' ? 'bg-green-500' : 
                  activity.type === 'assigned' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{activity.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Citizen Leaderboard */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Top Citizens
          </h3>
          <div className="space-y-3">
            {topCitizens.slice(0, 3).map((citizen: any, index: number) => (
              <div key={citizen.name} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                  index === 1 ?  'bg-slate-500/20 text-slate-400' :
                  index === 2 ? 'bg-orange-500/20 text-orange-500' :
                  'bg-slate-700/20 text-slate-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{citizen.name}</p>
                  <p className="text-xs text-slate-400">{citizen.reports} reports</p>
                </div>
              </div>
            ))}
            {onViewAllCitizens && (
              <button
                onClick={onViewAllCitizens}
                className="w-full mt-3 py-2 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg text-sm text-emerald-500 transition-all"
              >
                View All
              </button>
            )}
          </div>
        </div>
        
        {/* Worker Performance */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Top Workers
          </h3>
          <div className="space-y-3">
            {topWorkers.slice(0, 3).map((worker: Worker, index: number) => (
              <div key={worker.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-emerald-500/20 text-emerald-500' : 
                  index === 1 ? 'bg-slate-500/20 text-slate-400' :
                  index === 2 ? 'bg-teal-500/20 text-teal-500' :
                  'bg-slate-700/20 text-slate-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{worker.name}</p>
                  <p className="text-xs text-slate-400">{worker.tasksCompleted} tasks • {worker.avgCompletionTime}h avg</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-yellow-500">★</span>
                  <span className="text-sm text-slate-300">{(worker.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            ))}
            {onNavigateToWorkers && (
              <button
                onClick={onNavigateToWorkers}
                className="w-full mt-3 py-2 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg text-sm text-emerald-500 transition-all"
              >
                Worker Leaderboard
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Alerts */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-white mb-2">In-Portal Alerts</h3>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">• {stats.overdue || 0} reports are overdue and require immediate attention</p>
              <p className="text-sm text-slate-300">• {stats.pending || 0} new reports awaiting assignment</p>
              <p className="text-sm text-slate-300">• System monitoring active zones for anomalies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎨 YOUR EXACT EXISTING KPI CARD - NO CHANGES
function KPICard({ title, value, icon: Icon, color, trend }: { title:  string; value: number; icon:  any; color: 'blue' | 'red' | 'yellow' | 'green'; trend: string }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    red: 'from-red-500 to-orange-600',
    yellow: 'from-yellow-500 to-orange-500',
    green: 'from-emerald-500 to-teal-600'
  };
  
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-sm px-2 py-1 rounded ${
          trend. startsWith('+') ? 'bg-green-500/20 text-green-500' :  'bg-red-500/20 text-red-500'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-3xl text-white">{value}</p>
    </div>
  );
}