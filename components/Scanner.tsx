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

const Scanner: React.FC<ScannerProps> = ({ onComplete }) => {
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamType, setStreamType] = useState<'DISPLAY' | 'CAMERA' | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [liveAlert, setLiveAlert] = useState<AnalysisResult | null>(null);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [lastScanWasSafe, setLastScanWasSafe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  
  const [liveThreatScore, setLiveThreatScore] = useState<number>(0);
  const [scanCount, setScanCount] = useState(0);

  const isStreamingRef = useRef(false);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const samplingTimeoutRef = useRef<number | null>(null);

  const captureAndAnalyze = useCallback(async () => {
    if (!isStreamingRef.current || !liveVideoRef.current || isAnalyzingLive) return;
    
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
          setScanCount(c => c + 1);
          
          if (res.classification === Classification.FAKE || (res.classification === Classification.SUSPICIOUS && res.authenticityScore < 60)) {
            setLiveAlert(res);
            setLastScanWasSafe(false);
            onComplete(res); 
          } else {
            setLastScanWasSafe(true);
            setLiveAlert(null);
          }
        }
      }
    } catch (err) {
      console.warn("Live audit cycle failed - Retrying...", err);
    } finally {
      setIsAnalyzingLive(false);
      if (isStreamingRef.current) {
        samplingTimeoutRef.current = window.setTimeout(captureAndAnalyze, 5000);
      }
    }
  }, [onComplete, isAnalyzingLive]);

  const stopMonitoring = useCallback(() => {
    isStreamingRef.current = false;
    setIsStreaming(false);
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
        video.currentTime = Math.min(1.5, video.duration / 2);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const data = canvas.toDataURL('image/jpeg', 0.9);
          cleanUp();
          resolve(data);
        } else {
          cleanUp();
          reject(new Error("Forensic frame extraction failed."));
        }
      };
      
      video.onerror = () => { cleanUp(); reject(new Error("Unsupported artifact format.")); };
      setTimeout(() => { cleanUp(); reject(new Error("Extraction timeout.")); }, 10000);
    });
  };

  const processBatch = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    for (const task of tasks) {
      if (task.status === DetectionStatus.IDLE) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.ANALYZING, progressMsg: 'Isolating Artifact...' } : t));
        try {
          const data = task.metadata?.type === 'VIDEO' ? await extractVideoFrame(task.file) : await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(task.file);
          });
          const result = await analyzeContent(data, task.file.name, task.metadata!);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.COMPLETED, result, progressMsg: 'Audit Successful' } : t));
          onComplete(result);
        } catch (err: any) {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: DetectionStatus.FAILED, error: err.message, progressMsg: 'Analysis Failed' } : t));
        }
      }
    }
    setIsBatchRunning(false);
  };

  if (selectedResult) return <ResultsView result={selectedResult} onReset={() => setSelectedResult(null)} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 rounded-2xl text-slate-500"><ShieldCheck size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nodal Engine</p><p className="text-xs font-bold text-white italic">PRO FORENSIC v5.1</p></div>
           </div>
           <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[9px] font-mono text-emerald-500 uppercase">Operational</span></div>
        </div>
        <div className={`p-6 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center transition-all ${isStreaming ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''}`}>
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isStreaming ? 'bg-blue-600/20 text-blue-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}><Radio size={24} /></div>
              <div><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Live Link</p><p className="text-xs font-bold text-white italic">{isStreaming ? 'MONITORING ACTIVE' : 'STANDBY'}</p></div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div onClick={() => document.getElementById('f-upload')?.click()} className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center group hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden">
             <input id="f-upload" type="file" multiple className="hidden" accept="image/*,video/*" onChange={(e) => {
               const files = Array.from(e.target.files || []);
               const newTasks = files.map(f => ({
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
             <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 mb-6"><Upload size={40} /></div>
             <h3 className="text-xl font-black text-white italic uppercase tracking-widest">Inject Artifacts</h3>
             <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Upload suspect photos or videos for neural scanning</p>
          </div>

          <div className="bg-[#0a0e17] border border-slate-800 rounded-[3rem] overflow-hidden">
             <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest">Verification Queue</h3>
                {tasks.some(t => t.status === DetectionStatus.IDLE) && (
                  <button onClick={processBatch} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Start Batch Audit</button>
                )}
             </div>
             <div className="divide-y divide-slate-800">
                {tasks.map(t => (
                  <div key={t.id} className="p-6 flex items-center gap-6">
                     <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-700">
                        {t.metadata?.type === 'VIDEO' ? <Video size={24} /> : <Camera size={24} />}
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-white italic truncate max-w-[200px]">{t.file.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${t.status === DetectionStatus.FAILED ? 'text-rose-500' : 'text-slate-500'}`}>{t.progressMsg}</p>
                     </div>
                     {t.result && <button onClick={() => setSelectedResult(t.result)} className="text-[10px] font-black uppercase text-emerald-500 px-4 py-2 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">Report</button>}
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0a0e17] border border-slate-800 rounded-[3rem] p-8 h-full flex flex-col">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest flex items-center gap-3"><Monitor size={20} className="text-blue-500" /> Live Neural Tap</h3>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{isStreaming ? 'CONNECTED' : 'DISCONNECTED'}</span>
             </div>
             <div className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden relative border border-slate-800 mb-8 min-h-[300px]">
                <video ref={liveVideoRef} muted playsInline className={`w-full h-full object-cover grayscale transition-opacity ${isStreaming ? 'opacity-40' : 'opacity-0'}`} />
                {isStreaming && (
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
                  <button onClick={stopMonitoring} className="w-full py-5 bg-rose-600/10 text-rose-500 border border-rose-500/30 rounded-2xl font-black uppercase text-xs hover:bg-rose-600 hover:text-white transition-all">Disconnect Node</button>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => startMonitoring('CAMERA')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/40 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Camera size={18} /> Camera Tap</button>
                    <button onClick={() => startMonitoring('DISPLAY')} className="w-full py-5 bg-slate-800 text-white border border-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-3"><Monitor size={18} /> Screen Share</button>
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