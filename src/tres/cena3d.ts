// Monta o local do crime a partir dos dados do caso e cuida da mira.
import * as THREE from 'three';
import type { Cena } from '../casos/tipos';
import { M, limparCena } from './motor3d';
import { J, posicionar } from './jogador';
import { criarModelo, criarMovel, mat, trocarTela } from './modelos';
import { Humano } from './humanos';
import { modeloGlb } from './glb';
import { pbr } from './pbr';

export interface Alvo {
  tipo: 'item' | 'pessoa' | 'saida';
  id: string;
}

interface Proxy {
  caixa: THREE.Mesh;
  alvo: Alvo;
}

const proxies: Proxy[] = [];
const objetos = new Map<string, THREE.Object3D>();
export const humanos = new Map<string, Humano>();
const ray = new THREE.Raycaster();
const centro = new THREE.Vector2(0, 0);
let destaque: THREE.BoxHelper | null = null;

function texturaPiso(cor: string, tipo: 'tabua' | 'piso'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = cor;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 2;
  if (tipo === 'tabua') {
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(0, i * 32);
      g.lineTo(256, i * 32);
      g.stroke();
      g.beginPath();
      const x = ((i * 97) % 256);
      g.moveTo(x, i * 32);
      g.lineTo(x, i * 32 + 32);
      g.stroke();
    }
  } else {
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},0.03)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function montarCena(c: Cena, telasExtras: Record<string, string[] | null> = {}, removidos: string[] = []) {
  limparCena();
  proxies.length = 0;
  objetos.clear();
  humanos.clear();
  destaque = null;
  const W = c.largura;
  const D = c.profundidade;
  const H = c.altura ?? 2.7;

  const luzes: Record<Cena['luz'], { ceu: string; chao: string; amb: number; ponto: string; pi: number }> = {
    dia: { ceu: '#e0f2fe', chao: '#78716c', amb: 0.6, ponto: '#fff7ed', pi: 5 },
    noite: { ceu: '#1e1b4b', chao: '#0c0a09', amb: 0.35, ponto: '#fde68a', pi: 7 },
    fluor: { ceu: '#f8fafc', chao: '#64748b', amb: 0.55, ponto: '#f1f5f9', pi: 5 },
    garagem: { ceu: '#cbd5e1', chao: '#292524', amb: 0.4, ponto: '#fef3c7', pi: 7 },
  };
  const L = luzes[c.luz];
  M.cena.background = new THREE.Color(c.luz === 'noite' ? '#05060a' : '#0b0d12');
  M.cena.add(new THREE.HemisphereLight(L.ceu, L.chao, L.amb));
  const nx = Math.max(1, Math.round(W / 3.5));
  const nz = Math.max(1, Math.round(D / 3.5));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const p = new THREE.PointLight(L.ponto, L.pi, 9, 1.6);
    p.position.set(((i + 0.5) * W) / nx, H - 0.15, ((k + 0.5) * D) / nz);
    if (i === 0 && k === 0 && !M.leve) {
      p.castShadow = true;
      p.shadow.mapSize.set(1024, 1024);
      p.shadow.bias = -0.002;
    }
    M.cena.add(p);
    // luminária de verdade no teto (fluorescente de repartição ou plafon de casa)
    const lum = modeloGlb(c.luz === 'fluor' || c.luz === 'garagem' ? 'mounted_fluorescent_lights' : 'modern_ceiling_lamp_01');
    lum.grupo.position.set(p.position.x, c.luz === 'fluor' || c.luz === 'garagem' ? H : H - 0.95, p.position.z);
    M.cena.add(lum.grupo);
    const brilho = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: L.ponto, emissiveIntensity: 1.2, side: THREE.DoubleSide }));
    brilho.rotation.x = Math.PI / 2;
    brilho.position.set(p.position.x, H - 0.045, p.position.z);
    if (c.luz === 'fluor' || c.luz === 'garagem') M.cena.add(brilho);
  }

  let matPiso: THREE.Material;
  if (c.pisoTex) matPiso = pbr(c.pisoTex, [W / (c.pisoEscala ?? 1.5), D / (c.pisoEscala ?? 1.5)], c.piso.startsWith('#') && c.pisoTinta ? c.piso : '#ffffff');
  else {
    const tipoPiso = /tabua|madeira|#[89a-c][0-9a-f]5/i.test(c.piso) ? 'tabua' : 'piso';
    const tp = texturaPiso(c.piso, tipoPiso);
    tp.repeat.set(W / 2, D / 2);
    matPiso = new THREE.MeshStandardMaterial({ map: tp, roughness: 0.8 });
  }
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matPiso);
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(W / 2, 0, D / 2);
  piso.receiveShadow = true;
  M.cena.add(piso);
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(W, D), c.tetoTex ? pbr(c.tetoTex, [W / 2, D / 2]) : mat('#cfccc4', 0.95));
  teto.rotation.x = Math.PI / 2;
  teto.position.set(W / 2, H, D / 2);
  M.cena.add(teto);
  const parede = c.paredeTex ? pbr(c.paredeTex, [Math.max(W, D) / 2.5, H / 2.5], c.parede) : mat(c.parede, 0.92);
  const rodape = mat('#e7e5e4', 0.6);
  const paredes: [number, number, number, number, number][] = [
    [W / 2, 0, W, 0, 0], [W / 2, D, W, Math.PI, 0], [0, D / 2, D, Math.PI / 2, 0], [W, D / 2, D, -Math.PI / 2, 0],
  ];
  for (const [x, z, larg, rot] of paredes) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(larg, H), parede);
    p.position.set(x, H / 2, z);
    p.rotation.y = rot;
    p.receiveShadow = true;
    M.cena.add(p);
    const r = new THREE.Mesh(new THREE.BoxGeometry(larg, 0.1, 0.02), rodape);
    r.position.set(x, 0.05, z);
    r.rotation.y = rot;
    M.cena.add(r);
  }

  const obst: [number, number, number, number][] = [...(c.obstaculos ?? [])];
  for (const mv of c.moveis) {
    const pisaveis = ['tapete', 'porta', 'janela', 'quadro', 'cortina', 'portao'];
    const solido = mv.solido !== false && !pisaveis.includes(mv.tipo) && (mv.pos[1] < 0.5);
    if (mv.glb) {
      const { grupo, pronto } = modeloGlb(mv.glb);
      grupo.position.set(...mv.pos);
      grupo.rotation.y = mv.rot ?? 0;
      if (mv.escala) grupo.scale.setScalar(mv.escala);
      M.cena.add(grupo);
      if (solido) {
        // a colisão só existe quando o modelo chega (o mesmo array é o que o jogador consulta)
        void pronto.then((g) => {
          const b = new THREE.Box3().setFromObject(g);
          if (!b.isEmpty()) J.obstaculos.push([b.min.x, b.max.x, b.min.z, b.max.z]);
        });
      }
      continue;
    }
    const g = criarMovel(mv.tipo as Exclude<typeof mv.tipo, 'glb'>, mv.tam, mv.cor);
    g.position.set(...mv.pos);
    g.rotation.y = mv.rot ?? 0;
    M.cena.add(g);
    if (solido) {
      const b = new THREE.Box3().setFromObject(g);
      obst.push([b.min.x, b.max.x, b.min.z, b.max.z]);
    }
  }

  for (const it of c.itens) {
    if (removidos.includes(it.id)) continue;
    const tela = it.id in telasExtras ? telasExtras[it.id] : it.tela;
    let g: THREE.Group;
    if (it.glb) {
      const m = modeloGlb(it.glb);
      g = m.grupo;
      const alvo: Alvo = { tipo: 'item', id: it.id };
      void m.pronto.then(() => adicionarProxy(g, alvo));
    } else {
      g = criarModelo(it.modelo, tela ?? undefined, it.cor);
      if (it.id in telasExtras && telasExtras[it.id] === null) trocarTela(g, null);
    }
    g.position.set(...it.pos);
    g.rotation.y += it.rot ?? 0;
    if (it.escala) g.scale.setScalar(it.escala);
    M.cena.add(g);
    objetos.set(it.id, g);
    if (!it.glb) adicionarProxy(g, { tipo: 'item', id: it.id });
    if (['carro', 'geladeira', 'servidor', 'tv'].includes(it.modelo)) {
      const b = new THREE.Box3().setFromObject(g);
      obst.push([b.min.x, b.max.x, b.min.z, b.max.z]);
    }
  }

  for (const p of c.pessoas) {
    // gente de verdade (MakeHuman, CC0) com animação; o modelo carrega em segundo plano
    const hum = new Humano(p.modelo ?? 'kevin');
    hum.sentado = !!p.sentado;
    const g = hum.raiz;
    g.position.set(p.pos[0], 0, p.pos[1]);
    g.rotation.y = p.rot;
    M.cena.add(g);
    void hum.pronto.then(() => hum.tocar('parado'));
    M.atualizar.add((dt) => hum.update(dt));
    humanos.set(p.id, hum);
    objetos.set('pessoa:' + p.id, g);
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.6, p.sentado ? 1.3 : 1.75, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    caixa.position.set(p.pos[0], p.sentado ? 0.65 : 0.88, p.pos[1]);
    M.cena.add(caixa);
    proxies.push({ caixa, alvo: { tipo: 'pessoa', id: p.id } });
    if (!p.sentado) obst.push([p.pos[0] - 0.25, p.pos[0] + 0.25, p.pos[1] - 0.25, p.pos[1] + 0.25]);
  }

  // a saída: uma fita zebrada e uma maleta pericial no chão
  const saida = new THREE.Group();
  const fita = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.01), new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#a16207', emissiveIntensity: 0.4 }));
  fita.position.y = 1.0;
  saida.add(fita);
  const maleta = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.15), mat('#9ca3af', 0.3, 0.8));
  maleta.position.set(0.4, 0.175, 0);
  saida.add(maleta);
  saida.position.set(c.saida[0], 0, c.saida[1]);
  M.cena.add(saida);
  adicionarProxy(saida, { tipo: 'saida', id: 'saida' });

  J.limites = [0, W, 0, D];
  J.obstaculos = obst;
  posicionar(c.inicio[0], c.inicio[1], c.inicio[2]);

  // LEDs piscando, porque aparelho ligado pisca
  const leds: THREE.Mesh[] = [];
  M.cena.traverse((o) => { if (o.name === 'led') leds.push(o as THREE.Mesh); });
  M.atualizar.add((_dt, t) => {
    leds.forEach((l, i) => {
      const m = l.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = (Math.sin(t * (2 + (i % 5)) + i) > 0.6 ? 0.4 : 2.4);
    });
  });
}


function adicionarProxy(obj: THREE.Object3D, alvo: Alvo) {
  const b = new THREE.Box3().setFromObject(obj);
  const tam = new THREE.Vector3();
  b.getSize(tam);
  const min = 0.14;
  tam.set(Math.max(tam.x, min), Math.max(tam.y, min), Math.max(tam.z, min));
  const centroB = new THREE.Vector3();
  b.getCenter(centroB);
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(tam.x, tam.y, tam.z), new THREE.MeshBasicMaterial({ visible: false }));
  caixa.position.copy(centroB);
  M.cena.add(caixa);
  proxies.push({ caixa, alvo });
}

/** O que está na mira agora (até 2,6 m). */
export function mira(): Alvo | null {
  ray.setFromCamera(centro, M.camera);
  ray.far = 2.6;
  const hits = ray.intersectObjects(proxies.map((p) => p.caixa), false);
  if (!hits.length) {
    if (destaque) destaque.visible = false;
    return null;
  }
  // prefere o menor objeto (o pendrive em cima da mesa ganha da mesa)
  hits.sort((a, b) => {
    const va = volume(a.object as THREE.Mesh);
    const vb = volume(b.object as THREE.Mesh);
    return a.distance - b.distance + (va - vb) * 4;
  });
  const p = proxies.find((x) => x.caixa === hits[0].object)!;
  if (!destaque) {
    destaque = new THREE.BoxHelper(p.caixa, 0xff3d9a);
    M.cena.add(destaque);
  }
  destaque.setFromObject(p.caixa);
  destaque.visible = true;
  return p.alvo;
}
function volume(m: THREE.Mesh) {
  const g = m.geometry as THREE.BoxGeometry;
  return g.parameters.width * g.parameters.height * g.parameters.depth;
}

export function removerItem(id: string) {
  const o = objetos.get(id);
  if (o) M.cena.remove(o);
  const i = proxies.findIndex((p) => p.alvo.id === id && p.alvo.tipo === 'item');
  if (i >= 0) {
    M.cena.remove(proxies[i].caixa);
    proxies.splice(i, 1);
  }
  if (destaque) destaque.visible = false;
}

export function mudarTela(id: string, linhas: string[] | null) {
  const o = objetos.get(id);
  if (o) trocarTela(o, linhas);
}

export function posicaoDe(id: string): THREE.Vector3 | null {
  const o = objetos.get(id);
  return o ? o.position.clone() : null;
}
