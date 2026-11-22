// Aparelhos, móveis e gente, tudo modelado em código. Medidas em metros, origem no chão (base) do objeto.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ModeloId, TipoMovel } from '../casos/tipos';

const cacheMat = new Map<string, THREE.MeshStandardMaterial>();
export function mat(cor: string, rough = 0.6, metal = 0): THREE.MeshStandardMaterial {
  const k = `${cor}|${rough}|${metal}`;
  let m = cacheMat.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: cor, roughness: rough, metalness: metal });
    cacheMat.set(k, m);
  }
  return m;
}
function malha(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  me.receiveShadow = true;
  return me;
}
/** caixa com a base em y */
function cx(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, r = 0): THREE.Mesh {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  return malha(g, m, x, y + h / 2, z);
}
function cil(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 24): THREE.Mesh {
  return malha(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y + h / 2, z);
}

/** Textura de tela com texto. Linhas começando com "#" saem grandes; "!" em vermelho. */
export function telaTex(linhas: string[], fundo = '#0d1117', cor = '#e6edf3', w = 512, h = 320): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, fundo);
  grad.addColorStop(1, '#000000');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  let y = h * 0.12;
  for (const l of linhas) {
    const grande = l.startsWith('#');
    const alerta = l.startsWith('!');
    const txt = l.replace(/^[#!]/, '');
    const tam = grande ? h * 0.2 : h * 0.075;
    g.font = `${grande ? 600 : 400} ${tam}px "Segoe UI", system-ui, sans-serif`;
    g.fillStyle = alerta ? '#ff4d6d' : cor;
    g.textAlign = 'center';
    g.fillText(txt, w / 2, y + tam * 0.8);
    y += tam * 1.25;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function telaMesh(w: number, h: number, linhas: string[] | undefined, fundo: string, ligada = true): THREE.Mesh {
  const m = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.15, metalness: 0.1 });
  if (ligada && linhas) {
    const t = telaTex(linhas, fundo, '#e6edf3', 512, Math.round((512 * h) / w));
    m.map = t;
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = t;
    m.emissiveIntensity = 0.85;
    m.color.set('#ffffff');
  }
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  me.name = 'tela';
  return me;
}
export function trocarTela(obj: THREE.Object3D, linhas: string[] | null) {
  obj.traverse((o) => {
    if (o.name !== 'tela') return;
    const me = o as THREE.Mesh;
    const m = me.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    if (!linhas) {
      m.map = null;
      m.emissiveMap = null;
      m.emissive.set('#000000');
      m.color.set('#050505');
    } else {
      const p = me.geometry as THREE.PlaneGeometry;
      const t = telaTex(linhas, '#101826', '#e6edf3', 512, Math.round((512 * p.parameters.height) / p.parameters.width));
      m.map = t;
      m.emissiveMap = t;
      m.emissive.set('#ffffff');
      m.color.set('#ffffff');
    }
    m.needsUpdate = true;
  });
}
function led(cor: string, x: number, y: number, z: number, r = 0.003): THREE.Mesh {
  const m = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 2.5 });
  const me = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), m);
  me.position.set(x, y, z);
  me.name = 'led';
  return me;
}

const PRETO = mat('#141518', 0.35, 0.2);
const ALU = mat('#b9bec6', 0.3, 0.85);
const GRAFITE = mat('#2b2e33', 0.4, 0.4);
const BRANCO = mat('#eef0f2', 0.45);
const VIDRO = mat('#0a0a0c', 0.08, 0.3);

// ---------- aparelhos ----------
function notebook(tela?: string[], cor = '#9aa1ab'): THREE.Group {
  const g = new THREE.Group();
  const corpo = mat(cor, 0.35, 0.8);
  g.add(cx(0.34, 0.018, 0.235, corpo, 0, 0, 0, 0.006));
  const teclado = cx(0.29, 0.002, 0.11, PRETO, 0, 0.018, -0.03);
  g.add(teclado);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 13; j++) g.add(cx(0.018, 0.002, 0.016, GRAFITE, -0.132 + j * 0.022, 0.02, -0.075 + i * 0.021));
  g.add(cx(0.1, 0.001, 0.06, mat('#8e949c', 0.3, 0.7), 0, 0.018, 0.07));
  const tampa = new THREE.Group();
  tampa.add(cx(0.34, 0.225, 0.008, corpo, 0, 0, 0, 0.005));
  const t = telaMesh(0.31, 0.19, tela, '#0f1b2d', !!tela);
  t.position.set(0, 0.113, 0.0045);
  tampa.add(t);
  tampa.add(led('#22c55e', 0, 0.215, 0.005, 0.002));
  tampa.position.set(0, 0.018, -0.115);
  tampa.rotation.x = -0.32;
  g.add(tampa);
  return g;
}
function monitor(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.2, 0.012, 0.16, PRETO, 0, 0, 0, 0.004));
  g.add(cx(0.04, 0.24, 0.025, PRETO, 0, 0.012, -0.03));
  const painel = cx(0.56, 0.34, 0.03, PRETO, 0, 0.13, 0, 0.006);
  g.add(painel);
  const t = telaMesh(0.53, 0.3, tela, '#0b2447', !!tela);
  t.position.set(0, 0.3, 0.0155);
  g.add(t);
  g.add(led(tela ? '#3b82f6' : '#f59e0b', 0.25, 0.14, 0.016));
  // teclado na frente
  g.add(cx(0.44, 0.022, 0.14, GRAFITE, 0, 0, 0.24, 0.005));
  g.add(cx(0.06, 0.03, 0.1, GRAFITE, 0.33, 0, 0.24, 0.02));
  return g;
}
function desktop(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.2, 0.44, 0.43, mat('#1b1d22', 0.4, 0.3), 0, 0, 0, 0.01));
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), new THREE.MeshStandardMaterial({ color: '#7c3aed', emissive: '#6d28d9', emissiveIntensity: 0.5, transparent: true, opacity: 0.55 }));
  vidro.rotation.y = Math.PI / 2;
  vidro.position.set(0.101, 0.23, 0);
  g.add(vidro);
  g.add(led('#22c55e', -0.05, 0.42, 0.216, 0.004));
  g.add(cx(0.03, 0.01, 0.002, mat('#333'), 0.04, 0.4, 0.216));
  for (let i = 0; i < 2; i++) g.add(cx(0.012, 0.006, 0.002, mat('#2563eb'), -0.02 + i * 0.02, 0.38, 0.216));
  return g;
}
function celular(tela?: string[], cor = '#1f2a44'): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.075, 0.009, 0.16, mat(cor, 0.3, 0.5), 0, 0, 0, 0.008));
  const t = telaMesh(0.069, 0.152, tela, '#0f172a', !!tela);
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.0092, 0);
  g.add(t);
  g.add(cx(0.022, 0.003, 0.022, GRAFITE, -0.018, -0.002, -0.06, 0.004));
  g.add(cil(0.006, 0.006, 0.002, VIDRO, -0.018, -0.003, -0.055));
  return g;
}
function iphone(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.072, 0.008, 0.147, mat('#d6c7b0', 0.25, 0.85), 0, 0, 0, 0.01));
  const t = telaMesh(0.066, 0.14, tela, '#111827', !!tela);
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.0082, 0);
  g.add(t);
  g.add(cx(0.02, 0.001, 0.006, mat('#000'), 0, 0.0084, -0.064, 0.003));
  g.add(cx(0.034, 0.003, 0.034, mat('#c9b99f', 0.25, 0.85), -0.014, -0.002, -0.05, 0.007));
  for (const [x, z] of [[-0.022, -0.058], [-0.006, -0.058], [-0.014, -0.042]]) g.add(cil(0.0065, 0.0065, 0.003, VIDRO, x, -0.004, z));
  return g;
}
function tablet(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.17, 0.007, 0.25, mat('#c0c4ca', 0.3, 0.8), 0, 0, 0, 0.01));
  const t = telaMesh(0.155, 0.235, tela, '#172554', !!tela);
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.0072, 0);
  g.add(t);
  return g;
}
function relogio(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.04, 0.011, 0.046, mat('#222', 0.3, 0.6), 0, 0, 0, 0.009));
  const t = telaMesh(0.034, 0.04, tela ?? ['#10:32', '♥ 74'], '#000000', true);
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.0112, 0);
  g.add(t);
  g.add(cx(0.022, 0.004, 0.1, mat('#e11d48', 0.8), 0, 0, -0.07, 0.002));
  g.add(cx(0.022, 0.004, 0.1, mat('#e11d48', 0.8), 0, 0, 0.07, 0.002));
  return g;
}
function pendrive(cor = '#16a34a'): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.019, 0.008, 0.045, mat(cor, 0.5), 0, 0, 0, 0.003));
  g.add(cx(0.012, 0.0045, 0.013, ALU, 0, 0.0018, -0.028));
  g.add(cil(0.003, 0.003, 0.009, mat('#999', 0.3, 0.8), 0, 0, 0.018, 12));
  return g;
}
function hd(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.08, 0.014, 0.115, mat('#1e293b', 0.6), 0, 0, 0, 0.006));
  g.add(led('#60a5fa', 0.03, 0.014, 0.05, 0.002));
  return g;
}
function sd(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.024, 0.002, 0.032, mat('#1d4ed8', 0.5), 0, 0, 0, 0.001));
  g.add(cx(0.016, 0.0005, 0.006, mat('#d4af37', 0.3, 0.9), 0, 0.002, -0.012));
  return g;
}
function roteador(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.22, 0.035, 0.14, PRETO, 0, 0, 0, 0.01));
  for (const x of [-0.09, -0.03, 0.03, 0.09]) {
    const a = cil(0.005, 0.006, 0.16, PRETO, x, 0.03, -0.065, 8);
    g.add(a);
  }
  ['#22c55e', '#22c55e', '#f59e0b', '#22c55e', '#3b82f6'].forEach((c, i) => g.add(led(c, -0.07 + i * 0.035, 0.036, 0.06)));
  return g;
}
function camera(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.05, 0.055, 0.02, BRANCO, 0, 0, 0));
  const domo = malha(new THREE.SphereGeometry(0.045, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#111', 0.1, 0.4), 0, 0.02, 0);
  domo.rotation.x = Math.PI;
  domo.position.y = 0.02;
  g.add(domo);
  g.add(led('#ef4444', 0.03, 0.005, 0.04));
  g.rotation.x = Math.PI; // vai no teto
  return g;
}
function fechadura(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.075, 0.28, 0.03, mat('#1f2937', 0.35, 0.6), 0, 0, 0, 0.01));
  const t = telaMesh(0.055, 0.1, tela ?? ['1 2 3', '4 5 6', '7 8 9', '* 0 #'], '#0b1120', true);
  t.position.set(0, 0.19, 0.016);
  g.add(t);
  g.add(cx(0.02, 0.09, 0.05, ALU, 0.02, 0.06, 0.03, 0.008));
  g.add(cil(0.012, 0.012, 0.004, mat('#334155'), 0, 0.08, 0.015));
  return g;
}
function assistente(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.05, 0.05, 0.15, mat('#374151', 0.9), 0, 0, 0, 32));
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.004, 8, 32), new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 1.6 }));
  anel.rotation.x = Math.PI / 2;
  anel.position.y = 0.151;
  anel.name = 'led';
  g.add(anel);
  return g;
}
function tv(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(1.24, 0.72, 0.04, PRETO, 0, 0.12, 0, 0.01));
  const t = telaMesh(1.2, 0.68, tela, '#1e1b4b', !!tela);
  t.position.set(0, 0.48, 0.021);
  g.add(t);
  g.add(cx(0.3, 0.02, 0.2, PRETO, 0, 0, 0));
  g.add(cx(0.05, 0.12, 0.04, PRETO, 0, 0.02, 0));
  return g;
}
function servidor(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.6, 2.0, 1.0, mat('#111317', 0.5, 0.4), 0, 0, 0));
  for (let i = 0; i < 14; i++) {
    const y = 0.15 + i * 0.12;
    g.add(cx(0.56, 0.085, 0.02, mat(i % 3 ? '#2d3138' : '#1c1f24', 0.4, 0.5), 0, y, 0.5));
    for (let k = 0; k < 4; k++) g.add(led(Math.random() > 0.85 ? '#f59e0b' : '#22c55e', -0.24 + k * 0.02, y + 0.04, 0.512));
  }
  return g;
}
function switchRede(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.44, 0.044, 0.25, mat('#cbd5e1', 0.4, 0.6), 0, 0, 0));
  for (let i = 0; i < 24; i++) {
    g.add(cx(0.013, 0.012, 0.004, PRETO, -0.18 + (i % 12) * 0.026, 0.008 + Math.floor(i / 12) * 0.018, 0.124));
    g.add(led(Math.random() > 0.3 ? '#22c55e' : '#f59e0b', -0.18 + (i % 12) * 0.026, 0.022 + Math.floor(i / 12) * 0.018, 0.127, 0.0015));
  }
  return g;
}
function drone(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.12, 0.05, 0.18, mat('#9ca3af', 0.4, 0.5), 0, 0.03, 0, 0.02));
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) {
    const braco = cx(0.2, 0.012, 0.016, mat('#6b7280'), x / 2, 0.06, z / 2);
    braco.rotation.y = Math.atan2(z, -x);
    g.add(braco);
    g.add(cil(0.012, 0.012, 0.02, PRETO, x, 0.06, z));
    const helice = cx(0.18, 0.002, 0.014, mat('#1f2937'), x, 0.082, z);
    helice.rotation.y = Math.random() * 3;
    g.add(helice);
  }
  g.add(cil(0.02, 0.02, 0.03, VIDRO, 0, 0.0, 0.08));
  for (const x of [-0.05, 0.05]) g.add(cx(0.008, 0.03, 0.15, mat('#6b7280'), x, 0, 0));
  return g;
}
function controle(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.17, 0.03, 0.09, mat('#4b5563', 0.5), 0, 0, 0, 0.015));
  g.add(cil(0.008, 0.01, 0.02, PRETO, -0.05, 0.03, 0));
  g.add(cil(0.008, 0.01, 0.02, PRETO, 0.05, 0.03, 0));
  const t = telaMesh(0.06, 0.035, ['ZANGÃO', 'sem link'], '#020617', true);
  t.rotation.x = -Math.PI / 2;
  t.position.set(0, 0.031, -0.01);
  g.add(t);
  return g;
}
function carro(cor = '#7f1d1d'): THREE.Group {
  const g = new THREE.Group();
  const lat = mat(cor, 0.25, 0.6);
  g.add(cx(1.8, 0.62, 4.2, lat, 0, 0.32, 0, 0.12));
  g.add(cx(1.6, 0.5, 2.2, lat, 0, 0.9, -0.2, 0.15));
  const vidro = mat('#0f172a', 0.05, 0.5);
  g.add(cx(1.62, 0.42, 2.0, vidro, 0, 0.94, -0.2, 0.1));
  for (const [x, z] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) {
    const r = malha(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), mat('#111', 0.9), x, 0.33, z);
    r.rotation.z = Math.PI / 2;
    g.add(r);
    const calota = malha(new THREE.CylinderGeometry(0.2, 0.2, 0.225, 16), ALU, x, 0.33, z);
    calota.rotation.z = Math.PI / 2;
    g.add(calota);
  }
  for (const x of [-0.6, 0.6]) {
    g.add(led('#fef9c3', x, 0.72, 2.1, 0.06));
    g.add(led('#dc2626', x, 0.75, -2.1, 0.05));
  }
  g.add(cx(0.5, 0.12, 0.02, mat('#f8fafc'), 0, 0.42, 2.11));
  return g;
}
function central(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.22, 0.13, 0.04, PRETO, 0, 0, 0, 0.01));
  const t = telaMesh(0.2, 0.11, tela ?? ['VELOZ MULTIMÍDIA', 'Pareado: ???'], '#0c4a6e', true);
  t.position.set(0, 0.065, 0.021);
  g.add(t);
  return g;
}
function impressora(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.42, 0.2, 0.34, BRANCO, 0, 0, 0, 0.02));
  g.add(cx(0.3, 0.005, 0.2, mat('#f8fafc'), 0, 0.2, 0.05));
  g.add(cx(0.36, 0.06, 0.02, mat('#94a3b8'), 0, 0.1, 0.17));
  g.add(led('#f59e0b', 0.17, 0.2, 0.15));
  return g;
}
function geladeira(tela?: string[]): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.75, 1.8, 0.7, mat('#c7cdd4', 0.25, 0.8), 0, 0, 0, 0.03));
  g.add(cx(0.02, 0.5, 0.04, ALU, 0.3, 1.0, 0.37));
  g.add(cx(0.02, 0.4, 0.04, ALU, 0.3, 0.3, 0.37));
  const t = telaMesh(0.2, 0.3, tela ?? ['#21:47', 'Leite vence', 'amanhã 🥛', 'Postar no', 'Feedbook?'], '#082f49', true);
  t.position.set(-0.15, 1.25, 0.352);
  g.add(t);
  return g;
}
function cafeteira(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.2, 0.32, 0.28, mat('#27272a', 0.4, 0.4), 0, 0, 0, 0.02));
  g.add(cil(0.05, 0.045, 0.08, mat('#e5e7eb', 0.3), 0, 0.02, 0.07));
  g.add(led('#22c55e', 0.06, 0.28, 0.141));
  return g;
}
function console(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.38, 0.08, 0.26, BRANCO, 0, 0, 0, 0.02));
  g.add(cx(0.36, 0.01, 0.24, PRETO, 0, 0.08, 0));
  g.add(led('#3b82f6', -0.15, 0.04, 0.131));
  return g;
}
function postit(cor = '#fde047'): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.076, 0.0015, 0.076, mat(cor, 0.9), 0, 0, 0));
  const t = telaMesh(0.07, 0.07, ['senha:', '#C@rlos', '1971!'], cor, true);
  (t.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
  t.rotation.x = -Math.PI / 2;
  t.position.y = 0.0016;
  g.add(t);
  return g;
}
function papel(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const f = cx(0.21, 0.0008, 0.297, mat(i % 2 ? '#f8fafc' : '#f1f5f9', 0.95), (Math.random() - 0.5) * 0.02, i * 0.001, (Math.random() - 0.5) * 0.02);
    f.rotation.y = (Math.random() - 0.5) * 0.3;
    g.add(f);
  }
  return g;
}
function pizza(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.35, 0.04, 0.35, mat('#d6b38a', 0.95), 0, 0, 0));
  const tampa = cx(0.35, 0.004, 0.35, mat('#c9a77b', 0.95), 0, 0, 0);
  tampa.position.set(0, 0.2, -0.17);
  tampa.rotation.x = -1.2;
  g.add(tampa);
  g.add(cil(0.15, 0.15, 0.01, mat('#c2410c', 0.8), 0, 0.04, 0));
  return g;
}
function caneca(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.04, 0.036, 0.1, mat('#f43f5e', 0.5), 0, 0, 0));
  g.add(cil(0.036, 0.036, 0.002, mat('#3f1d0b', 0.2), 0, 0.09, 0));
  const alca = malha(new THREE.TorusGeometry(0.025, 0.006, 8, 16, Math.PI), mat('#f43f5e', 0.5), 0.04, 0.05, 0);
  alca.rotation.z = -Math.PI / 2;
  g.add(alca);
  return g;
}
function planta(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.14, 0.1, 0.25, mat('#9a3412', 0.9), 0, 0, 0));
  for (let i = 0; i < 9; i++) {
    const f = malha(new THREE.SphereGeometry(0.12, 8, 6), mat(i % 2 ? '#15803d' : '#166534', 0.9), (Math.random() - 0.5) * 0.2, 0.35 + Math.random() * 0.35, (Math.random() - 0.5) * 0.2);
    f.scale.set(1, 1.6, 0.5);
    f.rotation.y = Math.random() * 3;
    g.add(f);
  }
  return g;
}
function gato(): THREE.Group {
  const g = new THREE.Group();
  const pelo = mat('#f97316', 0.95);
  const corpo = malha(new THREE.SphereGeometry(0.12, 16, 12), pelo, 0, 0.09, 0);
  corpo.scale.set(1, 0.65, 1.5);
  g.add(corpo);
  g.add(malha(new THREE.SphereGeometry(0.075, 16, 12), pelo, 0, 0.12, 0.17));
  for (const x of [-0.04, 0.04]) {
    const o = malha(new THREE.ConeGeometry(0.025, 0.05, 4), pelo, x, 0.2, 0.17);
    g.add(o);
    g.add(malha(new THREE.SphereGeometry(0.008, 8, 8), mat('#16a34a', 0.2), x * 0.7, 0.13, 0.235));
  }
  const rabo = malha(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 8), pelo, 0.06, 0.05, -0.22);
  rabo.rotation.x = Math.PI / 2.4;
  g.add(rabo);
  return g;
}
function caixa(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.45, 0.32, 0.35, mat('#b08355', 0.95), 0, 0, 0));
  g.add(cx(0.46, 0.002, 0.06, mat('#c8a26e', 0.6), 0, 0.32, 0));
  return g;
}
function nobreak(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.15, 0.24, 0.35, PRETO, 0, 0, 0, 0.01));
  g.add(led('#22c55e', 0, 0.2, 0.176));
  return g;
}
function lampada(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.02, 0.015, 0.03, ALU, 0, 0, 0));
  const b = malha(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#c084fc', emissiveIntensity: 1.2 }), 0, 0.06, 0);
  b.name = 'led';
  g.add(b);
  return g;
}
function aspirador(): THREE.Group {
  const g = new THREE.Group();
  g.add(cil(0.17, 0.17, 0.09, mat('#1f2937', 0.4, 0.3), 0, 0, 0, 32));
  g.add(cil(0.04, 0.04, 0.012, mat('#111'), 0, 0.09, 0.05));
  g.add(led('#22d3ee', 0, 0.092, -0.08));
  return g;
}
function cabo(): THREE.Group {
  const g = new THREE.Group();
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.003, 0), new THREE.Vector3(0.1, 0.003, 0.05), new THREE.Vector3(0.18, 0.003, -0.04), new THREE.Vector3(0.3, 0.003, 0.02), new THREE.Vector3(0.4, 0.003, -0.05)]);
  g.add(malha(new THREE.TubeGeometry(curva, 40, 0.003, 6), BRANCO));
  g.add(cx(0.025, 0.012, 0.03, BRANCO, 0.4, 0, -0.05));
  return g;
}
function chip(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.025, 0.001, 0.015, mat('#f8fafc'), 0, 0, 0));
  g.add(cx(0.01, 0.0005, 0.008, mat('#d4af37', 0.3, 0.9), -0.006, 0.001, 0));
  return g;
}
function livro(cor = '#1e3a8a'): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.16, 0.035, 0.23, mat(cor, 0.8), 0, 0, 0, 0.003));
  g.add(cx(0.155, 0.031, 0.225, mat('#f5f5f4', 0.95), 0.004, 0.002, 0));
  return g;
}
function cofre(): THREE.Group {
  const g = new THREE.Group();
  g.add(cx(0.4, 0.4, 0.4, mat('#3f3f46', 0.4, 0.7), 0, 0, 0, 0.01));
  g.add(cil(0.04, 0.04, 0.02, ALU, 0, 0.2, 0.2).rotateX(Math.PI / 2));
  return g;
}

export function criarModelo(id: ModeloId, tela?: string[], cor?: string): THREE.Group {
  const f: Record<ModeloId, () => THREE.Group> = {
    notebook: () => notebook(tela, cor), desktop, monitor: () => monitor(tela), celular: () => celular(tela, cor), iphone: () => iphone(tela),
    tablet: () => tablet(tela), relogio: () => relogio(tela), pendrive: () => pendrive(cor), hd, sd, roteador, camera,
    fechadura: () => fechadura(tela), assistente, tv: () => tv(tela), servidor, switch: switchRede, drone, controle,
    carro: () => carro(cor), central: () => central(tela), impressora, geladeira: () => geladeira(tela), cafeteira, console,
    postit: () => postit(cor), papel, pizza, caneca, planta, gato, caixa, nobreak, lampada, aspirador, cabo, chip, livro: () => livro(cor), cofre,
  };
  return f[id]();
}

// ---------- móveis ----------
const MADEIRA = mat('#8b5a2b', 0.75);
export function criarMovel(tipo: TipoMovel, tam?: [number, number, number], cor?: string): THREE.Group {
  const g = new THREE.Group();
  const c = cor ? mat(cor, 0.7) : MADEIRA;
  switch (tipo) {
    case 'mesa': case 'escrivaninha': case 'bancada': {
      const [w, h, d] = tam ?? (tipo === 'bancada' ? [2.0, 0.92, 0.75] : tipo === 'escrivaninha' ? [1.4, 0.75, 0.7] : [1.6, 0.76, 0.9]);
      const tampo = tipo === 'bancada' ? mat(cor ?? '#e5e7eb', 0.5) : c;
      g.add(cx(w, 0.04, d, tampo, 0, h - 0.04, 0, 0.01));
      for (const [x, z] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) g.add(cx(0.05, h - 0.04, 0.05, tipo === 'bancada' ? GRAFITE : c, x, 0, z));
      if (tipo === 'escrivaninha') g.add(cx(0.42, h - 0.08, d - 0.06, c, w / 2 - 0.24, 0.02, 0));
      break;
    }
    case 'cadeira': {
      const m = mat(cor ?? '#1f2937', 0.6);
      g.add(cx(0.48, 0.07, 0.48, m, 0, 0.45, 0, 0.03));
      g.add(cx(0.46, 0.55, 0.06, m, 0, 0.5, -0.22, 0.03));
      g.add(cil(0.025, 0.025, 0.42, GRAFITE, 0, 0.03, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(cx(0.04, 0.03, 0.3, GRAFITE, Math.sin(a) * 0.14, 0.02, Math.cos(a) * 0.14).rotateY(a));
      }
      break;
    }
    case 'estante': {
      const [w, h, d] = tam ?? [1.0, 1.9, 0.35];
      g.add(cx(w, h, 0.02, c, 0, 0, -d / 2 + 0.01));
      for (const x of [-w / 2 + 0.01, w / 2 - 0.01]) g.add(cx(0.02, h, d, c, x, 0, 0));
      for (let i = 0; i <= 4; i++) {
        const y = (i * (h - 0.02)) / 4;
        g.add(cx(w, 0.02, d, c, 0, y, 0));
        if (i < 4) {
          let x = -w / 2 + 0.05;
          while (x < w / 2 - 0.08) {
            const lw = 0.025 + Math.random() * 0.03;
            const lh = 0.2 + Math.random() * 0.12;
            const cores = ['#7f1d1d', '#1e3a8a', '#14532d', '#78350f', '#4c1d95', '#0f766e', '#a16207', '#334155'];
            g.add(cx(lw, lh, d * 0.75, mat(cores[Math.floor(Math.random() * cores.length)], 0.8), x + lw / 2, y + 0.02, 0.02));
            x += lw + 0.004;
            if (Math.random() < 0.08) x += 0.12;
          }
        }
      }
      break;
    }
    case 'sofa': {
      const m = mat(cor ?? '#475569', 0.95);
      const [w] = tam ?? [2.0, 0, 0];
      g.add(cx(w, 0.42, 0.9, m, 0, 0, 0, 0.06));
      g.add(cx(w, 0.5, 0.22, m, 0, 0.35, -0.34, 0.08));
      for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(cx(0.2, 0.25, 0.9, m, x, 0.35, 0, 0.07));
      for (let i = 0; i < 3; i++) g.add(cx(w / 3 - 0.08, 0.12, 0.6, mat(cor ?? '#64748b', 0.95), -w / 3 + i * (w / 3), 0.42, 0.08, 0.05));
      break;
    }
    case 'cama': {
      g.add(cx(1.45, 0.4, 2.0, c, 0, 0, 0));
      g.add(cx(1.4, 0.2, 1.95, mat('#f1f5f9', 0.95), 0, 0.4, 0, 0.06));
      g.add(cx(1.4, 0.06, 1.3, mat(cor ?? '#be185d', 0.95), 0, 0.6, 0.3, 0.03));
      for (const x of [-0.35, 0.35]) g.add(cx(0.55, 0.12, 0.35, mat('#ffffff', 0.95), x, 0.6, -0.75, 0.05));
      g.add(cx(1.5, 1.0, 0.06, c, 0, 0, -1.0));
      break;
    }
    case 'armario': case 'arquivo': {
      const [w, h, d] = tam ?? (tipo === 'arquivo' ? [0.47, 1.33, 0.6] : [1.2, 2.0, 0.55]);
      const m = tipo === 'arquivo' ? mat(cor ?? '#6b7280', 0.4, 0.6) : c;
      g.add(cx(w, h, d, m, 0, 0, 0, 0.01));
      const n = tipo === 'arquivo' ? 4 : 2;
      for (let i = 0; i < n; i++) {
        if (tipo === 'arquivo') g.add(cx(0.12, 0.02, 0.02, ALU, 0, 0.2 + i * (h / n), d / 2 + 0.01));
        else g.add(cx(0.02, 0.2, 0.02, ALU, -0.05 + i * 0.1, h / 2, d / 2 + 0.01));
      }
      break;
    }
    case 'balcao': {
      const [w, h, d] = tam ?? [2.4, 0.9, 0.6];
      g.add(cx(w, h - 0.04, d, mat(cor ?? '#e7e5e4', 0.6), 0, 0, 0));
      g.add(cx(w + 0.04, 0.04, d + 0.04, mat('#1c1917', 0.3), 0, h - 0.04, 0));
      break;
    }
    case 'rack': {
      const [w, h, d] = tam ?? [1.6, 0.5, 0.45];
      g.add(cx(w, h, d, c, 0, 0, 0, 0.01));
      g.add(cx(w - 0.1, 0.02, 0.02, PRETO, 0, h / 2, d / 2));
      break;
    }
    case 'porta': {
      const m = mat(cor ?? '#7c4a1e', 0.7);
      g.add(cx(0.9, 2.1, 0.05, m, 0, 0, 0));
      g.add(cx(1.0, 0.06, 0.08, mat('#e7e5e4'), 0, 2.1, 0));
      g.add(cil(0.02, 0.02, 0.1, ALU, 0.35, 1.0, 0.05).rotateX(Math.PI / 2));
      break;
    }
    case 'portao': {
      g.add(cx(3.0, 2.4, 0.06, mat('#9ca3af', 0.5, 0.7), 0, 0, 0));
      for (let i = 0; i < 12; i++) g.add(cx(3.0, 0.02, 0.07, mat('#6b7280', 0.5, 0.7), 0, 0.1 + i * 0.2, 0));
      break;
    }
    case 'janela': {
      const [w, h] = tam ?? [1.4, 1.2, 0];
      g.add(cx(w, h, 0.04, mat('#e5e7eb', 0.5), 0, 0, 0));
      const v = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), new THREE.MeshStandardMaterial({ color: '#bae6fd', emissive: '#7dd3fc', emissiveIntensity: 0.6 }));
      v.position.set(0, h / 2, 0.021);
      g.add(v);
      g.add(cx(0.04, h, 0.05, mat('#e5e7eb'), 0, 0, 0.01));
      break;
    }
    case 'cortina': {
      const [w, h] = tam ?? [1.6, 2.2, 0];
      for (let i = 0; i < 10; i++) g.add(cx(w / 10, h, 0.04, mat(cor ?? '#a78bfa', 0.95), -w / 2 + (i + 0.5) * (w / 10), 0, (i % 2) * 0.04));
      break;
    }
    case 'tapete': {
      const [w, , d] = tam ?? [2.0, 0, 1.4];
      g.add(cx(w, 0.01, d, mat(cor ?? '#9f1239', 0.98), 0, 0, 0));
      break;
    }
    case 'quadro': {
      const [w, h] = tam ?? [0.7, 0.5, 0];
      g.add(cx(w, h, 0.03, mat('#1c1917'), 0, 0, 0));
      g.add(cx(w - 0.06, h - 0.06, 0.005, mat(cor ?? '#0ea5e9', 0.8), 0, 0.03, 0.016));
      break;
    }
    case 'pia': {
      g.add(cx(1.2, 0.86, 0.6, mat('#f5f5f4', 0.6), 0, 0, 0));
      g.add(cx(1.22, 0.04, 0.62, mat('#9ca3af', 0.2, 0.8), 0, 0.86, 0));
      g.add(cil(0.015, 0.015, 0.25, ALU, 0, 0.9, -0.22));
      break;
    }
    case 'rackServidor': {
      g.add(servidor());
      break;
    }
    case 'luminaria': {
      g.add(cil(0.08, 0.1, 0.02, GRAFITE, 0, 0, 0));
      g.add(cil(0.008, 0.008, 0.4, GRAFITE, 0, 0.02, 0));
      g.add(cil(0.04, 0.09, 0.1, mat(cor ?? '#f59e0b', 0.5), 0, 0.4, 0));
      break;
    }
  }
  return g;
}

// ---------- gente ----------
export function criarPessoa(roupa: string, pele = '#c68642', cabelo = '#2b1b10', sentado = false): THREE.Group {
  const g = new THREE.Group();
  const mRoupa = mat(roupa, 0.85);
  const mPele = mat(pele, 0.7);
  const mCabelo = mat(cabelo, 0.9);
  const mCalca = mat('#1e293b', 0.9);
  const quadril = sentado ? 0.48 : 0.92;
  if (sentado) {
    for (const x of [-0.09, 0.09]) {
      g.add(cx(0.13, 0.13, 0.45, mCalca, x, quadril - 0.06, 0.18, 0.05));
      g.add(cx(0.12, 0.42, 0.13, mCalca, x, 0.02, 0.38, 0.05));
    }
  } else for (const x of [-0.09, 0.09]) g.add(cx(0.13, quadril, 0.14, mCalca, x, 0, 0, 0.05));
  g.add(cx(0.38, 0.56, 0.22, mRoupa, 0, quadril, 0, 0.08));
  for (const x of [-0.24, 0.24]) {
    const b = cx(0.1, 0.52, 0.11, mRoupa, x, quadril + 0.04, 0, 0.04);
    b.rotation.z = x > 0 ? -0.06 : 0.06;
    g.add(b);
    g.add(malha(new THREE.SphereGeometry(0.05, 10, 8), mPele, x * 1.05, quadril + 0.02, 0));
  }
  g.add(cil(0.05, 0.055, 0.08, mPele, 0, quadril + 0.56, 0, 12));
  const cab = malha(new THREE.SphereGeometry(0.115, 20, 16), mPele, 0, quadril + 0.74, 0);
  cab.scale.set(0.92, 1.08, 1);
  g.add(cab);
  const cab2 = malha(new THREE.SphereGeometry(0.122, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.9), mCabelo, 0, quadril + 0.76, -0.012);
  cab2.scale.set(0.95, 1.05, 1.05);
  g.add(cab2);
  for (const x of [-0.04, 0.04]) g.add(malha(new THREE.SphereGeometry(0.013, 8, 8), mat('#111', 0.3), x, quadril + 0.76, 0.105));
  g.add(cx(0.05, 0.008, 0.01, mat('#7f1d1d', 0.6), 0, quadril + 0.69, 0.108));
  return g;
}
