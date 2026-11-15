import * as THREE from 'three';
import { AstronautCharacter } from './astronaut.js';
import { Pico7Companion } from './pico7.js';
import { SURFACE_LOCATIONS, getCurrentLocationName } from './locations.js';

/**
 * SurfaceMissionScene
 *
 * Implements two distinct, expansive planetary environments grounded in authentic space science:
 *
 * 1. Moon Surface (Apollo / Artemis inspired):
 *    - True black airless space sky with sharp starfield, diffraction sparkles, and zero haze
 *    - Brilliant Earth suspended in the lunar sky with slow cloud rotation and cool earthshine
 *    - Stark, high-contrast direct sunlight with deep pitch-black shadows
 *    - Sculpted basaltic maria, towering Apenninus highland ridges, and deep impact craters
 *    - Recognizable historic landmarks and scientific ALSEP packages across the lunar terrain
 *
 * 2. Mars Surface (Jezero Crater / Valles Marineris inspired):
 *    - Rolling terracotta/rust dunes, canyon ledges, and ancient river delta sediment layers
 *    - Atmospheric amber/salmon dust haze with realistic solar scattering and long shadows
 *    - Celestial bodies: Phobos and Deimos traversing the Martian sky
 *    - Multi-tonal iron-rich regolith, hematite fields, and volcanic basalt outcroppings
 *    - Full planetary base hub, geodesic biodome, and distant exploration stations
 */
export class SurfaceMissionScene {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.clock = new THREE.Clock();
    this.keys = new Set();

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = game.env === 'mars' ? 1.25 : 1.45;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.isMars = game.env === 'mars';

    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 1200);
    this.camera.position.set(0, 3.8, 7);

    // Obstacle coordinates across the terrain [x, z, radius]
    this.obstacles = [
      // Base hub area obstacles
      [-5, -2, 1.4],
      [2, -3, 1.0],
      [6, -1, 1.8],
      [-2, -5, 0.8],
      [-7, 2, 1.5],
      [5, 4, 1.3],
      [14, 8, 1.0],    // Solar power substation (compact collision footprint so panels and terminal are accessible)
      [-16, 12, 1.8],  // Habitat foundation yard
      [-22, -14, 2.6], // Biodome greenhouse
      [-12, 4, 1.6],   // Living habitat
      [12, -24, 1.4],  // Science station
      [-28, 28, 1.2],  // Meteorology array
      [36, 12, 1.8],   // Launch pad
      [56, -46, 1.4],  // Crater survey pod
      [-54, -48, 1.2], // Observation ridge mast
      [48, 32, 1.4],   // Drill rig
      [-46, 52, 1.4],  // Astronomy dish
      [68, -12, 1.4],  // Stranded rover / surveyor
      [28, -36, 1.4]   // Resupply pad
    ];

    this.beacons = [];
    this.rover = null;

    // 3. Build Environment based on destination
    if (this.isMars) {
      this.buildMarsWorld();
    } else {
      this.buildMoonWorld();
    }

    // 4. Player & Companion
    this.astronaut = new AstronautCharacter({ mode: 'ground' });
    this.scene.add(this.astronaut.root);

    this.pico = new Pico7Companion();
    this.scene.add(this.pico.root);

    // Create the exploration rover
    this.createRover();

    // 5. Science Beacons / Objective Markers
    this.createObjectiveBeacons();

    // Start render loop
    this.animate();
  }

  /* =========================================================================
   * DETERMINISTIC PLANETARY TERRAIN HEIGHT
   * Provides exact analytical elevation across the 240m map for both worlds.
   * ========================================================================= */
  getTerrainHeight(x, z) {
    if (this.isMars) {
      // Base rolling dunes and sedimentary swells
      let y = 0.48 * Math.sin(x * 0.045 + z * 0.038) + 0.28 * Math.sin(x * 0.09 - z * 0.07);
      y += 0.15 * Math.sin(x * 0.18 + z * 0.14);

      // Central landing and base hub flattened zone (radius 14m)
      const hubDist = Math.hypot(x, z);
      const hubFlatten = Math.min(1.0, Math.max(0.0, (hubDist - 4.0) / 10.0));

      // 1. Large Impact Crater at (56, -46) - Day 14
      const dCrater = Math.hypot(x - 56, z - (-46));
      if (dCrater < 24) {
        const factor = 1 - Math.pow(dCrater / 24, 2);
        y -= 5.8 * factor;
      } else if (dCrater < 34) {
        const rimDist = (dCrater - 24) / 10;
        y += 2.6 * Math.sin(rimDist * Math.PI);
      }

      // 2. Aeolis Promontory Observation Ridge at (-54, -48) - Day 15, 22
      const dRidge = Math.hypot(x - (-54), z - (-48));
      if (dRidge < 26) {
        const ridgeFactor = Math.cos((dRidge / 26) * (Math.PI / 2));
        y += 8.8 * Math.pow(ridgeFactor, 1.6);
      }

      // 3. Hematite & Regolith Sampling Field at (48, 32) - Day 17
      const dGeology = Math.hypot(x - 48, z - 32);
      if (dGeology < 22) {
        y += 1.8 * Math.cos((dGeology / 22) * (Math.PI / 2)) + 0.25 * Math.sin(x * 0.4);
      }

      // 4. Deep-Sky Astronomy Lookout at (-46, 52) - Day 21
      const dAstro = Math.hypot(x - (-46), z - 52);
      if (dAstro < 20) {
        y += 6.2 * Math.pow(Math.cos((dAstro / 20) * (Math.PI / 2)), 1.4);
      }

      // 5. Stranded Rover Recovery Canyon at (68, -12) - Day 24
      const dRecovery = Math.hypot(x - 68, z - (-12));
      if (dRecovery < 18) {
        y += 2.2 * Math.cos((dRecovery / 18) * (Math.PI / 2)) - 1.2 * Math.sin(x * 0.25);
      }

      // 6. Northern Valles Marineris Canyon Wall
      if (z < -45) {
        const wallDist = Math.abs(z + 45);
        y += Math.min(15, Math.pow(wallDist * 0.12, 1.4) + Math.sin(x * 0.08) * 1.5);
      }

      // Secondary regional impact craters
      const craters = [
        [-15, -15, 7, 1.35],
        [17, -20, 9, 1.8],
        [-24, 8, 5, 0.9],
        [24, 7, 4.5, 0.72],
        [-2, 24, 6.5, 1.0],
        [31, -2, 3.5, 0.55]
      ];
      for (const [cx, cz, cr, cdepth] of craters) {
        const d = Math.hypot(x - cx, z - cz);
        if (d < cr) {
          y -= cdepth * Math.pow(1 - d / cr, 1.7);
        } else if (d < cr * 1.35) {
          y += cdepth * 0.42 * Math.sin(((d - cr) / (cr * 0.35)) * Math.PI);
        }
      }

      return y * hubFlatten;
    } else {
      // MOON: Stark impact craters, crisp rims, and highland peaks
      let y = 0.35 * Math.sin(x * 0.04) * Math.cos(z * 0.04);
      y += 0.18 * Math.sin(x * 0.14 + z * 0.11);

      // Central base hub flat zone (radius 14m)
      const hubDist = Math.hypot(x, z);
      const hubFlatten = Math.min(1.0, Math.max(0.0, (hubDist - 4.0) / 10.0));

      // 1. Giant Shackleton Anomaly Crater at (56, -46) - Day 14
      const dCrater = Math.hypot(x - 56, z - (-46));
      if (dCrater < 25) {
        const factor = 1 - Math.pow(dCrater / 25, 2);
        y -= 6.8 * factor;
      } else if (dCrater < 35) {
        const rimDist = (dCrater - 25) / 10;
        y += 3.2 * Math.sin(rimDist * Math.PI);
      }

      // 2. Montes Apenninus Highland Mountain Ridge at (-54, -48) - Day 15, 22
      const dRidge = Math.hypot(x - (-54), z - (-48));
      if (dRidge < 26) {
        const ridgeFactor = Math.cos((dRidge / 26) * (Math.PI / 2));
        y += 9.8 * Math.pow(ridgeFactor, 1.5) + (Math.sin(x * 0.28) * 0.8);
      }

      // 3. Anorthosite Highland Field at (48, 32) - Day 17
      const dGeology = Math.hypot(x - 48, z - 32);
      if (dGeology < 22) {
        y += 4.8 * Math.cos((dGeology / 22) * (Math.PI / 2));
      }

      // 4. Radio-Quiet Astronomy Highland Crest at (-46, 52) - Day 21
      const dAstro = Math.hypot(x - (-46), z - 52);
      if (dAstro < 20) {
        y += 5.5 * Math.pow(Math.cos((dAstro / 20) * (Math.PI / 2)), 1.3);
      }

      // 5. Historic Surveyor Debris Slope at (68, -12) - Day 24
      const dRecovery = Math.hypot(x - 68, z - (-12));
      if (dRecovery < 18) {
        y += 3.0 * Math.cos((dRecovery / 18) * (Math.PI / 2));
      }

      // Secondary lunar impact craters
      const craters = [
        [-12, -10, 11, 2.6, 1.2],
        [14, -12, 9, 2.2, 0.95],
        [-2, -18, 14, 3.4, 1.4],
        [18, 8, 8, 1.8, 0.8],
        [-16, 12, 7, 1.5, 0.7],
        [-32, 24, 12, 2.8, 1.1]
      ];
      for (const [cx, cz, cr, cdepth, crim] of craters) {
        const d = Math.hypot(x - cx, z - cz);
        if (d < cr) {
          const factor = 1 - Math.pow(d / cr, 2);
          y -= cdepth * factor;
        } else if (d < cr * 1.5) {
          const rimDist = (d - cr) / (cr * 0.5);
          y += crim * Math.sin(rimDist * Math.PI);
        }
      }

      return y * hubFlatten;
    }
  }

  /* =========================================================================
   * MOON SURFACE ENVIRONMENT
   * Pure black space sky, Earth floating overhead, stark solar lighting.
   * ========================================================================= */
  buildMoonWorld() {
    this.scene.background = new THREE.Color(0x000104);
    this.scene.fog = null; // No atmosphere on the Moon

    // Stark direct white sunlight (high contrast, crisp shadows)
    const sunLight = new THREE.DirectionalLight(0xffffff, 4.2);
    sunLight.position.set(-28, 42, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0006;
    this.scene.add(sunLight);

    // Cool cyan Earthshine from Earth in the sky
    const earthshine = new THREE.DirectionalLight(0x38bdf8, 0.85);
    earthshine.position.set(35, 45, -50);
    this.scene.add(earthshine);

    // Minimal ambient (stark black lunar shadows)
    const ambient = new THREE.AmbientLight(0x0a0d16, 0.45);
    this.scene.add(ambient);

    // Deep space starfield with cross diffraction sparkles
    this.createMoonStarfield();

    // Radiant Earth in the Lunar Sky
    this.createLunarEarth();

    // Cyan Horizon Limb Glow
    this.createHorizonLimb();

    // Sculpted Cratered Lunar Terrain (240m x 240m)
    this.createMoonTerrain();
    this.createMoonDetailPass();

    // Basaltic Rock Spires & Boulders
    this.createMoonRocks();

    // Planetary Base Hub and All Exploration Landmarks
    this.createBaseHubLandmarks();
    this.createExplorationLandmarks();
  }

  createMoonStarfield() {
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 320 + Math.random() * 60;

      const y = Math.abs(r * Math.cos(phi)) + 6;
      const x = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.sin(phi) * Math.cos(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const brightness = 0.55 + Math.random() * 0.45;
      const tint = Math.random();
      if (tint > 0.88) {
        colors[i * 3] = 0.75 * brightness;
        colors[i * 3 + 1] = 0.88 * brightness;
        colors[i * 3 + 2] = 1.0 * brightness;
      } else if (tint > 0.75) {
        colors[i * 3] = 1.0 * brightness;
        colors[i * 3 + 1] = 0.92 * brightness;
        colors[i * 3 + 2] = 0.7 * brightness;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 32;
    starCanvas.height = 32;
    const ctx = starCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(235, 245, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(180, 220, 255, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const starTexture = new THREE.CanvasTexture(starCanvas);
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);

    // Bright stars with diffraction spikes
    this.createDiffractionSpikes(20, [
      [-70, 75, -180],
      [85, 90, -170],
      [140, 60, -140],
      [-120, 80, -130],
      [0, 110, -190]
    ]);
  }

  createDiffractionSpikes(count, fixedPos = []) {
    const spikeCanvas = document.createElement('canvas');
    spikeCanvas.width = 64;
    spikeCanvas.height = 64;
    const sctx = spikeCanvas.getContext('2d');

    const horizGrad = sctx.createLinearGradient(0, 32, 64, 32);
    horizGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    horizGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sctx.fillStyle = horizGrad;
    sctx.fillRect(0, 31, 64, 2);

    const vertGrad = sctx.createLinearGradient(32, 0, 32, 64);
    vertGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vertGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    vertGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sctx.fillStyle = vertGrad;
    sctx.fillRect(31, 0, 2, 64);

    const centerGrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 10);
    centerGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    centerGrad.addColorStop(0.4, 'rgba(210, 235, 255, 0.7)');
    centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sctx.fillStyle = centerGrad;
    sctx.beginPath();
    sctx.arc(32, 32, 10, 0, Math.PI * 2);
    sctx.fill();

    const spikeTexture = new THREE.CanvasTexture(spikeCanvas);
    const spikeMat = new THREE.SpriteMaterial({
      map: spikeTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(spikeMat);
      if (i < fixedPos.length) {
        sprite.position.set(...fixedPos[i]);
      } else {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 260;
        sprite.position.set(
          r * Math.sin(phi) * Math.sin(theta),
          Math.abs(r * Math.cos(phi)) + 15,
          r * Math.sin(phi) * Math.cos(theta)
        );
      }
      const scale = 5 + Math.random() * 4;
      sprite.scale.set(scale, scale, 1);
      this.scene.add(sprite);
    }
  }

  createLunarEarth() {
    const earthGroup = new THREE.Group();
    earthGroup.position.set(35, 45, -50);

    const earthGeo = new THREE.SphereGeometry(7.2, 48, 36);
    const eCanvas = document.createElement('canvas');
    eCanvas.width = 512;
    eCanvas.height = 256;
    const ectx = eCanvas.getContext('2d');

    // Ocean deep blue base
    ectx.fillStyle = '#061a38';
    ectx.fillRect(0, 0, 512, 256);

    // Continental landmasses
    ectx.fillStyle = '#1e4832';
    ectx.beginPath();
    ectx.ellipse(140, 110, 52, 44, 0.2, 0, Math.PI * 2);
    ectx.fill();
    ectx.beginPath();
    ectx.ellipse(220, 140, 42, 60, -0.15, 0, Math.PI * 2);
    ectx.fill();
    ectx.beginPath();
    ectx.ellipse(360, 95, 75, 42, 0.05, 0, Math.PI * 2);
    ectx.fill();

    // Swirling white weather/cloud systems
    ectx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let i = 0; i < 9; i++) {
      ectx.beginPath();
      const cy = 40 + i * 22;
      ectx.ellipse(100 + i * 35, cy, 55 + i * 6, 12 + (i % 3) * 5, 0.25, 0, Math.PI * 2);
      ectx.fill();
    }

    const earthTexture = new THREE.CanvasTexture(eCanvas);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x05203b,
      emissiveIntensity: 0.35
    });

    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earth);

    // Glowing cyan atmosphere haze rim
    const atmoGeo = new THREE.SphereGeometry(7.55, 36, 24);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmo);

    earthGroup.rotation.z = 0.38;
    this.scene.add(earthGroup);
    this.lunarEarth = earthGroup;
  }

  createHorizonLimb() {
    const horizonGeo = new THREE.CylinderGeometry(150, 150, 22, 48, 1, true);
    const hCanvas = document.createElement('canvas');
    hCanvas.width = 16;
    hCanvas.height = 128;
    const hctx = hCanvas.getContext('2d');
    const grad = hctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 16, 128);

    const horizonTexture = new THREE.CanvasTexture(hCanvas);
    const horizonMat = new THREE.MeshBasicMaterial({
      map: horizonTexture,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    horizonMesh.position.y = 6;
    this.scene.add(horizonMesh);
  }

  createMoonTerrain() {
    const size = 240;
    const segments = 160;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      // Multi-tonal lunar shading: Maria basalt vs Highland anorthosite
      const altitude = Math.max(-6, Math.min(10, y));
      const altNorm = (altitude + 6) / 16; // 0.0 in crater bottom, 1.0 on peak
      const noise = 0.92 + 0.16 * Math.sin(x * 0.35 + z * 0.28) + 0.05 * Math.sin(x * 1.8 - z * 1.2);

      // Low crater floors = dark charcoal basalt; high rims = bright reflective anorthosite
      const r = Math.min(1, (0.22 + altNorm * 0.38) * noise);
      const g = Math.min(1, (0.24 + altNorm * 0.40) * noise);
      const b = Math.min(1, (0.28 + altNorm * 0.45) * noise);

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const moonMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.06,
      flatShading: false
    });

    const terrain = new THREE.Mesh(terrainGeo, moonMat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
    this.terrain = terrain;
  }

  createMoonRocks() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.9, metalness: 0.15 });
    const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.88, metalness: 0.22 });

    const rockPositions = [
      [-5, -2, 1.4, 0],
      [2, -3, 1.0, 0.4],
      [6, -1, 1.8, -0.6],
      [-2, -5, 0.8, 0.8],
      [-7, 2, 1.5, -0.3],
      [5, 4, 1.3, 0.5],
      [-12, -6, 2.4, 0.2],
      [11, -8, 2.1, -0.4],
      [-18, -14, 3.2, 0.6],
      [15, -16, 2.8, 0.1],
      [52, -42, 3.5, 0.3],  // Crater rim rocks
      [58, -48, 2.2, -0.5], // Inside crater boulder
      [-52, -44, 4.0, 0.8], // Mountain ridge boulders
      [46, 28, 2.5, 0.2],   // Anorthosite sampling field
      [-44, 48, 2.8, -0.4]  // Astronomy ridge
    ];

    for (const [x, z, s, rot] of rockPositions) {
      const rockGroup = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      rockGroup.position.set(x, groundY, z);

      const spireGeo = new THREE.ConeGeometry(s * 0.65, s * 1.8, 5);
      const spire = new THREE.Mesh(spireGeo, rockMat);
      spire.position.y = (s * 1.8) * 0.45;
      spire.rotation.y = rot;
      spire.castShadow = true;
      spire.receiveShadow = true;
      rockGroup.add(spire);

      const chunkGeo = new THREE.DodecahedronGeometry(s * 0.55, 0);
      const chunk1 = new THREE.Mesh(chunkGeo, rockDarkMat);
      chunk1.position.set(s * 0.4, s * 0.25, -s * 0.2);
      chunk1.castShadow = true;
      chunk1.receiveShadow = true;
      rockGroup.add(chunk1);

      this.scene.add(rockGroup);
    }
  }

  createMoonDetailPass() {
    const detail = new THREE.Group();
    detail.name = 'LunarRegolithDetails';
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x78808d, roughness: 1, metalness: 0.04 });
    const craterSpecs = [
      [56, -46, 25],
      [-12, -10, 11],
      [14, -12, 9],
      [-2, -18, 14],
      [18, 8, 8],
      [-16, 12, 7]
    ];
    for (const [x, z, radius] of craterSpecs) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.24, radius * 0.07), 6, 32), rimMat);
      rim.rotation.x = Math.PI / 2;
      const groundY = this.getTerrainHeight(x, z);
      rim.position.set(x, groundY + 0.12, z);
      rim.castShadow = true;
      detail.add(rim);
    }
    this.scene.add(detail);
  }

  /* =========================================================================
   * MARS SURFACE ENVIRONMENT
   * Warm dusty atmosphere, Phobos & Deimos, rich rust/terracotta topography.
   * ========================================================================= */
  buildMarsWorld() {
    this.scene.background = new THREE.Color(0x1a0a0c);
    this.scene.fog = new THREE.FogExp2(0x381915, 0.0055);

    // Warm golden-peach solar light casting authentic long shadows
    const sunLight = new THREE.DirectionalLight(0xffbe92, 3.4);
    sunLight.position.set(-25, 36, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0007;
    this.scene.add(sunLight);

    // Rich terracotta ground bounce light
    const groundBounce = new THREE.HemisphereLight(0xffa87d, 0x4a1810, 1.8);
    this.scene.add(groundBounce);

    // Multi-layered dusty Martian Sky Dome
    this.createMarsSkyDome();
    this.createMarsStarfield();
    this.createMarsCelestialBodies();

    // Sculpted 240m x 240m Martian Terrain
    this.createMarsTerrain();
    this.createMarsGeologyPass();
    this.createMarsRocksAndLedges();

    // Planetary Base Hub and All Exploration Landmarks
    this.createBaseHubLandmarks();
    this.createExplorationLandmarks();
  }

  createMarsSkyDome() {
    const skyGeo = new THREE.SphereGeometry(240, 36, 28);
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 16;
    sCanvas.height = 256;
    const sctx = sCanvas.getContext('2d');
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#090e1f');    // Deep twilight zenith
    grad.addColorStop(0.35, '#221118'); // Dusky aubergine
    grad.addColorStop(0.65, '#853e2a'); // Warm iron rust
    grad.addColorStop(0.85, '#bf5b37'); // Terracotta dust glow
    grad.addColorStop(1, '#e08358');    // Horizon peach glow
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 16, 256);

    const skyTexture = new THREE.CanvasTexture(sCanvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  createMarsStarfield() {
    const count = 950;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i * 2.399) % (Math.PI * 2);
      const radius = 180 + (i % 23) * 4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 38 + (i % 29) * 4.4;
      positions[i * 3 + 2] = -90 - (i % 27) * 5;
      const brightness = 0.5 + (i % 5) * 0.1;
      colors[i * 3] = brightness * 0.95;
      colors[i * 3 + 1] = brightness * 0.92;
      colors[i * 3 + 2] = brightness * 0.85;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    })));
  }

  createMarsCelestialBodies() {
    const celestialGroup = new THREE.Group();
    celestialGroup.position.set(-25, 45, -90);

    // Martian Sun with atmospheric dust glow halo
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128;
    sunCanvas.height = 128;
    const sunCtx = sunCanvas.getContext('2d');
    const sunGrad = sunCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sunGrad.addColorStop(0.2, 'rgba(255, 225, 195, 0.95)');
    sunGrad.addColorStop(0.5, 'rgba(235, 145, 95, 0.45)');
    sunGrad.addColorStop(1, 'rgba(200, 80, 45, 0)');
    sunCtx.fillStyle = sunGrad;
    sunCtx.fillRect(0, 0, 128, 128);

    const sunTexture = new THREE.CanvasTexture(sunCanvas);
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    sunSprite.scale.set(16, 16, 1);
    celestialGroup.add(sunSprite);

    // Phobos (irregular natural Martian moon)
    const phobosGeo = new THREE.DodecahedronGeometry(1.4, 1);
    const phobosMat = new THREE.MeshStandardMaterial({ color: 0x857972, roughness: 0.95 });
    const phobos = new THREE.Mesh(phobosGeo, phobosMat);
    phobos.position.set(28, 14, 10);
    phobos.scale.set(1.4, 0.9, 1.1);
    celestialGroup.add(phobos);

    // Deimos (distant tiny moon)
    const deimosGeo = new THREE.DodecahedronGeometry(0.7, 0);
    const deimos = new THREE.Mesh(deimosGeo, phobosMat);
    deimos.position.set(-35, 22, 5);
    celestialGroup.add(deimos);

    this.scene.add(celestialGroup);
  }

  createMarsTerrain() {
    const size = 240;
    const segments = 160;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      // Procedural Martian coloration: Ochre dust, rich terracotta dunes, dark iron basalt
      const altNorm = Math.max(0, Math.min(1, (y + 5.5) / 15));
      const variation = 0.85 + 0.18 * Math.sin(x * 0.31 + z * 0.17) + 0.06 * Math.sin(x * 1.7 - z * 1.1);

      // In craters = darker basalt; on ridges = sun-bleached ochre peach
      const r = Math.min(1, (0.42 + altNorm * 0.42) * variation);
      const g = Math.min(1, (0.16 + altNorm * 0.28) * variation);
      const b = Math.min(1, (0.08 + altNorm * 0.18) * variation);

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const marsMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.91,
      metalness: 0.05,
      flatShading: false
    });

    const terrain = new THREE.Mesh(terrainGeo, marsMat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
    this.terrain = terrain;
  }

  createMarsGeologyPass() {
    const geology = new THREE.Group();
    geology.name = 'MarsGeologyDetails';

    // Layered horizon mountain silhouettes
    const ridgeMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x6e2f23, roughness: 1, metalness: 0, transparent: true, opacity: 0.92 }),
      new THREE.MeshStandardMaterial({ color: 0x98442e, roughness: 1, metalness: 0, transparent: true, opacity: 0.82 }),
      new THREE.MeshStandardMaterial({ color: 0xc16342, roughness: 1, metalness: 0, transparent: true, opacity: 0.65 })
    ];

    const ridgeData = [
      { z: -105, width: 220, base: 0, peaks: [6, 18, 9, 24, 11, 20, 8, 14, 6] },
      { z: -85, width: 190, base: 0.5, peaks: [4, 13, 8, 18, 6, 15, 9, 11, 4] },
      { z: -68, width: 160, base: 1.0, peaks: [3, 9, 6, 14, 5, 11, 6, 9, 3] }
    ];

    for (let layer = 0; layer < ridgeData.length; layer++) {
      const ridge = ridgeData[layer];
      const verts = [];
      const indices = [];
      const step = ridge.width / (ridge.peaks.length - 1);
      for (let i = 0; i < ridge.peaks.length; i++) {
        const x = -ridge.width / 2 + i * step;
        verts.push(x, ridge.base, ridge.z, x, ridge.base + ridge.peaks[i], ridge.z);
        if (i > 0) {
          const a = (i - 1) * 2;
          const b = i * 2;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      ridgeMaterials[layer].side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(geo, ridgeMaterials[layer]);
      mesh.castShadow = true;
      geology.add(mesh);
    }

    // Crater rims
    const craterSpecs = [
      [56, -46, 24],
      [-15, -15, 7],
      [17, -20, 9],
      [-24, 8, 5],
      [24, 7, 4.5],
      [-2, 24, 6.5]
    ];
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xab4b31, roughness: 0.98, metalness: 0.02 });
    for (const [x, z, radius] of craterSpecs) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.24, radius * 0.08), 6, 32), rimMat);
      rim.rotation.x = Math.PI / 2;
      const groundY = this.getTerrainHeight(x, z);
      rim.position.set(x, groundY + 0.1, z);
      rim.castShadow = true;
      geology.add(rim);
    }

    // Instanced Martian pebbles and scattered rocks
    const pebbleGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x763328, roughness: 1, metalness: 0.03 });
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, 220);
    const transform = new THREE.Object3D();
    for (let i = 0; i < 220; i++) {
      const x = ((i * 47) % 1800) / 10 - 90;
      const z = ((i * 73) % 1800) / 10 - 90;
      const groundY = this.getTerrainHeight(x, z);
      const scale = 0.5 + ((i * 17) % 80) / 100;
      transform.position.set(x, groundY + 0.1, z);
      transform.scale.set(scale * 1.5, scale * 0.55, scale);
      transform.rotation.set((i % 7) * 0.3, (i % 11) * 0.4, (i % 5) * 0.25);
      transform.updateMatrix();
      pebbles.setMatrixAt(i, transform.matrix);
    }
    pebbles.instanceMatrix.needsUpdate = true;
    pebbles.castShadow = true;
    pebbles.receiveShadow = true;
    geology.add(pebbles);

    this.scene.add(geology);
    this.marsGeology = geology;
  }

  createMarsRocksAndLedges() {
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x8a3924, roughness: 0.88, metalness: 0.12 });
    const darkBasaltMat = new THREE.MeshStandardMaterial({ color: 0x421b18, roughness: 0.95, metalness: 0.18 });

    const rockPositions = [
      [-5, -2, 1.4],
      [2, -3, 1.0],
      [6, -1, 1.8],
      [-2, -5, 0.8],
      [-7, 2, 1.5],
      [5, 4, 1.3],
      [-11, -5, 2.0],
      [10, -7, 1.8],
      [52, -42, 3.4],
      [58, -48, 2.5],
      [-52, -44, 3.8],
      [46, 28, 2.6],
      [-44, 48, 2.8]
    ];

    for (const [x, z, s] of rockPositions) {
      const groundY = this.getTerrainHeight(x, z);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 0.8, 1), darkBasaltMat);
      rock.position.set(x, groundY + s * 0.4, z);
      rock.scale.set(1.2, 0.75, 1.1);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  /* =========================================================================
   * BASE HUB LANDMARKS (Days 10-13, 16, 18-20, 23, 26-30)
   * Authentic scientific planetary base infrastructure.
   * ========================================================================= */
  createBaseHubLandmarks() {
    const hub = new THREE.Group();
    hub.name = 'BaseHubInfrastructure';

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.82, roughness: 0.25 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.75, roughness: 0.4 });
    const goldFoil = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.22 });
    const solarBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x0c2560, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
    const cyanLight = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 2.2 });
    const greenGrow = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 1.8 });

    // 1. TOUCHDOWN CRADLE & DESCENT SPACECRAFT (at 0, 0) - Day 10
    const lander = new THREE.Group();
    lander.position.set(0, this.getTerrainHeight(0, 0), 0);

    // Scorch circle on regolith
    const scorchMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 });
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), scorchMat);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.04;
    lander.add(scorch);

    // Ascent/Descent Hull
    const hullMat = this.isMars ? metalMat : goldFoil;
    const coreHull = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.9, 3.8, 12), hullMat);
    coreHull.position.y = 2.4;
    coreHull.castShadow = true;
    lander.add(coreHull);

    const upperHull = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 12), metalMat);
    upperHull.position.y = 5.2;
    upperHull.castShadow = true;
    lander.add(upperHull);

    // 4 Heavy Landing Struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), darkMetal);
      leg.position.set(Math.cos(angle) * 2.2, 1.4, Math.sin(angle) * 2.2);
      leg.rotation.z = Math.cos(angle) * 0.45;
      leg.rotation.x = Math.sin(angle) * 0.45;
      leg.castShadow = true;
      lander.add(leg);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.15, 12), darkMetal);
      foot.position.set(Math.cos(angle) * 3.4, 0.08, Math.sin(angle) * 3.4);
      lander.add(foot);
    }
    hub.add(lander);

    // 2. SOLAR FIELD & POWER SUBSTATION (at 14, 8) - Day 11
    const solarGroup = new THREE.Group();
    solarGroup.position.set(14, this.getTerrainHeight(14, 8), 8);
    for (const [offsetX, offsetZ] of [[-2, -1.5], [2, 1.5], [0, 0]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), darkMetal);
      mast.position.set(offsetX, 1.2, offsetZ);
      solarGroup.add(mast);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.5), solarBlue);
      panel.position.set(offsetX, 2.4, offsetZ);
      panel.rotation.x = 0.35;
      panel.rotation.y = 0.2;
      panel.castShadow = true;
      solarGroup.add(panel);
    }
    const substation = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.4), darkMetal);
    substation.position.set(0, 0.55, 0);
    const subBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cyanLight);
    subBeacon.position.set(0, 1.2, 0);
    solarGroup.add(substation, subBeacon);
    hub.add(solarGroup);

    // 3. HABITAT FOUNDATION YARD (at -16, 12) - Day 12
    const yard = new THREE.Group();
    yard.position.set(-16, this.getTerrainHeight(-16, 12), 12);
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 7), darkMetal);
    foundation.position.y = 0.15;
    yard.add(foundation);

    // Structural truss arches
    for (let z = -2.5; z <= 2.5; z += 2.5) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.08, 6, 24, Math.PI), metalMat);
      arch.position.set(0, 0.3, z);
      arch.rotation.x = -Math.PI / 2;
      yard.add(arch);
    }
    hub.add(yard);

    // 4. BIODOME HYDROPONICS GREENHOUSE (at -22, -14) - Day 13, 26
    const greenhouse = new THREE.Group();
    greenhouse.position.set(-22, this.getTerrainHeight(-22, -14), -14);
    greenhouse.name = 'BiodomeGreenhouse';

    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.72,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    // Geodesic glass dome (radius 3.8m)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.8, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
    dome.position.y = 0;
    dome.castShadow = true;
    greenhouse.add(dome);

    // Geodesic lattice ribs
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
    for (let r = 0; r < 4; r++) {
      const ringGeo = new THREE.TorusGeometry(3.8 * Math.sin((r + 1) * 0.3), 0.04, 6, 32);
      const ringMesh = new THREE.Mesh(ringGeo, ribMat);
      ringMesh.position.y = 3.8 * Math.cos((r + 1) * 0.3);
      ringMesh.rotation.x = Math.PI / 2;
      greenhouse.add(ringMesh);
    }

    // Interior NASA-spectrum Magenta/Purple Grow Light Glow
    const growLight = new THREE.PointLight(0xd946ef, 2.8, 12);
    growLight.position.set(0, 2.5, 0);
    greenhouse.add(growLight);

    const cyanBioGlow = new THREE.PointLight(0x38bdf8, 1.8, 8);
    cyanBioGlow.position.set(0, 1.2, 0);
    greenhouse.add(cyanBioGlow);

    // Central Vertical Aeroponic Crop Column
    const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.8, 12), metalMat);
    centerCol.position.y = 1.4;
    greenhouse.add(centerCol);

    // Spiraling green crop foliage along column
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, emissive: 0x15803d, emissiveIntensity: 0.4 });
    for (let i = 0; i < 16; i++) {
      const leafAngle = (i * Math.PI) / 3;
      const leafY = 0.5 + i * 0.14;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), foliageMat);
      leaf.position.set(Math.cos(leafAngle) * 0.55, leafY, Math.sin(leafAngle) * 0.55);
      leaf.rotation.z = Math.cos(leafAngle) * 0.6;
      leaf.rotation.x = Math.sin(leafAngle) * 0.6;
      greenhouse.add(leaf);
    }

    // Tiered hydroponic horizontal grow beds with lush space plants
    for (const [x, z] of [[-1.5, -1.0], [1.5, -1.0], [-1.5, 1.2], [1.5, 1.2]]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.8), darkMetal);
      tray.position.set(x, 0.25, z);
      greenhouse.add(tray);

      const plantCluster = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 1.65), greenGrow);
      plantCluster.position.set(x, 0.55, z);
      greenhouse.add(plantCluster);

      // Overhead micro-LED light bar for each tray
      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      ledBar.position.set(x, 1.1, z);
      greenhouse.add(ledBar);
    }

    // Pressurized airlock entrance tunnel
    const airlock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 2.2), metalMat);
    airlock.position.set(0, 0.8, 3.4);
    airlock.castShadow = true;
    greenhouse.add(airlock);

    // Glowing greenhouse exterior sign
    const signGeo = new THREE.PlaneGeometry(1.3, 0.35);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.5, 4.52);
    greenhouse.add(sign);

    hub.add(greenhouse);

    // 5. CREW LIVING HABITAT & MEDICAL (at -12, 4) - Day 18, 20, 27
    const hab = new THREE.Group();
    hab.position.set(-12, this.getTerrainHeight(-12, 4), 4);
    const mainPod = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 2.8, 16), metalMat);
    mainPod.position.y = 1.4;
    mainPod.castShadow = true;
    hab.add(mainPod);

    const habCap = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), metalMat);
    habCap.position.y = 2.8;
    hab.add(habCap);

    const habAirlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.4), darkMetal);
    habAirlock.position.set(0, 0.7, 2.5);
    const habLight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), cyanLight);
    habLight.position.set(0, 1.5, 3.25);
    hab.add(habAirlock, habLight);
    hub.add(hab);

    // 6. SCIENCE LAB & EXPERIMENT STATION (at 12, -24) - Day 16, 28
    const science = new THREE.Group();
    science.position.set(12, this.getTerrainHeight(12, -24), -24);
    const labModule = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.4), metalMat);
    labModule.position.y = 0.9;
    labModule.castShadow = true;
    science.add(labModule);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.9), darkMetal);
    bench.position.set(0, 0.4, 1.8);
    const holoScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), cyanLight);
    holoScreen.position.set(0, 1.1, 1.8);
    holoScreen.rotation.x = -0.2;
    science.add(bench, holoScreen);
    hub.add(science);

    // 7. ENVIRONMENTAL MONITORING ARRAY (at -28, 28) - Day 19
    const enviro = new THREE.Group();
    enviro.position.set(-28, this.getTerrainHeight(-28, 28), 28);
    const towerMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), darkMetal);
    towerMast.position.y = 2.1;
    enviro.add(towerMast);

    const anemometer = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), cyanLight);
    anemometer.position.y = 4.3;
    enviro.add(anemometer);
    const sensorBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.0), metalMat);
    sensorBox.position.y = 0.4;
    enviro.add(sensorBox);
    hub.add(enviro);

    // 8. LOGISTICS & FOOD DEPOT (at -18, -20) - Day 23
    const depot = new THREE.Group();
    depot.position.set(-18, this.getTerrainHeight(-18, -20), -20);
    for (const [dx, dz] of [[-0.8, -0.6], [0.8, -0.6], [0, 0.8]]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), darkMetal);
      crate.position.set(dx, 0.5, dz);
      crate.castShadow = true;
      depot.add(crate);
    }
    hub.add(depot);

    // 9. ASCENT LAUNCH PAD & RETURN VEHICLE (at 36, 12) - Day 29, 30
    const pad = new THREE.Group();
    pad.position.set(36, this.getTerrainHeight(36, 12), 12);
    const padBase = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 0.6, 16), darkMetal);
    padBase.position.y = 0.3;
    pad.add(padBase);

    // Ascent rocket stage
    const ascentRocket = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 5.2, 16), metalMat);
    ascentRocket.position.y = 3.2;
    ascentRocket.castShadow = true;
    pad.add(ascentRocket);

    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 16), metalMat);
    noseCone.position.y = 6.9;
    pad.add(noseCone);

    // Gantry tower
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.5, 0.8), darkMetal);
    gantry.position.set(-2.6, 4.25, 0);
    pad.add(gantry);
    hub.add(pad);

    this.scene.add(hub);
  }

  /* =========================================================================
   * DISTANT EXPLORATION LANDMARKS (Days 14, 15, 17, 21, 24, 25)
   * Real destinations requiring travel and rover navigation.
   * ========================================================================= */
  createExplorationLandmarks() {
    const landmarks = new THREE.Group();
    landmarks.name = 'ExplorationLandmarks';

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.28 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.75, roughness: 0.4 });
    const amberBeacon = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 2.2 });
    const cyanBeacon = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 2.2 });

    // 1. CRATER EXPEDITION OVERLOOK & TELEMETRY STATION (at 56, -46) - Day 14
    const craterOverlook = new THREE.Group();
    craterOverlook.position.set(54, this.getTerrainHeight(54, -44), -44);
    const craterMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 8), metalMat);
    craterMast.position.y = 1.6;
    craterOverlook.add(craterMast);

    const craterPod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), darkMetal);
    craterPod.position.set(0, 2.9, 0);
    const cLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), amberBeacon);
    cLight.position.set(0, 3.3, 0);
    craterOverlook.add(craterPod, cLight);
    landmarks.add(craterOverlook);

    // 2. ELEVATED OBSERVATION RIDGE SUMMIT (at -54, -48) - Day 15, 22
    const summitRidge = new THREE.Group();
    summitRidge.position.set(-54, this.getTerrainHeight(-54, -48), -48);
    const summitPlatform = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 0.4, 12), darkMetal);
    summitPlatform.position.y = 0.2;
    summitRidge.add(summitPlatform);

    const surveyMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8), metalMat);
    surveyMast.position.y = 2.3;
    summitRidge.add(surveyMast);

    const optics = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), cyanBeacon);
    optics.position.set(0, 4.4, 0);
    summitRidge.add(optics);
    landmarks.add(summitRidge);

    // 3. REGOLITH & HEMATITE DRILL FIELD (at 48, 32) - Day 17
    const drillField = new THREE.Group();
    drillField.position.set(48, this.getTerrainHeight(48, 32), 32);
    const drillTower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 3.8, 4), darkMetal);
    drillTower.position.y = 1.9;
    drillField.add(drillTower);

    const drillBit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 1.2, 8), metalMat);
    drillBit.position.y = 0.4;
    drillField.add(drillBit);

    const sampleCart = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.0), metalMat);
    sampleCart.position.set(1.5, 0.35, 0.8);
    drillField.add(sampleCart);
    landmarks.add(drillField);

    // 4. DEEP-SKY ASTRONOMY ARRAY (at -46, 52) - Day 21
    const astroArray = new THREE.Group();
    astroArray.position.set(-46, this.getTerrainHeight(-46, 52), 52);
    const dishBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8), darkMetal);
    dishBase.position.y = 1.1;
    astroArray.add(dishBase);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), metalMat);
    dish.position.set(0, 2.8, 0);
    dish.rotation.x = -0.55;
    dish.rotation.z = 0.3;
    astroArray.add(dish);
    landmarks.add(astroArray);

    // 5. STRANDED ROVER / LUNAR SURVEYOR RECOVERY (at 68, -12) - Day 24
    const recoverySite = new THREE.Group();
    recoverySite.position.set(68, this.getTerrainHeight(68, -12), -12);
    if (this.isMars) {
      // Stranded robotic rover with tilted solar wings
      const derelict = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.2), darkMetal);
      derelict.position.y = 0.45;
      derelict.rotation.z = 0.15;
      derelict.rotation.y = 0.4;
      derelict.castShadow = true;
      recoverySite.add(derelict);

      const derelictWing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 0.8), darkMetal);
      derelictWing.position.set(0, 0.75, 0);
      derelictWing.rotation.z = 0.15;
      recoverySite.add(derelictWing);

      // Flashing emergency transponder
      const transponder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), amberBeacon);
      transponder.position.set(0, 1.2, 0);
      this.recoveryTransponder = transponder;
      recoverySite.add(transponder);
    } else {
      // Historic Surveyor probe
      const surveyor = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.8, 6), metalMat);
      surveyor.position.y = 0.9;
      surveyor.castShadow = true;
      recoverySite.add(surveyor);

      const retro = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.2), amberBeacon);
      retro.position.set(0, 1.9, 0);
      recoverySite.add(retro);
    }
    landmarks.add(recoverySite);

    // 6. CARGO RESUPPLY DROP ZONE (at 28, -36) - Day 25
    const dropZone = new THREE.Group();
    dropZone.position.set(28, this.getTerrainHeight(28, -36), -36);
    const dropRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.4, 24), amberBeacon);
    dropRing.rotation.x = -Math.PI / 2;
    dropRing.position.y = 0.05;
    dropZone.add(dropRing);

    const cargoPod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.2, 12), metalMat);
    cargoPod.position.y = 1.1;
    cargoPod.castShadow = true;
    dropZone.add(cargoPod);
    landmarks.add(dropZone);

    this.scene.add(landmarks);
  }

  /* =========================================================================
   * SHARED SCIENCE BEACONS & ROVER
   * Distinct physical beacons with vertical holographic beams visible across the world.
   * ========================================================================= */
  createObjectiveBeacons() {
    // Clear any previous beacons
    for (const b of this.beacons) {
      this.scene.remove(b);
    }
    this.beacons = [];

    const tasks = this.game.tasks || [];
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      const beacon = new THREE.Group();

      const posX = task.pos[0];
      const posZ = task.pos[1];
      const groundY = this.getTerrainHeight(posX, posZ);
      beacon.position.set(posX, groundY + 0.05, posZ);

      const isResearch = task.interaction === 'record' || task.interaction === 'transmit' || task.interaction === 'experiment' || task.interaction === 'observe';
      const primaryColor = isResearch ? 0x38bdf8 : (this.isMars ? 0xf97316 : 0xfacc15);

      // 1. Pulsing Ground Ring
      const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: primaryColor, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      beacon.add(ring);

      // 2. Tall Vertical Hologram Light Beam (12m tall, easily spotted across distance)
      const beamGeo = new THREE.CylinderGeometry(0.04, 0.22, 12, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 6.0;
      beacon.add(beam);

      // 3. Floating Rotating Octahedron Crystal
      const diamondGeo = new THREE.OctahedronGeometry(0.38, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: primaryColor,
        emissive: primaryColor,
        emissiveIntensity: 1.8,
        roughness: 0.2
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.y = 1.6;
      diamond.castShadow = true;
      beacon.add(diamond);

      beacon.userData = { task, diamond, ring, beam, primaryColor, index };
      beacon.visible = !task.done;

      this.scene.add(beacon);
      this.beacons.push(beacon);
    }
  }

  isRoverMission() {
    return this.game.mission?.mission_id === 'M014' ||
           this.game.mission?.mission_id === 'M024' ||
           (this.game.campaign?.day >= 14);
  }

  createRover() {
    if (this.rover) return;

    const root = new THREE.Group();
    root.name = 'COSMOS Exploration Rover';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.isMars ? 0xc25b30 : 0x94a3b8,
      metalness: 0.65,
      roughness: 0.35
    });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.3 });

    // Rover Main Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.4), bodyMat);
    body.position.y = 0.58;
    body.castShadow = true;
    root.add(body);

    // Pressurized Cabin / Cockpit
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.52, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0f2438, metalness: 0.7, roughness: 0.25 })
    );
    cabin.position.set(0, 0.98, 0.3);
    cabin.castShadow = true;
    root.add(cabin);

    // Articulated Sensor Mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 })
    );
    mast.position.set(0, 1.55, -0.4);
    root.add(mast);

    const cameraHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.4 })
    );
    cameraHead.position.set(0, 1.98, -0.4);
    root.add(cameraHead);

    // Dual Forward LED Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const lx of [-0.55, 0.55]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lightMat);
      lamp.position.set(lx, 0.65, -1.22);
      root.add(lamp);
    }

    // 6 Planetary Rocker-Bogie All-Terrain Wheels
    const wheels = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92, metalness: 0.1 });
    const wheelOffsets = [
      [-0.95, -0.85], [0.95, -0.85], // Front
      [-0.98, 0.0],   [0.98, 0.0],   // Middle
      [-0.95, 0.85],  [0.95, 0.85]   // Rear
    ];

    for (const [wx, wz] of wheelOffsets) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, wz);
      wheel.castShadow = true;
      root.add(wheel);
      wheels.push(wheel);
    }

    // Place rover near the player or base hub
    const initX = this.game.player ? this.game.player.x : 0;
    const initZ = this.game.player ? this.game.player.z - 2.4 : -2.4;
    const groundY = this.getTerrainHeight(initX, initZ);
    root.position.set(initX, groundY + 0.08, initZ);

    this.scene.add(root);
    this.rover = { root, wheels };

    this.game.rover = this.game.rover || {
      position: { x: initX, z: initZ },
      heading: 0,
      speed: 0,
      deployed: true,
      entered: false
    };

    root.visible = Boolean(this.game.rover.deployed);
  }

  /* =========================================================================
   * ANIMATION & CAMERA LOOP
   * Tracks terrain height, slopes, vehicle movement, beacons, and companion.
   * ========================================================================= */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.04, this.clock.getDelta());
    const time = this.clock.getElapsedTime();
    const p = this.game.player;

    // 1. Astronaut Position on Procedural Ground
    const playerGroundY = this.getTerrainHeight(p.x, p.z);
    this.astronaut.root.position.set(p.x, playerGroundY + (p.y || 0), p.z);
    this.astronaut.root.visible = this.game.vehicle !== 'rover';
    this.astronaut.root.rotation.y = this.game.facing || 0;

    const moving = Boolean(this.game.moving);
    this.astronaut.update(dt, this.game.moveSpeed || 0, moving);

    // 2. PICO-7 Companion Updates
    this.pico.update(dt, p, this.obstacles);
    // Align PICO-7 hover height to procedural terrain
    const picoGroundY = this.getTerrainHeight(this.pico.root.position.x, this.pico.root.position.z);
    this.pico.root.position.y = picoGroundY + 0.14 + Math.sin(this.pico.animTime * 2.5) * 0.018;

    // 3. Rover Updates & Ground Slope Alignment
    if (this.rover && this.game.rover) {
      const rp = this.game.rover.position;
      const roverGroundY = this.getTerrainHeight(rp.x, rp.z);
      this.rover.root.position.set(rp.x, roverGroundY + 0.08, rp.z);

      const heading = this.game.rover.heading || 0;
      this.rover.root.rotation.y = heading;
      this.rover.root.visible = Boolean(this.game.rover.deployed);

      // Calculate terrain slope pitch & roll for realistic ground riding
      const hFront = this.getTerrainHeight(rp.x + Math.sin(heading) * 1.2, rp.z + Math.cos(heading) * 1.2);
      const hBack = this.getTerrainHeight(rp.x - Math.sin(heading) * 1.2, rp.z - Math.cos(heading) * 1.2);
      const hRight = this.getTerrainHeight(rp.x + Math.cos(heading) * 0.9, rp.z - Math.sin(heading) * 0.9);
      const hLeft = this.getTerrainHeight(rp.x - Math.cos(heading) * 0.9, rp.z + Math.sin(heading) * 0.9);

      this.rover.root.rotation.x = Math.atan2(hFront - hBack, 2.4);
      this.rover.root.rotation.z = Math.atan2(hRight - hLeft, 1.8);

      for (const wheel of this.rover.wheels) {
        wheel.rotation.x += (this.game.rover.speed || 0) * dt * 5;
      }
    }

    // 4. Physical Mission Beacons Updates
    for (const beacon of this.beacons) {
      const task = beacon.userData.task;
      beacon.visible = !task.done;

      if (beacon.visible) {
        beacon.userData.diamond.rotation.y += dt * 2.4;
        beacon.userData.ring.rotation.z -= dt * 1.8;

        const guided = this.game.guidedObjectiveId === task.id;
        const pulse = 1.0 + Math.sin(time * 5.0) * 0.15;
        beacon.scale.setScalar(guided ? 1.4 * pulse : 1.0);
        beacon.userData.beam.material.opacity = guided ? 0.65 : 0.35;
      }
    }

    // 5. Celestial Earth slow rotation
    if (this.lunarEarth) {
      this.lunarEarth.rotation.y = time * 0.015;
    }

    // 6. Camera Follow System
    const yaw = this.game.yaw || 0;
    const pitch = this.game.pitch || 0;

    if (this.game.vehicle === 'rover' && this.game.rover) {
      const rp = this.game.rover.position;
      const rGround = this.getTerrainHeight(rp.x, rp.z);
      const roverHeading = this.game.rover.heading || 0;
      const camDist = 8.5;
      const camHeight = 3.6 + pitch * 1.5;

      const targetCamera = new THREE.Vector3(
        rp.x - Math.sin(roverHeading) * camDist,
        rGround + Math.max(1.5, camHeight),
        rp.z - Math.cos(roverHeading) * camDist
      );
      this.camera.position.lerp(targetCamera, 1 - Math.pow(0.0001, dt));
      this.camera.lookAt(rp.x, rGround + 1.2, rp.z);
    } else {
      const camDist = 6.4;
      const camHeight = 2.3 + pitch * 1.5;

      const targetCamera = new THREE.Vector3(
        p.x + Math.sin(yaw) * camDist,
        playerGroundY + Math.max(1.0, camHeight),
        p.z + Math.cos(yaw) * camDist
      );
      this.camera.position.lerp(targetCamera, 1 - Math.pow(0.0001, dt));
      this.camera.lookAt(p.x, playerGroundY + 1.35 + (p.y || 0) * 0.4, p.z);
    }

    this.renderer.render(this.scene, this.camera);
  }

  getPicoPosition() {
    return this.pico ? this.pico.root.position : null;
  }

  setPicoGuideTarget(target) {
    if (this.pico) this.pico.setGuideTarget(target);
  }

  setPicoEmotion(emotion) {
    if (this.pico) this.pico.setEmotion(emotion);
  }

  setPicoTalking(val) {
    if (this.pico) this.pico.setTalking(val);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}
