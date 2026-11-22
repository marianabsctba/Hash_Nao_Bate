// Gabarito executável: os comandos que uma perita resolveria cada caso.
import { HASH_PEN } from '../src/casos/c00_estagio';

export interface Solucao {
  coletados: string[];
  flags?: string[];
  comandos: string[];
  respostas: Record<string, string>;
  /** texto que precisa aparecer na saída (quando difere da resposta, ex.: hora convertida) */
  evidencia?: Record<string, string>;
}

export const SOLUCOES: Record<string, Solucao> = {
  c00: {
    coletados: ['pen', 'folha'],
    comandos: [
      'cat LEIA-ME.txt',
      'bloqueador on',
      'lsblk',
      'imajador adquirir /dev/sdb PEN.E01',
      'cat /evidencias/PEN.E01.txt',
      'imajador montar /evidencias/PEN.E01',
      'ls /mnt/PEN',
      'formiga -i /evidencias/PEN.E01 -o ~/recuperados',
      'tree ~/recuperados',
      'file ~/recuperados/pdf/*',
      'strings ~/recuperados/pdf/* | grep -i pix',
      'exifeiro ~/recuperados/jpg/*',
      'conv fuso "2026-11-20 23:14:51" -3',
    ],
    respostas: { q1: HASH_PEN, q2: 'gilmar.gabaritos@banco.exemplo', q3: '2026-11-20 20:14' },
  },
};
