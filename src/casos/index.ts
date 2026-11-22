import type { Caso } from './tipos';
import { caso00 } from './c00_estagio';
import { caso01 } from './c01_contabilidade';
import { caso02 } from './c02_android';

export const CASOS: Caso[] = [caso00, caso01, caso02];

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
