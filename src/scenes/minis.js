import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeMini, makeChromeMat, makeLimeMat, makeStarGeometry, damp, lerp } from '../helpers.js';

/** Applique la souris et le survol sur un groupe d'objet. */
function pose(group, t, dt, ctx, state, { yaw = 0.45, pitch = 0.2, bob = 0.08 } = {}) {
  state.hover = damp(state.hover, ctx.hover, 6, dt);
  state.ry = damp(state.ry, ctx.pointer.x * yaw, 4, dt);
  state.rx = damp(state.rx, -ctx.pointer.y * pitch, 4, dt);
  group.rotation.x = state.rx;
  group.position.y = Math.sin(t * 1.2) * bob;
}

/* ------------------------------ Gyrophare ------------------------------ */
export function buildSiren({ env }) {
  const { scene, camera } = makeMini(env, { z: 7.4 });
  const g = new THREE.Group();
  scene.add(g);
  const inner = new THREE.Group();   // décalé vers le haut pour centrer l'objet
  inner.position.y = 0.55;
  g.add(inner);

  const chrome = makeChromeMat({ roughness: 0.14 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.42, 44), chrome);
  base.position.y = -1.0;
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98, 0.98, 0.14, 44),
    new THREE.MeshStandardMaterial({ color: 0x2a1048, roughness: 0.4, metalness: 0.4 }),
  );
  collar.position.y = -0.72;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.94, 44, 22, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xbcd8ff, transparent: true, opacity: 0.5, roughness: 0.04, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  dome.position.y = -0.66;
  inner.add(base, collar, dome);

  const rot = new THREE.Group();
  rot.position.y = -0.38;
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff3d6e, emissive: 0xff1f55, emissiveIntensity: 1.3 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x3d7bff, emissive: 0x1f55ff, emissiveIntensity: 1.3 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.34), redMat);
  red.position.x = 0.4;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.34), blueMat);
  blue.position.x = -0.4;
  const lr = new THREE.PointLight(0xff3d6e, 22, 0, 2);
  lr.position.set(0.85, 0.1, 0);
  const lb = new THREE.PointLight(0x3d7bff, 22, 0, 2);
  lb.position.set(-0.85, 0.1, 0);
  rot.add(red, blue, lr, lb);
  inner.add(rot);

  const state = { hover: 0, rx: 0, ry: 0 };
  let angle = 0;
  function update(t, dt, ctx) {
    pose(g, t, dt, ctx, state, { yaw: 0.3 });
    angle += dt * (3 + state.hover * 6);
    rot.rotation.y = angle;
    g.rotation.y = state.ry;
    const k = 0.5 + 0.5 * Math.sin(angle * 2);
    redMat.emissiveIntensity = 0.5 + 1.2 * k;
    blueMat.emissiveIntensity = 0.5 + 1.2 * (1 - k);
  }
  return { scene, camera, update };
}

/* ------------------------------ Croix médicale ------------------------------ */
export function buildCross({ env }) {
  const { scene, camera } = makeMini(env, { z: 7.6 });
  const g = new THREE.Group();
  scene.add(g);

  const mat = new THREE.MeshPhysicalMaterial({ color: 0x7bf0c2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 });
  const a = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.74, 0.58, 6, 0.2), mat);
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.74, 2.2, 0.58, 6, 0.2), mat);
  g.add(a, b);

  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const rings = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 12, 90), ringMat());
    scene.add(m);
    return m;
  });

  const state = { hover: 0, rx: 0, ry: 0 };
  function update(t, dt, ctx) {
    pose(g, t, dt, ctx, state, { bob: 0.05 });
    const speed = 1 + state.hover * 0.8;
    // battement de cœur : deux pulsations rapprochées
    const ph = (t * speed * 0.9) % 1;
    const beat = Math.exp(-Math.pow((ph - 0.12) * 14, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) * 14, 2));
    g.scale.setScalar(1 + beat * 0.12);
    g.rotation.y = Math.sin(t * 0.8) * 0.5 + state.ry;
    rings.forEach((r, i) => {
      const p = ((t * speed * 0.55) + i * 0.5) % 1;
      r.scale.setScalar(lerp(0.9, 2.3, p));
      r.material.opacity = (1 - p) * 0.75;
    });
  }
  return { scene, camera, update };
}

/* ------------------------------ Engrenages ------------------------------ */
function makeGearGeometry(teeth, rOut, rIn, hole, depth) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rIn, a], [rOut, a + step * 0.12], [rOut, a + step * 0.38], [rIn, a + step * 0.5],
    ];
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function buildGear({ env }) {
  const { scene, camera } = makeMini(env, { z: 7.9 });
  const g = new THREE.Group();
  scene.add(g);

  const g1 = new THREE.Mesh(makeGearGeometry(12, 1.35, 1.08, 0.46, 0.5), makeChromeMat({ roughness: 0.16 }));
  g1.position.set(-0.75, 0.42, 0);
  const g2 = new THREE.Mesh(makeGearGeometry(9, 0.95, 0.76, 0.32, 0.5), makeLimeMat());
  g2.position.set(1.12, -0.7, 0);
  g.add(g1, g2);

  const state = { hover: 0, rx: 0, ry: 0 };
  let angle = 0;
  function update(t, dt, ctx) {
    pose(g, t, dt, ctx, state, { bob: 0.05 });
    angle += dt * (0.6 + state.hover * 1.4);
    g1.rotation.z = angle;
    g2.rotation.z = -angle * (12 / 9) + Math.PI / 9;
    g.rotation.y = Math.sin(t * 0.7) * 0.28 + state.ry;
  }
  return { scene, camera, update };
}

/* ------------------------------ Maison ------------------------------ */
export function buildHouse({ env }) {
  const { scene, camera } = makeMini(env, { z: 8.0 });
  const g = new THREE.Group();
  scene.add(g);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.2, 56),
    new THREE.MeshPhysicalMaterial({ color: 0xfbd0ee, roughness: 0.4, clearcoat: 1 }),
  );
  ground.position.y = -1.15;
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(1.9, 1.25, 1.6, 4, 0.08),
    new THREE.MeshPhysicalMaterial({ color: 0xfff3fb, roughness: 0.4, clearcoat: 0.5 }),
  );
  body.position.y = -0.4;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.7, 0.95, 4),
    new THREE.MeshPhysicalMaterial({ color: 0x7b3ff2, roughness: 0.3, clearcoat: 1 }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.05, 1, 0.92);
  roof.position.y = 0.68;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.28), new THREE.MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.5 }));
  chimney.position.set(0.5, 0.95, 0.15);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a1038, roughness: 0.5 }));
  door.position.set(-0.4, -0.7, 0.81);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffec8a, emissive: 0xffd24d, emissiveIntensity: 1.2 });
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.06), lightMat);
  win1.position.set(0.45, -0.3, 0.81);
  const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.42), lightMat);
  win2.position.set(0.96, -0.3, 0);
  g.add(ground, body, roof, chimney, door, win1, win2);

  // petit sapin
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x6b3b2a, roughness: 0.9 }));
  trunk.position.y = 0.15;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 7), new THREE.MeshStandardMaterial({ color: 0x59d9a6, roughness: 0.6, flatShading: true }));
  leaves.position.y = 0.72;
  tree.add(trunk, leaves);
  tree.position.set(1.45, -1.05, 0.6);
  g.add(tree);

  const star = new THREE.Mesh(makeStarGeometry(0.28, 0.08, 0.08), makeLimeMat());
  star.position.set(-1.45, 1.1, 0.4);
  g.add(star);

  g.scale.setScalar(0.92);
  const state = { hover: 0, rx: 0, ry: 0 };
  let spin = 0;
  function update(t, dt, ctx) {
    pose(g, t, dt, ctx, state, { bob: 0.06 });
    spin += dt * (0.35 + state.hover * 1.2);
    g.rotation.y = spin + state.ry;
    star.rotation.y = t * 1.5;
    lightMat.emissiveIntensity = 1 + Math.sin(t * 2.2) * 0.12;
  }
  return { scene, camera, update };
}
