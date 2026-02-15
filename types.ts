export enum DetectionStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum Classification {
  AUTHENTIC = 'AUTHENTIC',
  SUSPICIOUS = 'SUSPICIOUS',
  FAKE = 'FAKE'
}

export type MediaType = 'IMAGE' | 'VIDEO';
export type AnomalyCategory = 'NEURAL' | 'BIOMETRIC' | 'ENVIRONMENTAL' | 'AUDIO' | 'METADATA' | 'TEMPORAL';

export interface Anomaly {
  timestamp?: number;
  label: string;
  category: AnomalyCategory;
  confidence: number;
  description: string;
  region?: { x: number; y: number; width: number; height: number };
}

export interface ContentMetadata {
  duration?: number;
  resolution: string;
  format: string;
  fps?: number;
  bitrate?: string;
  type: MediaType;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface VerificationTask {
  id: string;
  file: File;
  previewUrl: string;
  status: DetectionStatus;
  progressMsg: string;
  result: AnalysisResult | null;
  error: string | null;
  metadata: ContentMetadata | null;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  fileName: string;
  classification: Classification;
  confidenceScore: number;
  authenticityScore: number;
  anomalies: Anomaly[];
  metadata: ContentMetadata;
  fileHash: string;
  summary: string;
  groundingLinks?: GroundingLink[];
  metrics: {
    expressionStability: number;
    blinkPattern: 'Normal' | 'Abnormal';
    lipSync: 'Match' | 'Mismatch' | 'N/A';
    pixelArtifacts: 'Detected' | 'Not Detected';
    audioIntegrity: number;
  };
  scores: {
    pixelIntegrity: number;
    temporalConsistency: number;
    lightingCohesion: number;
    biometricSync: number;
  };
}