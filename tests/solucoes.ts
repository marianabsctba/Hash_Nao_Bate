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
  c01: {
    coletados: ['pc'],
    flags: ['viu_bitlocker', 'chave_bitlocker', 'puxou_cabo'],
    comandos: [
      'bloqueador on',
      'imajador adquirir /dev/sdb CONTAB07.E01',
      'imajador montar /evidencias/CONTAB07.E01',
      'cd /mnt/CONTAB07',
      'regripador -r Windows/System32/config/SYSTEM -p usbstor',
      'regripador -r Windows/System32/config/SYSTEM -p mountdev',
      'lnkeco -d Users/wagner/AppData/Roaming/Microsoft/Windows/Recent',
      'pfeco -d Windows/Prefetch | grep -i -A 4 limpa',
      'regripador -r Users/wagner/NTUSER.DAT -k "Software\Microsoft\Windows\CurrentVersion\Explorer\UserAssist"',
      'conv rot13 "P:\Hfref\jntare\Qbjaybnqf\YvzcnQvfpb64.rkr"',
      'conv fuso "2026-10-30 02:41:17" -3',
      "mfteco -f '$MFT' --csv ~/mft.csv",
      'grep -i notas_wagner ~/mft.csv',
    ],
    respostas: { q1: '7A1F3C9E00B2', q2: 'clientes_faturamento_2026.xlsx', q3: 'LIMPADISCO64.EXE', q4: '2026-10-29 23:41', q5: 'notas_wagner.txt' },
  },
};
