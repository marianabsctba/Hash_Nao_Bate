// Materiais fotográficos de piso e parede (texturas CC0 do Poly Haven em WebP, 1K).
import * as THREE from 'three';

const BASE = `${import.meta.env.BASE_URL}ambiente/texturas/`;
const tl = new THREE.TextureLoader();

export type Superficie =
  | 'granite_tile' | 'large_grey_tiles' | 'laminate_floor_02' | 'herringbone_parquet' | 'garage_floor' | 'smooth_concrete_floor'
  | 'dirty_carpet' | 'white_plaster_02' | 'painted_plaster_wall' | 'grey_plaster' | 'beige_wall_002' | 'concrete_wall_003'
  | 'square_tiled_wall' | 'worn_tile_floor' | 'terrazzo_tiles' | 'plastered_wall_02';

function tex(nome: string, rep: [number, number], cor: boolean): THREE.Texture {
  const t = tl.load(`${BASE}${nome}.webp?v=${__VERSAO__}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** rep = quantas vezes a textura repete; tinta multiplica a cor (parede pintada de outra cor) */
export function pbr(s: Superficie, rep: [number, number], tinta = '#ffffff'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex(`${s}_cor`, rep, true),
    normalMap: tex(`${s}_normal`, rep, false),
    roughnessMap: tex(`${s}_aspereza`, rep, false),
    color: tinta,
    roughness: 1,
    metalness: 0,
  });
}
