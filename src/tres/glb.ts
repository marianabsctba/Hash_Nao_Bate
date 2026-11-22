// Móveis e objetos fotográficos (Poly Haven, CC0) em GLB com Draco, carregados sob demanda.
import * as THREE from 'three';
import { L } from './humanos';

const BASE = `${import.meta.env.BASE_URL}ambiente/moveis/`;
const cache = new Map<string, Promise<THREE.Object3D | null>>();

function carregar(arquivo: string): Promise<THREE.Object3D | null> {
  let p = cache.get(arquivo);
  if (!p) {
    p = L()
      .loadAsync(`${BASE}${arquivo}.glb?v=${__VERSAO__}`)
      .then((g) => {
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        return g.scene;
      })
      .catch(() => null);
    cache.set(arquivo, p);
  }
  return p;
}

/**
 * Coloca um modelo na cena. "arquivo#n" pega só o n-ésimo objeto de um GLB que traz vários
 * (alguns pacotes do Poly Haven vêm com variações lado a lado). Devolve o grupo na hora
 * e a promessa de quando o modelo chegou (para calcular colisão e mira).
 */
export function modeloGlb(spec: string): { grupo: THREE.Group; pronto: Promise<THREE.Group> } {
  const grupo = new THREE.Group();
  const [arquivo, idx] = spec.split('#');
  const pronto = carregar(arquivo).then((cena) => {
    if (!cena) return grupo;
    let fonte: THREE.Object3D = cena;
    if (idx !== undefined) {
      const filhos = cena.children.length === 1 && cena.children[0].children.length > 1 ? cena.children[0].children : cena.children;
      fonte = filhos[Number(idx)] ?? cena;
    }
    const copia = fonte.clone(true);
    if (idx !== undefined) {
      // a variação vem deslocada no pacote: centraliza no chão
      copia.position.set(0, 0, 0);
      copia.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(copia);
      copia.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    }
    grupo.add(copia);
    return grupo;
  });
  return { grupo, pronto };
}

export function preCarregarGlb(specs: string[]) {
  for (const s of specs) void carregar(s.split('#')[0]);
}
