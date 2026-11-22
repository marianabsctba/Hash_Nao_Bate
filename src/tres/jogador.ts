// Primeira pessoa: WASD + mouse no computador, joystick + arrastar no celular.
import * as THREE from 'three';
import { M } from './motor3d';

export const OLHO = 1.62;
const RAIO = 0.3;

export const J = {
  pos: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  livre: false,
  olho: OLHO,
  agachado: false,
  limites: [0, 1, 0, 1] as [number, number, number, number],
  obstaculos: [] as [number, number, number, number][],
  teclas: new Set<string>(),
  joy: { x: 0, y: 0 },
  toque: false,
};

let canvasRef: HTMLCanvasElement | null = null;
let iniciado = false;

export function posicionar(x: number, z: number, yaw: number) {
  J.pos.set(x, 0, z);
  J.yaw = yaw;
  J.pitch = -0.08;
}

export function iniciarControles(canvas: HTMLCanvasElement, camada: HTMLElement) {
  canvasRef = canvas;
  J.toque = matchMedia('(pointer: coarse)').matches;
  if (iniciado) {
    M.atualizar.add(atualizar);
    return;
  }
  iniciado = true;
  addEventListener('keydown', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.tagName === 'SELECT') return;
    J.teclas.add(e.code);
    if (e.code === 'KeyC' && J.livre) J.agachado = !J.agachado;
  });
  addEventListener('keyup', (e) => J.teclas.delete(e.code));
  addEventListener('blur', () => J.teclas.clear());
  canvas.addEventListener('click', () => {
    if (J.livre && !J.toque && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
  });
  addEventListener('mousemove', (e) => {
    if (!J.livre || document.pointerLockElement !== canvas) return;
    girar(e.movementX * 0.0022, e.movementY * 0.0022);
  });

  const base = document.createElement('div');
  base.className = 'joy';
  const pino = document.createElement('div');
  pino.className = 'joy-pino';
  base.append(pino);
  camada.append(base);
  let idJoy: number | null = null;
  let idOlhar: number | null = null;
  let ox = 0;
  let oy = 0;
  let lx = 0;
  let ly = 0;
  const raioJoy = 50;
  camada.addEventListener('touchstart', (e) => {
    if (!J.livre) return;
    for (const t of Array.from(e.changedTouches)) {
      if ((t.target as HTMLElement).closest('button, .painel, .hud-topo')) continue;
      if (t.clientX < innerWidth * 0.45 && idJoy === null) {
        idJoy = t.identifier;
        ox = t.clientX;
        oy = t.clientY;
        base.style.left = `${ox - 60}px`;
        base.style.top = `${oy - 60}px`;
        base.classList.add('ativo');
      } else if (idOlhar === null) {
        idOlhar = t.identifier;
        lx = t.clientX;
        ly = t.clientY;
      }
    }
  }, { passive: true });
  camada.addEventListener('touchmove', (e) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === idJoy) {
        let dx = t.clientX - ox;
        let dy = t.clientY - oy;
        const d = Math.hypot(dx, dy);
        if (d > raioJoy) { dx = (dx / d) * raioJoy; dy = (dy / d) * raioJoy; }
        pino.style.transform = `translate(${dx}px, ${dy}px)`;
        J.joy.x = dx / raioJoy;
        J.joy.y = dy / raioJoy;
      } else if (t.identifier === idOlhar) {
        girar((t.clientX - lx) * 0.006, (t.clientY - ly) * 0.006);
        lx = t.clientX;
        ly = t.clientY;
      }
    }
  }, { passive: true });
  const fim = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === idJoy) { idJoy = null; J.joy.x = J.joy.y = 0; pino.style.transform = ''; base.classList.remove('ativo'); }
      if (t.identifier === idOlhar) idOlhar = null;
    }
  };
  camada.addEventListener('touchend', fim);
  camada.addEventListener('touchcancel', fim);
  M.atualizar.add(atualizar);
}

function girar(dx: number, dy: number) {
  J.yaw -= dx;
  J.pitch = Math.max(-1.35, Math.min(1.2, J.pitch - dy));
}

export function soltarMouse() {
  if (document.pointerLockElement) document.exitPointerLock();
}
export function travado() {
  return !!canvasRef && document.pointerLockElement === canvasRef;
}

function colide(x: number, z: number): boolean {
  const [x0, x1, z0, z1] = J.limites;
  if (x < x0 + RAIO || x > x1 - RAIO || z < z0 + RAIO || z > z1 - RAIO) return true;
  return J.obstaculos.some(([ax0, ax1, az0, az1]) => x > ax0 - RAIO && x < ax1 + RAIO && z > az0 - RAIO && z < az1 + RAIO);
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');

function atualizar(dt: number, t: number) {
  if (J.livre) {
    let fx = 0;
    let fz = 0;
    const k = J.teclas;
    if (k.has('KeyW') || k.has('ArrowUp')) fz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    fx += J.joy.x;
    fz += J.joy.y;
    const n = Math.hypot(fx, fz);
    if (n > 0.05) {
      const vel = (k.has('ShiftLeft') ? 3.2 : 1.9) * Math.min(1, n) * (J.agachado ? 0.5 : 1);
      fx /= Math.max(1, n);
      fz /= Math.max(1, n);
      const s = Math.sin(J.yaw);
      const c = Math.cos(J.yaw);
      const dx = (fx * c + fz * s) * vel * dt;
      const dz = (-fx * s + fz * c) * vel * dt;
      if (!colide(J.pos.x + dx, J.pos.z)) J.pos.x += dx;
      if (!colide(J.pos.x, J.pos.z + dz)) J.pos.z += dz;
    }
    const alvo = J.agachado ? 0.95 : OLHO;
    J.olho += (alvo - J.olho) * Math.min(1, dt * 8);
    if (n > 0.05) J.olho += Math.sin(t * 9) * 0.012;
  }
  M.camera.position.set(J.pos.x, J.olho, J.pos.z);
  euler.set(J.pitch, J.yaw, 0);
  M.camera.quaternion.setFromEuler(euler);
}
