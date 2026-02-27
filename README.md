# WorldView: Spatial Intelligence Simulator

WorldView is a high-fidelity, browser-based geospatial intelligence (GEOINT) prototype. It fuses planetary-scale 3D photogrammetry with real-time telemetry from aviation, orbital, and ground-level sources, all rendered within a custom-shaded military "panoptic" interface.

## 🚀 Quick Start

1. **Clone and Install:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy the example environment file and add your API keys.
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and provide your `VITE_GOOGLE_MAPS_API_KEY` (required for 3D Tiles).*

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🛠 Prerequisites

- **Node.js**: v18.0.0 or higher.
- **Google Maps API Key**: Required for "Photorealistic 3D Tiles". Ensure the "Map Tiles API" is enabled in your Google Cloud Console.
- **Cesium Ion Account**: (Optional) For high-resolution global terrain and asset hosting.

## 🛰 Core Features

- **Global 3D Tiles**: Powered by Google Maps Photorealistic 3D Tiles.
- **Aviation Tracking**: Live transponder data (ADS-B) from the OpenSky Network.
- **Orbital Mechanics**: Real-time satellite propagation (SGP4) using `satellite.js` and CelesTrak data.
- **Ground Logistics**: Urban traffic simulation using GPU particle systems.
- **Advanced Shader Pipeline**:
  - **CRT Mode**: Post-processing with barrel distortion, chromatic aberration, and scanlines.
  - **NVG (Night Vision)**: P43 phosphor green spectral mapping and noise simulation.
  - **FLIR (Thermal)**: High-contrast white-hot thermal mapping using depth-buffer analysis.
  - **Anime Mode**: Non-photorealistic (NPR) cel-shading with quantization and edge detection.

## 📂 Project Structure

- `index.html`: The HUD and interface container.
- `app.js`: Core simulation logic, API ingestion, and WebGL shader definitions.
- `styles.css`: HUD aesthetics and CRT scanline overlays.
- `worldsim.txt`: Technical blueprint and architectural goals.
- `GEMINI.md`: Development roadmap and internal engineering notes.

## ⚖️ License
This project is for educational and research purposes into "sousveillance" and spatial intelligence. 
Check individual API terms (Google Maps, OpenSky, CelesTrak) for data usage restrictions.
