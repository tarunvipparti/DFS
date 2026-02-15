import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShieldCheck, History, ScanSearch, Menu, X, Globe, Database as DbIcon, RefreshCw, LucideIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import HistoryView from './components/HistoryView';
import MonitorView from './components/MonitorView';
import { AnalysisResult, VerificationTask } from './types';
import { dbService } from './services/dbService';

type TabType = 'dashboard' | 'scanner' | 'monitor' | 'history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<VerificationTask[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dbStats, setDbStats] = useState({ usage: 0, count: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshHistory = async () => {
    setIsSyncing(true);
    try {
      const reports = await dbService.getAllReports();
      const stats = await dbService.getDatabaseSize();
      const count = await dbService.getReportCount();
      setHistory(reports);
      setDbStats({ usage: stats.usage, count });
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleComplete = async (result: AnalysisResult) => {
    await dbService.saveReport(result);
    await refreshHistory();
  };

  const NavItem = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: LucideIcon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl transition-all duration-300 relative group ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
    >
      <div className="shrink-0">
        <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 2} />
      </div>
      {isSidebarOpen && (
        <span className="font-bold text-xs uppercase tracking-widest truncate">
          {label}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans relative">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M 50 150 L 250 50 M 100 200 L 100 600 L 150 850" stroke="#3b82f6" strokeWidth="3" fill="none" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <path d="M 850 50 L 950 150 M 900 100 L 900 400 L 850 550" stroke="#3b82f6" strokeWidth="2" fill="none" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" opacity="0.3" />
        </svg>
      </div>

      <aside className={`bg-[#0a0e17] border-r border-slate-800/50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-24'} hidden md:flex flex-col relative z-10`}>
        <div className={`flex items-center gap-4 py-10 px-6 ${!isSidebarOpen ? 'justify-center px-0' : ''}`}>
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-600/20 shrink-0">
            <ShieldCheck className="text-white" size={26} strokeWidth={2.5} />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500">
              <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
                DeepShield
              </h1>
            </div>
          )}
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem id="dashboard" label="Nodal Overview" icon={LayoutDashboard} />
          <NavItem id="scanner" label="Forensic Analyzer" icon={ScanSearch} />
          <NavItem id="monitor" label="Live Network" icon={Globe} />
          <NavItem id="history" label="Evidence Vault" icon={History} />
        </nav>
        <div className="p-6">
          {isSidebarOpen && (
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vault Storage</span>
                <span className="text-[10px] font-mono text-blue-400">{(dbStats.usage / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (dbStats.usage / (100 * 1024 * 1024)) * 100)}%` }} 
                />
              </div>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full py-4 border border-slate-800/50 rounded-2xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all flex items-center justify-center">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#06080e]/95 z-10">
        <header className="sticky top-0 z-20 bg-[#06080e]/80 backdrop-blur-xl border-b border-slate-800/50 px-10 py-6 flex justify-between items-center">
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
            {activeTab === 'dashboard' ? 'Audit Overview' : 
             activeTab === 'scanner' ? 'AI Neural Analyzer' : 
             activeTab === 'monitor' ? 'Global Threat Topology' : 
             'Forensic Case History'}
          </h2>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 pr-6 border-r border-slate-800/50">
              <div className="text-right">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Database Engine</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <p className="text-[9px] font-mono text-emerald-500 uppercase tracking-tighter">Operational</p>
                  <RefreshCw size={10} className={`text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                <DbIcon size={18} className="text-emerald-500" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck size={18} className="text-blue-500" />
            </div>
          </div>
        </header>
        <div className="p-10 max-w-7xl mx-auto relative">
          {activeTab === 'dashboard' && <Dashboard history={history} onStartScan={() => setActiveTab('scanner')} />}
          {activeTab === 'scanner' && <Scanner onComplete={handleComplete} tasks={verificationQueue} setTasks={setVerificationQueue} />}
          {activeTab === 'monitor' && <MonitorView />}
          {activeTab === 'history' && <HistoryView history={history} onRefresh={refreshHistory} />}
        </div>
      </main>
    </div>
  );
};

export default App;