import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Classification, Anomaly, ContentMetadata, AnomalyCategory } from "../types";

/**
 * DeepShield Autonomous Forensic Engine
 * Optimized for resilience: Falls back to Flash if Pro is exhausted.
 */

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 2000;

// Type definition for internal process.env access to avoid tsc errors
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  };
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ForensicDataResponse {
  classification: string;
  authenticityScore: number;
  summary: string;
  anomalies: Array<{
    label: string;
    category: string;
    description: string;
    confidence: number;
  }>;
  metrics: {
    expressionStability: number;
    blinkPattern: string;
    lipSync: string;
    pixelArtifacts: string;
    audioIntegrity: number;
  };
  scores: {
    pixelIntegrity: number;
    temporalConsistency: number;
    lightingCohesion: number;
    biometricSync: number;
  };
}

export const analyzeContent = async (
  base64Data: string, 
  fileName: string,
  metadata: ContentMetadata,
  onProgress?: (msg: string) => void,
  isLive: boolean = false
): Promise<AnalysisResult> => {
  
  let activeModel = isLive ? "gemini-3-flash-preview" : "gemini-3-pro-preview";
  
  const base64Content = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const systemInstruction = `You are an elite Digital Forensic Analyst specializing in AI-generated manipulation.
  Analyze the provided image for:
  1. NEURAL ARTIFACTS: Check for GAN/Diffusion noise.
  2. BIOMETRIC SYNC: Check eye-glint asymmetry and mouth interior rendering.
  3. LIGHTING: Check for global illumination inconsistencies.
  
  OUTPUT REQUIREMENTS:
  - classification: "AUTHENTIC", "SUSPICIOUS", or "FAKE".
  - authenticityScore: 0-100.
  - metrics: Provide blinkPattern ("Normal"/"Abnormal"), lipSync ("Match"/"Mismatch"/"N/A"), and pixelArtifacts ("Detected"/"Not Detected").`;

  let attempt = 0;
  
  while (attempt <= MAX_RETRIES) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!isLive) {
        onProgress?.(attempt === 0 ? "Initializing Neural Core..." : `Re-calibrating via Fallback (Attempt ${attempt + 1})...`);
      }

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Content
                }
              }
            ]
          }
        ],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          ...(activeModel.includes('pro') ? { thinkingConfig: { thinkingBudget: 1000 } } : {}),
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classification: { type: Type.STRING },
              authenticityScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ["label", "category", "description", "confidence"]
                }
              },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  expressionStability: { type: Type.NUMBER },
                  blinkPattern: { type: Type.STRING },
                  lipSync: { type: Type.STRING },
                  pixelArtifacts: { type: Type.STRING },
                  audioIntegrity: { type: Type.NUMBER }
                },
                required: ["expressionStability", "blinkPattern", "lipSync", "pixelArtifacts", "audioIntegrity"]
              },
              scores: {
                type: Type.OBJECT,
                properties: {
                  pixelIntegrity: { type: Type.NUMBER },
                  temporalConsistency: { type: Type.NUMBER },
                  lightingCohesion: { type: Type.NUMBER },
                  biometricSync: { type: Type.NUMBER }
                },
                required: ["pixelIntegrity", "temporalConsistency", "lightingCohesion", "biometricSync"]
              }
            },
            required: ["classification", "authenticityScore", "summary", "anomalies", "metrics", "scores"]
          }
        }
      });

      const forensicData = JSON.parse(response.text || "{}") as ForensicDataResponse;
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base64Content.substring(0, 500)));
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        id: `DS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        fileName,
        fileHash,
        confidenceScore: 0.95,
        classification: (forensicData.classification as Classification) || Classification.SUSPICIOUS,
        authenticityScore: Math.min(100, Math.max(0, forensicData.authenticityScore ?? 50)),
        summary: forensicData.summary || "Forensic summary generated by Neural Core.",
        metadata,
        anomalies: (forensicData.anomalies || []).map((a) => ({
          label: a.label,
          category: (a.category as AnomalyCategory) || 'NEURAL',
          description: a.description,
          confidence: a.confidence
        })),
        metrics: {
          expressionStability: forensicData.metrics?.expressionStability ?? 50,
          blinkPattern: forensicData.metrics?.blinkPattern === 'Abnormal' ? 'Abnormal' : 'Normal',
          lipSync: (forensicData.metrics?.lipSync === 'Match' || forensicData.metrics?.lipSync === 'Mismatch') ? forensicData.metrics.lipSync : 'N/A',
          pixelArtifacts: forensicData.metrics?.pixelArtifacts === 'Detected' ? 'Detected' : 'Not Detected',
          audioIntegrity: forensicData.metrics?.audioIntegrity ?? 50
        },
        scores: {
          pixelIntegrity: forensicData.scores?.pixelIntegrity ?? 50,
          temporalConsistency: forensicData.scores?.temporalConsistency ?? 50,
          lightingCohesion: forensicData.scores?.lightingCohesion ?? 50,
          biometricSync: forensicData.scores?.biometricSync ?? 50
        },
        groundingLinks: []
      };
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes('429') || error?.status === 429;

      if (attempt < MAX_RETRIES) {
        attempt++;
        if (activeModel.includes('pro')) activeModel = "gemini-3-flash-preview";
        const backoff = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
        await sleep(backoff);
        continue;
      }
      
      if (isRateLimit) throw new Error("API Quota Exhausted. Use a different key or wait 60s.");
      throw new Error(`Forensic analysis aborted: ${errorMsg.substring(0, 100)}...`);
    }
  }
  
  throw new Error("Neural Core connection timeout.");
};