import React from 'react';
import { Shield, AlertTriangle, CheckCircle, BarChart3, TrendingUp, Scan, Database as DbIcon, Activity } from 'lucide-react';
import { AnalysisResult, Classification } from '../types.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  history: AnalysisResult[];
  onStartScan: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ history, onStartScan }) => {
  const stats = {
    total: history.length,
    fake: history.filter(h => h.classification === Classification.FAKE).length,
    suspicious: history.filter(h => h.classification === Classification.SUSPICIOUS).length,
    authentic: history.filter(h => h.classification === Classification.AUTHENTIC).length,
  };

  const chartData = history.slice(0, 10).reverse().map(h => ({
    name: h.fileName.substring(0, 8),
    score: h.authenticityScore,
  }));

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl group hover:border-slate-700 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
          <Icon size={24} className="text-white" />
        </div>
        {subValue && (
          <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
            <Activity size={12} />
            <span>{subValue}</span>
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
      <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Vault Records" value={stats.total} icon={DbIcon} color="bg-blue-600" subValue="Synced" />
        <StatCard title="Neural Fakes" value={stats.fake} icon={AlertTriangle} color="bg-rose-600" subValue="Critical" />
        <StatCard title="Suspicious" value={stats.suspicious} icon={Scan} color="bg-amber-600" subValue="Review" />
        <StatCard title="Authentic" value={stats.authentic} icon={CheckCircle} color="bg-emerald-600" subValue="Verified" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3">
              <BarChart3 size={20} className="text-blue-500" />
              Neural Integrity Trends
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Last 10 Cycles</span>
          </div>
          <div className="h-[320px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.5} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                <div className="p-6 bg-slate-800/30 rounded-full border border-slate-800">
                  <Activity size={48} className="text-slate-700" />
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase font-black tracking-widest">Awaiting Neural Inputs</p>
                  <button onClick={onStartScan} className="text-blue-500 hover:text-blue-400 font-bold text-[10px] uppercase tracking-widest mt-2">Initialize First Audit</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Recent */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col shadow-2xl">
          <h3 className="text-xs font-black text-white italic uppercase tracking-widest mb-8">System Protocols</h3>
          <div className="space-y-4 flex-1">
             <button onClick={onStartScan} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase tracking-widest text-xs py-5 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-900/20 group">
                <Scan size={20} className="group-hover:scale-125 transition-transform" />
                Initialize Scan
             </button>
             <div className="p-5 bg-black/40 rounded-2xl border border-slate-800/50">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Storage Integrity</h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">DB_ENGINE</span>
                      <span className="text-emerald-500 text-[10px] font-black">ACTIVE</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">VAULT_ENCRYPTION</span>
                      <span className="text-blue-500 text-[10px] font-black">AES-256</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">LEDGER_SYNC</span>
                      <span className="text-emerald-500 text-[10px] font-black">VERIFIED</span>
                   </div>
                </div>
             </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Neural Hot-Logs</h4>
            <div className="space-y-3">
              {history.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-slate-800/20 rounded-xl border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.classification === Classification.FAKE ? 'bg-rose-500 animate-pulse' : item.classification === Classification.SUSPICIOUS ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-200 truncate italic">{item.fileName}</p>
                    <p className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter">{item.id}</p>
                  </div>
                  <span className="text-[10px] font-black text-white/40">{item.authenticityScore}%</span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-[9px] text-slate-700 italic text-center">No recent intercepts documented.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
