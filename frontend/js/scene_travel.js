import * as THREE from 'three';

/**
 * High-Fidelity 3D Earth Departure & Interplanetary Cruise Scene.
 * Designed from exact reference: inspiration/WhatsApp Image 2026-11-15 at 10.14.52 AM (2).jpeg
 * Features the needle-nose twin-pod aerospace craft cruising through deep space
 * with diffraction-spiked stars, receding Earth behind, and destination world (Mars/Moon) ahead.
 */
export class SpaceTravelScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.destination = options.destination || 'mars';
    this.returning = Boolean(options.returning);
    this.landing = Boolean(options.landing);
    this.onComplete = options.onComplete || (() => {});
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.duration = options.duration || 6.5; // Auto-transition duration (seconds)

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040b);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    this.camera.position.set(-3.5, 2.8, 8.5);

    // 3. Lighting (Strong directional solar key light creating sharp highlights like Inspiration #2)
    const sunLight = new THREE.DirectionalLight(0xfff7ea, 3.6);
    sunLight.position.set(-8, 6, 6);
    this.scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0a1628, 1.4);
    this.scene.add(ambientLight);

    // 4. Starfield & 4-Point Diffraction Sparkles (Inspiration Image 2)
    this.createStarfield();

    // 5. Receding Planet Earth (Lower-Left / Background)
    this.createRecedingEarth();

    // 6. Destination Planet (Upper-Right / In front of flight vector - Inspiration Image 2)
    this.createDestinationPlanet();

    if (this.returning) {
      // Reverse the visual flight vector: the selected world recedes behind
      // the craft while the Earth occupies the forward approach position.
      this.earthGroup.position.set(11, 7.5, -16);
      this.destinationGroup.position.set(-18, -10, -32);
    }

    // 7. Sleek Aerospace Needle Spacecraft (Inspiration Image 2)
    this.createSleekSpacecraft();

    // Start render loop
    this.animate();
  }

  createStarfield() {
    const starCount = 2400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xbfe0ff), new THREE.Color(0xffe8c2), new THREE.Color(0xc4b5fd)];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 70 + Math.random() * 50;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.95 });
    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);

    // 4-Point Cross Diffraction Spikes on key prominent stars (Inspiration Image 2)
    const spikeGeo = new THREE.PlaneGeometry(0.85, 0.04);
    const spikeMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    for (const [x, y, z] of [[-14, 12, -35], [16, -10, -42], [-8, -14, -30], [22, 18, -45]]) {
      const hSpike = new THREE.Mesh(spikeGeo, spikeMat);
      const vSpike = new THREE.Mesh(spikeGeo, spikeMat);
      vSpike.rotation.z = Math.PI / 2;
      const starCross = new THREE.Group();
      starCross.position.set(x, y, z);
      starCross.add(hSpike, vSpike);
      this.scene.add(starCross);
    }
  }

  createRecedingEarth() {
    this.earthGroup = new THREE.Group();
    this.earthGroup.position.set(-18, -10, -32);

    const radius = 6.2;
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 36),
      new THREE.MeshStandardMaterial({ color: 0x0c3162, roughness: 0.65, metalness: 0.1 })
    );
    this.earthGroup.add(earthMesh);

    // Rayleigh scattering atmospheric glow limb
    const atmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.04, 48, 36),
      new THREE.ShaderMaterial({
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
            rim = pow(rim, 2.5);
            gl_FragColor = vec4(vec3(0.15, 0.65, 1.0), rim * 0.95);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    this.earthGroup.add(atmoMesh);
    this.scene.add(this.earthGroup);
  }

  createDestinationPlanet() {
    this.destinationGroup = new THREE.Group();
    // Positioned in upper right quadrant along the flight vector (Inspiration Image 2)
    this.destinationGroup.position.set(11, 7.5, -16);

    const isMars = this.destination === 'mars';
    const radius = 3.2;

    const planetMat = new THREE.MeshStandardMaterial({
      color: isMars ? 0xa8422b : 0x8a929d, // Mars rust-orange vs Moon regolith-grey
      roughness: 0.78,
      metalness: 0.05,
    });
    const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), planetMat);
    this.destinationGroup.add(planetMesh);

    // Procedural surface crater/maria patches
    const mariaMat = new THREE.MeshStandardMaterial({
      color: isMars ? 0x6e2518 : 0x475569,
      roughness: 0.9,
    });
    for (let i = 0; i < 8; i++) {
      const pGeo = new THREE.SphereGeometry(radius * 1.002, 16, 16, Math.random() * Math.PI * 2, 0.4 + Math.random() * 0.4, 0.5 + Math.random() * 0.6, 0.4 + Math.random() * 0.5);
      const pMesh = new THREE.Mesh(pGeo, mariaMat);
      this.destinationGroup.add(pMesh);
    }

    // Atmospheric limb
    const atmoColor = isMars ? new THREE.Color(0xf97316) : new THREE.Color(0x94a3b8);
    const atmoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.035, 48, 36),
      new THREE.ShaderMaterial({
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
          uniform vec3 col;
          void main() {
            float rim = 1.0 - max(dot(vViewDir, vNormal), 0.0);
            rim = pow(rim, 2.6);
            gl_FragColor = vec4(col, rim * 0.9);
          }
        `,
        uniforms: { col: { value: atmoColor } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    this.destinationGroup.add(atmoMesh);
    this.scene.add(this.destinationGroup);
  }

  createSleekSpacecraft() {
    this.craftGroup = new THREE.Group();
    // Banked in 3/4 flight perspective flying diagonally (Inspiration Image 2)
    this.craftGroup.position.set(-1.8, -0.6, 1.2);
    this.craftGroup.rotation.set(-0.25, -0.75, 0.35);

    // Materials (Inspiration Image 2: Pristine aerospace white with dark tile undersides and cyan engine glow)
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.65, metalness: 0.3 });
    const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.08, metalness: 0.9, clearcoat: 1.0 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 });
    const ionGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Aerodynamic Needle Fuselage (Inspiration Image 2)
    const noseGeo = new THREE.ConeGeometry(0.68, 5.2, 24);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.position.set(0, 0, 2.4);
    this.craftGroup.add(nose);

    // Twin Pitot/Sensor Probes at needle tip (Inspiration Image 2)
    const probeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.65, 8);
    probeGeo.rotateX(Math.PI / 2);
    const probe1 = new THREE.Mesh(probeGeo, chromeMat);
    probe1.position.set(-0.06, 0, 5.2);
    const probe2 = new THREE.Mesh(probeGeo, chromeMat);
    probe2.position.set(0.06, 0, 5.2);
    this.craftGroup.add(probe1, probe2);

    // Mid-Fuselage
    const midGeo = new THREE.CylinderGeometry(0.75, 0.88, 3.8, 24);
    midGeo.rotateX(Math.PI / 2);
    midGeo.scale(1.2, 0.85, 1);
    const mid = new THREE.Mesh(midGeo, hullMat);
    mid.position.set(0, 0, -1.6);
    this.craftGroup.add(mid);

    // 2. Teardrop Bubble Cockpit Canopy (Inspiration Image 2)
    const canopyGeo = new THREE.SphereGeometry(0.44, 24, 16);
    canopyGeo.scale(0.8, 0.6, 2.6);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.55, 0.6);
    this.craftGroup.add(canopy);

    // 3. Swept Delta Wings (Inspiration Image 2)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.8, -2.4);
    wingShape.lineTo(2.3, -3.6);
    wingShape.lineTo(0, -3.0);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 });
    wingGeo.rotateX(Math.PI / 2);

    const wingR = new THREE.Mesh(wingGeo, hullMat);
    wingR.position.set(0.5, -0.05, 0.6);
    const wingL = new THREE.Mesh(wingGeo, hullMat);
    wingL.scale.set(-1, 1, 1);
    wingL.position.set(-0.5, -0.05, 0.6);
    this.craftGroup.add(wingR, wingL);

    // 4. Twin Outboard Engine Pod Nacelles with Needle Fins (Inspiration Image 2)
    for (const side of [-1, 1]) {
      const podGroup = new THREE.Group();
      podGroup.position.set(side * 2.1, 0.25, -1.8);

      // Main Pod Body
      const podBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 3.2, 20), hullMat);
      podBody.rotation.x = Math.PI / 2;

      // Front Intake Cowl with Dark Turbine Ring
      const cowlRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 12, 24), darkMat);
      cowlRing.position.set(0, 0, 1.6);

      // Rear Long Needle Cone/Fin (Inspiration Image 2)
      const needleCone = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.8, 20), hullMat);
      needleCone.rotation.x = -Math.PI / 2;
      needleCone.position.set(0, 0, -2.5);

      // Glowing Ion Plasma Thruster Ring
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.35, 16), ionGlowMat);
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(0, 0, -1.7);

      podGroup.add(podBody, cowlRing, needleCone, thruster);
      this.craftGroup.add(podGroup);
    }

    // 5. Dual Ion Exhaust Particle/Plume Cones
    for (const side of [-1, 1]) {
      const plumeGeo = new THREE.ConeGeometry(0.35, 3.8, 16, 1, true);
      plumeGeo.rotateX(-Math.PI / 2);
      plumeGeo.translate(0, 0, -1.9);
      const plume = new THREE.Mesh(
        plumeGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
      );
      plume.position.set(side * 2.1, 0.25, -3.6);
      this.craftGroup.add(plume);
    }

    this.scene.add(this.craftGroup);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    this.elapsed += dt;

    // Interplanetary Cruise Trajectory:
    // Smooth flight progression from bottom-left to upper-right towards destination planet
    const progress = Math.min(1.0, this.elapsed / this.duration);

    if (this.craftGroup) {
      // Gentle bank oscillation & forward thrust movement
      this.craftGroup.position.x = -1.8 + progress * 2.6 + Math.sin(this.elapsed * 1.5) * 0.04;
      this.craftGroup.position.y = this.landing ? 2.3 - progress * 2.9 : -0.6 + progress * 1.8;
      this.craftGroup.position.z = this.landing ? 1.2 - progress * 1.8 : 1.2 - progress * 4.2;
    }

    if (this.returning && this.destinationGroup) {
      const approach = 1 + progress * 1.4;
      this.destinationGroup.scale.setScalar(approach);
      this.earthGroup.scale.setScalar(Math.max(0.62, 1 - progress * 0.25));
    } else if (this.destinationGroup) {
      this.destinationGroup.scale.setScalar(1 + progress * (this.landing ? 1.9 : 0.55));
      this.earthGroup.scale.setScalar(Math.max(0.62, 1 - progress * 0.28));
    }

    // Camera cinematic fly-along tracking
    this.camera.position.x = -3.5 + progress * 1.2;
    this.camera.position.y = 2.8 + progress * 0.6;
    this.camera.position.z = 8.5 - progress * 2.5;
    this.camera.lookAt(
      this.craftGroup.position.x + 0.8,
      this.craftGroup.position.y + 0.4,
      this.craftGroup.position.z
    );

    // Slowly rotate celestial bodies
    if (this.destinationGroup) {
      this.destinationGroup.rotation.y = this.elapsed * 0.03;
    }
    if (this.earthGroup) {
      this.earthGroup.rotation.y = this.elapsed * 0.015;
    }

    this.renderer.render(this.scene, this.camera);

    // Auto-transition when trajectory reaches destination approach
    if (this.elapsed >= this.duration && !this.completed) {
      this.completed = true;
      this.onComplete();
    }
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
