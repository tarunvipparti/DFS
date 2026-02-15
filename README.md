# 🛡️ DeepShield: AI Forensic Analyzer

DeepShield is a next-generation, high-fidelity deepfake detection platform. Built for digital forensic analysts, it leverages the **Gemini 3 Pro Neural Core** to identify adversarial perturbations, biometric desync, and lighting inconsistencies in digital artifacts.

![DeepShield Dashboard](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000)

## 🚀 Key Features

- **Neural Artifact Scanning**: Multi-pass analysis of images and video frames for GAN-generated markers.
- **Biometric Audit**: Verification of eye-blink patterns, lip-sync integrity, and micro-expression stability.
- **Live Neural Tap**: Real-time monitoring of camera feeds or screen-shares for synthetic injection.
- **Evidence Vault**: Persistent, encrypted local storage (IndexedDB) for forensic case management.
- **Global Threat Topology**: Real-time visualization of simulated global threat intercepts.

## 🛠️ Tech Stack

- **Framework**: React 19 (Strict Mode)
- **Neural Engine**: Google Gemini 3 Pro (Vision/Flash)
- **Styling**: Tailwind CSS (Atomic CSS)
- **Database**: Dexie.js (IndexedDB Persistence)
- **Icons**: Lucide React
- **Visualization**: Recharts

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/deepshield.git
   cd deepshield
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   API_KEY=YOUR_GEMINI_API_KEY
   ```

4. **Launch the platform**:
   ```bash
   npm run dev
   ```

## 🔍 Forensic Methodology

DeepShield analyzes content through four primary neural layers:
1. **Adversarial Noise Detection**: Identifying high-frequency perturbations invisible to the human eye.
2. **Global Illumination Audit**: Detecting inconsistencies between subject lighting and background geometry.
3. **Temporal Consistency**: (Video only) Scanning for "frame jitter" and neural ghosting in fast-motion sequences.
4. **Biometric Desync**: Analyzing the "Internal Mouth" rendering and eye-glint asymmetry.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
**Disclaimer**: *DeepShield is an AI-assisted tool. Forensic results should be verified by human experts for legal proceedings.*
