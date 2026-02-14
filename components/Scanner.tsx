import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, ShieldAlert, Cpu, Loader2, Play, Square, AlertTriangle, 
  RefreshCw, Bell, BellOff, Layers, Trash2, ChevronRight, Monitor,
  Activity, Video, CheckCircle2, X, Radio, Lock, ShieldCheck, Clock, Camera, Info, ShieldX, TrendingUp, TrendingDown,
  Target, Zap, AlertCircle
} from 'lucide-react';
import { analyzeContent } from '../services/aiService.ts';
import { DetectionStatus, AnalysisResult, ContentMetadata, Classification, MediaType } from '../types.ts';
import ResultsView from './ResultsView.tsx';

interface VerificationTask {
  id: string;
  file: File;
  previewUrl: string;
  status: DetectionStatus;
  progressMsg: string;
  result: AnalysisResult | null;
  error: string | null;
  metadata: ContentMetadata | null;
}

interface ScannerProps {
  onComplete: (result: AnalysisResult) => void;
}

const HUDCorner = ({ className = "" }: { className?: string }) => (
  <svg className={`w-10 h-10 text-blue-500 opacity-60 ${className}`} viewBox="0 0 100 100">
    <path d="M 10 40 L 40 10 M 20 60 L 20 20 L 60 20" stroke="currentColor" strokeWidth="4" fill="none" />
  </svg>
);

const SCAN_PHASES = [
  "PIXEL_HASH_AUDIT",
  "BIOMETRIC_SYNC_CHECK",
  "TEMPORAL_FLICKER_SCAN",
  "NEURAL_UPSAMPLE_DETECTION",
  "ILLUMINATION_COHESION_MAP",
  "GAN_FINGERPRINT_SEARCH"
];

const Scanner: React.FC<ScannerProps> = ({ onComplete }) => {
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamType, setStreamType] = useState<'DISPLAY' | 'CAMERA' | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingType, setPendingType] = useState<'DISPLAY' | 'CAMERA' | null>(null);
  const [liveAlert, setLiveAlert] = useState<AnalysisResult | null>(null);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [lastScanWasSafe, setLastScanWasSafe] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  
  // Live HUD States
  const [liveThreatScore, setLiveThreatScore] = useState<number>(0);
  const [threatTrend, setThreatTrend] = useState<'UP' | 'DOWN' | 'STABLE'>('STABLE');
  const [scanCount, setScanCount] = useState(0);
  const [activePhase, setActivePhase] = useState(SCAN_PHASES[0]);

  const isStreamingRef = useRef(false);
  const streamTypeRef = useRef<'DISPLAY' | 'CAMERA' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const samplingTimeoutRef = useRef<number | null>(null);

  const captureAndAnalyze = useCallback(async () => {
    if (!isStreamingRef.current || !liveVideoRef.current) return;
    
    const video = liveVideoRef.current;
    
    if (video.readyState < 2 || video.paused || video.ended || video.videoWidth === 0) {
      samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 1000);
      return;
    }

    setIsAnalyzingLive(true);
    setActivePhase(SCAN_PHASES[Math.floor(Math.random() * SCAN_PHASES.length)]);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const res = await analyzeContent(base64, `Live_${streamTypeRef.current || 'Neural'}_Tap_${Date.now()}.jpg`, {
          resolution: `${canvas.width}x${canvas.height}`,
          format: 'image/jpeg',
          type: 'IMAGE'
        }, undefined, true);

        if (isStreamingRef.current) {
          const newThreat = 100 - res.authenticityScore;
          
          setLiveThreatScore(prev => {
            if (newThreat > prev + 1) setThreatTrend('UP');
            else if (newThreat < prev - 1) setThreatTrend('DOWN');
            else setThreatTrend('STABLE');
            return newThreat;
          });

          setScanCount(c => c + 1);
          setLastScanTime(new Date().toLocaleTimeString());
          
          const isFake = res.classification === Classification.FAKE;
          const isAtRisk = res.classification === Classification.SUSPICIOUS && res.authenticityScore < 60;
          
          if (isFake || isAtRisk) {
            setLiveAlert(res);
            setLastScanWasSafe(false);
            onComplete(res); 
          } else {
            if (res.authenticityScore > 72) {
              setLastScanWasSafe(true);
              setLiveAlert(null);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Forensic frame capture intercept skipped", err);
    } finally {
      setIsAnalyzingLive(false);
      if (isStreamingRef.current) {
        samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 2000);
      }
    }
  }, [onComplete]);

  const stopMonitoring = useCallback(() => {
    isStreamingRef.current = false;
    streamTypeRef.current = null;
    setIsStreaming(false);
    setStreamType(null);
    setPendingType(null);
    setIsAuthorizing(false);
    
    if (samplingTimeoutRef.current) {
      clearTimeout(samplingTimeoutRef.current);
      samplingTimeoutRef.current = null;
    }

    if (liveVideoRef.current?.srcObject) {
      const stream = liveVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      liveVideoRef.current.srcObject = null;
    }

    setLiveAlert(null);
    setLastScanTime(null);
    setLastScanWasSafe(true);
    setLiveThreatScore(0);
    setThreatTrend('STABLE');
    setScanCount(0);
  }, []);

  const startMonitoring = async (type: 'DISPLAY' | 'CAMERA') => {
    setIsAuthorizing(true);
    setPendingType(type);
    setError(null);
    setIsStreaming(true);
    setStreamType(type);
    streamTypeRef.current = type;

    await new Promise(r => setTimeout(r, 200));

    try {
      let stream: MediaStream;
      if (type === 'DISPLAY') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("Screen sharing is not supported in this environment.");
        }
        stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { cursor: "always" } as any,
          audio: false 
        });
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Media capture is not supported in this environment.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false 
        });
      }

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.onloadedmetadata = () => {
          liveVideoRef.current?.play().catch(console.error);
          isStreamingRef.current = true;
          captureAndAnalyze();
        };
        
        stream.getTracks().forEach(track => {
          track.onended = () => { if (isStreamingRef.current) stopMonitoring(); };
        });
      }
    } catch (err: any) {
      console.error("Forensic node authorization failed:", err);
      setIsStreaming(false);
      setStreamType(null);
      streamTypeRef.current = null;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Authorization Failed: User rejected node permissions.");
      } else {
        setError(err.message || "Establishing forensic link failed.");
      }
    } finally {
      setIsAuthorizing(false);
      setPendingType(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newTasks: VerificationTask[] = Array.from(files as FileList).map((file: File) => ({
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: DetectionStatus.IDLE,
      progressMsg: 'Pending Audit',
      result: null,
      error: null,
      metadata: {
        type: (file.type.startsWith('video') ? 'VIDEO' : 'IMAGE') as MediaType,
        format: file.type,
        resolution: 'Extracting...',
      }
    }));
    setTasks(prev => [...prev, ...newTasks]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Helper to extract a high-quality frame from a video file for analysis.
   */
  const extractVideoFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        // Seek to 1 second to avoid potential black frames at start
        video.currentTime = Math.min(1, video.duration / 2);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          URL.revokeObjectURL(video.src);
          resolve(base64);
        } else {
          reject(new Error("Canvas context failed"));
        }
      };
      
      video.onerror = (e) => reject(e);
    });
  };

  const processBatch = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    for (const task of tasks) {
      if (task.status === DetectionStatus.IDLE || task.status === DetectionStatus.FAILED) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.ANALYZING, error: null, progressMsg: 'Establishing Neural Context...' } : t));
        
        try {
          let artifactData: string;
          if (task.metadata?.type === 'VIDEO') {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progressMsg: 'Extracting Forensic Frame...' } : t));
            artifactData = await extractVideoFrame(task.file);
          } else {
            const reader = new FileReader();
            artifactData = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(task.file);
            });
          }

          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progressMsg: 'AI Neural Analysis in Progress...' } : t));
          const res = await analyzeContent(artifactData, task.file.name, task.metadata!);
          
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.COMPLETED, result: res, progressMsg: 'Audit Complete' } : t));
          onComplete(res);
        } catch (err: any) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.FAILED, error: err.message, progressMsg: 'Audit Failed' } : t));
        }
      }
    }
    setIsBatchRunning(false);
  };

  const removeTask = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) URL.revokeObjectURL(task.previewUrl);
      return prev.filter(t => t.id !== id);
    });
  };

  if (selectedResult) {
    return <ResultsView result={selectedResult} onReset={() => setSelectedResult(null)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl border bg-slate-900 border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-slate-800 text-slate-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forensic Node</p>
              <p className="text-xs font-bold text-white uppercase tracking-wider italic">Autonomous Engine v4.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${!isStreaming ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-widest">Ready</span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between transition-all duration-500 ${isStreaming ? 'bg-rose-500/5 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-colors duration-500 ${isStreaming ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
              <Radio size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Tap Status</p>
              <p className="text-xs font-bold text-white uppercase tracking-wider italic">{isStreaming ? `MONITORING ${streamType === 'DISPLAY' ? 'DESKTOP' : 'CAM'}` : 'STANDBY'}</p>
            </div>
          </div>
          {isStreaming && (
            <span className="text-[10px] font-mono text-rose-500 font-bold uppercase animate-pulse">Live Link Active</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div 
            className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[3rem] p-16 text-center group hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            <HUDCorner className="absolute top-8 left-8" />
            <HUDCorner className="absolute bottom-8 right-8 rotate-180" />

            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*,video/*" />
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 group-hover:bg-blue-600/20 transition-all">
                <Upload size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Artifact Injection</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Analyze uploaded assets for neural inconsistencies.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
               <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                 <Layers size={18} className="text-blue-500" /> Forensic Queue
               </h3>
               {tasks.length > 0 && !isBatchRunning && (
                 <button onClick={processBatch} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-900/20">
                   <Play size={14} fill="currentColor" /> Initialize Audit
                 </button>
               )}
            </div>
            <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
              {tasks.map(task => (
                <div key={task.id} className="p-6 flex items-center gap-6 group hover:bg-slate-800/20 transition-all">
                   <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 relative">
                     {task.metadata?.type === 'IMAGE' ? (
                       <img src={task.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center"><Video size={24} className="text-slate-600" /></div>
                     )}
                     {task.status === DetectionStatus.COMPLETED && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 size={24} className="text-emerald-500" />
                        </div>
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white truncate max-w-[180px] italic">{task.file.name}</span>
                        <span className="text-[10px] font-mono text-slate-700 uppercase">{task.id}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-black italic tracking-widest ${task.status === DetectionStatus.FAILED ? 'text-rose-500' : 'text-slate-500'}`}>
                        {task.progressMsg}
                      </span>
                   </div>
                   <div className="flex items-center gap-3">
                      {task.status === DetectionStatus.COMPLETED && (
                        <button onClick={() => setSelectedResult(task.result!)} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                          Review
                        </button>
                      )}
                      <button onClick={() => removeTask(task.id)} className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="py-24 text-center text-slate-600 italic text-xs">Queue empty. Waiting for artifact injection.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-full flex flex-col">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3">
                  <Monitor size={20} className="text-blue-500" /> Live Neural Tap
                </h3>
                <div className="flex items-center gap-2">
                   <Zap size={16} className={isStreaming ? "text-emerald-500" : "text-slate-700"} />
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{isStreaming ? 'LINK_UP' : 'OFFLINE'}</span>
                </div>
             </div>

             <div className="flex-1 min-h-[350px] bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden relative mb-8 group">
                <HUDCorner className="absolute top-4 left-4 z-10 !w-8 !h-8" />
                <HUDCorner className="absolute bottom-4 right-4 z-10 !w-8 !h-8 rotate-180" />
                
                {(!isStreaming && !isAuthorizing) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-950/80">
                    <div className="bg-slate-800/30 p-6 rounded-full mb-4 text-slate-700 animate-pulse border border-slate-800">
                      <Lock size={32} />
                    </div>
                  </div>
                )}
                
                {(!isStreaming && !isAuthorizing) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 italic">Signal Stand-by</p>
                    <p className="text-[9px] text-slate-600 max-w-[150px] mx-auto uppercase">Awaiting neural link authentication...</p>
                  </div>
                )}

                {(isStreaming || isAuthorizing) && (
                  <div className="relative w-full h-full">
                    <video ref={liveVideoRef} muted playsInline className={`w-full h-full object-cover transition-all duration-700 ${isStreaming ? 'grayscale opacity-60 brightness-[0.4]' : 'opacity-0'}`} />
                    
                    {isStreaming && (
                      <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                            <div className="space-y-2">
                               <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mb-0.5">Forensic Test</p>
                                  <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                     <span className="text-[9px] font-mono text-white/70 uppercase truncate max-w-[120px]">{activePhase}</span>
                                  </div>
                               </div>
                               <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5">Audit History</p>
                                  <span className="text-[10px] font-mono text-white italic">{scanCount.toString().padStart(5, '0')} Frames</span>
                               </div>
                            </div>

                            <div className="text-right space-y-2">
                               <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Threat Index</p>
                                  <div className="flex items-center justify-end gap-2">
                                     <span className={`text-3xl font-black italic tracking-tighter transition-colors duration-500 ${liveThreatScore > 65 ? 'text-rose-500' : liveThreatScore > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                       {liveThreatScore}%
                                     </span>
                                     <div className="transition-transform duration-500">
                                       {threatTrend === 'UP' && <TrendingUp size={20} className="text-rose-500" />}
                                       {threatTrend === 'DOWN' && <TrendingDown size={20} className="text-emerald-500" />}
                                     </div>
                                  </div>
                               </div>
                               <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-colors duration-500 shadow-lg ${lastScanWasSafe ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse shadow-rose-500/20'}`}>
                                  {lastScanWasSafe ? <ShieldCheck size={10} /> : <AlertCircle size={10} />}
                                  {lastScanWasSafe ? 'FEED_SECURE' : 'THREAT_ACTIVE'}
                               </div>
                            </div>
                         </div>

                         <div className="flex justify-center mb-4">
                            <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center relative">
                               <div className={`absolute inset-0 border-t-2 rounded-full animate-[spin_4s_linear_infinite] ${lastScanWasSafe ? 'border-blue-500/20' : 'border-rose-500/50'}`} />
                               <Target size={32} className={`transition-colors duration-500 ${lastScanWasSafe ? 'text-blue-500/10' : 'text-rose-500/20'}`} />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                               {Array.from({ length: 30 }).map((_, i) => {
                                 const threshold = (i / 30) * 100;
                                 const isActive = liveThreatScore >= threshold;
                                 return (
                                   <div 
                                     key={i} 
                                     className={`flex-1 h-full transition-all duration-700 ${
                                       isActive 
                                         ? (threshold > 65 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : threshold > 30 ? 'bg-amber-500' : 'bg-emerald-500') 
                                         : 'bg-white/5'
                                     }`}
                                   />
                                 );
                               })}
                            </div>
                            <div className="flex justify-between items-center px-1">
                               <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em]">Autonomous Neural Verification Pass 3.0</span>
                               <span className="text-[7px] font-mono text-white/20 uppercase">Last Intercept: {lastScanTime || 'SYNCHRONIZING...'}</span>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {isAuthorizing && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-md z-30">
                     <div className="text-center space-y-4">
                        <div className="relative">
                           <Loader2 className="animate-spin text-blue-500 mx-auto" size={48} />
                           <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/50" size={20} />
                        </div>
                        <p className="text-[10px] font-black uppercase text-white tracking-[0.3em] italic animate-pulse">Establishing Forensic Link...</p>
                     </div>
                   </div>
                )}
                
                {liveAlert && (
                  <div className="absolute inset-0 bg-rose-600/40 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in zoom-in-95 duration-300">
                    <div className="bg-rose-950 border-2 border-rose-500/50 text-white p-8 rounded-[2rem] text-center shadow-[0_0_100px_rgba(225,29,72,0.6)] max-w-[260px] relative pointer-events-auto">
                       <div className="absolute -top-4 -right-4">
                         <button onClick={() => setLiveAlert(null)} className="p-2 bg-rose-900 border border-rose-500/50 rounded-full hover:bg-rose-800 transition-colors">
                           <X size={16} />
                         </button>
                       </div>
                       <ShieldX size={48} className="mx-auto mb-4 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
                       <p className="text-xs font-black uppercase tracking-widest mb-2">THREAT_IDENTIFIED</p>
                       <p className="text-[10px] font-mono mb-6 text-rose-200 uppercase leading-relaxed">System has identified synthetic manipulation in current visual stream.</p>
                       <button onClick={() => { setSelectedResult(liveAlert); setLiveAlert(null); }} className="w-full py-3 bg-white text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-xl font-bold">
                         Examine Forensic Evidence
                       </button>
                    </div>
                  </div>
                )}

                {isAnalyzingLive && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full flex items-center gap-3 z-40 shadow-2xl border border-white/20 scale-90">
                     <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                     <span className="text-[8px] font-black uppercase italic tracking-[0.2em]">Interpreting Frame...</span>
                  </div>
                )}
             </div>

             <div className="space-y-4">
               {isStreaming ? (
                 <button onClick={stopMonitoring} className="w-full py-6 rounded-3xl font-black italic uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all bg-rose-600/10 text-rose-500 border border-rose-500/30 hover:bg-rose-600 hover:text-white group">
                   <Square size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" /> 
                   Terminate Forensic Link
                 </button>
               ) : (
                 <div className="grid grid-cols-1 gap-3">
                   <button onClick={() => startMonitoring('CAMERA')} disabled={isAuthorizing} className="w-full py-5 rounded-3xl font-black italic uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-900/40 border border-blue-500/50">
                     {isAuthorizing && pendingType === 'CAMERA' ? <Loader2 className="animate-spin" size={18} /> : <Camera size={20} />}
                     Establish Camera Tap
                   </button>
                   <button onClick={() => startMonitoring('DISPLAY')} disabled={isAuthorizing} className="w-full py-5 rounded-3xl font-black italic uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all bg-slate-800 text-white hover:bg-slate-700 border border-slate-700">
                     {isAuthorizing && pendingType === 'DISPLAY' ? <Loader2 className="animate-spin" size={18} /> : <Monitor size={20} />}
                     Establish Screen Share
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-10 right-10 z-[200] bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center gap-6 animate-in slide-in-from-right-10 duration-500 max-w-md">
           <div className="bg-rose-600/20 p-3 rounded-2xl text-rose-500 shrink-0 border border-rose-500/20">
             <AlertTriangle size={32} />
           </div>
           <div className="flex-1">
             <p className="text-xs font-black text-white uppercase tracking-widest mb-1 italic">Forensic Alert</p>
             <p className="text-[10px] text-slate-400 italic leading-relaxed">{error}</p>
           </div>
           <button onClick={() => setError(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-all shrink-0">
             <X size={20} className="text-slate-500" />
           </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;