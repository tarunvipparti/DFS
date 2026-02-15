import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert, Wifi, Globe, MapPin, Database, Server, Radar, Terminal, Maximize2 } from 'lucide-react';

interface Intercept {
  id: string;
  region: string;
  type: string;
  status: 'NEUTRALIZED' | 'INTERCEPTING';
  time: string;
  confidence: string;
}

const MonitorView: React.FC = () => {
  const [intercepts, setIntercepts] = useState<Intercept[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const regions = ['NA-EAST', 'EU-WEST', 'AS-SOUTH', 'LATAM'];
    const attackTypes = ['Neural Injection', 'Biometric Spoof', 'Temporal Warp', 'Pixel Perturbation'];

    const interval = setInterval(() => {
      const newIntercept: Intercept = {
        id: `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        region: regions[Math.floor(Math.random() * regions.length)],
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        status: Math.random() > 0.3 ? 'NEUTRALIZED' : 'INTERCEPTING',
        time: new Date().toLocaleTimeString(),
        confidence: (Math.random() * 20 + 80).toFixed(2)
      };
      setIntercepts(prev => [newIntercept, ...prev].slice(0, 50));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const FeedNode = ({ id, region, status }: { id: string, region: string, status: 'ACTIVE' | 'WARNING' | 'SCANNING' }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative group">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'ACTIVE' ? 'bg-emerald-500' : status === 'WARNING' ? 'bg-rose-500' : 'bg-blue-500'}`} />
        <span className="text-[9px] font-black text-white uppercase tracking-widest">{id}</span>
      </div>
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 size={12} className="text-slate-500 cursor-pointer" />
      </div>

      <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full animate-[noise_0.2s_infinite] bg-[url('https://media.giphy.com/media/oEI9uWUicH91sH78Yj/giphy.gif')] bg-cover" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <Radar className={`mb-2 ${status === 'WARNING' ? 'text-rose-500' : 'text-blue-500/50'}`} size={24} />
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">{region} NODE SCAN</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-1/2 w-full top-0 animate-[scan_3s_linear_infinite]" />
      </div>

      <div className="p-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{status}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-blue-500/30' : 'bg-slate-800'}`} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden min-h-[500px]">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                <Globe size={20} className="text-blue-500" /> Global Threat Topology
              </h3>
              <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">Real-time neural tap heatmap</p>
            </div>
            <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-black text-white uppercase">Active Breach Detected</span>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
             <svg width="800" height="400" viewBox="0 0 800 400" fill="none">
                <path d="M150 100 Q 200 80 250 120 T 350 100 T 450 150 T 600 120 T 700 180" stroke="#3b82f6" strokeWidth="1" fill="none" />
                <circle cx="400" cy="200" r="150" fill="url(#gradM)" fillOpacity="0.1" />
                <defs>
                  <radialGradient id="gradM" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
             </svg>
          </div>

          <div className="absolute bottom-8 left-8 right-8 grid grid-cols-4 gap-4 z-10">
            <FeedNode id="SOC-LON-04" region="UK/EU" status="SCANNING" />
            <FeedNode id="SOC-NYC-12" region="US-EAST" status="WARNING" />
            <FeedNode id="SOC-TOK-01" region="APAC" status="ACTIVE" />
            <FeedNode id="SOC-SAO-08" region="LATAM" status="ACTIVE" />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex-1 flex flex-col overflow-hidden max-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                <Terminal size={18} className="text-emerald-500" /> Forensic Logs
              </h3>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {intercepts.map((log) => (
                <div key={log.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-xl flex flex-col gap-2 group hover:border-blue-500/30 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase">{log.id}</span>
                    <span className="text-[9px] font-mono text-slate-600 uppercase">{log.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white uppercase italic">{log.type}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${log.status === 'NEUTRALIZED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500 animate-pulse'}`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Taps</p>
                <p className="text-2xl font-black text-white italic">31.2K</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Detections/H</p>
                <p className="text-2xl font-black text-blue-500 italic">2.1K</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorView;