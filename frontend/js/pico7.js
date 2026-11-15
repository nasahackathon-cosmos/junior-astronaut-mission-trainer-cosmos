import * as THREE from 'three';

/**
 * Shared physical PICO-7 companion used by every playable 3D scene.
 * The scene owns the renderer; this component owns only robot appearance,
 * movement, reactions, and conversation-facing animation state.
 */
export class Pico7Companion {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'PICO-7';
    this.root.position.set(-1.8, 0.16, -1.2);
    this.velocity = new THREE.Vector3();
    this.guideTarget = null;
    this.emotion = 'curious';
    this.talking = false;
    this.animTime = Math.random() * 10;
    this.blinkTimer = 2.4;
    this.buildModel();
  }

  buildModel() {
    const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.12 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x087ea4, roughness: 0.24, metalness: 0.42 });
    const dark = new THREE.MeshPhysicalMaterial({ color: 0x071426, roughness: 0.08, metalness: 0.78, clearcoat: 1 });
    this.eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0e7490, emissiveIntensity: 2.5 });
    this.mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.55, 0.62), white);
    this.body.position.y = 0.46;
    this.body.castShadow = true;
    this.root.add(this.body);

    this.chest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.04), blue);
    this.chest.position.set(0, 0.48, 0.33);
    this.root.add(this.chest);

    this.head = new THREE.Group();
    this.head.position.y = 1.02;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.55, 0.56), white);
    head.castShadow = true;
    this.head.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.035), dark);
    visor.position.set(0, -0.02, 0.29);
    this.head.add(visor);
    this.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), this.eyeMaterial);
    this.eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), this.eyeMaterial);
    this.eyeL.position.set(-0.13, 0, 0.32);
    this.eyeR.position.set(0.13, 0, 0.32);
    this.head.add(this.eyeL, this.eyeR);
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.018), this.mouthMaterial);
    this.mouth.position.set(0, -0.13, 0.325);
    this.head.add(this.mouth);
    this.root.add(this.head);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 10), blue);
    antenna.position.y = 1.43;
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), this.eyeMaterial);
    this.beacon.position.y = 1.57;
    this.root.add(antenna, this.beacon);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 24), blue);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    this.hoverRing = ring;
    this.root.add(ring);

    this.wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 16), dark);
    this.wheelR = this.wheelL.clone();
    this.wheelL.rotation.z = Math.PI / 2;
    this.wheelR.rotation.z = Math.PI / 2;
    this.wheelL.position.set(-0.38, 0.23, 0);
    this.wheelR.position.set(0.38, 0.23, 0);
    this.root.add(this.wheelL, this.wheelR);
  }

  setGuideTarget(target) {
    this.guideTarget = target ? new THREE.Vector3(target[0], 0, target[1]) : null;
  }

  setTalking(value) { this.talking = Boolean(value); }

  setEmotion(emotion) {
    this.emotion = emotion;
    const colors = { happy: 0x4ade80, curious: 0x38bdf8, concerned: 0xfbbf24, excited: 0xf97316, calm: 0xa5b4fc };
    const color = colors[emotion] || colors.curious;
    this.eyeMaterial.color.setHex(color);
    this.eyeMaterial.emissive.setHex(color);
  }

  faceTarget(target) {
    if (!target) return;
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    if (Math.hypot(dx, dz) > 0.05) this.root.rotation.y = Math.atan2(dx, dz);
  }

  isBlocked(candidate, obstacles = []) {
    return obstacles.some(([x, z, radius]) => Math.hypot(candidate.x - x, candidate.z - z) < radius + 0.55);
  }

  update(dt, player, obstacles = []) {
    if (!player) return;
    this.animTime += dt;
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.eyeL.scale.y = 0.12;
      this.eyeR.scale.y = 0.12;
      this.blinkTimer = 2.8 + Math.random() * 3.5;
    } else {
      this.eyeL.scale.y += (1 - this.eyeL.scale.y) * Math.min(1, dt * 14);
      this.eyeR.scale.y += (1 - this.eyeR.scale.y) * Math.min(1, dt * 14);
    }

    const facing = player.facing || 0;
    const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const side = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing));
    const desired = new THREE.Vector3(player.x, 0, player.z).sub(forward.multiplyScalar(1.8)).add(side.multiplyScalar(0.9));
    if (this.guideTarget) {
      const toGuide = this.guideTarget.clone().sub(this.root.position);
      if (toGuide.length() > 1.35) desired.copy(this.guideTarget).sub(toGuide.normalize().multiplyScalar(1.1));
      else this.guideTarget = null;
    }

    const delta = desired.sub(this.root.position);
    delta.y = 0;
    const distance = delta.length();
    const candidate = this.root.position.clone();
    if (distance > 0.38) {
      delta.normalize();
      const step = Math.min(distance, dt * (distance > 3 ? 3.5 : 2.25));
      candidate.addScaledVector(delta, step);
      if (!this.isBlocked(candidate, obstacles)) {
        this.root.position.x = candidate.x;
        this.root.position.z = candidate.z;
      }
      this.faceTarget(candidate);
      this.wheelL.rotation.x += dt * 7;
      this.wheelR.rotation.x += dt * 7;
    } else {
      this.faceTarget(new THREE.Vector3(player.x, 0, player.z));
    }

    const talkingPulse = this.talking ? 1 + Math.sin(this.animTime * 18) * 0.24 : 1;
    this.mouth.scale.x = talkingPulse;
    this.mouth.scale.y = this.talking ? 1.5 : 1;
    this.head.rotation.z = Math.sin(this.animTime * 1.7) * 0.025;
    // Wheels stay grounded; only the antenna/head animation conveys motion.
    this.root.position.y = 0.14 + Math.sin(this.animTime * 2.5) * 0.018;
    this.hoverRing.scale.setScalar(1 + Math.sin(this.animTime * 8) * 0.08);
    this.beacon.scale.setScalar(1 + Math.sin(this.animTime * 5) * 0.12);
  }

  destroy() { this.root.clear(); }
}
