import React from 'react';
import { AnalysisResult, Classification } from '../types';
import { 
  ShieldCheck, ShieldAlert, ShieldX, Download, ArrowLeft, Info, 
  AlertTriangle, Eye, Layers, Activity, Ban, VolumeX, FileBarChart, Mic, FileText,
  Sun, Fingerprint, Zap, Maximize, ExternalLink, Globe
} from 'lucide-react';

interface ResultsViewProps {
  result: AnalysisResult;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset }) => {
  const themeMap = {
    [Classification.AUTHENTIC]: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: ShieldCheck },
    [Classification.SUSPICIOUS]: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: ShieldAlert },
    [Classification.FAKE]: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: ShieldX }
  };

  const theme = themeMap[result.classification] || themeMap[Classification.SUSPICIOUS];

  const exportAsText = () => {
    const report = `
DEEPSHIELD FORENSIC AUDIT REPORT
================================
REPORT ID: ${result.id}
TIMESTAMP: ${new Date(result.timestamp).toLocaleString()}
FILE NAME: ${result.fileName}

ASSESSMENT: ${result.classification} (${result.authenticityScore}%)
SUMMARY: ${result.summary}

VERIFICATION SOURCES:
${result.groundingLinks?.map(l => `- ${l.title}: ${l.uri}`).join('\n') || 'No external grounding sources found.'}
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DeepShield_Audit_${result.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in zoom-in-95 duration-700 pb-20 print:p-0">
      <div className="flex items-center justify-between px-4 no-print">
        <button onClick={onReset} className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
          <ArrowLeft size={16} /> Close Forensic Case
        </button>
        <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest">AUDIT_REF: {result.id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Risk Gauge Panel */}
        <div className="lg:col-span-4">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[3rem] p-12 text-center space-y-10 shadow-2xl h-full flex flex-col justify-center">
             <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Integrity Score</h4>
                <div className="relative w-64 h-64 mx-auto">
                   <svg className="w-full h-full -rotate-90">
                      <circle cx="128" cy="128" r="110" stroke="#111827" strokeWidth="18" fill="transparent" />
                      <circle 
                        cx="128" cy="128" r="110" stroke="currentColor" strokeWidth="18" fill="transparent" 
                        strokeDasharray={691}
                        strokeDashoffset={691 * (1 - result.authenticityScore / 100)}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ease-out ${theme.color}`}
                      />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-7xl font-black text-white italic tracking-tighter">{result.authenticityScore}%</span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">Verified</span>
                   </div>
                </div>
             </div>

             <div className="space-y-4 pt-4">
                <h2 className={`text-5xl font-black italic uppercase tracking-tighter ${theme.color}`}>
                  {result.classification}
                </h2>
                <p className="text-xs text-slate-500 italic leading-relaxed px-8">
                  {result.summary}
                </p>
             </div>
          </div>
        </div>

        {/* Audit Evidence Log */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
             <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
                <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-4">
                   <Layers size={22} className="text-blue-500" /> Evidence Audit Feed
                </h3>
                <div className="text-[10px] font-mono text-slate-600 bg-black/50 px-4 py-1.5 rounded-full border border-slate-800">NODAL_SYNC: OK</div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Neural Texture Fidelity', val: `${result.metrics.expressionStability}%`, icon: Activity },
                  { label: 'Blink Temporal Loop', val: result.metrics.blinkPattern, icon: Eye },
                  { label: 'Audio-Visual Sync (LipSync)', val: result.metrics.lipSync, icon: Mic },
                  { label: 'Neural Audio Integrity', val: `${result.metrics.audioIntegrity}%`, icon: VolumeX },
                  { label: 'Lighting Cohesion', val: `${result.scores.lightingCohesion}%`, icon: Sun },
                  { label: 'Biometric Sync', val: `${result.scores.biometricSync}%`, icon: Fingerprint }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:bg-slate-800/40 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-600/10 p-2 rounded-xl text-blue-500">
                          <item.icon size={16} />
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase italic ${
                       item.val.includes('Abnormal') || item.val.includes('Mismatch') || (typeof item.val === 'string' && item.val.startsWith('0')) ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                       {item.val}
                    </span>
                  </div>
                ))}
             </div>

             {/* External Grounding Links Section */}
             {result.groundingLinks && result.groundingLinks.length > 0 && (
               <div className="mt-8 pt-8 border-t border-slate-800">
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                   <Globe size={16} /> External Contextual Evidence
                 </h4>
                 <div className="grid grid-cols-1 gap-3">
                   {result.groundingLinks.map((link, idx) => (
                     <a 
                       key={idx} 
                       href={link.uri} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl hover:bg-blue-500/10 transition-all group"
                     >
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                           <ExternalLink size={14} />
                         </div>
                         <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{link.title}</span>
                       </div>
                       <span className="text-[9px] font-mono text-slate-600 truncate max-w-[200px]">{link.uri}</span>
                     </a>
                   ))}
                 </div>
               </div>
             )}

             <div className="mt-8 p-6 bg-black/40 rounded-3xl border border-slate-800/50 space-y-4">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-3">
                   <AlertTriangle size={16} className="text-amber-500" /> Critical Anomaly Logs
                </h4>
                <div className="grid grid-cols-1 gap-3">
                   {result.anomalies.map((a, i) => (
                     <div key={i} className="flex gap-4 text-xs p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                        <div className="w-1 h-full bg-rose-500 rounded-full shrink-0" />
                        <div>
                           <p className="font-black text-white uppercase tracking-widest mb-1 text-[10px]">{a.label}</p>
                           <p className="text-slate-500 text-[10px] leading-relaxed italic">{a.description}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
             <button className="bg-rose-600 hover:bg-rose-700 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all">
               <Ban size={18} /> Block
             </button>
             <button onClick={exportAsText} className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all border border-slate-700">
               <FileText size={18} /> Export
             </button>
             <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black italic uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all">
               <FileBarChart size={18} /> Report
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;