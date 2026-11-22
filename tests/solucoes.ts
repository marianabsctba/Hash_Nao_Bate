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
  c02: {
    coletados: ['cel'],
    flags: ['isolou_cel'],
    comandos: [
      'celebrita listar',
      'celebrita extrair cel --fs',
      'leappinho /evidencias/PCI-TESTE-0_fs',
      'cd /evidencias/PCI-TESTE-0_fs/data/data/com.zapeia/databases',
      'sqlite3 msgstore.db .tables',
      "sqlite3 msgstore.db \"SELECT text_data FROM message WHERE text_data LIKE '%pix%'\"",
      "sqlite3 -header -column msgstore.db \"SELECT datetime(m.timestamp/1000,'unixepoch','-3 hours') AS hora, m.text_data FROM message m JOIN chat c ON m.chat_row_id = c._id JOIN jid j ON c.jid_row_id = j._id WHERE j.raw_string LIKE '5541998765432%' ORDER BY m.timestamp LIMIT 1\"",
      "sqlite3 msgstore.db \"SELECT count(DISTINCT chat_row_id) FROM message WHERE from_me = 1 AND text_data LIKE '%troquei de número%'\"",
      'cd /evidencias/PCI-TESTE-0_fs/sdcard/DCIM/Camera',
      'ver *.jpg | grep -i cart',
      'exifeiro IMG_20261119_153012.jpg | grep -i gps',
      "conv dms \"25 deg 25' 41.50\\\" S\"",
      "sqlite3 /evidencias/PCI-TESTE-0_fs/data/data/com.navegador.android/app_navegador/Default/History \"SELECT datetime(last_visit_time/1000000 - 11644473600,'unixepoch','-3 hours'), url FROM urls WHERE url LIKE '%idosos%'\"",
    ],
    respostas: { q1: 'e2f1a7c4-9b3d-4f60-8a21-5d7c3e9b1f08', q2: '2026-11-03 10:12', q3: '37', q4: '-25.4282', q5: '2026-11-21 21:37' },
    evidencia: { q4: '-25.428194' },
  },
};
