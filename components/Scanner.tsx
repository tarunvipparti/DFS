import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, ShieldAlert, Cpu, Loader2, Play, Square, AlertTriangle, 
  RefreshCw, Bell, BellOff, Layers, Trash2, ChevronRight, Monitor,
  Activity, Video, CheckCircle2, X, Radio, Lock, ShieldCheck, Clock, Camera, Info, ShieldX, TrendingUp, TrendingDown,
  Target, Zap, AlertCircle, Thermometer
} from 'lucide-react';
import { analyzeContent } from '../services/aiService';
import { DetectionStatus, AnalysisResult, ContentMetadata, Classification, MediaType, VerificationTask } from '../types';
import ResultsView from './ResultsView';

interface ScannerProps {
  onComplete: (result: AnalysisResult) => void;
  tasks: VerificationTask[];
  setTasks: React.Dispatch<React.SetStateAction<VerificationTask[]>>;
}

const Scanner: React.FC<ScannerProps> = ({ onComplete, tasks, setTasks }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamType, setStreamType] = useState<'DISPLAY' | 'CAMERA' | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [lastScanWasSafe, setLastScanWasSafe] = useState(true);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  
  const [liveThreatScore, setLiveThreatScore] = useState<number>(0);

  const isStreamingRef = useRef(false);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const samplingTimeoutRef = useRef<number | null>(null);

  const captureAndAnalyze = useCallback(async () => {
    if (!isStreamingRef.current || !liveVideoRef.current || isAnalyzingLive || isCoolingDown) return;
    
    const video = liveVideoRef.current;
    if (video.readyState < 2) {
      samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 1000);
      return;
    }

    setIsAnalyzingLive(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const res = await analyzeContent(base64, "Live_Intercept.jpg", {
          resolution: `${canvas.width}x${canvas.height}`,
          format: 'image/jpeg',
          type: 'IMAGE'
        }, undefined, true);

        if (isStreamingRef.current) {
          const threat = 100 - res.authenticityScore;
          setLiveThreatScore(threat);
          
          if (res.classification === Classification.FAKE || (res.classification === Classification.SUSPICIOUS && res.authenticityScore < 60)) {
            setLastScanWasSafe(false);
            onComplete(res); 
          } else {
            setLastScanWasSafe(true);
          }
        }
      }
      
      if (isStreamingRef.current) {
        samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 10000); // 10s gap for live
      }
    } catch (err: any) {
      if (err.message?.includes("Quota")) {
        setIsCoolingDown(true);
        setTimeout(() => setIsCoolingDown(false), 30000);
      }
      if (isStreamingRef.current) {
        samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 8000);
      }
    } finally {
      setIsAnalyzingLive(false);
    }
  }, [onComplete, isAnalyzingLive, isCoolingDown]);

  const stopMonitoring = useCallback(() => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    setIsCoolingDown(false);
    if (samplingTimeoutRef.current) clearTimeout(samplingTimeoutRef.current);
    if (liveVideoRef.current?.srcObject) {
      (liveVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      liveVideoRef.current.srcObject = null;
    }
  }, []);

  const startMonitoring = async (type: 'DISPLAY' | 'CAMERA') => {
    setIsAuthorizing(true);
    setError(null);
    try {
      const stream = type === 'DISPLAY' 
        ? await navigator.mediaDevices.getDisplayMedia({ video: true })
        : await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });

      setIsStreaming(true);
      setStreamType(type);
      isStreamingRef.current = true;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.onloadedmetadata = () => {
          liveVideoRef.current?.play();
          captureAndAnalyze();
        };
      }
    } catch (err: any) {
      setError(err.message || "Failed to establish link.");
      setIsStreaming(false);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const extractVideoFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      
      const cleanUp = () => {
        URL.revokeObjectURL(objectUrl);
        video.src = '';
        video.remove();
      };

      video.onloadeddata = () => {
        // Seek to 20% or 2 seconds into the video to avoid black frames or intro logos
        video.currentTime = Math.min(2, video.duration * 0.2);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const data = canvas.toDataURL('image/jpeg', 0.85);
          cleanUp();
          resolve(data);
        } else {
          cleanUp();
          reject(new Error("Canvas context failed."));
        }
      };
      
      video.onerror = () => { cleanUp(); reject(new Error("Video decode failed.")); };
      setTimeout(() => { cleanUp(); reject(new Error("Extraction timeout.")); }, 15000);
    });
  };

  const processBatch = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    
    // Create a local copy to iterate safely
    const currentTasks = [...tasks];
    
    for (const task of currentTasks) {
      if (task.status === DetectionStatus.IDLE || task.status === DetectionStatus.FAILED) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.ANALYZING, progressMsg: 'Extracting Neural Data...' } : t));
        
        try {
          const data = task.metadata?.type === 'VIDEO' ? await extractVideoFrame(task.file) : await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(task.file);
          });
          
          const result = await analyzeContent(data, task.file.name, task.metadata!, (msg) => {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progressMsg: msg } : t));
          });
          
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.COMPLETED, result, progressMsg: 'Audit Complete' } : t));
          onComplete(result);
        } catch (err: any) {
          console.error("Task failed:", err);
          setTasks(prev => prev.map(t => t.id === task.id ? { 
            ...t, 
            status: DetectionStatus.FAILED, 
            error: err.message, 
            progressMsg: 'Core Error' 
          } : t));
        }
      }
    }
    setIsBatchRunning(false);
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  if (selectedResult) return <ResultsView result={selectedResult} onReset={() => setSelectedResult(null)} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-2xl text-slate-500"><ShieldCheck size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nodal Engine</p><p className="text-xs font-bold text-white italic uppercase">Forensic Core v5.2</p></div>
           </div>
           <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[9px] font-mono text-emerald-500 uppercase">Operational</span></div>
        </div>
        <div className={`p-6 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center transition-all ${isStreaming ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''}`}>
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isStreaming ? (isCoolingDown ? 'bg-amber-600/20 text-amber-500' : 'bg-blue-600/20 text-blue-500 animate-pulse') : 'bg-slate-800 text-slate-500'}`}><Radio size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Live Link</p><p className="text-xs font-bold text-white italic uppercase">{isCoolingDown ? 'COOLING DOWN...' : isStreaming ? 'MONITORING ACTIVE' : 'STANDBY'}</p></div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div onClick={() => document.getElementById('f-upload')?.click()} className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[3rem] p-16 text-center group hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden">
             <input id="f-upload" type="file" multiple className="hidden" accept="image/*,video/*" onChange={(e) => {
               const files = Array.from(e.target.files || []);
               const newTasks: VerificationTask[] = files.map(f => ({
                 id: Math.random().toString(36).substr(2, 9),
                 file: f,
                 previewUrl: URL.createObjectURL(f),
                 status: DetectionStatus.IDLE,
                 progressMsg: 'Awaiting Verification',
                 result: null,
                 error: null,
                 metadata: { type: f.type.includes('video') ? 'VIDEO' : 'IMAGE' as MediaType, format: f.type, resolution: 'Analysing...' }
               }));
               setTasks(prev => [...prev, ...newTasks]);
             }} />
             <div className="w-16 h-16 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 mb-6 group-hover:scale-110 transition-transform"><Upload size={32} /></div>
             <h3 className="text-xl font-black text-white italic uppercase tracking-widest">Inject Artifacts</h3>
             <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.2em]">Upload suspect imagery or video for neural audit</p>
          </div>

          <div className="bg-[#0a0e17] border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest">Verification Queue</h3>
                {(tasks.some(t => t.status === DetectionStatus.IDLE || t.status === DetectionStatus.FAILED)) && (
                  <button onClick={processBatch} disabled={isBatchRunning} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                    {isBatchRunning ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    {isBatchRunning ? 'Auditing...' : 'Start Audit'}
                  </button>
                )}
             </div>
             <div className="divide-y divide-slate-800">
                {tasks.map(t => (
                  <div key={t.id} className="p-6 flex items-center gap-6 group">
                     <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-800 overflow-hidden relative">
                        {t.status === DetectionStatus.ANALYZING ? (
                          <Loader2 className="animate-spin text-blue-500" />
                        ) : (
                          <img src={t.previewUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           {t.metadata?.type === 'VIDEO' ? <Video size={16} className="text-white/50" /> : <Camera size={16} className="text-white/50" />}
                        </div>
                     </div>
                     <div className="flex-1">
                        <p className="text-[11px] font-bold text-white italic truncate max-w-[200px]">{t.file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[8px] font-black uppercase tracking-widest ${t.status === DetectionStatus.FAILED ? 'text-rose-500' : t.status === DetectionStatus.COMPLETED ? 'text-emerald-500' : 'text-slate-500'}`}>
                             {t.progressMsg}
                           </span>
                           {t.error && <span className="text-[8px] font-mono text-rose-500/60 truncate max-w-[150px]">- {t.error}</span>}
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        {t.result && (
                          <button onClick={() => setSelectedResult(t.result)} className="text-[9px] font-black uppercase text-emerald-500 px-4 py-2 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">Report</button>
                        )}
                        <button onClick={() => removeTask(t.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                           <X size={16} />
                        </button>
                     </div>
                  </div>
                ))}
                {tasks.length === 0 && <div className="p-16 text-center text-slate-700 uppercase font-black text-[10px] tracking-widest italic">Awaiting Inputs</div>}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[3rem] p-8 h-full flex flex-col shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3"><Monitor size={20} className="text-blue-500" /> Live Neural Tap</h3>
             </div>
             <div className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden relative border border-slate-800 mb-8 min-h-[300px]">
                <video ref={liveVideoRef} muted playsInline className={`w-full h-full object-cover grayscale transition-opacity ${isStreaming ? 'opacity-40' : 'opacity-0'}`} />
                
                {isCoolingDown && (
                   <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-center p-6">
                      <Thermometer size={32} className="text-amber-500 mb-4 animate-bounce" />
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Cooling Down</h4>
                      <p className="text-[9px] text-slate-500 uppercase mt-2 font-mono">Neural Quota Throttled. Auto-resuming shortly.</p>
                   </div>
                )}

                {isStreaming && !isCoolingDown && (
                  <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                     <div className="flex justify-between">
                        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5"><p className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Threat Index</p><p className={`text-xl font-black italic ${liveThreatScore > 60 ? 'text-rose-500' : 'text-emerald-500'}`}>{liveThreatScore}%</p></div>
                        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${lastScanWasSafe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/30 bg-rose-500/10 text-rose-500 animate-pulse'}`}><ShieldCheck size={12} /><span className="text-[8px] font-black uppercase tracking-widest">{lastScanWasSafe ? 'SAFE' : 'BREACH'}</span></div>
                     </div>
                  </div>
                )}
                {!isStreaming && !isAuthorizing && <div className="absolute inset-0 flex items-center justify-center"><Lock size={40} className="text-slate-800" /></div>}
                {isAuthorizing && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}
             </div>
             <div className="space-y-3">
                {isStreaming ? (
                  <button onClick={stopMonitoring} className="w-full py-5 bg-rose-600/10 text-rose-500 border border-rose-500/30 rounded-2xl font-black uppercase text-xs hover:bg-rose-600 hover:text-white transition-all uppercase italic">Disconnect Tap</button>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => startMonitoring('CAMERA')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/40 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 italic"><Camera size={18} /> Camera Tap</button>
                    <button onClick={() => startMonitoring('DISPLAY')} className="w-full py-5 bg-slate-800 text-white border border-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-3 italic"><Monitor size={18} /> Screen Tap</button>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;