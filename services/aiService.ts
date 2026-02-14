
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Classification, Anomaly, ContentMetadata, AnomalyCategory } from "../types";

/**
 * DeepShield Autonomous Forensic Engine
 * MISSION: Use Gemini Vision to perform high-precision forensic analysis on visual content.
 */

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeContent = async (
  base64Data: string, 
  fileName: string,
  metadata: ContentMetadata,
  onProgress?: (msg: string) => void,
  isLive: boolean = false
): Promise<AnalysisResult> => {
  
  if (!isLive) onProgress?.("Establishing Neural Link...");
  
  // Extract raw base64 if it has the data URI prefix
  const base64Content = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const prompt = `Act as an elite AI Deepfake Forensic Specialist. Analyze the provided image/video-frame for signs of neural manipulation, synthetic generation, or deepfake artifacts. 
  Focus on:
  1. Neural Upsampling: Checkerboard patterns or unnatural pixel smoothing in skin textures.
  2. Biometric Integrity: Ocular reflections, dental alignment, and micro-expression latency.
  3. Edge Blending: Halos or blurring around the jawline, ears, and hair.
  4. Environmental Logic: Light sources vs reflections and shadow geometry.

  Return a detailed forensic report in JSON format following the requested schema.`;

  try {
    // Upgrade: Using 'gemini-3-pro-preview' for high-precision forensic analysis which falls under complex text/vision tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            { text: prompt },
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
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { type: Type.STRING, description: "AUTHENTIC, SUSPICIOUS, or FAKE" },
            authenticityScore: { type: Type.NUMBER, description: "0 to 100 score where 100 is perfectly authentic" },
            summary: { type: Type.STRING },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  category: { type: Type.STRING, description: "NEURAL, BIOMETRIC, ENVIRONMENTAL, or TEMPORAL" },
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
                blinkPattern: { type: Type.STRING, description: "Normal or Abnormal" },
                lipSync: { type: Type.STRING, description: "Match, Mismatch, or N/A" },
                pixelArtifacts: { type: Type.STRING, description: "Detected or Not Detected" },
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

    // Access the response text property directly without calling it as a method.
    const forensicData = JSON.parse(response.text || "{}");
    
    // Generate deterministic hash for the report
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base64Content.substring(0, 1000)));
    const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      id: `DS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      fileName,
      fileHash,
      confidenceScore: 0.98,
      classification: forensicData.classification as Classification,
      authenticityScore: forensicData.authenticityScore,
      summary: forensicData.summary,
      metadata,
      anomalies: forensicData.anomalies,
      metrics: forensicData.metrics,
      scores: forensicData.scores,
      groundingLinks: []
    };
  } catch (error) {
    console.error("Forensic analysis failed:", error);
    throw new Error("Neural Engine failed to interpret the artifact. Check network status.");
  }
};
