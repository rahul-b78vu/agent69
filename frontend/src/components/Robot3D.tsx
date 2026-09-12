import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Robot3DProps {
  className?: string;
}

/**
 * Creates a high-resolution HTML5 Canvas texture of the Superhero Chest Emblem
 * (Yellow diamond shield with bold red border and the classic red 'S' crest).
 */
function createSuperheroEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;

  // Outer Red Diamond Shield
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 200);        // Top
  ctx.lineTo(cx + 195, cy - 80);   // Top-Right
  ctx.lineTo(cx + 125, cy + 180);  // Bottom-Right
  ctx.lineTo(cx, cy + 220);        // Bottom tip
  ctx.lineTo(cx - 125, cy + 180);  // Bottom-Left
  ctx.lineTo(cx - 195, cy - 80);   // Top-Left
  ctx.closePath();

  ctx.fillStyle = '#dc2626'; // Bold Crimson Red
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#991b1b';
  ctx.stroke();

  // Inner Golden Yellow Shield
  ctx.beginPath();
  ctx.moveTo(cx, cy - 170);
  ctx.lineTo(cx + 168, cy - 68);
  ctx.lineTo(cx + 105, cy + 158);
  ctx.lineTo(cx, cy + 192);
  ctx.lineTo(cx - 105, cy + 158);
  ctx.lineTo(cx - 168, cy - 68);
  ctx.closePath();
  ctx.fillStyle = '#facc15'; // Bright Golden Yellow
  ctx.fill();

  // Bold Red 'S' Insignia
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  // Top horizontal bar
  ctx.moveTo(cx - 105, cy - 130);
  ctx.lineTo(cx + 115, cy - 130);
  ctx.lineTo(cx + 135, cy - 75);
  ctx.lineTo(cx + 45, cy - 75);
  ctx.quadraticCurveTo(cx - 15, cy - 75, cx - 15, cy - 35);
  ctx.quadraticCurveTo(cx - 15, cy - 5, cx + 50, cy + 15);
  // Bottom sweep
  ctx.lineTo(cx + 90, cy + 35);
  ctx.quadraticCurveTo(cx + 135, cy + 65, cx + 135, cy + 115);
  ctx.quadraticCurveTo(cx + 135, cy + 165, cx + 35, cy + 170);
  ctx.lineTo(cx - 105, cy + 170);
  ctx.lineTo(cx - 125, cy + 115);
  ctx.lineTo(cx - 25, cy + 115);
  ctx.quadraticCurveTo(cx + 35, cy + 115, cx + 35, cy + 85);
  ctx.quadraticCurveTo(cx + 35, cy + 55, cx - 35, cy + 35);
  ctx.lineTo(cx - 65, cy + 20);
  ctx.quadraticCurveTo(cx - 115, cy - 5, cx - 115, cy - 65);
  ctx.quadraticCurveTo(cx - 115, cy - 120, cx - 105, cy - 130);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates the Visor Screen texture with glowing cyan smiling happy eyes (`^ ^`).
 */
function createHappyEyesTexture(): { texture: THREE.CanvasTexture; updateBlink: (blinkProgress: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  function draw(blink = 0) {
    ctx.fillStyle = '#060914'; // Glossy deep black
    ctx.fillRect(0, 0, 512, 256);

    const eyeScaleY = Math.max(0.06, 1 - blink);

    // Left Eye Arc
    ctx.save();
    ctx.translate(160, 120);
    ctx.scale(1, eyeScaleY);

    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 35;
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00f0ff'; // Electric Cyan Glow

    ctx.beginPath();
    ctx.arc(0, 0, 56, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    // Inner bright white core
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Right Eye Arc
    ctx.save();
    ctx.translate(352, 120);
    ctx.scale(1, eyeScaleY);

    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 35;
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00f0ff';

    ctx.beginPath();
    ctx.arc(0, 0, 56, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    // Inner bright white core
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  draw(0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return {
    texture,
    updateBlink: (p: number) => {
      draw(p);
      texture.needsUpdate = true;
    },
  };
}

export const Robot3D: React.FC<Robot3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 180;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.88, 3.5);
    camera.lookAt(0, 0.68, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting System
    const ambientLight = new THREE.AmbientLight(0xf0f9ff, 1.7);
    scene.add(ambientLight);

    // Front-Right Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(2.5, 4, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Back-Left Cyan Rim Light (Hero Edge Silhouette)
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 3.4);
    rimLight.position.set(-3.5, 2.5, -2.5);
    scene.add(rimLight);

    // Soft Warm Fill Light
    const fillLight = new THREE.PointLight(0x93c5fd, 1.5, 10);
    fillLight.position.set(0, 0.2, 2.5);
    scene.add(fillLight);

    // 4. Materials
    const whiteCeramicMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
    });

    const royalBlueHoodieMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Vivid Royal Blue Hoodie
      roughness: 0.6,
      metalness: 0.05,
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.2,
      roughness: 0.1,
      metalness: 0.2,
    });

    const darkJointMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
    });

    const darkGripMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark slate for finger joints
      roughness: 0.5,
      metalness: 0.4,
    });

    const redCapeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Crimson Red Cape
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const blueShoeAccentMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.25,
      metalness: 0.3,
    });

    // 5. Clean Floating Hover Runway Platform
    const runwayGroup = new THREE.Group();
    const runwayGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.06, 48);
    runwayGeo.scale(1.8, 1, 0.55); // Wide pill track
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, -0.03, 0);
    runway.receiveShadow = true;
    runwayGroup.add(runway);

    // Glowing Cyan Trim on Runway Edge
    const runwayRingGeo = new THREE.TorusGeometry(2.48, 0.018, 12, 48);
    runwayRingGeo.rotateX(Math.PI / 2);
    runwayRingGeo.scale(1.8, 0.55, 1);
    const runwayRing = new THREE.Mesh(runwayRingGeo, cyanGlowMat);
    runwayRing.position.set(0, 0, 0);
    runwayGroup.add(runwayRing);

    scene.add(runwayGroup);

    // 6. Textures
    const emblemTex = createSuperheroEmblemTexture();
    const { texture: eyesTex, updateBlink } = createHappyEyesTexture();

    // 7. ROBOT CHARACTER HIERARCHY
    const robotRoot = new THREE.Group();
    robotRoot.scale.set(0.78, 0.78, 0.78);
    scene.add(robotRoot);

    // Horizontal walking bounds
    const startX = -1.75;
    const endX = 1.75;
    robotRoot.position.set(startX, 0, 0);

    // robotBody: Faces forward with subtle 3/4 angle (~10 degrees)
    const robotBody = new THREE.Group();
    robotBody.rotation.y = 0.14;
    robotRoot.add(robotBody);

    // --- PELVIS & TORSO ---
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.65;
    robotBody.add(pelvis);

    const torsoGroup = new THREE.Group();
    pelvis.add(torsoGroup);

    // Blue Hoodie Body (Cute rounded chibi torso)
    const hoodieGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.58, 28);
    const hoodieMesh = new THREE.Mesh(hoodieGeo, royalBlueHoodieMat);
    hoodieMesh.position.y = 0.29;
    hoodieMesh.castShadow = true;
    hoodieMesh.receiveShadow = true;
    torsoGroup.add(hoodieMesh);

    // Hoodie Bottom Ribbing
    const ribbingGeo = new THREE.TorusGeometry(0.42, 0.04, 12, 32);
    ribbingGeo.rotateX(Math.PI / 2);
    const ribbingMesh = new THREE.Mesh(ribbingGeo, royalBlueHoodieMat);
    ribbingMesh.position.y = 0.02;
    torsoGroup.add(ribbingMesh);

    // Kangaroo Front Pouch
    const pouchGeo = new THREE.BoxGeometry(0.4, 0.17, 0.1);
    const pouchMesh = new THREE.Mesh(pouchGeo, royalBlueHoodieMat);
    pouchMesh.position.set(0, 0.15, 0.36);
    torsoGroup.add(pouchMesh);

    // White Hoodie Drawstrings
    [-0.075, 0.075].forEach((xOff) => {
      const stringGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8);
      const stringMesh = new THREE.Mesh(stringGeo, whiteCeramicMat);
      stringMesh.position.set(xOff, 0.42, 0.38);
      stringMesh.rotation.z = xOff > 0 ? -0.1 : 0.1;
      torsoGroup.add(stringMesh);

      // Silver aglet at tip
      const agletGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8);
      const agletMesh = new THREE.Mesh(agletGeo, darkJointMat);
      agletMesh.position.set(xOff + (xOff > 0 ? -0.01 : 0.01), 0.31, 0.39);
      torsoGroup.add(agletMesh);
    });

    // Superhero Chest Shield Emblem ('S' Logo)
    const emblemMat = new THREE.MeshBasicMaterial({
      map: emblemTex,
      transparent: true,
      depthWrite: false,
    });
    const emblemGeo = new THREE.PlaneGeometry(0.36, 0.36);
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.position.set(0, 0.35, 0.41);
    emblemMesh.rotation.x = -0.04;
    torsoGroup.add(emblemMesh);

    // --- RED SUPERHERO CAPE ---
    const capeGroup = new THREE.Group();
    capeGroup.position.set(0, 0.54, -0.34);
    torsoGroup.add(capeGroup);

    // Hinged cape segments for wind physics
    const capeSegments: THREE.Mesh[] = [];
    let prevCapeAnchor: THREE.Object3D = capeGroup;
    const numCapeSegments = 5;
    const segLength = 0.14;

    for (let i = 0; i < numCapeSegments; i++) {
      const segGroup = new THREE.Group();
      if (i > 0) {
        segGroup.position.y = -segLength;
      }
      prevCapeAnchor.add(segGroup);

      const widthTop = 0.55 + i * 0.07;
      const segGeo = new THREE.PlaneGeometry(widthTop, segLength);
      segGeo.translate(0, -segLength / 2, 0);

      const segMesh = new THREE.Mesh(segGeo, redCapeMat);
      segMesh.castShadow = true;
      segGroup.add(segMesh);
      capeSegments.push(segMesh);

      prevCapeAnchor = segGroup;
    }

    // --- HEAD GROUP (Large Rounded Chibi Astronaut Helmet) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.68, 0.02);
    torsoGroup.add(headGroup);

    // Dark neck joint
    const neckGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.1, 16);
    const neckMesh = new THREE.Mesh(neckGeo, darkJointMat);
    neckMesh.position.y = -0.05;
    headGroup.add(neckMesh);

    // Helmet Shell (Glossy white rounded squircle)
    const helmetGeo = new THREE.SphereGeometry(0.54, 32, 28);
    helmetGeo.scale(1.22, 0.98, 1.08); // Cute chubby proportions
    const helmetMesh = new THREE.Mesh(helmetGeo, whiteCeramicMat);
    helmetMesh.position.y = 0.35;
    helmetMesh.castShadow = true;
    helmetMesh.receiveShadow = true;
    headGroup.add(helmetMesh);

    // Visor Faceplate Bezel
    const visorBezelGeo = new THREE.TorusGeometry(0.42, 0.035, 16, 32);
    visorBezelGeo.scale(1.15, 0.85, 1);
    const visorBezel = new THREE.Mesh(visorBezelGeo, whiteCeramicMat);
    visorBezel.position.set(0, 0.35, 0.44);
    headGroup.add(visorBezel);

    // Visor Display Screen with Happy Cyan Eyes Texture
    const visorScreenGeo = new THREE.SphereGeometry(0.48, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    visorScreenGeo.scale(1.06, 0.76, 0.6);
    visorScreenGeo.rotateX(Math.PI / 2);
    const visorMatWithEyes = new THREE.MeshStandardMaterial({
      map: eyesTex,
      roughness: 0.08,
      metalness: 0.85,
      emissive: 0x00f0ff,
      emissiveMap: eyesTex,
      emissiveIntensity: 2.2,
    });
    const visorScreen = new THREE.Mesh(visorScreenGeo, visorMatWithEyes);
    visorScreen.position.set(0, 0.35, 0.33);
    headGroup.add(visorScreen);

    // Left & Right Blue Headphone Ear Pods
    [-1, 1].forEach((dir) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(dir * 0.65, 0.35, 0);
      headGroup.add(earGroup);

      // Blue ear cup cylinder
      const cupGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.09, 24);
      cupGeo.rotateZ(Math.PI / 2);
      const cupMesh = new THREE.Mesh(cupGeo, blueShoeAccentMat);
      cupMesh.castShadow = true;
      earGroup.add(cupMesh);

      // Glowing Cyan Center Disc
      const ringGeo = new THREE.TorusGeometry(0.1, 0.022, 12, 24);
      ringGeo.rotateY(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeo, cyanGlowMat);
      ringMesh.position.x = dir * 0.05;
      earGroup.add(ringMesh);
    });

    // Cute Antenna with Glowing Cyan Bulb
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0, 0.82, -0.04);
    headGroup.add(antennaGroup);

    const stalkGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.22, 12);
    stalkGeo.translate(0, 0.11, 0);
    stalkGeo.rotateZ(-0.14);
    const stalkMesh = new THREE.Mesh(stalkGeo, darkJointMat);
    stalkMesh.castShadow = true;
    antennaGroup.add(stalkMesh);

    const bulbGeo = new THREE.SphereGeometry(0.08, 20, 16);
    const bulbMesh = new THREE.Mesh(bulbGeo, cyanGlowMat);
    bulbMesh.position.set(0.04, 0.22, 0);
    antennaGroup.add(bulbMesh);

    // --- LEFT ARM (Viewer's Right): PROMINENT HIGH WAVING HAND ("Say Hi!") ---
    // Shoulder on upper torso
    const leftShoulderGroup = new THREE.Group();
    leftShoulderGroup.position.set(0.44, 0.38, 0.12);
    torsoGroup.add(leftShoulderGroup);

    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), whiteCeramicMat);
    leftShoulderGroup.add(leftShoulder);

    // Upper Arm: Angled out to (0.32, 0.28, 0) relative to shoulder
    const leftBicepGeo = new THREE.CylinderGeometry(0.08, 0.085, 0.34, 16);
    const leftBicepMesh = new THREE.Mesh(leftBicepGeo, royalBlueHoodieMat);
    leftBicepMesh.position.set(0.16, 0.14, 0);
    leftBicepMesh.rotation.z = -0.85; // angled up & out
    leftBicepMesh.castShadow = true;
    leftShoulderGroup.add(leftBicepMesh);

    // Elbow Group: Reaches x = 0.32, y = 0.28 outside the shoulder
    const leftElbowGroup = new THREE.Group();
    leftElbowGroup.position.set(0.32, 0.28, 0.02);
    leftShoulderGroup.add(leftElbowGroup);

    const leftElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), darkJointMat);
    leftElbowGroup.add(leftElbowJoint);

    const leftElbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 16), cyanGlowMat);
    leftElbowGroup.add(leftElbowRing);

    // Forearm Group: Reaches up from elbow to hand
    const leftForearmGroup = new THREE.Group();
    leftElbowGroup.add(leftForearmGroup);

    const leftForearmGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.32, 16);
    const leftForearmMesh = new THREE.Mesh(leftForearmGeo, whiteCeramicMat);
    leftForearmMesh.position.set(0.08, 0.16, 0);
    leftForearmMesh.rotation.z = -0.45; // Angled upright beside head
    leftForearmMesh.castShadow = true;
    leftForearmGroup.add(leftForearmMesh);

    // Waving Hand: Positioned at top of forearm beside the head at head/eye level!
    const wavingHand = new THREE.Group();
    wavingHand.position.set(0.18, 0.36, 0.05);
    wavingHand.scale.set(1.25, 1.25, 1.25);
    leftForearmGroup.add(wavingHand);

    // Palm
    const palmGeo = new THREE.BoxGeometry(0.22, 0.18, 0.08);
    const palmMesh = new THREE.Mesh(palmGeo, whiteCeramicMat);
    palmMesh.castShadow = true;
    wavingHand.add(palmMesh);

    // 4 Articulated spread fingers with dark knuckle accents
    [-0.07, -0.023, 0.023, 0.07].forEach((xPos, idx) => {
      const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), darkGripMat);
      knuckle.position.set(xPos, 0.1, 0);
      wavingHand.add(knuckle);

      const fingerGeo = new THREE.CylinderGeometry(0.021, 0.023, 0.15, 8);
      fingerGeo.translate(0, 0.075, 0);
      const fingerMesh = new THREE.Mesh(fingerGeo, whiteCeramicMat);
      fingerMesh.position.set(xPos, 0.12, 0);
      fingerMesh.rotation.z = (idx - 1.5) * 0.14;
      wavingHand.add(fingerMesh);
    });

    // Thumb pointing out
    const thumbKnuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), darkGripMat);
    thumbKnuckle.position.set(0.12, 0.04, 0);
    thumbKnuckle.rotation.z = -0.7;
    wavingHand.add(thumbKnuckle);

    const thumbGeo = new THREE.CylinderGeometry(0.02, 0.023, 0.11, 8);
    thumbGeo.translate(0, 0.055, 0);
    const thumbMesh = new THREE.Mesh(thumbGeo, whiteCeramicMat);
    thumbMesh.position.set(0.14, 0.05, 0);
    thumbMesh.rotation.z = -0.75;
    wavingHand.add(thumbMesh);

    // --- RIGHT ARM (Viewer's Left): NATURAL STRIDE COUNTER-SWING ---
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-0.46, 0.42, 0.1);
    torsoGroup.add(rightArmGroup);

    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), whiteCeramicMat);
    rightArmGroup.add(rightShoulder);

    const rightUpperArm = new THREE.Group();
    rightArmGroup.add(rightUpperArm);

    const rightBicepGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.24, 16);
    rightBicepGeo.translate(0, -0.12, 0);
    const rightBicepMesh = new THREE.Mesh(rightBicepGeo, royalBlueHoodieMat);
    rightBicepMesh.castShadow = true;
    rightUpperArm.add(rightBicepMesh);

    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -0.25, 0);
    rightUpperArm.add(rightElbow);

    const rightElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), darkJointMat);
    rightElbow.add(rightElbowJoint);

    const rightElbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 16), cyanGlowMat);
    rightElbow.add(rightElbowRing);

    const rightForearm = new THREE.Group();
    rightElbow.add(rightForearm);

    const rightForearmGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.22, 16);
    rightForearmGeo.translate(0, -0.11, 0);
    const rightForearmMesh = new THREE.Mesh(rightForearmGeo, whiteCeramicMat);
    rightForearmMesh.castShadow = true;
    rightForearm.add(rightForearmMesh);

    const rightFistMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), whiteCeramicMat);
    rightFistMesh.position.set(0, -0.24, 0);
    rightForearm.add(rightFistMesh);

    // --- LEGS & SNEAKERS ---
    function buildLeg(isRight: boolean) {
      const legRoot = new THREE.Group();
      legRoot.position.set(isRight ? -0.2 : 0.2, 0, 0);
      pelvis.add(legRoot);

      const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), darkJointMat);
      legRoot.add(hipMesh);

      const thigh = new THREE.Group();
      legRoot.add(thigh);

      const thighGeo = new THREE.CylinderGeometry(0.08, 0.085, 0.26, 16);
      thighGeo.translate(0, -0.13, 0);
      const thighMesh = new THREE.Mesh(thighGeo, whiteCeramicMat);
      thighMesh.castShadow = true;
      thigh.add(thighMesh);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.27, 0);
      thigh.add(kneeGroup);

      const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), darkJointMat);
      kneeGroup.add(kneeBall);

      // Glowing Cyan Disc on Knee side
      const kneeDiscGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 16);
      kneeDiscGeo.rotateZ(Math.PI / 2);
      const kneeDisc = new THREE.Mesh(kneeDiscGeo, cyanGlowMat);
      kneeDisc.position.x = isRight ? -0.085 : 0.085;
      kneeGroup.add(kneeDisc);

      const shin = new THREE.Group();
      kneeGroup.add(shin);

      const shinGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.24, 16);
      shinGeo.translate(0, -0.12, 0);
      const shinMesh = new THREE.Mesh(shinGeo, whiteCeramicMat);
      shinMesh.castShadow = true;
      shin.add(shinMesh);

      const ankleGroup = new THREE.Group();
      ankleGroup.position.set(0, -0.25, 0);
      shin.add(ankleGroup);

      const ankleBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), darkJointMat);
      ankleGroup.add(ankleBall);

      const ankleDisc = new THREE.Mesh(kneeDiscGeo, cyanGlowMat);
      ankleDisc.position.x = isRight ? -0.08 : 0.08;
      ankleGroup.add(ankleDisc);

      // Sneaker Boot
      const foot = new THREE.Group();
      ankleGroup.add(foot);

      const shoeBodyGeo = new THREE.BoxGeometry(0.17, 0.1, 0.32);
      shoeBodyGeo.translate(0, -0.035, 0.05);
      const shoeBody = new THREE.Mesh(shoeBodyGeo, whiteCeramicMat);
      shoeBody.castShadow = true;
      foot.add(shoeBody);

      // Royal Blue Toe Cap
      const toeCapGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.11, 16, 1, false, 0, Math.PI);
      toeCapGeo.rotateX(-Math.PI / 2);
      const toeCap = new THREE.Mesh(toeCapGeo, blueShoeAccentMat);
      toeCap.position.set(0, -0.04, 0.19);
      foot.add(toeCap);

      // Royal Blue Heel Cap
      const heelCapGeo = new THREE.BoxGeometry(0.18, 0.07, 0.09);
      heelCapGeo.translate(0, -0.025, -0.1);
      const heelCap = new THREE.Mesh(heelCapGeo, blueShoeAccentMat);
      foot.add(heelCap);

      // Glowing Cyan Light-Up Sole
      const soleGeo = new THREE.BoxGeometry(0.19, 0.025, 0.36);
      soleGeo.translate(0, -0.095, 0.05);
      const soleMesh = new THREE.Mesh(soleGeo, cyanGlowMat);
      foot.add(soleMesh);

      return { legRoot, thigh, kneeGroup, shin, foot };
    }

    const leftLeg = buildLeg(false);
    const rightLeg = buildLeg(true);

    // 8. Mouse Interaction
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetMouseX = x * 0.45;
      targetMouseY = y * 0.25;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 9. ANIMATION LOOP
    let animId: number;
    let clock = new THREE.Clock();
    let currentX = startX;
    const walkSpeed = 0.92; // Smooth, charming walking pace across the arena
    let blinkTimer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      currentMouseX += (targetMouseX - currentMouseX) * 0.08;
      currentMouseY += (targetMouseY - currentMouseY) * 0.08;

      // ----------------------------------------------------
      // A. LEFT-TO-RIGHT CONTINUOUS WALKING LOOP
      // ----------------------------------------------------
      currentX += delta * walkSpeed;

      // Smooth wrap when reaching right edge
      if (currentX > endX) {
        currentX = startX;
      }

      robotRoot.position.x = currentX;

      // ----------------------------------------------------
      // B. STRIDE KINEMATICS (Bipedal Walk Cycle)
      // ----------------------------------------------------
      const strideFreq = 6.8;
      const cycle = time * strideFreq;

      const leftStride = Math.sin(cycle);
      const rightStride = -Math.sin(cycle);

      // Thigh rotation
      leftLeg.thigh.rotation.x = leftStride * 0.5;
      rightLeg.thigh.rotation.x = rightStride * 0.5;

      // Knee bend on back extension
      leftLeg.kneeGroup.rotation.x = Math.max(0, -leftStride) * 0.65;
      rightLeg.kneeGroup.rotation.x = Math.max(0, -rightStride) * 0.65;

      // Feet lift & roll
      leftLeg.foot.rotation.x = -leftStride * 0.2;
      rightLeg.foot.rotation.x = -rightStride * 0.2;

      // Torso bobbing
      const bob = Math.abs(Math.sin(cycle)) * 0.05;
      pelvis.position.y = 0.65 + bob;

      // Subtle hip sway
      pelvis.rotation.z = Math.sin(cycle) * 0.035;

      // Right arm natural counter-swing
      rightUpperArm.rotation.x = leftStride * 0.4;
      rightForearm.rotation.x = Math.max(0, -leftStride) * 0.25;

      // ----------------------------------------------------
      // C. LEFT HAND WAVING TO SAY "HI!" 👋 (Held High Beside Head)
      // ----------------------------------------------------
      const waveSpeed = 8.5;
      const waveVal = Math.sin(time * waveSpeed);

      // Forearm and hand oscillate actively back and forth
      leftForearmGroup.rotation.z = waveVal * 0.25;
      wavingHand.rotation.z = waveVal * 0.35;
      wavingHand.rotation.y = Math.cos(time * waveSpeed) * 0.25;

      // ----------------------------------------------------
      // D. CAPE BILLOWING PHYSICS
      // ----------------------------------------------------
      capeSegments.forEach((seg, i) => {
        const wave = Math.sin(time * 6.0 - i * 0.75) * 0.22 + 0.3;
        seg.rotation.x = wave;
      });

      // ----------------------------------------------------
      // E. HEAD GAZE & EYE BLINK
      // ----------------------------------------------------
      headGroup.rotation.y = currentMouseX * 0.35 + Math.sin(cycle * 0.5) * 0.04;
      headGroup.rotation.x = currentMouseY * 0.2 - 0.03;

      // Soft eye blink
      blinkTimer += delta;
      if (blinkTimer > 3.6) {
        const blinkProgress = Math.sin((blinkTimer - 3.6) * Math.PI / 0.18);
        if (blinkProgress > 0) {
          updateBlink(blinkProgress);
        } else {
          updateBlink(0);
          blinkTimer = 0;
        }
      }

      // Antenna spring wobble
      antennaGroup.rotation.z = Math.sin(cycle) * 0.06;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 320;
      height = container.clientHeight || 180;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none cursor-pointer overflow-hidden ${className}`}
      title="Agent 69 Superhero Sentinel: Walking & Waving Hello!"
    />
  );
};
