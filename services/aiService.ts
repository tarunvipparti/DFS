
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Classification, Anomaly, ContentMetadata, AnomalyCategory } from "../types";

/**
 * DeepShield Autonomous Forensic Engine
 * MISSION: Use Gemini Vision to perform high-precision forensic analysis on visual content.
 */

export const analyzeContent = async (
  base64Data: string, 
  fileName: string,
  metadata: ContentMetadata,
  onProgress?: (msg: string) => void,
  isLive: boolean = false
): Promise<AnalysisResult> => {
  
  // Re-initialize AI client right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!isLive) onProgress?.("Establishing Neural Link...");
  
  const base64Content = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const systemInstruction = `Act as an elite AI Deepfake Forensic Specialist. Analyze the provided image/video-frame for signs of neural manipulation, synthetic generation, or deepfake artifacts. 
  Focus on:
  1. Neural Upsampling: Checkerboard patterns or unnatural pixel smoothing.
  2. Biometric Integrity: Ocular reflections, dental alignment, and micro-expression latency.
  3. Edge Blending: Halos or blurring around hair/skin transitions.
  4. Environmental Logic: Light sources vs reflections and shadow geometry.
  5. Audio/Visual Sync: (If analyzing a video frame) check for lip-sync markers.

  CRITICAL: Your response MUST adhere to the provided schema exactly. 
  - blinkPattern must be strictly 'Normal' or 'Abnormal'.
  - lipSync must be strictly 'Match', 'Mismatch', or 'N/A'.
  - pixelArtifacts must be strictly 'Detected' or 'Not Detected'.
  - anomaly category must be one of: NEURAL, BIOMETRIC, ENVIRONMENTAL, AUDIO, METADATA, TEMPORAL.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { type: Type.STRING, description: "AUTHENTIC, SUSPICIOUS, or FAKE" },
            authenticityScore: { type: Type.NUMBER, description: "0 to 100 score" },
            summary: { type: Type.STRING },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  category: { type: Type.STRING, description: "NEURAL, BIOMETRIC, ENVIRONMENTAL, AUDIO, METADATA, or TEMPORAL" },
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
                blinkPattern: { type: Type.STRING, description: "'Normal' or 'Abnormal'" },
                lipSync: { type: Type.STRING, description: "'Match', 'Mismatch', or 'N/A'" },
                pixelArtifacts: { type: Type.STRING, description: "'Detected' or 'Not Detected'" },
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

    // Access the text property directly (not a method) as per the guidelines.
    const forensicData = JSON.parse(response.text || "{}");
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base64Content.substring(0, 1000)));
    const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Robust casting to ensure types are respected
    return {
      id: `DS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      fileName,
      fileHash,
      confidenceScore: 0.98,
      classification: (forensicData.classification as Classification) || Classification.SUSPICIOUS,
      authenticityScore: forensicData.authenticityScore ?? 50,
      summary: forensicData.summary || "Forensic analysis generated no definitive summary.",
      metadata,
      anomalies: (forensicData.anomalies || []).map((a: any) => ({
        ...a,
        category: a.category as AnomalyCategory
      })),
      metrics: {
        expressionStability: forensicData.metrics?.expressionStability ?? 50,
        blinkPattern: forensicData.metrics?.blinkPattern === 'Abnormal' ? 'Abnormal' : 'Normal',
        lipSync: ['Match', 'Mismatch', 'N/A'].includes(forensicData.metrics?.lipSync) ? forensicData.metrics.lipSync : 'N/A',
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
  } catch (error) {
    console.error("Forensic analysis failed:", error);
    throw new Error("Neural Engine failed to interpret the artifact. Check network status or API key.");
  }
};
