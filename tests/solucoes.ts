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
  c03: {
    coletados: ['iphone'],
    flags: ['isolou_iphone'],
    comandos: [
      'celebrita extrair iphone --logica',
      'celebrita extrair iphone --fs',
      'cd /evidencias/PCI-TESTE-0_fs/private/var/mobile/Library',
      "sqlite3 CoreDuet/Knowledge/knowledgeC.db \"SELECT ZVALUESTRING, datetime(ZSTARTDATE+978307200,'unixepoch','-3 hours') AS ini, datetime(ZENDDATE+978307200,'unixepoch','-3 hours') AS fim FROM ZOBJECT WHERE ZSTREAMNAME='/app/inFocus' AND ZSTARTDATE <= 811119790 AND ZENDDATE >= 811119790\"",
      "sqlite3 CoreDuet/Knowledge/knowledgeC.db \"SELECT ZVALUEINTEGER, datetime(ZSTARTDATE+978307200,'unixepoch','-3 hours'), datetime(ZENDDATE+978307200,'unixepoch','-3 hours') FROM ZOBJECT WHERE ZSTREAMNAME='/device/isLocked'\"",
      "sqlite3 SMS/sms.db \"SELECT datetime(m.date/1000000000+978307200,'unixepoch','-3 hours'), h.id, m.text FROM message m JOIN handle h ON m.handle_id = h.ROWID WHERE m.text LIKE '%posta você%'\"",
    ],
    respostas: { q1: 'com.instagrama.app', q2: 'sim', q3: '2026-09-14 19:41', q4: '+5541996660101' },
    evidencia: { q2: '0|2026-09-14 19:39:10|2026-09-14 20:22:40' },
  },
  c04: {
    coletados: ['camera'],
    flags: ['requisitou_fechadura', 'exportou_roteador', 'anotou_relogio', 'requisitou_voz'],
    comandos: [
      'cd /casos/c04/recebidos',
      'cat LEIA-ME.txt',
      "jq '.usuarios' fechadura_trancatech_export.json",
      "jq -c '.eventos[] | select(.usuario_id == 3)' fechadura_trancatech_export.json",
      "jq -r 'select(.ts > \"2026-10-19\") | .transcricao' lumen_historico_voz.jsonl",
      'grep -v -E "TV-Sala|Lumen|Aspirador|Lampada|Camera|TT900|Geladeira" roteador_logs_dhcp.txt',
      'bloqueador on',
      'imajador adquirir /dev/sdc SD.E01',
      'imajador montar /evidencias/SD.E01',
      'ls /mnt/SD/DCIM/2026/10',
      'exifeiro /mnt/SD/DCIM/2026/10/20261019_022115.mp4',
      'grep -i diferen /mnt/SD/system.log',
      'conv fuso "2026-10-19 02:21:15" -0.12',
    ],
    respostas: { q1: 'Visitante Cleiton', q2: 'Marlene', q3: '2026-10-19 02:14', q4: 'Celumax-do-Cleiton' },
  },
};
