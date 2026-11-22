import type { Caso } from './tipos';
import { caso00 } from './c00_estagio';

export const CASOS: Caso[] = [caso00];

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
