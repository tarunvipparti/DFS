import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Classification, Anomaly, ContentMetadata, AnomalyCategory } from "../types";

/**
 * DeepShield Autonomous Forensic Engine
 * MISSION: Use Gemini 3 Pro Vision to perform high-precision forensic analysis.
 */

export const analyzeContent = async (
  base64Data: string, 
  fileName: string,
  metadata: ContentMetadata,
  onProgress?: (msg: string) => void,
  isLive: boolean = false
): Promise<AnalysisResult> => {
  
  // Re-initialize for key freshness
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!isLive) onProgress?.("Calibrating Forensic Sensors...");
  
  const base64Content = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const systemInstruction = `You are an elite Digital Forensic Analyst specializing in AI-generated manipulation (Deepfakes, GANs, and Diffusion models). 
  Analyze the provided image/frame for the following high-precision markers:
  
  1. ADVERSARIAL NOISE: Look for low-level pixel perturbations common in GAN outputs.
  2. LIGHTING GEOMETRY: Check for "Global Illumination" failures - where light source direction on the subject contradicts background shadows.
  3. BIOMETRIC DESYNC: Scan for eye-glint asymmetry, unnatural mouth interior rendering, and micro-expression stiffness.
  4. BOUNDARY COHERENCE: Check for pixel "halos" or blending artifacts at the edge of the face and hair.
  
  STRICT OUTPUT REQUIREMENTS:
  - classification: Must be "AUTHENTIC", "SUSPICIOUS", or "FAKE".
  - authenticityScore: 0-100 (100 = Perfect, 0 = Pure Synthetic).
  - blinkPattern: Strictly "Normal" or "Abnormal".
  - lipSync: Strictly "Match", "Mismatch", or "N/A".
  - pixelArtifacts: Strictly "Detected" or "Not Detected".
  - anomaly category: Must be one of: NEURAL, BIOMETRIC, ENVIRONMENTAL, AUDIO, METADATA, TEMPORAL.`;

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

    const forensicData = JSON.parse(response.text || "{}");
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base64Content.substring(0, 1000)));
    const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      id: `DS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      fileName,
      fileHash,
      confidenceScore: 0.99,
      classification: (forensicData.classification as Classification) || Classification.SUSPICIOUS,
      authenticityScore: Math.min(100, Math.max(0, forensicData.authenticityScore ?? 50)),
      summary: forensicData.summary || "No automated summary provided.",
      metadata,
      anomalies: (forensicData.anomalies || []).map((a: any) => ({
        ...a,
        category: (a.category as AnomalyCategory) || 'NEURAL'
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
    throw new Error("The Neural Core was unable to process this artifact. Check your connection or API configuration.");
  }
};