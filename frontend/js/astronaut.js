import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

/**
 * Creates and manages the 3D Astronaut character for both the cinematic
 * opening screen and the gameplay environments.
 */
export class AstronautCharacter {
  constructor(options = {}) {
    this.mode = options.mode || 'orbit'; // 'orbit' or 'ground'
    this.root = new THREE.Group();
    this.root.name = 'AstronautRoot';

    // Animation pivot handles zero-G floating & walking without overwriting world position
    this.animPivot = new THREE.Group();
    this.animPivot.name = 'AstronautAnimPivot';
    this.root.add(this.animPivot);

    this.isLoaded = true;
    this.model = null;

    // Animation state
    this.animTime = Math.random() * 10;
    this.isMoving = false;
    this.moveSpeed = 0;
    this.walkCycle = 0;

    // Build high-detail PBR procedural astronaut with gold visor, life-support pack, and rigged joints
    this.proceduralAstronaut = this.createDetailedProceduralAstronaut();
    this.animPivot.add(this.proceduralAstronaut);

    // Load authentic NASA 3D Astronaut model asset
    this.loadNASAAsset();
  }

  loadNASAAsset() {
    const loader = new GLTFLoader();
    loader.load(
      '/static/assets/models/Astronaut.glb',
      (gltf) => {
        const nasaModel = gltf.scene;
        nasaModel.name = 'NASA_Astronaut';

        // Measure bounding box to normalize scale to ~1.85m tall
        const box = new THREE.Box3().setFromObject(nasaModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 1.85;
        const scale = maxDim > 0 ? targetHeight / size.y : 1;
        nasaModel.scale.set(scale, scale, scale);

        // Center bottom of feet at y = 0
        const center = new THREE.Vector3();
        box.getCenter(center);
        nasaModel.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        // Enhance materials with PBR properties matching reference images
        nasaModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = (child.name || '').toLowerCase();
            const matName = (child.material?.name || '').toLowerCase();

            // Check if this is the visor
            if (name.includes('visor') || matName.includes('visor') || matName.includes('glass') || (child.geometry.boundingSphere?.radius < 0.25 && child.position.y > 1.2)) {
              child.material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(0xd4af37), // Apollo gold
                metalness: 0.95,
                roughness: 0.08,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                reflectivity: 1.0,
              });
            } else {
              // High-spec EVA EMU thermal micrometer fabric
              child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xf0f3f6),
                metalness: 0.12,
                roughness: 0.65,
                roughnessMap: child.material?.roughnessMap || null,
                normalMap: child.material?.normalMap || null,
              });
            }
          }
        });

        // Add helmet work lights
        const lightsGroup = this.createSuitAccessories();
        nasaModel.add(lightsGroup);

        // Wrap in animation pivot
        const wrapper = new THREE.Group();
        wrapper.add(nasaModel);
        this.model = wrapper;

        // Replace procedural model with the NASA model
        this.animPivot.remove(this.proceduralAstronaut);
        this.animPivot.add(wrapper);
        this.isLoaded = true;
      },
      undefined,
      (err) => {
        console.warn('Using detailed procedural astronaut fallback:', err);
      }
    );
  }

  createDetailedProceduralAstronaut() {
    const group = new THREE.Group();
    group.name = 'ProceduralAstronaut';

    // Premium PBR materials
    const suitFabric = new THREE.MeshStandardMaterial({
      color: 0xedf1f5,
      roughness: 0.62,
      metalness: 0.1,
    });
    const suitDark = new THREE.MeshStandardMaterial({
      color: 0x1c2430,
      roughness: 0.5,
      metalness: 0.3,
    });
    const goldVisor = new THREE.MeshPhysicalMaterial({
      color: 0xffb703,
      emissive: 0x925f00,
      emissiveIntensity: 0.35,
      metalness: 0.98,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
    });
    const metalAccent = new THREE.MeshStandardMaterial({
      color: 0x8a9bb0,
      roughness: 0.25,
      metalness: 0.85,
    });
    const emissiveCyan = new THREE.MeshStandardMaterial({
      color: 0x4df2ff,
      emissive: 0x22d8e6,
      emissiveIntensity: 2.5,
    });
    const emissiveCoral = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      emissive: 0xff4422,
      emissiveIntensity: 2.0,
    });

    // 1. Torso & Chest Pack
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.08;

    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.23, 0.54, 18);
    torsoGeo.scale(1, 1, 0.72);
    const torsoMesh = new THREE.Mesh(torsoGeo, suitFabric);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // Hard Upper Torso (HUT) collar ring
    const collarGeo = new THREE.TorusGeometry(0.18, 0.035, 12, 24);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, 0.27, 0);
    const collarMesh = new THREE.Mesh(collarGeo, metalAccent);
    torsoGroup.add(collarMesh);

    // Chest Display & Control Module (DCM)
    const dcmGeo = new THREE.BoxGeometry(0.24, 0.18, 0.1);
    const dcmMesh = new THREE.Mesh(dcmGeo, suitDark);
    dcmMesh.position.set(0, 0.08, 0.18);
    torsoGroup.add(dcmMesh);

    // DCM Status screen / switches
    const screenGeo = new THREE.PlaneGeometry(0.16, 0.07);
    const screenMesh = new THREE.Mesh(screenGeo, emissiveCyan);
    screenMesh.position.set(0, 0.11, 0.232);
    torsoGroup.add(screenMesh);

    const switchGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
    const sw1 = new THREE.Mesh(switchGeo, emissiveCoral);
    sw1.position.set(-0.06, 0.03, 0.232);
    const sw2 = new THREE.Mesh(switchGeo, emissiveCyan);
    sw2.position.set(0.06, 0.03, 0.232);
    torsoGroup.add(sw1, sw2);

    // 2. Primary Life Support Subsystem (PLSS) Backpack
    const plssGroup = new THREE.Group();
    plssGroup.position.set(0, 0.06, -0.25);

    const plssMainGeo = new THREE.BoxGeometry(0.42, 0.58, 0.2);
    const plssMesh = new THREE.Mesh(plssMainGeo, suitFabric);
    plssMesh.castShadow = true;
    plssGroup.add(plssMesh);

    // Oxygen Tank Cylinders on top of PLSS
    const tankGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.38, 16);
    const tank1 = new THREE.Mesh(tankGeo, metalAccent);
    tank1.rotation.z = Math.PI / 2;
    tank1.position.set(0, 0.24, -0.05);
    plssGroup.add(tank1);

    // Vent manifolds / heat radiator
    const ventGeo = new THREE.BoxGeometry(0.32, 0.14, 0.04);
    const ventMesh = new THREE.Mesh(ventGeo, suitDark);
    ventMesh.position.set(0, -0.16, -0.105);
    plssGroup.add(ventMesh);

    torsoGroup.add(plssGroup);

    // 3. Helmet & Visor (NASA Extravehicular Visor Assembly - EVVA)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.48;

    const helmetGeo = new THREE.SphereGeometry(0.22, 24, 20);
    helmetGeo.scale(1, 1.05, 1.02);
    const helmetMesh = new THREE.Mesh(helmetGeo, suitFabric);
    helmetMesh.castShadow = true;
    headGroup.add(helmetMesh);

    // Curved Gold Reflective Visor (Iconic NASA EVVA Bubble Visor)
    const visorGeo = new THREE.SphereGeometry(0.205, 32, 24);
    visorGeo.scale(0.85, 0.72, 0.85);
    const visorMesh = new THREE.Mesh(visorGeo, goldVisor);
    visorMesh.position.set(0, 0.02, 0.12);
    headGroup.add(visorMesh);

    // Visor Seal Frame Ring
    const frameGeo = new THREE.TorusGeometry(0.15, 0.018, 12, 32);
    frameGeo.scale(0.92, 1.15, 1);
    const frameMesh = new THREE.Mesh(frameGeo, suitDark);
    frameMesh.position.set(0, 0.02, 0.14);
    headGroup.add(frameMesh);

    // Helmet Work Lights (left and right)
    const lightBracketGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12);
    lightBracketGeo.rotateZ(Math.PI / 2);

    const lightL = new THREE.Mesh(lightBracketGeo, metalAccent);
    lightL.position.set(-0.21, 0.06, 0.08);
    const lightR = new THREE.Mesh(lightBracketGeo, metalAccent);
    lightR.position.set(0.21, 0.06, 0.08);

    const lightBulbL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), emissiveCyan);
    lightBulbL.position.set(-0.24, 0.06, 0.09);
    const lightBulbR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), emissiveCyan);
    lightBulbR.position.set(0.24, 0.06, 0.09);

    headGroup.add(lightL, lightR, lightBulbL, lightBulbR);
    this.head = headGroup;

    // 4. Arms & Gloves (with shoulder convolute joints)
    this.leftArm = this.createArm(-1, suitFabric, suitDark, metalAccent);
    this.rightArm = this.createArm(1, suitFabric, suitDark, metalAccent);
    this.leftArm.position.set(-0.31, 1.25, 0);
    this.rightArm.position.set(0.31, 1.25, 0);

    // 5. Legs & Boots
    this.leftLeg = this.createLeg(-1, suitFabric, suitDark, metalAccent);
    this.rightLeg = this.createLeg(1, suitFabric, suitDark, metalAccent);
    this.leftLeg.position.set(-0.13, 0.82, 0);
    this.rightLeg.position.set(0.13, 0.82, 0);

    group.add(torsoGroup, headGroup, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.proceduralGroup = group;
    return group;
  }

  createArm(side, fabric, dark, metal) {
    const armRoot = new THREE.Group();

    // Shoulder bearing
    const shoulderGeo = new THREE.SphereGeometry(0.095, 14, 12);
    const shoulder = new THREE.Mesh(shoulderGeo, metal);
    armRoot.add(shoulder);

    // Upper arm
    const upperGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.28, 14);
    upperGeo.translate(0, -0.14, 0);
    const upper = new THREE.Mesh(upperGeo, fabric);
    upper.castShadow = true;
    armRoot.add(upper);

    // Elbow joint
    const elbowGeo = new THREE.SphereGeometry(0.075, 12, 10);
    const elbow = new THREE.Mesh(elbowGeo, dark);
    elbow.position.y = -0.28;
    armRoot.add(elbow);

    // Forearm
    const foreGeo = new THREE.CylinderGeometry(0.072, 0.068, 0.26, 14);
    foreGeo.translate(0, -0.13, 0);
    const fore = new THREE.Mesh(foreGeo, fabric);
    fore.position.y = -0.28;
    fore.castShadow = true;
    armRoot.add(fore);

    // Wrist disconnect ring
    const wristGeo = new THREE.TorusGeometry(0.07, 0.015, 8, 16);
    wristGeo.rotateX(Math.PI / 2);
    wristGeo.translate(0, -0.54, 0);
    const wrist = new THREE.Mesh(wristGeo, metal);
    armRoot.add(wrist);

    // EVA Glove
    const gloveGeo = new THREE.BoxGeometry(0.1, 0.12, 0.08);
    gloveGeo.translate(0, -0.61, 0.02);
    const glove = new THREE.Mesh(gloveGeo, dark);
    armRoot.add(glove);

    if (this.mode === 'orbit') {
      // Natural zero-G relaxed pose
      armRoot.rotation.z = side * 0.35;
      armRoot.rotation.x = -0.15;
    }

    return armRoot;
  }

  createLeg(side, fabric, dark, metal) {
    const legRoot = new THREE.Group();

    // Thigh
    const thighGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.38, 16);
    thighGeo.translate(0, -0.19, 0);
    const thigh = new THREE.Mesh(thighGeo, fabric);
    thigh.castShadow = true;
    legRoot.add(thigh);

    // Knee convolute joint
    const kneeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14);
    kneeGeo.rotateZ(Math.PI / 2);
    const knee = new THREE.Mesh(kneeGeo, dark);
    knee.position.y = -0.38;
    legRoot.add(knee);

    // Shin / Lower leg
    const shinGeo = new THREE.CylinderGeometry(0.092, 0.085, 0.38, 16);
    shinGeo.translate(0, -0.19, 0);
    const shin = new THREE.Mesh(shinGeo, fabric);
    shin.position.y = -0.38;
    shin.castShadow = true;
    legRoot.add(shin);

    // Lunar/Planetary EVA Boot
    const bootGeo = new THREE.BoxGeometry(0.15, 0.12, 0.28);
    bootGeo.translate(0, -0.06, 0.06);
    const boot = new THREE.Mesh(bootGeo, dark);
    boot.position.y = -0.76;
    boot.castShadow = true;
    legRoot.add(boot);

    // Boot tread sole
    const soleGeo = new THREE.BoxGeometry(0.16, 0.03, 0.3);
    soleGeo.translate(0, -0.13, 0.06);
    const sole = new THREE.Mesh(soleGeo, metal);
    boot.add(sole);

    return legRoot;
  }

  createSuitAccessories() {
    const group = new THREE.Group();

    // Dual forward helmet spotlights
    const spotL = new THREE.SpotLight(0x7df0ff, 2.5, 12, Math.PI / 6, 0.4, 1.2);
    spotL.position.set(-0.25, 1.55, 0.2);
    spotL.target.position.set(-0.25, 1.2, 5);
    group.add(spotL);
    group.add(spotL.target);

    const spotR = new THREE.SpotLight(0x7df0ff, 2.5, 12, Math.PI / 6, 0.4, 1.2);
    spotR.position.set(0.25, 1.55, 0.2);
    spotR.target.position.set(0.25, 1.2, 5);
    group.add(spotR);
    group.add(spotR.target);

    return group;
  }

  update(dt, speed = 0, isMoving = false) {
    this.animTime += dt;
    this.isMoving = isMoving;
    this.moveSpeed = speed;

    if (this.mode === 'orbit') {
      // Cinematic Zero-G floating drift
      const t = this.animTime;
      const bob = Math.sin(t * 1.2) * 0.08;
      const sway = Math.cos(t * 0.8) * 0.04;
      const roll = Math.sin(t * 0.6) * 0.05;
      const pitch = Math.cos(t * 0.9) * 0.04;

      this.animPivot.position.y = bob;
      this.animPivot.position.x = sway;
      this.animPivot.rotation.z = roll;
      this.animPivot.rotation.x = pitch;

      if (this.leftArm && this.rightArm) {
        this.leftArm.rotation.z = -0.35 + Math.sin(t * 0.9) * 0.06;
        this.rightArm.rotation.z = 0.35 - Math.sin(t * 0.9 + 1) * 0.06;
        this.leftArm.rotation.x = -0.15 + Math.cos(t * 0.7) * 0.05;
        this.rightArm.rotation.x = -0.15 + Math.cos(t * 0.7 + 1) * 0.05;
      }
    } else {
      // Ground gameplay walk cycle & idle breathing
      if (this.isMoving) {
        this.walkCycle += dt * (speed > 3 ? 12 : 8);
        const legAngle = Math.sin(this.walkCycle) * 0.45;
        const armAngle = -Math.sin(this.walkCycle) * 0.4;

        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x = legAngle;
          this.rightLeg.rotation.x = -legAngle;
        }
        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x = armAngle;
          this.rightArm.rotation.x = -armAngle;
          this.leftArm.rotation.z = -0.12;
          this.rightArm.rotation.z = 0.12;
        }
        this.animPivot.position.y = Math.abs(Math.sin(this.walkCycle * 2)) * 0.04;
      } else {
        // Idle breathing
        const breathe = Math.sin(this.animTime * 2.2) * 0.012;
        this.animPivot.position.y = breathe;
        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x *= 0.85;
          this.rightLeg.rotation.x *= 0.85;
        }
        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x *= 0.85;
          this.rightArm.rotation.x *= 0.85;
          this.leftArm.rotation.z = -0.12 + Math.sin(this.animTime * 1.5) * 0.02;
          this.rightArm.rotation.z = 0.12 - Math.sin(this.animTime * 1.5) * 0.02;
        }
      }
    }
  }
}
