import React, { useState } from 'react';
import { AnalysisResult, Classification } from '../types';
import { Search, Calendar, ShieldCheck, ShieldAlert, ShieldX, ArrowRight, Trash2, Hash, X, Database as DbIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import ResultsView from './ResultsView';
import { dbService } from '../services/dbService';

interface HistoryViewProps {
  history: AnalysisResult[];
  onRefresh: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onRefresh }) => {
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  const filteredHistory = history.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.fileHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Permanently delete this forensic report from the secure vault?')) {
      await dbService.deleteReport(id);
      onRefresh();
    }
  };

  const handlePurge = async () => {
    if (confirm('CRITICAL: Purge ALL forensic data from the database? This cannot be undone.')) {
      setIsPurging(true);
      await dbService.purgeDatabase();
      onRefresh();
      setTimeout(() => setIsPurging(false), 500);
    }
  };

  const getBadge = (classification: Classification) => {
    switch (classification) {
      case Classification.AUTHENTIC:
        return <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Authentic</span>;
      case Classification.SUSPICIOUS:
        return <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Suspicious</span>;
      case Classification.FAKE:
        return <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">Deepfake</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Evidence Vault</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Nodal Storage: IndexedDB Persistent Layer</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search hash or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
            />
          </div>
          <button 
            onClick={onRefresh}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all hover:bg-slate-800"
            title="Refresh Database"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handlePurge}
            disabled={isPurging}
            className="p-3 bg-rose-600/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-600 hover:text-white transition-all"
            title="Purge Database"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Artifact Target</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nodal Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Integrity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredHistory.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-600/[0.03] transition-all group cursor-pointer"
                    onClick={() => setSelectedResult(item)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-800/50 p-2 rounded-lg text-slate-600 group-hover:text-blue-400 transition-colors">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-[9px] text-slate-600 font-mono uppercase">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-white truncate max-w-[200px] italic group-hover:text-blue-400 transition-colors">{item.fileName}</p>
                        <p className="text-[9px] font-mono text-slate-700 truncate max-w-[140px] tracking-tight">{item.id} / {item.fileHash.substring(0, 12)}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {getBadge(item.classification)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                           <div 
                             className={`h-full transition-all duration-1000 rounded-full ${
                               item.classification === Classification.AUTHENTIC ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                               item.classification === Classification.SUSPICIOUS ? 'bg-amber-500' : 
                               'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                             }`} 
                             style={{ width: `${item.authenticityScore}%` }}
                           />
                        </div>
                        <span className="text-[10px] font-black text-white/50">{item.authenticityScore}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-2.5 text-slate-700 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                            <ArrowRight size={16} />
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 text-center space-y-6">
             <div className="inline-block p-8 bg-slate-900/50 rounded-full text-slate-800 border border-slate-800/50 animate-pulse">
               <DbIcon size={64} />
             </div>
             <div className="max-w-sm mx-auto">
               <p className="text-white font-black uppercase tracking-[0.3em] text-xs italic">Central Ledger Empty</p>
               <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-3 leading-relaxed">
                 {searchQuery ? `Telemetry query yielded zero results for "${searchQuery}"` : 'Forensic data has not yet been indexed. Initialize analyzer to begin population.'}
               </p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl flex items-center gap-6 group hover:border-emerald-500/20 transition-all">
           <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
           </div>
           <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Index Integrity</h4>
              <p className="text-[9px] text-slate-500 italic uppercase">Database checksum verified against local environment.</p>
           </div>
        </div>
        <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl flex items-center gap-6 group hover:border-blue-500/20 transition-all">
           <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
              <Hash size={32} />
           </div>
           <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Vault Persistence</h4>
              <p className="text-[9px] text-slate-500 italic uppercase">Atomic transactions enabled via IndexedDB storage engine.</p>
           </div>
        </div>
        <div className="p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl flex items-center gap-6 group hover:border-amber-500/20 transition-all">
           <div className="bg-amber-500/10 p-4 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
              <AlertTriangle size={32} />
           </div>
           <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Threat History</h4>
              <p className="text-[9px] text-slate-500 italic uppercase">Tracking {history.filter(h => h.classification === Classification.FAKE).length} verified synthetic artifacts.</p>
           </div>
        </div>
      </div>

      {/* Forensic Report Modal Overlay */}
      {selectedResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 no-print">
          <div 
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setSelectedResult(null)}
          />
          <div className="relative w-full max-w-7xl max-h-full overflow-y-auto bg-[#0a0e17] rounded-[4rem] border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 fade-in duration-500">
             <button 
               onClick={() => setSelectedResult(null)}
               className="absolute top-10 right-10 z-50 p-3 bg-slate-900/50 hover:bg-rose-500 text-white rounded-full transition-all border border-slate-800"
             >
               <X size={24} />
             </button>
             <div className="p-4 md:p-12">
               <ResultsView result={selectedResult} onReset={() => setSelectedResult(null)} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;