# WorldView: Spatial Intelligence Simulator

## Project Overview
A technical prototype for a browser-based geospatial data fusion and non-photorealistic rendering engine. It integrates planetary-scale 3D tiles with real-time telemetry from aviation, orbital, and ground-level sources.

## Current Architecture
- **Rendering Engine**: CesiumJS (WebGL-based)
- **Volumetric Data**: Google Photorealistic 3D Tiles
- **Aviation Tracking**: OpenSky Network API (ADS-B)
- **Satellite Tracking**: CelesTrak TLEs propagated via `satellite.js` (SGP4)
- **Ground Logistics**: Cesium Particle Systems for urban traffic flow
- **Stylization**: Custom GLSL shaders via `Cesium.CustomShader`

## Implemented Modes
- **Normal**: Standard photogrammetry.
- **Anime**: Cel-shaded NPR with quantization and edge detection.
- **FLIR**: Monochromatic thermal imaging simulation using depth-buffer mapping.
- **NVG**: Night vision simulation with phosphor green spectral mapping.
- **CRT**: Full GLSL-based post-process stage with barrel distortion, chromatic aberration, and scanlines.

## Setup Instructions
1.  **Dependencies**: Project uses CDNs for Cesium and satellite.js, managed locally via `vite`.
2.  **Dev Server**: Run `npm install` then `npm run dev` to start a local server.
3.  **Environment Variables**: 
    - Copy `.env.example` to `.env`.
    - Set `VITE_GOOGLE_MAPS_API_KEY` for Google 3D Tiles.
    - Set `VITE_CESIUM_ION_ACCESS_TOKEN` for global terrain and assets.

## Roadmap
- [ ] Implement full projective texture mapping for live CCTV feeds.
- [x] Integrate GLSL-based CRT distortion shader.
- [x] Integrate ADS-B Exchange for unfiltered military flight tracking.
- [ ] Add vector-field-based traffic flow using OpenStreetMap data.

## CCTV Spatial Projection Roadmap (Phase 2)
1. **Data Ingestion**: Integration with City of Austin Traffic API (JSON/HLS).
2. **Frustum Mapping**: Calculate View-Projection matrices for real-world camera orientations (Heading/Pitch/FOV).
3. **Texture Injection**: Implement `Cesium.Texture` binding for HTML5 `<video>` elements.
4. **Shader Logic**: 
   - Reverse-project fragment world coordinates into CCTV camera space.
   - Occlusion testing using the depth buffer.
   - Flashlight-style texture blending on 3D Tiles mesh.
5. **UI**: Add "LIVE_FEED" toggle and camera selection nodes.

