import * as THREE from 'three';
import { AstronautCharacter } from './astronaut.js';
import { Pico7Companion } from './pico7.js';

/**
 * High-Fidelity 3D Earth Astronaut Preparation Environment.
 * Features an aerospace cleanroom & launch integration hangar, gantry trusses,
 * sleek spacecraft, Astro Bot-inspired PICO-7 companion, and 5 interactive stations.
 */
export class EarthPreparationScene {
  constructor(canvas, gameOptions = {}) {
    this.canvas = canvas;
    this.options = gameOptions;
    this.animationId = null;
    this.clock = new THREE.Clock();

    // Input state
    this.keys = new Set();
    this.mouseLook = { yaw: 0, pitch: 0.28 };
    this.player = {
      x: 0,
      z: 3.8,
      y: 0,
      vy: 0,
      speed: 0,
      facing: 0,
    };
    this.carriedItem = null; // 'oxygen', 'tool', etc.

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060c18);
    this.scene.fog = new THREE.FogExp2(0x060c18, 0.015);

    // Camera with expansive 62-degree FOV for clear spatial awareness
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 500);

    // 3. Lighting (Hangar industrial illumination & atmospheric window light)
    this.setupLighting();

    // 4. Hangar Architecture (Floor, Trusses, Walls, Launchpad Window)
    this.createHangarArchitecture();

    // 5. Sleek Aerospace Spacecraft (Matching Inspiration Image 3)
    this.createSpacecraft();

    // 6. PICO-7 Companion (Matching Inspiration Image 4 / Astro Bot)
    this.pico = new Pico7Companion();
    this.picoGroup = this.pico.root;
    this.scene.add(this.picoGroup);

    // 7. Interactive Stations & Equipment
    this.createInteractiveStations();

    // 8. Player 3D Astronaut
    this.astronaut = new AstronautCharacter({ mode: 'ground' });
    this.scene.add(this.astronaut.root);

    // Start loop
    this.animate();
  }

  setupLighting() {
    // Ambient fill (cool industrial navy)
    const ambient = new THREE.AmbientLight(0x0f1d38, 1.4);
    this.scene.add(ambient);

    // Primary overhead hangar floodlight
    const mainSun = new THREE.DirectionalLight(0xf1f5f9, 2.8);
    mainSun.position.set(-8, 18, 10);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 50;
    mainSun.shadow.camera.left = -16;
    mainSun.shadow.camera.right = 16;
    mainSun.shadow.camera.top = 16;
    mainSun.shadow.camera.bottom = -16;
    mainSun.shadow.bias = -0.0005;
    this.scene.add(mainSun);

    // Daylight stream from panoramic launchpad window
    const windowLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    windowLight.position.set(0, 8, -15);
    this.scene.add(windowLight);

    // Warm station accent lights
    const warmAccent = new THREE.PointLight(0xff9d5c, 1.8, 14);
    warmAccent.position.set(-4, 3, -3);
    this.scene.add(warmAccent);

    const cyanAccent = new THREE.PointLight(0x00f0ff, 2.2, 16);
    cyanAccent.position.set(4, 3.5, -2);
    this.scene.add(cyanAccent);
  }

  createHangarArchitecture() {
    this.hangarGroup = new THREE.Group();

    // 1. Polished Epoxy Hangar Floor with Specular Sheen
    const floorGeo = new THREE.PlaneGeometry(36, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1524,
      roughness: 0.28,
      metalness: 0.45,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.hangarGroup.add(floor);

    // Floor markings & Hazard Striping (Tactile yellow/black boundary)
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, opacity: 0.75, transparent: true });
    const cyanMarkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, opacity: 0.7, transparent: true });

    // Safety boundary lines on floor
    const lineGeo = new THREE.PlaneGeometry(28, 0.14);
    const line1 = new THREE.Mesh(lineGeo, markingMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(0, 0.005, -5.8);
    const line2 = new THREE.Mesh(lineGeo, markingMat);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(0, 0.005, 5.8);
    this.hangarGroup.add(line1, line2);

    // Bay 01 Staging Circle
    const circleGeo = new THREE.RingGeometry(2.4, 2.55, 32);
    const circleMesh = new THREE.Mesh(circleGeo, cyanMarkMat);
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.set(0, 0.006, 0);
    this.hangarGroup.add(circleMesh);

    // 2. High-strength Steel Overhead Gantry Trusses
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8,
    });

    for (let z = -8; z <= 8; z += 5.5) {
      const trussBeamGeo = new THREE.BoxGeometry(32, 0.35, 0.35);
      const beam = new THREE.Mesh(trussBeamGeo, trussMat);
      beam.position.set(0, 6.5, z);
      beam.castShadow = true;
      this.hangarGroup.add(beam);

      // Support columns
      const colGeo = new THREE.BoxGeometry(0.5, 7, 0.5);
      const colL = new THREE.Mesh(colGeo, trussMat);
      colL.position.set(-15, 3.5, z);
      const colR = new THREE.Mesh(colGeo, trussMat);
      colR.position.set(15, 3.5, z);
      this.hangarGroup.add(colL, colR);

      // Diagonal cross braces
      const braceGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8);
      const brace1 = new THREE.Mesh(braceGeo, trussMat);
      brace1.rotation.z = Math.PI / 4;
      brace1.position.set(-13, 5, z);
      const brace2 = new THREE.Mesh(braceGeo, trussMat);
      brace2.rotation.z = -Math.PI / 4;
      brace2.position.set(13, 5, z);
      this.hangarGroup.add(brace1, brace2);
    }

    // Overhead Yellow Bridge Crane Rail
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.7 });
    const craneRail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 26), craneMat);
    craneRail.position.set(0, 6.2, 0);
    this.hangarGroup.add(craneRail);

    // 3. Panoramic Observation Window to Launchpad
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
    });

    // Back wall window frame
    const wallGeo = new THREE.BoxGeometry(34, 8, 0.4);
    const wallMesh = new THREE.Mesh(wallGeo, windowFrameMat);
    wallMesh.position.set(0, 4, -9.5);
    this.hangarGroup.add(wallMesh);

    // Large window glass cutouts
    for (let x = -10; x <= 10; x += 5) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.5, 0.08), glassMat);
      pane.position.set(x, 4.2, -9.45);
      this.hangarGroup.add(pane);

      // Exterior Launch Gantry visible through window
      const gantryTower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 1.2), trussMat);
      gantryTower.position.set(x * 0.8 + 2, 6, -18);
      this.hangarGroup.add(gantryTower);
    }

    // Distant Launchpad Sky Horizon (Visible through glass)
    const skyGeo = new THREE.PlaneGeometry(60, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0d2847,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, 8, -22);
    this.hangarGroup.add(skyMesh);

    // 4. Industrial Wall Graphics & NASA Artemis Stencils
    const bayBannerTex = this.createDecalTexture(
      'NASA ARTEMIS // EXPEDITION BAY-01',
      'PRIMARY LAUNCH INTEGRATION & FLIGHT SUIT STAGING',
      '#38bdf8',
      1024,
      192
    );
    const bayBannerGeo = new THREE.PlaneGeometry(12, 2.2);
    const bayBannerMat = new THREE.MeshBasicMaterial({ map: bayBannerTex, transparent: true });
    const bayBanner = new THREE.Mesh(bayBannerGeo, bayBannerMat);
    bayBanner.position.set(0, 6.35, -9.28);
    this.hangarGroup.add(bayBanner);

    // Airlock station warning sign
    const airlockSignTex = this.createDecalTexture(
      'AIRLOCK 04 - FLIGHT CREW',
      'AUTHORIZED PERSONNEL ONLY // SEAL INTEGRITY VERIFIED',
      '#f59e0b',
      512,
      128
    );
    const airlockSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: airlockSignTex, transparent: true })
    );
    airlockSign.position.set(5.2, 3.4, -1.0);
    this.hangarGroup.add(airlockSign);

    // LOX cryogenic servicing sign
    const loxSignTex = this.createDecalTexture(
      'LOX REFUELING DECK',
      'HIGH PRESSURE MEDICAL O2 // 99.8% PURITY',
      '#00f0ff',
      512,
      128
    );
    const loxSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: loxSignTex, transparent: true })
    );
    loxSign.position.set(-4.5, 2.65, -3.8);
    this.hangarGroup.add(loxSign);

    // 5. Cinematic Volumetric Spotlight God-Rays from Overhead Gantry
    this.createVolumetricBeams();

    this.scene.add(this.hangarGroup);
  }

  createDecalTexture(title, subtitle, accentColor = '#0284c7', width = 512, height = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Dark titanium backing panel
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Precision boundary frame
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Left accent badge bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(12, 12, 8, height - 24);

    // Corner notches
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(width - 16, 0, 16, 16);
    ctx.fillRect(0, height - 16, 16, 16);
    ctx.fillRect(width - 16, height - 16, 16, 16);

    // Main title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px "Segoe UI", Roboto, system-ui, sans-serif';
    ctx.fillText(title, 32, 50);

    // Subtitle
    ctx.fillStyle = accentColor;
    ctx.font = '600 16px "Segoe UI", Roboto, monospace';
    ctx.fillText(subtitle, 32, 88);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createVolumetricBeams() {
    const beams = [
      { from: [-4.5, 6.4, -3.2], to: [-4.5, 0.8, -3.2], color: 0x00f0ff, opacity: 0.08, botR: 1.4 },
      { from: [0, 6.4, -3.2], to: [0, 0.8, -3.2], color: 0x38bdf8, opacity: 0.07, botR: 1.4 },
      { from: [2.4, 6.4, -2.4], to: [2.4, 0.8, -2.4], color: 0x10b981, opacity: 0.07, botR: 1.3 },
      { from: [6.8, 6.4, -2.5], to: [6.8, 1.2, -2.5], color: 0x38bdf8, opacity: 0.10, botR: 2.2 },
    ];

    for (const b of beams) {
      const height = b.from[1] - b.to[1];
      const geo = new THREE.CylinderGeometry(0.18, b.botR, height, 18, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: b.color,
        transparent: true,
        opacity: b.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const cone = new THREE.Mesh(geo, mat);
      cone.position.set(b.from[0], b.from[1] - height / 2, b.from[2]);
      this.hangarGroup.add(cone);
    }
  }

  createSpacecraft() {
    this.shipGroup = new THREE.Group();
    this.shipGroup.position.set(6.8, 0, -2.5);
    this.shipGroup.rotation.y = -Math.PI * 0.55;
    this.shipGroup.scale.set(1.24, 1.24, 1.24);

    // Materials matching Inspiration Image 3
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Clean ceramic aerospace white
      roughness: 0.35,
      metalness: 0.15,
    });
    const heatShieldMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Black thermal protection tiles
      roughness: 0.65,
      metalness: 0.2,
    });
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Glossy blue cockpit canopy
      metalness: 0.9,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const engineGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.2,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const racingBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.3,
      metalness: 0.6,
    });

    // 1. Aerodynamic Needle Fuselage
    const noseGeo = new THREE.ConeGeometry(0.75, 4.8, 24);
    noseGeo.rotateX(Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, hullMat);
    noseMesh.position.set(0, 1.2, 2.2);
    noseMesh.castShadow = true;
    this.shipGroup.add(noseMesh);

    // Main Mid-Fuselage
    const midGeo = new THREE.CylinderGeometry(0.85, 0.95, 4.5, 24);
    midGeo.rotateX(Math.PI / 2);
    midGeo.scale(1.2, 0.85, 1);
    const midMesh = new THREE.Mesh(midGeo, hullMat);
    midMesh.position.set(0, 1.2, -1.8);
    midMesh.castShadow = true;
    this.shipGroup.add(midMesh);

    // Underside Heat Shield Tile Layer
    const tileGeo = new THREE.BoxGeometry(2.4, 0.15, 6.5);
    const tileMesh = new THREE.Mesh(tileGeo, heatShieldMat);
    tileMesh.position.set(0, 0.65, -0.6);
    this.shipGroup.add(tileMesh);

    // 2. Cockpit Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.48, 20, 16);
    canopyGeo.scale(0.8, 0.65, 2.4);
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0, 1.82, 0.5);
    this.shipGroup.add(canopyMesh);

    // 3. Swept Delta Wings (Inspiration Image 3)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.8, -2.6);
    wingShape.lineTo(2.4, -3.8);
    wingShape.lineTo(0, -3.2);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);

    // Right Wing
    const rightWing = new THREE.Mesh(wingGeo, hullMat);
    rightWing.position.set(0.6, 1.05, 0.8);
    rightWing.castShadow = true;

    // Left Wing
    const leftWing = new THREE.Mesh(wingGeo, hullMat);
    leftWing.scale.set(-1, 1, 1);
    leftWing.position.set(-0.6, 1.05, 0.8);
    leftWing.castShadow = true;
    this.shipGroup.add(rightWing, leftWing);

    // 4. Canted Twin Vertical Stabilizers (Matching Inspiration 3)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.7, 1.5);
    finShape.lineTo(0.2, 1.7);
    finShape.lineTo(-0.5, 0);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    finGeo.rotateY(Math.PI / 2);

    const finL = new THREE.Mesh(finGeo, hullMat);
    finL.position.set(-1.25, 1.35, -2.2);
    finL.rotation.z = 0.22;
    finL.castShadow = true;

    const finR = new THREE.Mesh(finGeo, hullMat);
    finR.position.set(1.25, 1.35, -2.2);
    finR.rotation.z = -0.22;
    finR.castShadow = true;

    // Accent Navy Stripes on Fins
    const stripeGeo = new THREE.BoxGeometry(0.08, 0.35, 0.6);
    const stripeL = new THREE.Mesh(stripeGeo, racingBlueMat);
    stripeL.position.set(-1.26, 1.95, -2.3);
    stripeL.rotation.z = 0.22;
    const stripeR = new THREE.Mesh(stripeGeo, racingBlueMat);
    stripeR.position.set(1.26, 1.95, -2.3);
    stripeR.rotation.z = -0.22;
    this.shipGroup.add(finL, finR, stripeL, stripeR);

    // 5. Twin Pod Engines (Nacelles) on Wings
    const podGeo = new THREE.CylinderGeometry(0.38, 0.44, 3.2, 20);
    podGeo.rotateX(Math.PI / 2);

    const podL = new THREE.Mesh(podGeo, hullMat);
    podL.position.set(-2.0, 1.4, -2.2);
    podL.castShadow = true;

    const podR = new THREE.Mesh(podGeo, hullMat);
    podR.position.set(2.0, 1.4, -2.2);
    podR.castShadow = true;

    // Glowing Engine Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.3, 0.22, 0.4, 16);
    nozzleGeo.rotateX(Math.PI / 2);

    const nozL = new THREE.Mesh(nozzleGeo, engineGlowMat);
    nozL.position.set(-2.0, 1.4, -3.8);
    const nozR = new THREE.Mesh(nozzleGeo, engineGlowMat);
    nozR.position.set(2.0, 1.4, -3.8);

    this.shipGroup.add(podL, podR, nozL, nozR);

    // 6. Boarding Access Bridge / Gantry
    const bridgeGeo = new THREE.BoxGeometry(2.4, 0.2, 1.4);
    const bridge = new THREE.Mesh(bridgeGeo, metalMat);
    bridge.position.set(-1.8, 1.1, 0.5);
    this.shipGroup.add(bridge);

    this.scene.add(this.shipGroup);
  }

  createPicoCompanion() {
    this.picoGroup = new THREE.Group();
    this.picoGroup.position.set(-2.6, 0.95, -1.2);

    // Materials inspired by Inspiration #4 (Astro Bot)
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.1,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.25,
      metalness: 0.4,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.1,
      metalness: 0.95,
    });
    const visorFaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1128,
      roughness: 0.05,
      metalness: 0.85,
      clearcoat: 1.0,
    });
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    // Rounded Head/Monitor
    const headGeo = new THREE.BoxGeometry(0.68, 0.56, 0.52);
    const headMesh = new THREE.Mesh(headGeo, ceramicMat);
    headMesh.castShadow = true;
    this.picoGroup.add(headMesh);

    // Cyan accent cap
    const capGeo = new THREE.BoxGeometry(0.7, 0.12, 0.54);
    const capMesh = new THREE.Mesh(capGeo, blueMat);
    capMesh.position.y = 0.24;
    this.picoGroup.add(capMesh);

    // Visor Faceplate
    const visorGeo = new THREE.PlaneGeometry(0.54, 0.38);
    const visorMesh = new THREE.Mesh(visorGeo, visorFaceMat);
    visorMesh.position.set(0, -0.02, 0.262);
    this.picoGroup.add(visorMesh);

    // Expressive Cyan LED Eyes
    const eyeGeo = new THREE.PlaneGeometry(0.1, 0.14);
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.14, 0, 0.265);

    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR.position.set(0.14, 0, 0.265);
    this.picoGroup.add(this.eyeL, this.eyeR);

    // Top Antenna with Glowing Beacon
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22);
    const stem = new THREE.Mesh(stemGeo, chromeMat);
    stem.position.set(0, 0.4, 0);

    const tipGeo = new THREE.SphereGeometry(0.045, 12, 12);
    this.beacon = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    this.beacon.position.set(0, 0.52, 0);
    this.picoGroup.add(stem, this.beacon);

    // Levitating Hover Base (No clumsy legs)
    const hoverRingGeo = new THREE.TorusGeometry(0.25, 0.06, 12, 24);
    hoverRingGeo.rotateX(Math.PI / 2);
    const hoverRing = new THREE.Mesh(hoverRingGeo, blueMat);
    hoverRing.position.y = -0.38;

    const pulseGeo = new THREE.CylinderGeometry(0.2, 0.02, 0.3, 16);
    this.hoverPulse = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
    }));
    this.hoverPulse.position.y = -0.52;

    this.picoGroup.add(hoverRing, this.hoverPulse);

    this.scene.add(this.picoGroup);
  }

  createInteractiveStations() {
    this.stations = {};

    // 1. Oxygen Service Station & Canister
    this.stations.oxygen = this.buildOxygenStation();

    // 2. Diagnostic Toolkit Station
    this.stations.tool = this.buildToolStation();

    // 3. Astronaut Suit Diagnostic Podium
    this.stations.suit = this.buildSuitDiagnosticStation();

    // 4. Gantry Airlock Blast Door & Keypad Terminal
    this.stations.airlock = this.buildAirlockStation();

    // 5. Spacecraft Boarding Gantry Marker
    this.stations.board = this.buildBoardingStation();
  }

  buildOxygenStation() {
    const group = new THREE.Group();
    group.position.set(-4.5, 0, -3.2);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.8 });
    const dewarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.5 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.15, metalness: 0.95 });

    // Workbench Table
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 1.4), metalMat);
    bench.position.y = 0.425;
    bench.castShadow = true;
    bench.receiveShadow = true;
    group.add(bench);

    // Dual Cryogenic LOX Dewars
    const dewarGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 20);
    const d1 = new THREE.Mesh(dewarGeo, dewarMat);
    d1.position.set(-0.7, 1.55, -0.2);
    const d2 = new THREE.Mesh(dewarGeo, dewarMat);
    d2.position.set(0.7, 1.55, -0.2);
    d1.castShadow = true;
    d2.castShadow = true;
    group.add(d1, d2);

    // Frosted Manifold Pipes & Dial
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 2.1, -0.2);
    group.add(pipe);

    // Removable Oxygen Canister (Pickup item)
    const canGroup = new THREE.Group();
    canGroup.position.set(0, 0.95, 0.2);

    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.4 })
    );
    const canRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.142, 0.02, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    canRing.rotation.x = Math.PI / 2;
    canGroup.add(canBody, canRing);
    canGroup.castShadow = true;

    this.oxygenCanisterMesh = canGroup;
    group.add(canGroup);

    // Floating Interaction Beacon
    this.createBeacon(group, [0, 2.2, 0], 0x00f0ff);
    // Separate orange install beacon makes the destination obvious after pickup.
    this.createBeacon(group, [2.3, 0.12, 0], 0xffa45b);

    this.scene.add(group);
    return group;
  }

  buildToolStation() {
    const group = new THREE.Group();
    group.position.set(0, 0, -3.2);

    const deskMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.4), deskMat);
    desk.position.y = 0.425;
    desk.castShadow = true;
    desk.receiveShadow = true;
    group.add(desk);

    // Oscilloscope / Diagnostic Telemetry Screen
    const screenGeo = new THREE.BoxGeometry(0.8, 0.55, 0.15);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    screen.position.set(-0.5, 1.15, -0.3);
    group.add(screen);

    // Orange Pelican-Style EVA Flight Toolkit (Pickup item)
    const crateGroup = new THREE.Group();
    crateGroup.position.set(0.4, 0.95, 0.1);

    const crateGeo = new THREE.BoxGeometry(0.48, 0.24, 0.34);
    const crateMesh = new THREE.Mesh(
      crateGeo,
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.2 })
    );
    const handleGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);
    const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    handle.position.set(0, 0.14, 0);

    crateGroup.add(crateMesh, handle);
    crateGroup.castShadow = true;

    this.toolkitMesh = crateGroup;
    group.add(crateGroup);

    // Floating Interaction Beacon
    this.createBeacon(group, [0.4, 1.8, 0], 0xf97316);

    this.scene.add(group);
    return group;
  }

  buildSuitDiagnosticStation() {
    const group = new THREE.Group();
    group.position.set(2.4, 0, -2.4);

    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });

    // Platform Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.15, 32), podiumMat);
    base.position.y = 0.075;
    group.add(base);

    // Holographic Scanner Ring
    this.scannerRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 8, 32), ringMat);
    this.scannerRing.rotation.x = Math.PI / 2;
    this.scannerRing.position.y = 1.2;
    group.add(this.scannerRing);

    // Diagnostic Console Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.3), podiumMat);
    tower.position.set(1.1, 0.65, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.4), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    screen.rotation.y = -Math.PI / 2;
    screen.position.set(0.94, 1.1, 0);
    group.add(tower, screen);

    // Floating Interaction Beacon
    this.createBeacon(group, [0, 2.2, 0], 0x10b981);

    this.scene.add(group);
    return group;
  }

  buildAirlockStation() {
    const group = new THREE.Group();
    group.position.set(5.2, 0, -1.2);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.85 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.9 });

    // Heavy Bulkhead Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.4), frameMat);
    frame.position.y = 1.6;
    group.add(frame);

    // Sliding Airlock Door Panel with Hazard Stripes
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.6, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.4 })
    );
    door.position.set(0, 1.3, 0.05);
    group.add(door);

    // Amber Caution Strobe Beacon
    const strobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    strobe.position.set(0, 3.1, 0.25);
    group.add(strobe);

    // Keypad Console Pedestal
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 0.25), metalMat);
    pedestal.position.set(-0.85, 0.55, 0.6);
    const keypad = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    keypad.rotation.x = -Math.PI / 6;
    keypad.position.set(-0.85, 1.12, 0.62);
    group.add(pedestal, keypad);

    this.createBeacon(group, [-0.85, 1.8, 0.6], 0xf59e0b);

    this.scene.add(group);
    return group;
  }

  buildBoardingStation() {
    const group = new THREE.Group();
    group.position.set(7.8, 0, 0);

    // Boarding Gate Beacon
    this.createBeacon(group, [0, 2.4, 0], 0x38bdf8);

    // Walkway Guidance Lamps
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let z = -1; z <= 1; z += 1) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), lampMat);
      lamp.position.set(0, 0.1, z);
      group.add(lamp);
    }

    this.scene.add(group);
    return group;
  }

  createBeacon(parent, pos, colorHex) {
    const bGroup = new THREE.Group();
    bGroup.position.set(...pos);

    const diamondGeo = new THREE.OctahedronGeometry(0.15, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: false });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    bGroup.add(diamond);

    const ringGeo = new THREE.RingGeometry(0.22, 0.26, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    bGroup.add(ring);

    bGroup.userData = { diamond, ring };
    if (!this.animatedBeacons) this.animatedBeacons = [];
    this.animatedBeacons.push(bGroup);

    parent.add(bGroup);
    return bGroup;
  }

  setCarried(itemId) {
    this.carriedItem = itemId;

    // Attach item visually to astronaut chest/arms
    if (itemId === 'oxygen') {
      if (this.oxygenCanisterMesh) {
        this.oxygenCanisterMesh.visible = false;
      }
      if (this.carriedMesh) this.astronaut.root.remove(this.carriedMesh);

      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.48, 16),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.4 })
      );
      can.rotation.z = Math.PI / 2;
      can.position.set(0, 1.1, 0.35);
      this.carriedMesh = can;
      this.astronaut.root.add(can);
    } else if (itemId === 'tool') {
      if (this.toolkitMesh) {
        this.toolkitMesh.visible = false;
      }
      if (this.carriedMesh) this.astronaut.root.remove(this.carriedMesh);

      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.22, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.2 })
      );
      crate.position.set(0, 1.1, 0.35);
      this.carriedMesh = crate;
      this.astronaut.root.add(crate);
    } else {
      if (this.carriedMesh) {
        this.astronaut.root.remove(this.carriedMesh);
        this.carriedMesh = null;
      }
    }
  }

  updateMovement(dt) {
    const run = this.keys.has('shift') ? 4.8 : 2.8;
    let dx = 0;
    let dz = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    const len = Math.hypot(dx, dz);
    const isMoving = len > 0.01;

    if (isMoving) {
      dx /= len;
      dz /= len;

      // Transform movement relative to camera yaw
      const forwardX = -Math.sin(this.mouseLook.yaw);
      const forwardZ = -Math.cos(this.mouseLook.yaw);
      const rightX = -forwardZ;
      const rightZ = forwardX;

      const moveX = (forwardX * -dz + rightX * dx) * run * dt;
      const moveZ = (forwardZ * -dz + rightZ * dx) * run * dt;

      this.player.x += moveX;
      this.player.z += moveZ;

      // Boundary limits inside hangar
      this.player.x = Math.max(-10, Math.min(10, this.player.x));
      this.player.z = Math.max(-5.5, Math.min(5.5, this.player.z));

      // Rotate astronaut to face movement direction smoothly
      const targetAngle = Math.atan2(moveX, moveZ);
      let diff = targetAngle - this.player.facing;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.player.facing += diff * 0.18;

      this.player.speed = run;
    } else {
      this.player.speed = 0;
    }

    // Jump physics
    if (this.keys.has(' ')) {
      if (this.player.y === 0) {
        this.player.vy = 5.2;
      }
      this.keys.delete(' ');
    }
    this.player.vy -= 14 * dt;
    this.player.y = Math.max(0, this.player.y + this.player.vy * dt);
    if (this.player.y === 0) this.player.vy = 0;

    // Update astronaut position and rotation
    this.astronaut.root.position.set(this.player.x, this.player.y, this.player.z);
    this.astronaut.root.rotation.y = this.player.facing;
    this.astronaut.update(dt, this.player.speed, isMoving);

    // Update Third-Person Chase Camera (Expansive vista)
    const camDist = 6.8;
    const camHeight = 3.6 + this.mouseLook.pitch * 2.2;
    const camX = this.player.x + Math.sin(this.mouseLook.yaw) * camDist;
    const camZ = this.player.z + Math.cos(this.mouseLook.yaw) * camDist;

    this.camera.position.set(camX, Math.max(1.2, camHeight), camZ);
    this.camera.lookAt(this.player.x, 1.4 + this.player.y * 0.5, this.player.z);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setPicoGuideTarget(target) { this.pico?.setGuideTarget(target); }
  setPicoTalking(value) { this.pico?.setTalking(value); }
  setPicoEmotion(value) { this.pico?.setEmotion(value); }
  getPicoPosition() { return this.pico?.root.position || null; }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateMovement(dt);

    if (this.pico) this.pico.update(dt, this.player, [[-4, -3, 1], [0, -3, 1], [2, -2, .8], [5, -1, 1], [8, 0, 1]]);

    // Animate scanner ring at suit diagnostic station
    if (this.scannerRing) {
      this.scannerRing.rotation.z = time * 1.8;
    }

    // Animate interactive beacons (floating diamond spin & ring pulse)
    if (this.animatedBeacons) {
      for (const b of this.animatedBeacons) {
        if (b.userData.diamond) {
          b.userData.diamond.rotation.y = time * 2;
          b.userData.diamond.position.y = Math.sin(time * 3) * 0.08;
        }
        if (b.userData.ring) {
          b.userData.ring.rotation.z = -time * 1.5;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.pico?.destroy();
  }
}
