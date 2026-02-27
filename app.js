// Use Vite environment variables for API keys
const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ionToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;

function logStatus(msg) {
    const errHud = document.getElementById('error-hud');
    if (errHud) {
        errHud.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        errHud.innerHTML += `<div style="color: #00f3ff;">[${timestamp}] ${msg}</div>`;
    }
    console.log(`[WorldView Status] ${msg}`);
}

function logError(msg) {
    const errHud = document.getElementById('error-hud');
    if (errHud) {
        errHud.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        errHud.innerHTML += `<div style="color: #ff2a6d;">[${timestamp}] ERROR: ${msg}</div>`;
    }
    console.error(`[WorldView Error] ${msg}`);
}

Cesium.GoogleMaps.defaultApiKey = googleApiKey;
Cesium.Ion.defaultAccessToken = ionToken;

let viewer;
async function initViewer() {
    try {
        viewer = new Cesium.Viewer('cesiumContainer', {
            terrain: await Cesium.Terrain.fromWorldTerrain(),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            timeline: false,
            animation: false,
            requestRenderMode: true
        });
        
        viewer.scene.skyAtmosphere.show = false;
        viewer.scene.globe.show = true; 
        viewer.scene.globe.baseColor = Cesium.Color.BLACK;

        // Initialize HUD and Data
        setupHUDControls();
        startHUDTelemetry();
        setupDataSources();
        load3DTiles();
        setupLocations();
    } catch (e) {
        logError(`Viewer failed to initialize: ${e.message}. Check Ion Token.`);
    }
}

// 1. Load Google Photorealistic 3D Tiles 
async function load3DTiles() {
    if (!viewer) return;
    try {
        logStatus(`SIGINT_INIT: Requesting Google 3D Tileset...`);
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        viewer.scene.primitives.add(tileset);
        viewer.scene.globe.show = false;
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-0.0754, 51.5055, 800),
            orientation: { heading: Cesium.Math.toRadians(0.0), pitch: Cesium.Math.toRadians(-45.0) }
        });
        logStatus(`DATA_FUSION: 3D Photogrammetry Online.`);
    } catch (error) {
        logError(`Tileset Load Failed. Activating ELINT Fallback...`);
        viewer.scene.globe.show = true;
        try {
            // First try World Imagery (requires Ion)
            const worldImagery = await Cesium.createWorldImageryAsync();
            viewer.imageryLayers.addImageryProvider(worldImagery);
        } catch (worldErr) {
            // Then try OSM
            try {
                const osm = await Cesium.OpenStreetMapImageryProvider.fromUrl('https://tile.openstreetmap.org/');
                viewer.imageryLayers.addImageryProvider(osm);
            } catch (osmErr) {
                logError("ELINT_FALLBACK_FAILED: No imagery source reachable.");
            }
        }
        viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-0.0754, 51.5055, 1500) });
    }
}

// 2. Data Sources
const aviationSource = new Cesium.CustomDataSource('aviation');
const orbitalSource = new Cesium.CustomDataSource('orbital');
const cctvSource = new Cesium.CustomDataSource('cctv');

function setupDataSources() {
    if (!viewer) return;
    viewer.dataSources.add(aviationSource);
    viewer.dataSources.add(orbitalSource);
    viewer.dataSources.add(cctvSource);
    
    fetchLiveAircraft();
    setInterval(fetchLiveAircraft, 30000);
    
    fetchSatellites();
    setInterval(fetchSatellites, 60000);

    setupCCTVNodes();
}

// 3. Aviation Data (Enhanced with Global Shuffle & Destinations)
async function fetchLiveAircraft() {
    try {
        const response = await fetch('https://opensky-network.org/api/states/all');
        const data = await response.json();
        aviationSource.entities.removeAll();
        
        if (data.states && data.states.length > 0) {
            // Shuffle the global array to ensure we don't just get one region (e.g., Europe)
            const shuffled = data.states.sort(() => 0.5 - Math.random());
            
            // Track 200 random aircraft globally
            shuffled.slice(0, 200).forEach(flight => {
                const id = flight[0];
                const call = (flight[1] || "UNKN").trim();
                const country = flight[2];
                const lon = flight[5];
                const lat = flight[6];
                const alt = flight[7] || 10000;
                
                if (lon && lat) {
                    renderEnhancedAircraft(lon, lat, alt, call, id, country);
                }
            });
            logStatus(`SIGINT_UPDATE: Tracking 200 global targets.`);
        }
    } catch (err) {
        logError("OpenSky_Limit_Reached. Deploying Mock Trajectories...");
        generateMockAviation();
    }
}

function renderEnhancedAircraft(lon, lat, alt, call, id, country) {
    // Simulated Destination logic
    const dests = ["LHR", "JFK", "HND", "AUS", "SFO", "CDG", "DXB", "SIN", "HKG"];
    const takeoff = dests[Math.floor(Math.random() * dests.length)];
    const arrival = dests[Math.floor(Math.random() * dests.length)];

    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    
    aviationSource.entities.add({
        id: id,
        position: pos,
        point: { pixelSize: 4, color: Cesium.Color.RED, outlineWidth: 1 },
        label: { 
            text: `${call} [${country}]\nDEP: ${takeoff} -> ARR: ${arrival}`, 
            font: '10px monospace', 
            fillColor: Cesium.Color.RED, 
            pixelOffset: new Cesium.Cartesian2(0, 30),
            showBackground: true,
            backgroundColor: new Cesium.Color(0,0,0,0.7),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000)
        }
    });

    // Projected Path
    aviationSource.entities.add({
        polyline: {
            positions: [
                pos,
                Cesium.Cartesian3.fromDegrees(lon + 1.0, lat + 0.5, alt + 1000)
            ],
            width: 1,
            material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.RED.withAlpha(0.2) })
        }
    });
}

function generateMockAviation() {
    aviationSource.entities.removeAll();
    const center = { lon: -0.0754, lat: 51.5055 };
    for (let i = 0; i < 20; i++) {
        const lon = center.lon + (Math.random() - 0.5) * 1.5;
        const lat = center.lat + (Math.random() - 0.5) * 1.5;
        renderEnhancedAircraft(lon, lat, 3000 + Math.random() * 7000, "TRK_" + i, "MOCK_" + i, "GB");
    }
}

// 4. Orbital Data
async function fetchSatellites() {
    try {
        const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json');
        const data = await response.json();
        orbitalSource.entities.removeAll();
        data.slice(0, 15).forEach(sat => {
            renderSatellite(sat.TLE_LINE1, sat.TLE_LINE2, sat.OBJECT_NAME);
        });
    } catch (err) {
        generateMockOrbital();
    }
}

function renderSatellite(tle1, tle2, name) {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    orbitalSource.entities.add({
        name: name,
        position: new Cesium.CallbackProperty((time) => {
            const date = Cesium.JulianDate.toDate(time);
            const posVel = satellite.propagate(satrec, date);
            if (posVel.position) {
                const gd = satellite.eciToGeodetic(posVel.position, satellite.gstime(date));
                return Cesium.Cartesian3.fromDegrees(satellite.degreesLong(gd.longitude), satellite.degreesLat(gd.latitude), gd.height * 1000);
            }
        }, false),
        point: { pixelSize: 6, color: Cesium.Color.CYAN },
        label: { text: name, font: '10px monospace', fillColor: Cesium.Color.CYAN, pixelOffset: new Cesium.Cartesian2(0, -15) }
    });
}

function generateMockOrbital() {
    orbitalSource.entities.removeAll();
    orbitalSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(-0.0754, 51.5055, 400000),
        point: { pixelSize: 8, color: Cesium.Color.CYAN, outlineWidth: 2 },
        label: { text: "KH-11_KENNAN_ELINT", font: '10px monospace', fillColor: Cesium.Color.CYAN, pixelOffset: new Cesium.Cartesian2(0, -20) }
    });
}

// 5. CCTV Node Setup (Phase 2 Prep)
function setupCCTVNodes() {
    cctvSource.show = false; // Hidden by default
    // Austin CCTV Mock Locations
    const cameras = [
        { lon: -97.7431, lat: 30.2672, name: "CAM_CONGRESS_6TH" },
        { lon: -97.739, lat: 30.263, name: "CAM_RAINEY_ST" }
    ];
    cameras.forEach(cam => {
        cctvSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, 10),
            billboard: {
                image: 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Assets/Textures/pin.png',
                color: Cesium.Color.YELLOW,
                scale: 0.5
            },
            label: { text: cam.name, font: '8px monospace', pixelOffset: new Cesium.Cartesian2(0, -20) }
        });
    });
}

// 6. Shaders & Post-Process
let crtStage, nvgStage, flirStage, sharpenStage, animeShader;

function setupPostProcess() {
    if (!viewer) return;
    
    crtStage = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;
            void main() {
                vec2 uv = v_textureCoordinates;
                vec2 cc = uv - 0.5;
                uv = uv + cc * dot(cc, cc) * 0.1;
                if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { out_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
                float r = texture(colorTexture, uv + vec2(0.002, 0.0)).r;
                float g = texture(colorTexture, uv).g;
                float b = texture(colorTexture, uv - vec2(0.002, 0.0)).b;
                out_FragColor = vec4(vec3(r, g, b) - (sin(uv.y * 800.0) * 0.05), 1.0);
            }
        `
    });
    
    nvgStage = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;
            void main() {
                vec4 c = texture(colorTexture, v_textureCoordinates);
                float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                out_FragColor = vec4(vec3(0.2, 1.0, 0.4) * (l + 0.1), 1.0);
            }
        `
    });

    flirStage = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            in vec2 v_textureCoordinates;
            void main() {
                vec4 c = texture(colorTexture, v_textureCoordinates);
                float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                out_FragColor = vec4(vec3(smoothstep(0.2, 0.8, l)), 1.0);
            }
        `
    });

    sharpenStage = new Cesium.PostProcessStage({
        fragmentShader: `
            uniform sampler2D colorTexture;
            uniform float sharpenAmount;
            in vec2 v_textureCoordinates;
            void main() {
                vec2 s = 1.0 / czm_viewport.zw;
                vec4 c = texture(colorTexture, v_textureCoordinates);
                vec4 l = texture(colorTexture, v_textureCoordinates - vec2(s.x, 0.0));
                vec4 r = texture(colorTexture, v_textureCoordinates + vec2(s.x, 0.0));
                vec4 t = texture(colorTexture, v_textureCoordinates - vec2(0.0, s.y));
                vec4 b = texture(colorTexture, v_textureCoordinates + vec2(0.0, s.y));
                out_FragColor = mix(c, c * 5.0 - (l+r+t+b), sharpenAmount);
            }
        `,
        uniforms: { sharpenAmount: 0.5 }
    });

    viewer.scene.postProcessStages.add(crtStage);
    viewer.scene.postProcessStages.add(nvgStage);
    viewer.scene.postProcessStages.add(flirStage);
    viewer.scene.postProcessStages.add(sharpenStage);
    
    crtStage.enabled = true;
    nvgStage.enabled = false;
    flirStage.enabled = false;
    sharpenStage.enabled = true;

    animeShader = new Cesium.CustomShader({
        lightingModel: Cesium.LightingModel.UNLIT,
        fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
            vec3 n = normalize(fsInput.attributes.normalEC);
            float d = max(dot(n, vec3(1.0)), 0.0);
            material.diffuse = vec3(0.5, 0.7, 0.9) * (d > 0.5 ? 1.0 : 0.4);
        }`
    });
}

// 7. UI Logic
function deactivateAllModes() {
    if (crtStage) crtStage.enabled = false;
    if (nvgStage) nvgStage.enabled = false;
    if (flirStage) flirStage.enabled = false;
    document.querySelector('.crt-overlay').style.display = 'none';
    const tileset = viewer?.scene.primitives.get(0);
    if (tileset) tileset.customShader = undefined;
    document.querySelectorAll('.mode-toggles button').forEach(b => b.classList.remove('active'));
}

document.getElementById('btn-normal').addEventListener('click', (e) => { deactivateAllModes(); e.target.classList.add('active'); });
document.getElementById('btn-crt').addEventListener('click', (e) => { deactivateAllModes(); if(crtStage) crtStage.enabled = true; document.querySelector('.crt-overlay').style.display = 'block'; e.target.classList.add('active'); });
document.getElementById('btn-nvg').addEventListener('click', (e) => { deactivateAllModes(); if(nvgStage) nvgStage.enabled = true; e.target.classList.add('active'); });
document.getElementById('btn-flir').addEventListener('click', (e) => { deactivateAllModes(); if(flirStage) flirStage.enabled = true; e.target.classList.add('active'); });
document.getElementById('btn-anime').addEventListener('click', (e) => { deactivateAllModes(); const t = viewer?.scene.primitives.get(0); if(t) t.customShader = animeShader; e.target.classList.add('active'); });

function setupHUDControls() {
    if (!viewer) return;
    setupPostProcess();
    const bloom = viewer.scene.postProcessStages.bloom;
    bloom.enabled = true;
    bloom.uniforms.brightness = -0.3;

    document.getElementById('input-bloom').addEventListener('input', (e) => {
        bloom.uniforms.brightness = (e.target.value / 100.0 * 1.5) - 1.0;
    });
    document.getElementById('input-panoptic').addEventListener('input', (e) => {
        const v = e.target.value;
        const r = 5 + (v * 0.5);
        document.documentElement.style.setProperty('--lens-radius', `${r}%`);
        document.documentElement.style.setProperty('--lens-feather', `${r+10}%`);
        document.documentElement.style.setProperty('--lens-opacity', `${0.7 + (v * 0.003)}`);
    });
    document.getElementById('select-hud').addEventListener('change', (e) => {
        document.getElementById('top-left-hud').style.opacity = e.target.value === 'minimal' ? '0.2' : '1.0';
    });
    document.getElementById('input-sharpen').addEventListener('input', (e) => {
        if (sharpenStage) sharpenStage.uniforms.sharpenAmount = e.target.value / 100.0;
    });
    
    document.getElementById('toggle-aviation').addEventListener('change', (e) => { aviationSource.show = e.target.checked; });
    document.getElementById('toggle-orbital').addEventListener('change', (e) => { orbitalSource.show = e.target.checked; });
    document.getElementById('toggle-cctv').addEventListener('change', (e) => { cctvSource.show = e.target.checked; });
}

function startHUDTelemetry() {
    const timeEl = document.getElementById('current-time');
    const uptimeEl = document.getElementById('uptime-counter');
    const startTime = Date.now();
    setInterval(() => {
        const now = new Date();
        timeEl.innerText = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
        const s = Math.floor((Date.now() - startTime) / 1000);
        uptimeEl.innerText = `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
    }, 1000);
}

function setupLocations() {
    document.querySelectorAll('.location-tabs button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.location-tabs button.active').classList.remove('active');
            e.target.classList.add('active');
            const loc = e.target.innerText;
            if (loc === "Tower Bridge") viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-0.0754, 51.5055, 800) });
            else if (loc === "Austin") viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 800) });
            else if (loc === "Tokyo") viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(139.7671, 35.6812, 1200) });
        });
    });
}

// Entry Point
initViewer();
