import * as THREE from 'three';
import { AstronautCharacter } from './astronaut.js';

/**
 * High-Fidelity 3D Opening Scene for COSMOS.
 * Designed from exact visual references in inspiration/:
 * - Sleek retro-futuristic needle-nosed starship cruising in low orbit (Inspiration #2)
 * - Hero astronaut floating in zero-G with gold reflective visor and life-support pack (Inspiration #1, #6, #8)
 * - Photorealistic curved Earth horizon with Rayleigh atmospheric scattering limb (Inspiration #1)
 * - Deep cosmos starfield with 4-point cross diffraction spikes (Inspiration #2, #6, #8)
 * - Dynamic mouse parallax with smooth aerospace flight kinematics
 */
export class OpeningScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.animationId = null;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
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
    this.scene.fog = new THREE.FogExp2(0x020612, 0.007);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0.35, 4.8);

    // 3. Cinematic Aerospace Lighting
    this.setupLighting();

    // 4. Cosmos Starfield & Diffraction Crosses
    this.createStarfield();

    // 5. Orbital Earth Horizon with Rayleigh Atmospheric Scattering
    this.createOrbitalEarth();

    // 6. Sleek Aerospace Starship (Inspiration Image 2)
    this.createSpacecraft();

    // 7. Hero Astronaut in Zero-G (Inspiration Image 8)
    this.createAstronaut();

    // Parallax mouse tracker
    this.onMouseMove = (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 0.35;
    };
    window.addEventListener('mousemove', this.onMouseMove);

    // Start render loop
    this.animate();
  }

  setupLighting() {
    // Distant Solar Key Light (harsh sunlight in vacuum of space)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 3.8);
    sunLight.position.set(-9, 7, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Earthshine: Aquamarine / Cyan diffuse bounce light rising from Earth below
    const earthshine = new THREE.DirectionalLight(0x38bdf8, 1.8);
    earthshine.position.set(3, -8, -1);
    this.scene.add(earthshine);

    // Cosmic violet rim light
    const cosmicRim = new THREE.DirectionalLight(0x818cf8, 1.2);
    cosmicRim.position.set(4, 5, -5);
    this.scene.add(cosmicRim);

    // Ambient deep-space fill
    const ambient = new THREE.AmbientLight(0x0a1226, 1.4);
    this.scene.add(ambient);
  }

  createStarfield() {
    const starCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff), // O-type brilliant white
      new THREE.Color(0xbfe0ff), // B-type icy blue
      new THREE.Color(0xffe8c2), // G-type solar warm
      new THREE.Color(0xc4b5fd), // A-type violet
      new THREE.Color(0x93c5fd), // Deep cyan
    ];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 50 + Math.random() * 40;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);

    // 4-Point Cross Diffraction Spikes on primary navigation stars (Inspiration #2)
    const spikeCanvas = document.createElement('canvas');
    spikeCanvas.width = 64;
    spikeCanvas.height = 64;
    const sctx = spikeCanvas.getContext('2d');
    sctx.clearRect(0, 0, 64, 64);

    const hGrad = sctx.createLinearGradient(0, 32, 64, 32);
    hGrad.addColorStop(0, 'rgba(255,255,255,0)');
    hGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
    hGrad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = hGrad;
    sctx.fillRect(0, 31, 64, 2);

    const vGrad = sctx.createLinearGradient(32, 0, 32, 64);
    vGrad.addColorStop(0, 'rgba(255,255,255,0)');
    vGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
    vGrad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = vGrad;
    sctx.fillRect(31, 0, 2, 64);

    const centerGrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 8);
    centerGrad.addColorStop(0, 'rgba(255,255,255,1)');
    centerGrad.addColorStop(0.4, 'rgba(186,230,253,0.8)');
    centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = centerGrad;
    sctx.fillRect(24, 24, 16, 16);

    const spikeTexture = new THREE.CanvasTexture(spikeCanvas);
    const spikeMat = new THREE.SpriteMaterial({
      map: spikeTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
    });

    const spikePositions = [
      [-16, 14, -38],
      [18, 12, -42],
      [-24, -8, -35],
      [22, -12, -45],
      [0, 18, -32],
    ];

    for (const [x, y, z] of spikePositions) {
      const sprite = new THREE.Sprite(spikeMat);
      sprite.position.set(x, y, z);
      sprite.scale.set(3.2, 3.2, 1);
      this.scene.add(sprite);
    }
  }

  createOrbitalEarth() {
    this.earthGroup = new THREE.Group();
    // Position Earth so its glowing horizon sweeps across the lower viewport
    this.earthGroup.position.set(1.5, -8.2, -4.8);
    this.earthGroup.rotation.z = -0.24;

    const radius = 7.5;

    // 1. Surface Globe (Deep navy oceans with realistic continents)
    const surfaceGeo = new THREE.SphereGeometry(radius, 64, 48);
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0x092244,
      roughness: 0.65,
      metalness: 0.1,
    });
    this.earthSurface = new THREE.Mesh(surfaceGeo, surfaceMat);
    this.earthGroup.add(this.earthSurface);

    // Procedural continental landmasses
    const continentMat = new THREE.MeshStandardMaterial({
      color: 0x164e43,
      roughness: 0.82,
      metalness: 0.05,
    });
    for (let i = 0; i < 16; i++) {
      const cGeo = new THREE.SphereGeometry(
        radius * 1.002,
        24,
        20,
        Math.random() * Math.PI * 2,
        0.35 + Math.random() * 0.7,
        0.5 + Math.random() * 1.3,
        0.35 + Math.random() * 0.7
      );
      const cMesh = new THREE.Mesh(cGeo, continentMat);
      this.earthGroup.add(cMesh);
    }

    // 2. Swirling Weather & Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(radius * 1.02, 48, 36);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xe2f3fe,
      transparent: true,
      opacity: 0.42,
      roughness: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.earthClouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.earthGroup.add(this.earthClouds);

    // 3. Luminous Cyan Atmosphere Scattering Limb (Fresnel Rayleigh glow)
    const atmoGeo = new THREE.SphereGeometry(radius * 1.045, 64, 48);
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
        void main() {
          float rim = 1.0 - max(dot(vViewDir, vNormal), 0.0);
          rim = pow(rim, 2.4);
          vec3 atmoColor = mix(vec3(0.02, 0.48, 0.98), vec3(0.42, 0.96, 1.0), rim);
          gl_FragColor = vec4(atmoColor, rim * 1.15);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.earthAtmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    this.earthGroup.add(this.earthAtmosphere);

    this.scene.add(this.earthGroup);
  }

  createSpacecraft() {
    this.craftGroup = new THREE.Group();
    // Positioned gracefully in upper sky between title and astronaut, cruising forward
    this.craftGroup.position.set(-0.4, 1.35, -1.4);
    this.craftGroup.rotation.set(-0.22, -0.72, 0.32);
    this.craftGroup.scale.set(0.38, 0.38, 0.38);

    // Materials (Inspiration #2: Aerospace white hull with dark ceramic heat tiles and cobalt accents)
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.4 });
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 });
    const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.06, metalness: 0.95, clearcoat: 1.0 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.15, metalness: 0.95 });
    const ionGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Aerodynamic Needle Nose Cone (Inspiration #2)
    const noseGeo = new THREE.ConeGeometry(0.72, 5.4, 24);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.position.set(0, 0, 2.5);
    nose.castShadow = true;
    this.craftGroup.add(nose);

    // Twin Pitot/Sensor Probes at needle tip
    const probeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8);
    probeGeo.rotateX(Math.PI / 2);
    const p1 = new THREE.Mesh(probeGeo, chromeMat);
    p1.position.set(-0.08, 0, 5.4);
    const p2 = new THREE.Mesh(probeGeo, chromeMat);
    p2.position.set(0.08, 0, 5.4);
    this.craftGroup.add(p1, p2);

    // 2. Mid-fuselage with dark underside ceramic heat tiles
    const midGeo = new THREE.CylinderGeometry(0.78, 0.92, 4.0, 24);
    midGeo.rotateX(Math.PI / 2);
    midGeo.scale(1.22, 0.88, 1);
    const mid = new THREE.Mesh(midGeo, hullMat);
    mid.position.set(0, 0, -1.7);
    mid.castShadow = true;
    this.craftGroup.add(mid);

    // Blue racing stripe on upper fuselage
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 3.8), blueMat);
    stripe.position.set(0, 0.75, -1.6);
    this.craftGroup.add(stripe);

    // 3. Teardrop Cockpit Bubble Canopy (Inspiration #2)
    const canopyGeo = new THREE.SphereGeometry(0.46, 24, 16);
    canopyGeo.scale(0.82, 0.62, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.58, 0.7);
    this.craftGroup.add(canopy);

    // 4. Swept Delta Wings (Inspiration #2)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(3.2, -2.6);
    wingShape.lineTo(2.6, -3.8);
    wingShape.lineTo(0, -3.2);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 });
    wingGeo.rotateX(Math.PI / 2);

    const wingR = new THREE.Mesh(wingGeo, hullMat);
    wingR.position.set(0.55, -0.06, 0.7);
    wingR.castShadow = true;
    const wingL = new THREE.Mesh(wingGeo, hullMat);
    wingL.scale.set(-1, 1, 1);
    wingL.position.set(-0.55, -0.06, 0.7);
    wingL.castShadow = true;
    this.craftGroup.add(wingR, wingL);

    // Blue tips on wing edges
    const wingTipR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.2), blueMat);
    wingTipR.position.set(3.4, 0.1, -2.5);
    const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.2), blueMat);
    wingTipL.position.set(-3.4, 0.1, -2.5);
    this.craftGroup.add(wingTipR, wingTipL);

    // 5. Twin Outboard Engine Pod Nacelles with Needle Fins (Inspiration #2)
    for (const side of [-1, 1]) {
      const pod = new THREE.Group();
      pod.position.set(side * 2.3, 0.28, -1.9);

      // Nacelle Cylinder Body
      const podBody = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 3.4, 20), hullMat);
      podBody.rotation.x = Math.PI / 2;
      podBody.castShadow = true;

      // Front Intake Cowl with dark turbine ring
      const cowl = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 12, 24), darkTileMat);
      cowl.position.set(0, 0, 1.7);

      // Rear Needle Cone Fin (Inspiration #2)
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.46, 2.0, 20), hullMat);
      fin.rotation.x = -Math.PI / 2;
      fin.position.set(0, 0, -2.7);

      // Thruster Nozzle Ring
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.4, 16), ionGlowMat);
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(0, 0, -1.8);

      pod.add(podBody, cowl, fin, thruster);
      this.craftGroup.add(pod);

      // Glowing Cyan Ion Plasma Plume
      const plumeGeo = new THREE.ConeGeometry(0.32, 3.4, 16, 1, true);
      plumeGeo.rotateX(-Math.PI / 2);
      const plumeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.set(side * 2.3, 0.28, -4.8);
      this.craftGroup.add(plume);
    }

    this.scene.add(this.craftGroup);
  }

  createAstronaut() {
    this.astronaut = new AstronautCharacter({ mode: 'orbit' });
    this.astronaut.root.position.set(1.45, -0.08, 0.75);
    this.astronaut.root.rotation.set(-0.06, -0.36, 0.05);
    this.scene.add(this.astronaut.root);

    // Glowing Umbilical Life-Support Tether Cord (extending behind into space)
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = 1.45 + t * 2.2 + Math.sin(t * Math.PI) * 0.35;
      const y = -0.08 - t * 0.7 + Math.cos(t * Math.PI * 2) * 0.18;
      const z = 0.5 - t * 3.8;
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.014, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.7,
    });
    this.tether = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(this.tether);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Smooth cinematic mouse parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.camera.position.x = this.mouse.x;
    this.camera.position.y = 0.35 + this.mouse.y;
    this.camera.lookAt(0.5, 0.1, 0);

    // Slowly rotate Earth & cloud systems
    if (this.earthSurface) {
      this.earthSurface.rotation.y = time * 0.014;
    }
    if (this.earthClouds) {
      this.earthClouds.rotation.y = time * 0.018;
    }

    // Starfield subtle cosmic drift
    if (this.starfield) {
      this.starfield.rotation.y = time * 0.0012;
    }

    // Zero-G orbital maneuvering drift for spacecraft
    if (this.craftGroup) {
      this.craftGroup.position.y = 1.35 + Math.sin(time * 0.6) * 0.05;
      this.craftGroup.rotation.z = 0.32 + Math.cos(time * 0.45) * 0.02;
      this.craftGroup.rotation.x = -0.22 + Math.sin(time * 0.35) * 0.015;
    }

    // Update astronaut zero-G kinematics
    if (this.astronaut) {
      this.astronaut.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
