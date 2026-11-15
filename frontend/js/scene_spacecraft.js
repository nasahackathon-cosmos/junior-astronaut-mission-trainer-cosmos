import * as THREE from 'three';
import { AstronautCharacter } from './astronaut.js';
import { Pico7Companion } from './pico7.js';

/**
 * High-Fidelity 3D Spacecraft Interior Scene.
 * Designed from exact reference: inspiration/WhatsApp Image 2026-11-15 at 10.14.52 AM.jpeg
 * Features an angular cockpit canopy with overhead skylights, wrap-around illuminated flight console,
 * circular navigation radar scope, tactile annunciator panels, journey mission stations (Days 1-8),
 * and panoramic views of receding Earth and approaching destination.
 */
export class SpacecraftCabinScene {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.mouseLook = { yaw: 0, pitch: 0.18 };

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020612);

    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 1000);
    this.camera.position.set(0, 1.8, 2.8);

    // 3. Lighting & Atmosphere
    this.setupLighting();

    // 4. Exterior Vista (Earth, Stars, Destination Planet)
    this.createExteriorSpaceVista();

    // 5. Cockpit Architecture & Flight Consoles (Inspiration #1)
    this.createCabinArchitecture();
    this.createFlightDeckConsole();
    this.createJourneyStations();
    this.createCabinDetailPass();
    this.createReferenceInteriorArchitecture();

    // 6. Character & Companion
    this.astronaut = new AstronautCharacter({ mode: 'ground' });
    this.scene.add(this.astronaut.root);

    this.pico = new Pico7Companion();
    this.pico.root.position.set(1.4, 0.65, -2.5);
    this.scene.add(this.pico.root);

    // 7. Interactive Beacons
    this.createMissionBeacons();

    // Start render loop
    this.animate();
  }

  setupLighting() {
    // Ambient cosmic fill
    const ambient = new THREE.AmbientLight(0x0d1e38, 1.3);
    this.scene.add(ambient);

    // Sunlight streaming in through the forward canopy windows
    this.sunLight = new THREE.DirectionalLight(0xfff7e6, 3.2);
    this.sunLight.position.set(-6, 8, -12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Glowing avionics console glow (cyan & green dash bounce light)
    this.consoleGlow = new THREE.PointLight(0x38bdf8, 2.4, 8);
    this.consoleGlow.position.set(0, 1.5, -4.2);
    this.scene.add(this.consoleGlow);

    // Amber station accent light
    const amberAccent = new THREE.PointLight(0xf59e0b, 1.8, 7);
    amberAccent.position.set(4.5, 1.6, -1.0);
    this.scene.add(amberAccent);

    const overheadFill = new THREE.PointLight(0x7dd3fc, 1.2, 10);
    overheadFill.position.set(0, 4.8, 1.5);
    this.scene.add(overheadFill);
  }

  createExteriorSpaceVista() {
    this.exteriorGroup = new THREE.Group();

    // 1. Distant Starfield
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xb0e0ff), new THREE.Color(0xffe4b5), new THREE.Color(0x93c5fd)];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 60 + Math.random() * 40;

      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95 });
    this.starfield = new THREE.Points(starGeo, starMat);
    this.exteriorGroup.add(this.starfield);

    // 2. Receding Earth (or Approaching Destination)
    const isApproach = (this.game.spaceDay || 1) >= 8 || this.game.phase === 'landing';
    const isMars = this.game.env === 'mars';

    // Planetary sphere visible through the cockpit window
    const planetGeo = new THREE.SphereGeometry(7.5, 48, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      color: isApproach ? (isMars ? 0xa8422b : 0x71717a) : 0x0c3162,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.vistaPlanet = new THREE.Mesh(planetGeo, planetMat);
    this.vistaPlanet.position.set(0, -5.5, -24);
    this.exteriorGroup.add(this.vistaPlanet);

    // Glowing atmospheric scattering rim (Fresnel limb)
    const atmoGeo = new THREE.SphereGeometry(7.75, 48, 36);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-worldPos.xyz);
          gl_Position = projectionMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 rimColor;
        void main() {
          float rim = 1.0 - max(dot(vViewDir, vNormal), 0.0);
          rim = pow(rim, 2.5);
          gl_FragColor = vec4(rimColor, rim * 0.95);
        }
      `,
      uniforms: {
        rimColor: { value: new THREE.Color(isApproach ? (isMars ? 0xf97316 : 0x93c5fd) : 0x38bdf8) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.vistaAtmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    this.vistaPlanet.add(this.vistaAtmosphere);

    this.scene.add(this.exteriorGroup);
  }

  createCabinArchitecture() {
    this.cabinGroup = new THREE.Group();

    // Materials
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.7 });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x090e1a, roughness: 0.28, metalness: 0.5 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transmission: 0.9,
      opacity: 0.95,
      transparent: true,
      roughness: 0.08,
      metalness: 0.1,
    });

    // 1. Cabin Floor
    const floorGeo = new THREE.PlaneGeometry(16, 18);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.cabinGroup.add(floor);

    // Floor anti-slip grates & guide strips
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    for (const x of [-2.4, 2.4]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 14), stripMat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(x, 0.005, 0);
      this.cabinGroup.add(strip);
    }

    // 2. Cockpit Canopy Forward Frame & Windows (Inspiration Image 1)
    // Forward Wall with cutouts for panoramic window
    const frontWallMat = ribMat;

    // Window Sill Base (lower frame)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(14, 0.45, 0.6), frontWallMat);
    sill.position.set(0, 1.4, -6.5);
    this.cabinGroup.add(sill);

    // Window Top Arch (upper frame)
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.6), frontWallMat);
    topFrame.position.set(0, 4.4, -6.5);
    this.cabinGroup.add(topFrame);

    // Central Panoramic Window Pane (Trapezoidal view)
    const centerWindow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.6), glassMat);
    centerWindow.position.set(0, 2.85, -6.48);
    centerWindow.visible = false;
    this.cabinGroup.add(centerWindow);

    // Left and Right Angled Window Panes
    const sideWindowL = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), glassMat);
    sideWindowL.rotation.y = Math.PI / 7;
    sideWindowL.position.set(-4.8, 2.85, -6.0);
    const sideWindowR = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), glassMat);
    sideWindowR.rotation.y = -Math.PI / 7;
    sideWindowR.position.set(4.8, 2.85, -6.0);
    this.cabinGroup.add(sideWindowL, sideWindowR);

    // Overhead Angled Skylights (Ceiling Observation Panes - Inspiration Image 1)
    for (let x = -3.2; x <= 3.2; x += 3.2) {
      const skylight = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 3.4), glassMat);
      skylight.rotation.x = Math.PI / 6;
      skylight.position.set(x, 5.0, -4.8);
      this.cabinGroup.add(skylight);

      // Skylight Frame Ribs
      const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 3.5), ribMat);
      ribL.rotation.x = Math.PI / 6;
      ribL.position.set(x - 1.35, 5.0, -4.8);
      const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 3.5), ribMat);
      ribR.rotation.x = Math.PI / 6;
      ribR.position.set(x + 1.35, 5.0, -4.8);
      this.cabinGroup.add(ribL, ribR);
    }

    // 3. Cabin Sidewalls with Structural Ribs
    const sideWallGeo = new THREE.BoxGeometry(0.4, 5.5, 16);
    const wallL = new THREE.Mesh(sideWallGeo, hullMat);
    wallL.position.set(-7.2, 2.75, 0);
    const wallR = new THREE.Mesh(sideWallGeo, hullMat);
    wallR.position.set(7.2, 2.75, 0);
    this.cabinGroup.add(wallL, wallR);

    // Aft Wall
    const aftWall = new THREE.Mesh(new THREE.BoxGeometry(14.8, 5.5, 0.4), hullMat);
    aftWall.position.set(0, 2.75, 7.8);
    this.cabinGroup.add(aftWall);

    this.scene.add(this.cabinGroup);
  }

  createFlightDeckConsole() {
    this.deckGroup = new THREE.Group();

    // High-tech materials
    const consoleBodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.8 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const radarMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const buttonGridMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // 1. Main Flight Console Base (Tiered wrap-around desk below forward window)
    const baseGeo = new THREE.BoxGeometry(11.5, 1.25, 2.2);
    const baseMesh = new THREE.Mesh(baseGeo, consoleBodyMat);
    baseMesh.position.set(0, 0.625, -5.2);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.deckGroup.add(baseMesh);

    // Slanted instrument deck surface
    const slantGeo = new THREE.BoxGeometry(11.4, 0.12, 1.6);
    slantGeo.rotateX(Math.PI / 6);
    const slantMesh = new THREE.Mesh(slantGeo, consoleBodyMat);
    slantMesh.position.set(0, 1.35, -5.0);
    this.deckGroup.add(slantMesh);

    // 2. Central Navigation Radar Scope (Inspiration Image 1 - circular concentric reticle)
    const scopeRing1 = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.28, 32), radarMat);
    scopeRing1.rotation.x = -Math.PI / 3;
    scopeRing1.position.set(0, 1.48, -4.9);
    const scopeRing2 = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 24), radarMat);
    scopeRing2.rotation.x = -Math.PI / 3;
    scopeRing2.position.set(0, 1.48, -4.9);
    const scopeReticle = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.02), radarMat);
    scopeReticle.rotation.x = -Math.PI / 3;
    scopeReticle.position.set(0, 1.48, -4.9);
    this.deckGroup.add(scopeRing1, scopeRing2, scopeReticle);

    // 3. Multi-Function Avionics Displays (MFDs)
    // Left Flight Screen
    const mfdL = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), screenMat);
    mfdL.rotation.x = -Math.PI / 3;
    mfdL.position.set(-1.8, 1.48, -4.9);
    // Right Flight Screen
    const mfdR = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), greenMat);
    mfdR.rotation.x = -Math.PI / 3;
    mfdR.position.set(1.8, 1.48, -4.9);
    this.deckGroup.add(mfdL, mfdR);

    // 4. Backlit Annunciator Pushbutton Matrices (Amber, White, Blue - Inspiration Image 1)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const btnMat = (row + col) % 3 === 0 ? amberMat : (row + col) % 3 === 1 ? buttonGridMat : screenMat;
        const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), btnMat);
        btn.rotation.x = -Math.PI / 3;
        btn.position.set(-3.6 + col * 0.12, 1.58 - row * 0.09, -4.8);
        this.deckGroup.add(btn);
      }
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const btnMat = (row * 2 + col) % 2 === 0 ? greenMat : amberMat;
        const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), btnMat);
        btn.rotation.x = -Math.PI / 3;
        btn.position.set(3.1 + col * 0.12, 1.58 - row * 0.09, -4.8);
        this.deckGroup.add(btn);
      }
    }

    // 5. Twin Throttle Sticks / Control Levers (Inspiration Image 1)
    for (const x of [-0.65, 0.65]) {
      const baseStick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), consoleBodyMat);
      baseStick.position.set(x, 1.35, -4.2);
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
      lever.position.set(x, 1.46, -4.2);
      lever.rotation.x = -0.25;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.2 }));
      knob.position.set(x, 1.58, -4.26);
      this.deckGroup.add(baseStick, lever, knob);
    }

    // 6. Overhead Canopy Control Panels (Angled down from ceiling - Inspiration Image 1)
    for (const x of [-2.2, 2.2]) {
      const overheadPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 0.1), consoleBodyMat);
      overheadPanel.rotation.x = Math.PI / 4;
      overheadPanel.position.set(x, 4.1, -5.6);
      const overheadScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), screenMat);
      overheadScreen.rotation.x = Math.PI / 4;
      overheadScreen.position.set(x, 4.08, -5.55);
      this.deckGroup.add(overheadPanel, overheadScreen);
    }

    this.scene.add(this.deckGroup);
  }

  createCabinDetailPass() {
    const cabin = new THREE.Group();
    cabin.name = 'CabinFabricationDetails';

    const structural = new THREE.MeshStandardMaterial({ color: 0x111b2d, metalness: 0.78, roughness: 0.3 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x6b7b91, metalness: 0.88, roughness: 0.2 });
    const fabric = new THREE.MeshStandardMaterial({ color: 0x26344a, metalness: 0.05, roughness: 0.86 });
    const warmFabric = new THREE.MeshStandardMaterial({ color: 0xc58a72, metalness: 0.02, roughness: 0.9 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x0b9db9, emissiveIntensity: 2.1, roughness: 0.28 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xffb36b, emissive: 0xc45b26, emissiveIntensity: 1.5, roughness: 0.35 });

    // Repeating pressure-hull ribs give the cabin its fabricated, load-bearing silhouette.
    for (const z of [-5.7, -3.8, -1.9, 0, 1.9, 3.8, 5.7]) {
      for (const x of [-6.65, 6.65]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.9, 0.24), structural);
        rib.position.set(x, 2.55, z);
        rib.rotation.z = x < 0 ? -0.06 : 0.06;
        rib.castShadow = true;
        cabin.add(rib);
      }
    }

    // Hexagonal non-slip floor plates and recessed guide lights.
    const floorPlate = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.62, roughness: 0.48 });
    for (let z = -5.8; z <= 5.8; z += 1.45) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.045, 1.18), floorPlate);
      plate.position.set(0, 0.025, z);
      cabin.add(plate);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.65), cyan);
      light.position.set(0, 0.06, z);
      cabin.add(light);
    }

    // Flight crew seats: shaped cushions, shoulder harnesses, and head restraints.
    for (const x of [-2.1, 2.1]) {
      const seat = new THREE.Group();
      seat.position.set(x, 0, -1.55);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.0), structural);
      base.position.y = 0.55;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.38, 0.88), warmFabric);
      cushion.position.set(0, 0.82, 0.02);
      cushion.rotation.x = -0.08;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.35, 0.32), fabric);
      back.position.set(0, 1.45, 0.32);
      back.rotation.x = -0.1;
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.3), fabric);
      headrest.position.set(0, 2.22, 0.25);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.04), amber);
      belt.position.set(0, 1.2, -0.44);
      belt.rotation.z = 0.28;
      seat.add(base, cushion, back, headrest, belt);
      cabin.add(seat);
    }

    // Overhead service spine, segmented utility rails and cool-white task lamps.
    const spine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 12.5), structural);
    spine.position.set(0, 5.05, 0);
    cabin.add(spine);
    for (const z of [-4.8, -2.4, 0, 2.4, 4.8]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.045, 0.12), cyan);
      lamp.position.set(0, 4.92, z);
      cabin.add(lamp);
    }

    // Rounded pressure-door and viewport rings echo the curved proportions in the references.
    const viewportFrame = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.13, 12, 48), trim);
    viewportFrame.position.set(0, 2.85, -6.2);
    viewportFrame.scale.set(1.55, 0.62, 1);
    cabin.add(viewportFrame);
    const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.1, 10, 36), structural);
    doorFrame.rotation.y = Math.PI / 2;
    doorFrame.position.set(0, 2.45, 7.55);
    doorFrame.scale.set(1, 1.35, 1);
    cabin.add(doorFrame);
    for (const x of [-3.6, 3.6]) {
      const warmRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 8, 32), amber);
      warmRing.rotation.x = Math.PI / 2;
      warmRing.position.set(x, 4.83, -4.7);
      warmRing.scale.set(1.35, 0.7, 1);
      cabin.add(warmRing);
    }

    // Cable conduits and access hatches keep the sidewalls from reading as empty boxes.
    for (const x of [-6.45, 6.45]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 10.8, 10), trim);
      conduit.rotation.x = Math.PI / 2;
      conduit.position.set(x, 1.15, 0);
      cabin.add(conduit);
      for (const z of [-4.7, -2.1, 0.5, 3.1]) {
        const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.05), structural);
        hatch.position.set(x * 0.995, 2.65, z);
        cabin.add(hatch);
      }
    }

    // A small forward screen texture adds readable, non-flat avionics without external assets.
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256; screenCanvas.height = 128;
    const ctx = screenCanvas.getContext('2d');
    ctx.fillStyle = '#071522'; ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#1dd3e8'; ctx.lineWidth = 2;
    for (let y = 16; y < 128; y += 22) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(244, y); ctx.stroke(); }
    ctx.strokeStyle = '#ff9f68'; ctx.beginPath(); ctx.arc(165, 65, 32, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#b7f7ff'; ctx.font = '12px monospace'; ctx.fillText('NAV / HABITAT', 12, 14);
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    const detailScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.68), new THREE.MeshStandardMaterial({ map: screenTexture, emissive: 0x0c6875, emissiveIntensity: 0.7, roughness: 0.4 }));
    detailScreen.position.set(0, 2.35, -6.16);
    cabin.add(detailScreen);

    this.scene.add(cabin);
  }

  createReferenceInteriorArchitecture() {
    const reference = new THREE.Group();
    reference.name = 'ReferenceLivingQuartersAndObservationDeck';

    const ivory = new THREE.MeshStandardMaterial({ color: 0xdce7e8, metalness: 0.38, roughness: 0.3 });
    const whiteTrim = new THREE.MeshStandardMaterial({ color: 0xf2f4ef, metalness: 0.2, roughness: 0.32 });
    const darkFrame = new THREE.MeshStandardMaterial({ color: 0x17243a, metalness: 0.85, roughness: 0.25 });
    const upholstery = new THREE.MeshStandardMaterial({ color: 0x66849d, metalness: 0.04, roughness: 0.88 });
    const coral = new THREE.MeshStandardMaterial({ color: 0xff8292, emissive: 0x9e1f54, emissiveIntensity: 1.7, roughness: 0.3 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x6ff7ff, emissive: 0x089db5, emissiveIntensity: 2.5, roughness: 0.2 });
    const violet = new THREE.MeshStandardMaterial({ color: 0xd99cff, emissive: 0x773b9e, emissiveIntensity: 1.8, roughness: 0.25 });

    // Rounded ceiling ribs and luminous strips reproduce the curved living-quarter shell.
    for (const z of [4.9, 3.1, 1.3, -0.5]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(5.65, 0.16, 10, 40, Math.PI), ivory);
      arch.rotation.z = Math.PI;
      arch.position.set(0, 3.15, z);
      arch.scale.y = 0.68;
      arch.castShadow = true;
      reference.add(arch);
      const lightStrip = new THREE.Mesh(new THREE.TorusGeometry(5.28, 0.045, 8, 40, Math.PI), z > 2 ? coral : cyan);
      lightStrip.rotation.z = Math.PI;
      lightStrip.position.set(0, 3.16, z - 0.04);
      lightStrip.scale.y = 0.68;
      reference.add(lightStrip);
    }

    // Large circular panoramic port, with layered glass, bezel and atmospheric rim.
    const windowCanvas = document.createElement('canvas');
    windowCanvas.width = 256; windowCanvas.height = 256;
    const wctx = windowCanvas.getContext('2d');
    const windowGradient = wctx.createRadialGradient(128, 128, 18, 128, 128, 128);
    windowGradient.addColorStop(0, '#113b64');
    windowGradient.addColorStop(0.55, '#071b39');
    windowGradient.addColorStop(1, '#020714');
    wctx.fillStyle = windowGradient; wctx.fillRect(0, 0, 256, 256);
    wctx.fillStyle = '#c9f4ff';
    for (let i = 0; i < 42; i++) { wctx.fillRect((i * 61) % 240 + 6, (i * 37) % 236 + 8, i % 5 === 0 ? 3 : 1, i % 5 === 0 ? 3 : 1); }
    const windowTexture = new THREE.CanvasTexture(windowCanvas);
    const windowPane = new THREE.Mesh(new THREE.CircleGeometry(1.72, 48), new THREE.MeshBasicMaterial({ map: windowTexture }));
    windowPane.position.set(0, 2.95, -6.34);
    reference.add(windowPane);
    const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.16, 14, 56), whiteTrim);
    outerBezel.position.set(0, 2.95, -6.38);
    reference.add(outerBezel);
    const cyanBezel = new THREE.Mesh(new THREE.TorusGeometry(1.77, 0.045, 8, 56), cyan);
    cyanBezel.position.set(0, 2.95, -6.42);
    reference.add(cyanBezel);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3ec7dc, emissive: 0x0e687c, emissiveIntensity: 0.75, roughness: 0.62 }));
    planet.position.set(0.48, 2.72, -6.2);
    reference.add(planet);

    // Living quarters: two padded berths, pillows, headboards and side storage modules.
    for (const x of [-3.85, 3.85]) {
      const berth = new THREE.Group();
      berth.position.set(x, 0, 3.2);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.32, 3.25), darkFrame);
      frame.position.y = 0.62;
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.32, 2.88), upholstery);
      mattress.position.y = 0.86;
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.08, 1.38), x < 0 ? coral : new THREE.MeshStandardMaterial({ color: 0x87d8da, roughness: 0.9 }));
      blanket.position.set(0, 1.06, 0.48);
      const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), whiteTrim);
      pillow.scale.set(1.4, 0.32, 0.72); pillow.position.set(0, 1.08, -0.8);
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.65, 0.18), ivory);
      headboard.position.set(0, 1.3, -1.48);
      const readingLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), amberMaterial());
      readingLight.position.set(x < 0 ? -0.95 : 0.95, 1.75, -1.32);
      berth.add(frame, mattress, blanket, pillow, headboard, readingLight);
      reference.add(berth);

      const locker = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.6, 0.72), darkFrame);
      locker.position.set(x < 0 ? -5.75 : 5.75, 0.8, 3.0);
      reference.add(locker);
      const lockerScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.2), x < 0 ? violet : cyan);
      lockerScreen.position.set(locker.position.x, 1.2, locker.position.z - 0.38);
      reference.add(lockerScreen);
    }

    // Soft central lounge/rug visible from the cabin approach.
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.15, 48), new THREE.MeshStandardMaterial({ color: 0x324e6a, roughness: 0.92 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.075, 3.5); reference.add(rug);
    const rugLight = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.62, 48), coral);
    rugLight.rotation.x = -Math.PI / 2; rugLight.position.set(0, 0.085, 3.5); reference.add(rugLight);

    // Observation deck: side consoles flank the astronaut's forward view.
    for (const x of [-4.35, 4.35]) {
      const console = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.15, 1.3), darkFrame);
      console.position.set(x, 0.72, -4.85);
      console.rotation.y = x < 0 ? 0.12 : -0.12;
      console.castShadow = true;
      reference.add(console);
      for (let i = 0; i < 6; i++) {
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), i % 3 === 0 ? coral : cyan);
        screen.rotation.x = -Math.PI / 3;
        screen.position.set(x + (i % 3 - 1) * 0.48, 1.36 + Math.floor(i / 3) * 0.16, -5.46);
        reference.add(screen);
      }
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.12, 2.4), darkFrame);
    canopy.position.set(0, 4.8, -4.9); canopy.rotation.x = Math.PI / 8; reference.add(canopy);
    for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) {
      const canopyLight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 1.4), x === 0 ? violet : cyan);
      canopyLight.position.set(x, 4.67, -4.82); canopyLight.rotation.x = Math.PI / 8; reference.add(canopyLight);
    }

    this.scene.add(reference);

    // Keep the emissive colors in one place and avoid creating lights per small fixture.
    function amberMaterial() {
      return new THREE.MeshStandardMaterial({ color: 0xffc277, emissive: 0xc15c27, emissiveIntensity: 1.8, roughness: 0.25 });
    }
  }

  createJourneyStations() {
    this.stations = {};

    const stationMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.9 });
    // Dark structural material used by trays and other spacecraft hardware.
    // Keep it local to this station factory, alongside the other station
    // materials, so constructor initialization does not depend on a helper's
    // local scope from another scene method.
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.75 });
    const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const amberGlow = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const greenGlow = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // 1. Life Support Rack (Day 2: Life Support Systems - pos [-4.5, -2])
    const lssGroup = new THREE.Group();
    lssGroup.position.set(-4.5, 0, -2.0);
    const lssRack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 0.8), stationMat);
    lssRack.position.y = 1.6;
    lssRack.castShadow = true;
    // Cryogenic O2 cylinders
    for (const x of [-0.4, 0.4]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6 }));
      cyl.position.set(x, 1.5, 0.35);
      lssGroup.add(cyl);
    }
    const lssDisplay = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), cyanGlow);
    lssDisplay.position.set(0, 2.6, 0.42);
    lssGroup.add(lssRack, lssDisplay);
    this.scene.add(lssGroup);
    this.stations.life = lssGroup;

    // 2. NASA VEGGIE & ADVANCED PLANT HABITAT (Day 3: Grow Food in Space - pos [4.5, -2])
    const ghGroup = new THREE.Group();
    ghGroup.position.set(4.5, 0, -2.0);
    ghGroup.name = 'SpaceBotanyChamber';

    // Unit frame
    const ghRack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.85), stationMat);
    ghRack.position.y = 1.4;
    ghRack.castShadow = true;
    ghGroup.add(ghRack);

    // Sealed transparent growth chamber
    const chamberGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.8, 0.65),
      new THREE.MeshPhysicalMaterial({
        color: 0xc4b5fd,
        transmission: 0.88,
        transparent: true,
        opacity: 0.9,
        roughness: 0.08,
        clearcoat: 1.0
      })
    );
    chamberGlass.position.set(0, 1.4, 0.2);
    ghGroup.add(chamberGlass);

    // NASA Magenta Grow Light Bar (660nm red + 450nm blue spectrum)
    const plantGlow = new THREE.PointLight(0xd946ef, 2.4, 6);
    plantGlow.position.set(0, 2.2, 0.2);
    ghGroup.add(plantGlow);

    // 3 tiered hydroponic root pillows and lush space foliage
    for (const y of [0.75, 1.35, 1.95]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.45), darkMetal);
      tray.position.set(0, y, 0.2);
      ghGroup.add(tray);

      const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.08), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      lightStrip.position.set(0, y + 0.38, 0.2);
      ghGroup.add(lightStrip);

      // Clustered space salad crops / leafy micro-greens
      for (const x of [-0.5, -0.15, 0.2, 0.55]) {
        const crop = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.5, roughness: 0.7 })
        );
        crop.position.set(x, y + 0.12, 0.2 + (Math.random() - 0.5) * 0.1);
        crop.scale.set(1.2, 0.85, 1.1);
        ghGroup.add(crop);
      }
    }

    // Illuminated unit header
    const ghLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.22), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    ghLabel.position.set(0, 2.65, 0.44);
    ghGroup.add(ghLabel);

    this.scene.add(ghGroup);
    this.stations.greenhouse = ghGroup;

    // 3. Maintenance Bay (Day 4: Spacecraft Maintenance - pos [-4.5, 2])
    const maintGroup = new THREE.Group();
    maintGroup.position.set(-4.5, 0, 2.0);
    const maintConsole = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.8), stationMat);
    maintConsole.position.y = 1.3;
    const faultPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), amberGlow);
    faultPanel.position.set(0, 1.8, 0.42);
    maintGroup.add(maintConsole, faultPanel);
    this.scene.add(maintGroup);
    this.stations.repair = maintGroup;

    // 4. Microgravity Science Experiment (Day 5: Microgravity Experiment - pos [4.5, 2])
    const expGroup = new THREE.Group();
    expGroup.position.set(4.5, 0, 2.0);
    const expDesk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.85, 24), metalMat);
    expDesk.position.y = 0.425;
    const waterChamber = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.92,
      opacity: 0.95,
      transparent: true,
      roughness: 0.05,
    }));
    waterChamber.position.y = 1.15;
    expGroup.add(expDesk, waterChamber);
    this.scene.add(expGroup);
    this.stations.experiment = expGroup;

    // 5. Crew Berth & Birthday Nook (Day 6: Crew Nook - pos [4, 1])
    const nookGroup = new THREE.Group();
    nookGroup.position.set(4.8, 0, 1.2);
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.4), stationMat);
    bunk.position.y = 0.55;
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 2.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 }));
    mattress.position.y = 1.12;
    nookGroup.add(bunk, mattress);
    this.scene.add(nookGroup);
    this.stations.birthday = nookGroup;

    // 6. Navigation & Comms Terminal (Day 7: Route Check - pos [-4, 2])
    const navGroup = new THREE.Group();
    navGroup.position.set(-4.5, 0, 2.2);
    const navPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.7), stationMat);
    navPedestal.position.y = 0.65;
    const navScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), cyanGlow);
    navScreen.position.set(0, 1.1, 0.36);
    navGroup.add(navPedestal, navScreen);
    this.scene.add(navGroup);
    this.stations.navigation = navGroup;

    // 7. Landing Approach Console (Day 8/9: Touchdown Preparation - pos [2, 2])
    const landGroup = new THREE.Group();
    landGroup.position.set(2.4, 0, 2.2);
    const landPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.7), stationMat);
    landPedestal.position.y = 0.65;
    const landScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), greenGlow);
    landScreen.position.set(0, 1.1, 0.36);
    landGroup.add(landPedestal, landScreen);
    this.scene.add(landGroup);
    this.stations.landing = landGroup;
  }

  createMissionBeacons() {
    this.beacons = [];
    for (const task of this.game.tasks || []) {
      const bGroup = new THREE.Group();
      bGroup.position.set(task.pos[0], 1.6, task.pos[1]);

      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.28, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      bGroup.add(diamond, ring);

      bGroup.userData = { task, diamond, ring };
      this.scene.add(bGroup);
      this.beacons.push(bGroup);
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.04, this.clock.getDelta());
    const time = this.clock.getElapsedTime();

    // Player position & animation
    const p = this.game.player;
    this.astronaut.root.position.set(p.x, p.y || 0, p.z);
    this.astronaut.root.rotation.y = this.game.facing || 0;
    const isMoving = Boolean(this.game.moving);
    this.astronaut.update(dt, this.game.moveSpeed || 0, isMoving);

    // PICO-7 companion hover & follow
    if (this.pico) {
      this.pico.update(dt, p, []);
      this.pico.root.position.y += Math.sin(time * 2.5) * 0.04;
    }

    // Animate mission beacons
    for (const b of this.beacons) {
      const t = b.userData.task;
      b.visible = !t.done;
      b.userData.diamond.rotation.y += dt * 2.2;
      b.userData.ring.rotation.z -= dt * 1.6;
    }

    // Animate exterior planet slow rotation & star drift
    if (this.vistaPlanet) {
      this.vistaPlanet.rotation.y = time * 0.015;
    }
    if (this.starfield) {
      this.starfield.rotation.y = time * 0.001;
    }

    // Camera follow (Third-person view behind astronaut inside cabin)
    const yaw = this.game.yaw || 0;
    const pitch = this.game.pitch || 0.18;
    const camDist = 4.6;
    const camHeight = 2.4 + pitch * 1.5;
    const camX = p.x + Math.sin(yaw) * camDist;
    const camZ = p.z + Math.cos(yaw) * camDist;

    this.camera.position.lerp(new THREE.Vector3(camX, Math.max(1.1, camHeight), camZ), 1 - Math.pow(0.0001, dt));
    this.camera.lookAt(p.x, 1.35 + (p.y || 0) * 0.4, p.z);

    this.renderer.render(this.scene, this.camera);
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

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.pico) {
      this.pico.destroy?.();
    }
  }
}
