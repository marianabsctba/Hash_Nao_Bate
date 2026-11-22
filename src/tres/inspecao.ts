// Visualizador de bancada: o aparelho girando na sua frente, como no zoom da lupa.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ModeloId } from '../casos/tipos';
import { criarModelo } from './modelos';
import { modeloGlb } from './glb';

let r: THREE.WebGLRenderer | null = null;
let rodando = false;

export function abrirInspecao(alvo: HTMLElement, modelo: ModeloId, tela?: string[] | null, cor?: string, glb?: string): () => void {
  const cena = new THREE.Scene();
  cena.background = new THREE.Color('#0d0f14');
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  if (!r) {
    r = new THREE.WebGLRenderer({ antialias: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const pm = new THREE.PMREMGenerator(r);
  cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.2));
  const d = new THREE.DirectionalLight('#ffffff', 2);
  d.position.set(1, 2, 2);
  cena.add(d);
  const piv = new THREE.Group();
  cena.add(piv);
  let raio = 0.3;
  const base = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.9 }));
  base.rotation.x = -Math.PI / 2;
  cena.add(base);
  const encaixar = (obj: THREE.Object3D) => {
    const caixa = new THREE.Box3().setFromObject(obj);
    const tam = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    obj.position.sub(centro);
    piv.add(obj);
    raio = Math.max(tam.x, tam.y, tam.z, 0.05);
    cam.position.set(0, raio * 0.6, raio * 2.2);
    cam.lookAt(0, 0, 0);
    // mesa de inspeção (todo perito fotografa com escala)
    base.scale.setScalar(raio * 6);
    base.position.y = -tam.y / 2 - 0.001;
  };
  if (glb) void modeloGlb(glb).pronto.then(encaixar);
  else {
    const obj = criarModelo(modelo, tela ?? undefined, cor);
    if (modelo === 'camera') obj.rotation.x = 0;
    encaixar(obj);
  }
  alvo.innerHTML = '';
  alvo.append(r.domElement);
  const ajustar = () => {
    const w = alvo.clientWidth || 300;
    const h = alvo.clientHeight || 240;
    r!.setSize(w, h);
    r!.setPixelRatio(Math.min(devicePixelRatio, 2));
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  ajustar();
  let arrastando = false;
  let lx = 0;
  let ly = 0;
  let girando = true;
  let zoom = 1;
  const el = r.domElement;
  const ini = (x: number, y: number) => { arrastando = true; girando = false; lx = x; ly = y; };
  const mov = (x: number, y: number) => {
    if (!arrastando) return;
    piv.rotation.y += (x - lx) * 0.01;
    piv.rotation.x = Math.max(-1.4, Math.min(1.4, piv.rotation.x + (y - ly) * 0.01));
    lx = x;
    ly = y;
  };
  el.onpointerdown = (e) => { ini(e.clientX, e.clientY); el.setPointerCapture(e.pointerId); };
  el.onpointermove = (e) => mov(e.clientX, e.clientY);
  el.onpointerup = () => { arrastando = false; };
  el.onwheel = (e) => { e.preventDefault(); zoom = Math.max(0.4, Math.min(2.5, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); };
  rodando = true;
  const loop = () => {
    if (!rodando) return;
    if (girando) piv.rotation.y += 0.008;
    cam.position.setLength(raio * 2.3 * zoom);
    r!.render(cena, cam);
    requestAnimationFrame(loop);
  };
  loop();
  addEventListener('resize', ajustar);
  return () => {
    rodando = false;
    removeEventListener('resize', ajustar);
    pm.dispose();
  };
}
