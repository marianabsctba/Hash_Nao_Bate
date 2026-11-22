import type { Caso } from './tipos';
import { caso00 } from './c00_estagio';
import { caso01 } from './c01_contabilidade';
import { caso02 } from './c02_android';
import { caso03 } from './c03_ios';
import { caso04 } from './c04_iot';
import { caso05 } from './c05_nuvem';
import { caso06 } from './c06_rede';

export const CASOS: Caso[] = [caso00, caso01, caso02, caso03, caso04, caso05, caso06];

export function casoPorId(id: string): Caso | undefined {
  return CASOS.find((c) => c.id === id);
}
