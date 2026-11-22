// Renderizador, cena, câmera e laço principal.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const M = {
  renderer: null as unknown as THREE.WebGLRenderer,
  cena: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(70, 1, 0.03, 200),
  relogio: new THREE.Clock(),
  atualizar: new Set<(dt: number, t: number) => void>(),
  ativo: false,
  leve: false,
};

export function iniciar3d(alvo: HTMLElement): HTMLCanvasElement {
  if (M.renderer) {
    alvo.prepend(M.renderer.domElement);
    M.ativo = true;
    redimensionar();
    return M.renderer.domElement;
  }
  M.leve = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  const r = new THREE.WebGLRenderer({ antialias: !M.leve, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  r.shadowMap.enabled = !M.leve;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setPixelRatio(Math.min(devicePixelRatio, M.leve ? 1 : 1.5));
  r.domElement.className = 'tela3d';
  M.renderer = r;
  alvo.prepend(r.domElement);
  const pm = new THREE.PMREMGenerator(r);
  M.cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  M.cena.environmentIntensity = 0.45;
  M.cena.add(M.camera);
  addEventListener('resize', redimensionar);
  redimensionar();
  M.ativo = true;
  r.setAnimationLoop(() => {
    if (!M.ativo) return;
    const dt = Math.min(M.relogio.getDelta(), 0.05);
    const t = M.relogio.elapsedTime;
    for (const f of M.atualizar) f(dt, t);
    r.render(M.cena, M.camera);
  });
  return r.domElement;
}

export function pausar3d() {
  M.ativo = false;
}

export function redimensionar() {
  if (!M.renderer) return;
  const w = innerWidth;
  const h = innerHeight;
  M.renderer.setSize(w, h);
  M.camera.aspect = w / h;
  M.camera.updateProjectionMatrix();
}

/** Remove tudo da cena (menos a câmera) e libera memória da GPU. */
export function limparCena() {
  for (const filho of [...M.cena.children]) {
    if (filho === M.camera) continue;
    M.cena.remove(filho);
    filho.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        const mm = mat as THREE.MeshStandardMaterial;
        mm.map?.dispose();
        mm.emissiveMap?.dispose();
        mm.dispose();
      }
    });
  }
  M.atualizar.clear();
}
