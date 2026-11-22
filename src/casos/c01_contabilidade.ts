// Caso 1: Windows. A planilha de clientes saiu num pendrive na véspera da demissão e alguém passou o "limpador".
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import type { No, RegMft } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { ruidoMft } from './ruido';

const enc = new TextEncoder();
const bin = (magia: string, texto: string[], formato?: string) => esp({ tipo: 'binario', magia: [...enc.encode(magia)], texto, formato });
const U = (s: string) => T.data(s, 0); // datas em UTC
const ft = (d: Date) => '0x' + T.filetime(d).toString(16).toUpperCase().padStart(16, '0');

// linha do tempo real (UTC): na noite de 29/10 em Brasília, já 30/10 em UTC
const PLUGOU = U('2026-10-30 01:58:33');
const ABRIU = U('2026-10-30 02:05:12');
const COPIOU = U('2026-10-30 02:06:40');
const TIMESTOMP = U('2026-10-30 02:20:11');
const LIMPOU_1 = U('2026-10-30 02:39:02');
const LIMPOU_2 = U('2026-10-30 02:41:17');
const LOG_LIMPO = U('2026-10-30 02:44:55');

const SERIAL = '7A1F3C9E00B2';
const USB_ALVO = `Disk&Ven_Pendrivix&Prod_Turbo_3.0&Rev_1.00\\${SERIAL}&0`;

function hiveSystem(): No {
  const r = new Rng(101);
  const chaves: Record<string, Record<string, string>> = {
    'ControlSet001\\Control\\ComputerName\\ComputerName': { ComputerName: 'CONTAB-07' },
    'ControlSet001\\Control\\TimeZoneInformation': { TimeZoneKeyName: 'E. South America Standard Time', Bias: '0x000000B4 (180 minutos = UTC-3)', ActiveTimeBias: '0x000000B4' },
    'ControlSet001\\Control\\Windows': { ShutdownTime: T.le64(T.filetime(U('2026-10-30 02:47:31'))) },
    'MountedDevices': {
      '\\DosDevices\\C:': 'DMIO:ID:9f2c...  (disco interno)',
      '\\DosDevices\\D:': '_??_SCSI#CdRom&Ven_HL-DT-ST&Prod_DVDRAM#5&1a2b#{53f5630d-b6bf-11d0-94f2-00a0c91efb8b}',
      '\\DosDevices\\E:': `_??_USBSTOR#${USB_ALVO.replace('\\', '#')}#{53f56307-b6bf-11d0-94f2-00a0c91efb8b}`,
      '\\DosDevices\\F:': '_??_USBSTOR#Disk&Ven_Generic&Prod_Card_Reader&Rev_1.00#000000000819&0#{53f56307-b6bf-11d0-94f2-00a0c91efb8b}',
    },
  };
  const escrita: Record<string, Date> = {
    'ControlSet001\\Control\\ComputerName\\ComputerName': U('2024-02-11 13:20:00'),
    'ControlSet001\\Control\\TimeZoneInformation': U('2024-02-11 13:21:10'),
    'ControlSet001\\Control\\Windows': U('2026-10-30 02:47:31'),
    'MountedDevices': PLUGOU,
  };
  const usbs: [string, Date, string][] = [
    ['Disk&Ven_SanDiskette&Prod_Cruzer_Blade&Rev_1.00\\4C530001190815101234&0', U('2025-06-03 14:12:00'), 'Pendrive SanDiskette Cruzer (o da Dona Dirce com fotos do neto)'],
    ['Disk&Ven_Generic&Prod_Card_Reader&Rev_1.00\\000000000819&0', U('2026-08-19 18:40:00'), 'Leitor de cartão genérico'],
    ['Disk&Ven_WD&Prod_Elements_25A2&Rev_1014\\575831314135&0', U('2026-02-02 11:05:00'), 'HD externo de backup'],
    [USB_ALVO, PLUGOU, 'Pendrivix Turbo 3.0 USB Device'],
    ['Disk&Ven_Kingstron&Prod_DataTraveler_3.0&Rev_PMAP\\60A44C3FAE21B1A0C9F2&0', U('2026-09-12 16:30:00'), 'Kingstron DataTraveler 3.0'],
  ];
  for (const [k, d, nome] of usbs) {
    chaves[`ControlSet001\\Enum\\USBSTOR\\${k}`] = { FriendlyName: nome, Mfg: '@disk.inf,%genmanufacturer%;(Unidades de disco padrão)', Service: 'disk' };
    escrita[`ControlSet001\\Enum\\USBSTOR\\${k}`] = d;
  }
  // ruído: serviços, que todo SYSTEM tem aos montes
  for (let i = 0; i < 40; i++) {
    const s = `ControlSet001\\Services\\${r.pick(['Wd', 'Bth', 'Intel', 'Realtek', 'Nv', 'Ms', 'Wpn', 'Cdp', 'Diag', 'Usb'])}${r.hex(4)}`;
    chaves[s] = { Start: String(r.int(2, 4)), Type: String(r.pick([1, 16, 32])) };
  }
  return esp({ tipo: 'hive', nome: 'SYSTEM', chaves, escrita });
}

function hiveSoftware(): No {
  return esp({
    tipo: 'hive', nome: 'SOFTWARE',
    chaves: {
      'Microsoft\\Windows NT\\CurrentVersion': { ProductName: 'Windows 11 Pro', DisplayVersion: '24H2', RegisteredOwner: 'Dinheiro Certo Contabilidade', InstallDate: '0x65C8C4A0' },
      'Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\S-1-5-21-3311-1001': { ProfileImagePath: 'C:\\Users\\dirce' },
      'Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\S-1-5-21-3311-1004': { ProfileImagePath: 'C:\\Users\\wagner' },
      'Microsoft\\Windows\\CurrentVersion\\Run': { OneDrive: '"C:\\Program Files\\OneDrive\\OneDrive.exe" /background', AntivirusBarato: 'C:\\Program Files\\AntivirusBarato\\tray.exe' },
    },
    escrita: { 'Microsoft\\Windows NT\\CurrentVersion': U('2026-10-14 09:00:00'), 'Microsoft\\Windows\\CurrentVersion\\Run': U('2026-03-02 10:11:00') },
  });
}

function hiveNtuser(): No {
  const ua = 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}\\Count';
  const exe = (p: string) => T.rot13(p);
  const r = new Rng(77);
  const uaVals: Record<string, string> = {};
  const progs: [string, number, Date][] = [
    ['{6D809377-6AF0-444B-8957-A3773F02200E}\\Microsoft Office\\root\\Office16\\EXCEL.EXE', 412, U('2026-10-30 02:05:12')],
    ['{6D809377-6AF0-444B-8957-A3773F02200E}\\Navegador\\Application\\navegador.exe', 1890, U('2026-10-30 01:40:00')],
    ['C:\\Users\\wagner\\Downloads\\LimpaDisco64.exe', 3, LIMPOU_2],
    ['{6D809377-6AF0-444B-8957-A3773F02200E}\\Sistema Contabil\\contabil.exe', 2210, U('2026-10-29 20:55:00')],
    ['Microsoft.Windows.Explorer', 999, U('2026-10-30 02:40:00')],
    ['{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\calc.exe', 57, U('2026-10-27 15:12:00')],
    ['C:\\Users\\wagner\\Downloads\\instalador_jogo_de_paciencia.exe', 1, U('2026-05-02 12:00:00')],
  ];
  for (const [p, n, d] of progs) uaVals[exe(p)] = `RunCount=${n}  FocusCount=${r.int(1, 300)}  LastExecuted(FILETIME)=${ft(d)}`;
  const recent = 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs';
  const docs = ['clientes_faturamento_2026.xlsx', 'folha_outubro.xlsx', 'DARF_setembro.pdf', 'contrato_padaria_do_ze.docx', 'meme_contador.png', 'notas_wagner.txt', 'ferias_2027.xlsx', 'boleto_condominio.pdf'];
  return esp({
    tipo: 'hive', nome: 'NTUSER.DAT',
    chaves: {
      [ua]: uaVals,
      [recent]: Object.fromEntries(docs.map((d, i) => [String(i), d])),
      [`${recent}\\.xlsx`]: { '0': 'clientes_faturamento_2026.xlsx', '1': 'folha_outubro.xlsx', '2': 'ferias_2027.xlsx', MRUListEx: '00 00 00 00 01 00 00 00 02 00 00 00' },
      'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths': { url1: 'E:\\backup_wagner', url2: 'C:\\Users\\wagner\\Documents\\Clientes', url3: '\\\\SERVIDOR\\contabil' },
      'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery': { '0': 'clientes', '1': 'como apagar historico de pendrive', '2': 'limpadisco64 download gratis' },
      'Software\\Microsoft\\Windows\\CurrentVersion\\Run': { Spotifai: 'C:\\Users\\wagner\\AppData\\Roaming\\Spotifai\\Spotifai.exe --minimized' },
    },
    escrita: { [ua]: LIMPOU_2, [recent]: ABRIU, [`${recent}\\.xlsx`]: ABRIU, 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths': COPIOU, 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery': U('2026-10-30 02:30:40') },
  });
}

function prefetch(): Record<string, No> {
  const r = new Rng(5);
  const out: Record<string, No> = {};
  const nomes = ['NAVEGADOR.EXE', 'EXCEL.EXE', 'WINWORD.EXE', 'ONEDRIVE.EXE', 'SVCHOST.EXE', 'SEARCHAPP.EXE', 'TEAMS.EXE', 'CONTABIL.EXE', 'SPOTIFAI.EXE', 'CALC.EXE', 'NOTEPAD.EXE', 'EXPLORER.EXE', 'TASKMGR.EXE', 'RUNTIMEBROKER.EXE', 'SETUPHOST.EXE', 'MSEDGEWEBVIEW2.EXE', 'DLLHOST.EXE', 'CONHOST.EXE', 'WMIPRVSE.EXE', 'TRAY.EXE', 'WUAUCLT.EXE', 'MPCMDRUN.EXE', 'CTFMON.EXE', 'SMARTSCREEN.EXE', 'BACKGROUNDTASKHOST.EXE'];
  for (const n of nomes) {
    const hashPf = r.hex(8).toUpperCase();
    const ult = Array.from({ length: r.int(1, 8) }, () => new Date(U('2026-10-01 10:00:00').getTime() + r.prox() * 29 * 864e5)).sort((a, b) => b.getTime() - a.getTime());
    out[`${n}-${hashPf}.pf`] = esp({ tipo: 'prefetch', exe: n, hashPf, execucoes: r.int(ult.length, 900), ultimas: ult, arquivos: ['\\VOLUME{01d9}\\WINDOWS\\SYSTEM32\\NTDLL.DLL', '\\VOLUME{01d9}\\WINDOWS\\SYSTEM32\\KERNEL32.DLL', `\\VOLUME{01d9}\\PROGRAM FILES\\${n.replace('.EXE', '')}\\${n}`] });
  }
  out['LIMPADISCO64.EXE-7C2E91AF.pf'] = esp({
    tipo: 'prefetch', exe: 'LIMPADISCO64.EXE', hashPf: '7C2E91AF', execucoes: 3, ultimas: [LIMPOU_2, LIMPOU_1, U('2026-09-12 16:44:10')],
    arquivos: ['\\VOLUME{01d9}\\USERS\\WAGNER\\DOWNLOADS\\LIMPADISCO64.EXE', '\\VOLUME{01d9}\\WINDOWS\\SYSTEM32\\NTDLL.DLL', '\\VOLUME{01d9}\\USERS\\WAGNER\\APPDATA\\ROAMING\\MICROSOFT\\WINDOWS\\RECENT\\AUTOMATICDESTINATIONS', '\\VOLUME{01d9}\\USERS\\WAGNER\\APPDATA\\LOCAL\\NAVEGADOR\\USER DATA\\DEFAULT\\HISTORY', '\\VOLUME{01d9}\\$RECYCLE.BIN\\S-1-5-21-3311-1004\\DESKTOP.INI'],
  });
  return out;
}

function lnks(): Record<string, No> {
  const mk = (alvo: string, c: Date, m: Date, vol: string, serial: string) => esp({ tipo: 'lnk', alvo, criado: c, modificado: m, volume: vol, serialVolume: serial, maquina: 'contab-07' });
  return {
    'clientes_faturamento_2026.xlsx.lnk': mk('E:\\backup_wagner\\clientes_faturamento_2026.xlsx', COPIOU, COPIOU, 'Removível (DRIVE_REMOVABLE)', '3C1A-77F0'),
    'backup_wagner.lnk': mk('E:\\backup_wagner', COPIOU, COPIOU, 'Removível (DRIVE_REMOVABLE)', '3C1A-77F0'),
    'folha_outubro.xlsx.lnk': mk('C:\\Users\\wagner\\Documents\\folha_outubro.xlsx', U('2026-10-20 13:00:00'), U('2026-10-28 18:02:00'), 'Fixo (DRIVE_FIXED)', '8E21-0C4B'),
    'DARF_setembro.pdf.lnk': mk('C:\\Users\\wagner\\Downloads\\DARF_setembro.pdf', U('2026-10-02 11:00:00'), U('2026-10-02 11:00:00'), 'Fixo (DRIVE_FIXED)', '8E21-0C4B'),
    'meme_contador.png.lnk': mk('C:\\Users\\wagner\\Pictures\\meme_contador.png', U('2026-10-10 15:40:00'), U('2026-10-10 15:40:00'), 'Fixo (DRIVE_FIXED)', '8E21-0C4B'),
    'notas_wagner.txt.lnk': mk('C:\\Users\\wagner\\Documents\\notas_wagner.txt', TIMESTOMP, TIMESTOMP, 'Fixo (DRIVE_FIXED)', '8E21-0C4B'),
    'contabil (2).lnk': mk('\\\\SERVIDOR\\contabil', U('2026-01-10 09:00:00'), U('2026-10-29 20:50:00'), 'Rede (DRIVE_REMOTE)', '0000-0000'),
  };
}

function mft(): No {
  const r = new Rng(31);
  const regs: RegMft[] = ruidoMft(r, 2600, U('2026-09-01 00:00:00'), U('2026-10-30 03:00:00'), 5000);
  const d4 = (d: Date): [Date, Date, Date, Date] => [d, d, d, d];
  const antigo = U('2019-03-02 10:00:00');
  regs.push(
    { entrada: 88123, caminho: 'C:\\Users\\wagner\\Documents\\Clientes\\clientes_faturamento_2026.xlsx', tamanho: 482113, si: [U('2026-01-15 12:00:00'), U('2026-10-29 20:40:00'), U('2026-10-29 20:40:00'), ABRIU], fn: d4(U('2026-01-15 12:00:00')) },
    { entrada: 88140, caminho: 'C:\\Users\\wagner\\Documents\\notas_wagner.txt', tamanho: 2210, si: [antigo, antigo, antigo, antigo], fn: d4(TIMESTOMP) },
    { entrada: 88141, caminho: 'C:\\Users\\wagner\\Documents\\folha_outubro.xlsx', tamanho: 99812, si: d4(U('2026-10-20 13:00:00')), fn: d4(U('2026-10-20 13:00:00')) },
    { entrada: 88150, caminho: 'C:\\Users\\wagner\\Downloads\\LimpaDisco64.exe', tamanho: 3311020, si: d4(U('2026-09-12 16:40:00')), fn: d4(U('2026-09-12 16:40:00')) },
    { entrada: 88151, caminho: 'C:\\Users\\wagner\\Downloads\\lista_clientes_para_o_primo.csv', tamanho: 61022, si: d4(U('2026-10-30 02:10:00')), fn: d4(U('2026-10-30 02:10:00')), apagado: true },
    { entrada: 88152, caminho: 'C:\\Users\\wagner\\Pictures\\meme_contador.png', tamanho: 81022, si: d4(U('2026-10-10 15:40:00')), fn: d4(U('2026-10-10 15:40:00')) },
  );
  regs.sort((a, b) => a.entrada - b.entrada);
  return esp({ tipo: 'mft', registros: regs }, { tam: 268435456 });
}

function evtx(): Record<string, No> {
  const r = new Rng(9);
  const ev: { t: Date; id: number; nivel: string; dados: Record<string, string> }[] = [];
  for (let i = 0; i < 300; i++) {
    const t = new Date(U('2026-10-28 11:00:00').getTime() + r.prox() * 1.6 * 864e5);
    ev.push({ t, id: r.pick([4624, 4624, 4624, 4672, 4634, 4798, 5379]), nivel: 'Information', dados: { TargetUserName: r.pick(['wagner', 'dirce', 'SYSTEM', 'DWM-1', 'UMFD-0']), LogonType: String(r.pick([2, 5, 7, 11])) } });
  }
  ev.push({ t: LOG_LIMPO, id: 1102, nivel: 'Information', dados: { SubjectUserName: 'wagner', Mensagem: 'O log de auditoria foi limpo' } });
  ev.sort((a, b) => a.t.getTime() - b.t.getTime());
  // depois de limpo, só sobra o que veio depois
  const seg = ev.filter((e) => e.t >= LOG_LIMPO);
  return {
    'Security.evtx': esp({ tipo: 'evtx', canal: 'Security', eventos: seg.length > 1 ? seg : [ev.find((e) => e.id === 1102)!, { t: U('2026-10-30 02:46:02'), id: 4634, nivel: 'Information', dados: { TargetUserName: 'wagner', LogonType: '2' } }] }),
    'System.evtx': esp({ tipo: 'evtx', canal: 'System', eventos: [
      { t: U('2026-10-29 11:02:00'), id: 6005, nivel: 'Information', dados: { Mensagem: 'O serviço de log de eventos foi iniciado' } },
      { t: PLUGOU, id: 20001, nivel: 'Information', dados: { Dispositivo: `USBSTOR\\${USB_ALVO}`, Driver: 'disk.inf' } },
      { t: U('2026-10-30 02:47:31'), id: 1074, nivel: 'Information', dados: { Processo: 'explorer.exe', Usuario: 'wagner', Motivo: 'Desligamento' } },
    ] }),
    'Application.evtx': esp({ tipo: 'evtx', canal: 'Application', eventos: Array.from({ length: 80 }, () => ({ t: new Date(U('2026-10-20 08:00:00').getTime() + r.prox() * 10 * 864e5), id: r.pick([1000, 1001, 1026, 16384, 8224]), nivel: r.pick(['Information', 'Error', 'Warning']), dados: { Fonte: r.pick(['Application Error', 'Windows Error Reporting', 'Software Protection Platform', 'VSS', 'contabil.exe']) } })) }),
  };
}

function discoWindows(): () => import('../motor/vfs').Pasta {
  return () => pasta({
    '$MFT': mft(),
    'Windows': pasta({
      'System32': pasta({ 'config': pasta({ SYSTEM: hiveSystem(), SOFTWARE: hiveSoftware(), SAM: esp({ tipo: 'hive', nome: 'SAM', chaves: { 'SAM\\Domains\\Account\\Users\\Names\\wagner': {}, 'SAM\\Domains\\Account\\Users\\Names\\dirce': {} }, escrita: {} }) }), 'winevt': pasta({ 'Logs': pasta(evtx()) }) }),
      'Prefetch': pasta(prefetch()),
      'Temp': pasta({ 'setup_log_9921.txt': arq('instalação concluída\n'.repeat(40)) }),
    }),
    'Users': pasta({
      'wagner': pasta({
        'NTUSER.DAT': hiveNtuser(),
        'Documents': pasta({
          'Clientes': pasta({ 'clientes_faturamento_2026.xlsx': bin('PK\x03\x04', ['xl/worksheets/sheet1.xml', 'CNPJ', 'Faturamento anual', 'Padaria do Zé', 'Auto Peças Pistão'], 'Microsoft Excel 2007+') }),
          'notas_wagner.txt': arq('lembrar: levar carregador\nver vaga no concorrente (Lucro Real Assessoria)\nprimo paga 3 mil pela lista\n'),
          'folha_outubro.xlsx': bin('PK\x03\x04', ['xl/worksheets/sheet1.xml'], 'Microsoft Excel 2007+'),
        }),
        'Downloads': pasta({ 'LimpaDisco64.exe': bin('MZ\x90\x00', ['LimpaDisco 64 bits', 'Apaga rastros com segurança militar (não apaga)', 'Prefetch', 'RecentDocs'], 'PE32+ executable (GUI) x86-64, for MS Windows'), 'DARF_setembro.pdf': bin('%PDF-1.7\n', ['DARF'], 'PDF document, version 1.7') }),
        'Pictures': pasta({ 'meme_contador.png': bin('\x89PNG\r\n', ['IHDR'], 'PNG image data, 800 x 600, 8-bit/color RGBA') }),
        'AppData': pasta({ 'Roaming': pasta({ 'Microsoft': pasta({ 'Windows': pasta({ 'Recent': pasta(lnks()) }) }) }) }),
      }),
      'dirce': pasta({ 'Documents': pasta({ 'fotos_neto_formatura': pasta({}) }) }),
      'Public': pasta({}),
    }),
  });
}

export const caso01: Caso = {
  id: 'c01',
  numero: 1,
  titulo: 'Contabilidade Criativa',
  subtitulo: 'A planilha de clientes sumiu junto com o estagiário. O "limpador" que ele rodou não limpou nada.',
  modulo: 'Análise de dados de sistemas operacionais (Windows)',
  dificuldade: 2,
  resumo: 'O escritório Dinheiro Certo Contabilidade demitiu o estagiário de TI, Wagner, na manhã de 30/10/2026. Dias depois, clientes começaram a receber propostas de um concorrente com os próprios números de faturamento. A suspeita é que a planilha de clientes saiu num pendrive na véspera.',
  canal: 'zap',
  chamado: [
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Bom dia. Tem um caso de vazamento numa contabilidade no Batel. Inquérito por violação de segredo profissional e concorrência desleal.', hora: '08:02' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O computador do estagiário ainda está LIGADO e bloqueado desde a demissão. A dona não deixou ninguém mexer, milagre.', hora: '08:02' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O suporte terceirizado disse que as máquinas têm "aquele negócio de criptografia do Windows". Pensa bem antes de puxar o cabo.', hora: '08:03' },
    { de: 'Você', texto: 'Entendido. BitLocker. Vou com o kit de resposta.', hora: '08:05', eu: true },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'E tem um gato no escritório. Não apreenda o gato.', hora: '08:05' },
  ],
  oficio: ['Delegacia de Crimes Cibernéticos. IP nº 2026.0402.', 'Requisita exame no computador utilizado pelo investigado, na sede da empresa, com preservação de vestígios de dispositivos removíveis e de eventual destruição de dados.'],
  quesitos: [
    { id: 'q1', texto: 'Qual o número de série do dispositivo USB de armazenamento conectado na noite anterior à demissão e associado à letra E:?', formato: 'número de série (como no registro, sem o &0)', tipo: 'texto', respostas: [SERIAL], explicacao: `O SYSTEM guarda em USBSTOR cada dispositivo conectado; a última escrita da chave do Pendrivix Turbo 3.0 é 30/10 01:58 UTC (29/10 22:58 em Brasília). O MountedDevices liga a letra E: a esse mesmo dispositivo. O serial é o trecho antes do &0: ${SERIAL}. Não confunda com o serial do VOLUME (3C1A-77F0) que aparece no .lnk: esse muda se formatar.`, prejudicado: (f) => !f.has('chave_bitlocker') || f.has('nao_coletou_pc') },
    { id: 'q2', texto: 'Qual planilha foi aberta a partir do dispositivo removível?', formato: 'nome do arquivo com extensão', tipo: 'texto', respostas: ['clientes_faturamento_2026.xlsx'], explicacao: 'Os atalhos em Recent (.lnk) apontam para E:\\backup_wagner\\clientes_faturamento_2026.xlsx, volume do tipo removível. O RecentDocs e o TypedPaths (E:\\backup_wagner) confirmam.', prejudicado: (f) => !f.has('chave_bitlocker') || f.has('nao_coletou_pc') },
    { id: 'q3', texto: 'Foi executado algum programa de limpeza de rastros? Qual o nome do executável?', formato: 'nome do executável', tipo: 'texto', respostas: ['LIMPADISCO64.EXE', 'LimpaDisco64.exe'], explicacao: 'O Prefetch LIMPADISCO64.EXE-7C2E91AF.pf prova execução (3 vezes). No UserAssist ele aparece em ROT13 como P:\\Hfref\\jntare\\Qbjaybnqf\\YvzcnQvfpb64.rkr. A ironia: o limpador deixou o próprio Prefetch.', prejudicado: (f) => !f.has('chave_bitlocker') || f.has('nao_coletou_pc') },
    { id: 'q4', texto: 'Quando o programa de limpeza foi executado pela última vez? Responda no horário de Brasília.', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-10-29 23:41'], explicacao: 'O Prefetch mostra Last run 2026-10-30 02:41:17 UTC. O UserAssist traz o mesmo instante em FILETIME (conv filetime). Brasília é UTC-3: 29/10/2026 às 23:41. Repare que a data muda de dia na conversão: armadilha clássica.', prejudicado: (f) => !f.has('chave_bitlocker') || f.has('nao_coletou_pc') },
    { id: 'q5', texto: 'Há indício de alteração de carimbos de tempo (timestomping) em arquivo do usuário? Qual?', formato: 'nome do arquivo', tipo: 'texto', respostas: ['notas_wagner.txt'], explicacao: 'Na $MFT, notas_wagner.txt tem $STANDARD_INFORMATION (0x10) criado em 2019, mas $FILE_NAME (0x30) criado em 30/10/2026 02:20 UTC. O 0x10 é alterável por programa; o 0x30 só o kernel mexe. 0x10 anterior a 0x30 é a assinatura clássica de timestomping.', prejudicado: (f) => !f.has('chave_bitlocker') || f.has('nao_coletou_pc') },
  ],
  cena: {
    local: 'Dinheiro Certo Contabilidade, sala 3',
    largura: 7,
    profundidade: 6,
    piso: '#ffffff',
    parede: '#e8e4dc',
    pisoTex: 'laminate_floor_02',
    pisoEscala: 2,
    paredeTex: 'plastered_wall_02',
    luz: 'fluor',
    inicio: [3.5, 5.2, 0],
    saida: [6.4, 5.5],
    moveis: [
      { tipo: 'glb', glb: 'metal_office_desk', pos: [2.0, 0, 1.2] },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [2.0, 0, 1.95], rot: Math.PI, escala: 0.85 },
      { tipo: 'glb', glb: 'metal_office_desk', pos: [5.3, 0, 1.2] },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [5.3, 0, 1.95], rot: Math.PI, escala: 0.85 },
      { tipo: 'glb', glb: 'wooden_bookshelf_worn', pos: [0.32, 0, 3.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'drawer_cabinet', pos: [6.72, 0, 3.4], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [0.5, 0, 5.2], rot: 0.2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [0.55, 0.34, 5.25], rot: -0.3 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [1.05, 0, 5.4], rot: 1.2 },
      { tipo: 'glb', glb: 'CoffeeCart_01', pos: [3.6, 0, 0.55], escala: 0.8 },
      { tipo: 'glb', glb: 'potted_plant_02', pos: [6.5, 0, 0.4] },
      { tipo: 'glb', glb: 'potted_plant_04', pos: [5.9, 0.79, 0.95], solido: false },
      { tipo: 'glb', glb: 'wall_clock', pos: [3.6, 2.2, 0.03], solido: false },
      { tipo: 'glb', glb: 'fancy_picture_frame_01', pos: [1.2, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_03', pos: [6.97, 1.6, 2.0], rot: -Math.PI / 2, solido: false },
      { tipo: 'glb', glb: 'trashbag', pos: [1.0, 0, 0.45] },
      { tipo: 'glb', glb: 'office_notepads#0', pos: [5.6, 0.79, 1.3], solido: false },
      { tipo: 'glb', glb: 'desk_lamp_arm_01', pos: [4.6, 0.79, 0.9], solido: false },
      { tipo: 'janela', pos: [5.3, 1.0, 0.02], tam: [1.6, 1.1, 0] },
      { tipo: 'porta', pos: [6.4, 0, 5.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'pc', modelo: 'desktop', pos: [1.25, 0, 1.25], relevante: true,
        nome: 'Gabinete do computador CONTAB-07 (do Wagner)',
        descricao: 'Desktop ligado, ventoinha roncando, LED de disco piscando de vez em quando. A tela mostra o usuário "wagner" bloqueado. Um adesivo do suporte diz: "Disco protegido. Não desligar sem falar com o Rogério".',
        detalhes: ['Etiqueta de patrimônio: DC-0007', 'Adesivo: "BitLocker ativo, chave com o suporte"', 'Portas USB frontais: 2, vazias'],
        acoes: [
          { id: 'ram', rotulo: 'Capturar a memória RAM com o pendrive de resposta (Volátil Coletor)', toca: true, unica: true, flags: ['ram_capturada'], integridade: 2, texto: 'RAM capturada para mídia estéril, com hash registrado. Não era o foco dos quesitos, mas com a máquina ligada e disco criptografado, RAM primeiro é boa prática: a chave do BitLocker mora na memória enquanto o volume está montado.' },
          { id: 'bitlocker', rotulo: 'Verificar a criptografia do disco antes de desligar', unica: true, flags: ['viu_bitlocker'], texto: 'Pela tela de bloqueio dá para ver o cadeado do BitLocker no ícone da unidade, e o adesivo confirma. Se desligar sem a chave de recuperação, o disco vira um tijolo de dados embaralhados. Fale com o suporte.' },
          { id: 'menu', rotulo: 'Desligar pelo menu (com a senha do post-it)', toca: true, unica: true, integridade: -10, flags: ['desligou_menu', 'usou_senha_postit'], texto: 'Você logou com a senha do post-it (acesso que ninguém autorizou) e desligou pelo menu. O Windows rodou tarefas de encerramento, atualizou registros, limpou o arquivo de paginação. Desligamento "educado" altera a máquina. Em perícia, ou se faz coleta ao vivo planejada, ou se tira da energia.' },
          { id: 'cabo', rotulo: 'Desligar puxando o cabo da energia', toca: true, unica: true, flags: ['puxou_cabo'], texto: 'Cabo puxado. Estado do disco congelado como estava. Agora é com a chave de recuperação, se você pegou.', requer: [] },
          { id: 'chave', rotulo: 'Pedir ao Rogério a chave de recuperação do BitLocker e registrar no auto', unica: true, requer: ['viu_bitlocker'], flags: ['chave_bitlocker'], integridade: 3, texto: 'O Rogério achou o e-mail de 2024. Chave de recuperação de 48 dígitos anotada no auto de coleta, com o ID do protetor. Agora o disco pode ser desligado sem virar tijolo.' },
          { id: 'coletar', rotulo: 'Coletar o gabinete', toca: true, requer: ['chave_bitlocker'], coleta: { rotulo: 'Gabinete desktop CONTAB-07, patrimônio DC-0007', embalagens: ['antiestatico', 'caixa'], dispositivo: 'pc' }, texto: 'Gabinete coletado e lacrado, chave de recuperação registrada. Disco íntegro até a aquisição no laboratório.' },
          { id: 'coletar_sem', rotulo: 'Coletar o gabinete', toca: true, bloqueiaSe: ['chave_bitlocker'], flags: ['sem_chave_bitlocker'], integridade: -15, coleta: { rotulo: 'Gabinete desktop CONTAB-07, patrimônio DC-0007', embalagens: ['antiestatico', 'caixa'], dispositivo: 'pc' }, texto: 'Gabinete coletado. Sem a chave de recuperação do BitLocker registrada, torça para alguém lembrar do e-mail de 2024.' },
        ],
      },
      { id: 'monitor', modelo: 'monitor', pos: [2.0, 0.79, 1.0], tela: ['#CONTAB-07', 'wagner', 'Bloqueado desde 30/10 08:12', '🔒 BitLocker'], nome: 'Monitor e teclado do Wagner', descricao: 'Tela de bloqueio com o usuário wagner. Ao lado do teclado, um adesivo de "Keep calm and Ctrl+Z".', acoes: [] },
      { id: 'postit', modelo: 'postit', pos: [2.55, 0.79, 1.35], nome: 'Post-it colado na borda do monitor', descricao: 'Escrito: "C@rlos1971!". Senha do Windows do Wagner, provavelmente. Usar sem autorização judicial específica é pedir para a defesa falar em prova ilícita.', acoes: [{ id: 'fotografar_senha', rotulo: 'Registrar o post-it no relatório (sem usar a senha)', unica: true, integridade: 1, texto: 'Registrado e fotografado. Se for preciso usar, a autoridade pede autorização. Perita(o) não sai digitando senha alheia.' }] },
      { id: 'gato', modelo: 'gato', pos: [5.6, 0.79, 1.05], rot: 2, nome: 'Débito, o gato do escritório', descricao: 'Um gato laranja deitado em cima do teclado da Dona Dirce. É por causa dele que aquela máquina nunca entra em suspensão. Não é evidência. É chefe.', acoes: [{ id: 'carinho', rotulo: 'Fazer carinho', unica: true, texto: 'Débito ronronou e digitou "ggggggggggggg" na planilha da Dona Dirce. Você não viu nada.' }, { id: 'apreender', rotulo: 'Apreender o gato', unica: true, credibilidade: -5, texto: 'A Dra. Ivone avisou. O gato arranhou você, a Dona Dirce chorou e o auto de apreensão agora tem um item "felino, laranja, mal-humorado".' }] },
      { id: 'hd', modelo: 'hd', pos: [6.2, 0.79, 1.4], nome: 'HD externo "BACKUP 2019"', descricao: 'HD externo na mesa da Dona Dirce, escrito à caneta "BACKUP 2019 NÃO MEXER". Está empoeirado. Não aparece conectado no computador do Wagner desde fevereiro.', acoes: [{ id: 'coletar', rotulo: 'Coletar também', toca: true, credibilidade: -3, coleta: { rotulo: 'HD externo "BACKUP 2019"', embalagens: ['antiestatico'] }, texto: 'Coletado. Tem 1 TB de backup de 2019 e fotos do aniversário da Dona Dirce. Não tem nada a ver com os quesitos e vai ocupar o storage por anos.' }] },
      { id: 'notebook', modelo: 'notebook', pos: [5.1, 0.79, 1.15], rot: 0.2, tela: ['#Sistema Contábil', 'Fechamento de outubro', '87%'], nome: 'Notebook da Dona Dirce', descricao: 'Fechando o mês de outubro. Desligar agora custaria uma multa da Receita para 40 clientes. Não é evidência.', acoes: [] },
      { id: 'roteador', modelo: 'roteador', pos: [6.55, 1.35, 3.4], nome: 'Roteador Wi-Fi', descricao: 'Os logs dele só guardam 24 horas e já foram sobrescritos há semanas. Sem utilidade aqui.', acoes: [] },
      { id: 'impressora', modelo: 'impressora', pos: [3.6, 0.92, 0.55], nome: 'Multifuncional em cima do carrinho', descricao: 'Imprime, digitaliza, xeroca e trava. Tem 312 páginas na fila desde março.', acoes: [] },
      { id: 'caneca', modelo: 'caneca', pos: [1.6, 0.79, 0.95], nome: 'Caneca "Contador não erra, ajusta"', descricao: 'Do Wagner. Café de 30/10, agora um ecossistema.', acoes: [] },
    ],
    pessoas: [
      { id: 'dirce', nome: 'Dona Dirce', papel: 'dona do escritório', modelo: 'dirce', pos: [4.4, 3.3], rot: 2.6, falas: ['Ninguém encostou no computador dele, eu juro. Só o gato.', 'Ele era um amor de menino. Até descobrir quanto o concorrente pagava.', 'A senha? Deve estar no post-it, ele nunca decorou nada.'] },
      { id: 'rogerio', nome: 'Rogério', papel: 'suporte de TI terceirizado', modelo: 'rogerio', pos: [3.2, 2.6], rot: -2.4, falas: ['Todas as máquinas têm BitLocker. Eu tenho as chaves de recuperação num e-mail de 2024.', 'Se você desligar sem a chave, eu não consigo te ajudar. Ninguém consegue.', 'O Wagner sabia mais de Windows do que eu. Ele que me ensinou a usar o Prefetch. Ops.'], reage: [{ flag: 'viu_bitlocker', fala: 'É, é BitLocker. Quer a chave de recuperação? Peraí que eu acho o e-mail.' }] },
      { id: 'marlene', nome: 'Marlene', papel: 'contadora sênior', modelo: 'marlene', pos: [1.2, 3.9], rot: 1.2, falas: ['O Wagner ficou até tarde no dia 29. Disse que ia "organizar os arquivos".', 'Ele vivia ouvindo podcast de crime real. Achava que sabia apagar rastro.', 'Eu não sei de nada. Mas se souber, conto tudo.'] },
    ],
  },
  lab: (c) => {
    const temChave = c.flags.has('chave_bitlocker');
    const pc: Dispositivo = {
      id: 'pc', dev: '/dev/sdb', rotulo: 'SSD 512 GB do gabinete CONTAB-07', tipo: 'disco', tamanho: '476.9G', semente: 7101,
      cifrado: temChave ? undefined : 'Volume protegido por BitLocker e nenhuma chave de recuperação foi registrada. Sem a chave (ou a RAM com a chave, que não foi analisada), os dados são irrecuperáveis. Registre os quesitos como prejudicados.',
      conteudo: discoWindows(),
    };
    return {
      dispositivos: [pc],
      boasVindas: [
        'Caso: vazamento de planilha na Dinheiro Certo Contabilidade.',
        'Material: SSD do gabinete CONTAB-07, ligado à estação como /dev/sdb.',
        temChave ? 'Chave de recuperação do BitLocker registrada na custódia: 418902-551033-... (a estação já desbloqueia ao montar).' : 'ATENÇÃO: não há chave de recuperação do BitLocker registrada.',
        '',
        'Dicas de caminho:',
        '  Windows/System32/config/SYSTEM     (USBSTOR, MountedDevices)  regripador -r SYSTEM -p usbstor',
        '  Users/wagner/NTUSER.DAT            (UserAssist em ROT13, RecentDocs)',
        '  Users/wagner/AppData/Roaming/Microsoft/Windows/Recent   (.lnk)  lnkeco -d',
        '  Windows/Prefetch                   (execução)  pfeco -d',
        '  $MFT                               (timestomping)  mfteco -f \'$MFT\' --csv ~/mft.csv',
      ],
    };
  },
  metodologia: [
    { texto: 'Verificou-se a existência de criptografia de disco antes do desligamento e obteve-se a chave de recuperação com o responsável pela TI.', certo: true },
    { texto: 'O equipamento foi desligado por interrupção da energia, preservando o estado do disco.', certo: true },
    { texto: 'A aquisição foi feita com bloqueador de escrita e verificada por hash SHA-256.', certo: true },
    { texto: 'Foram analisados os hives SYSTEM e NTUSER.DAT, os arquivos Prefetch, os atalhos LNK e a $MFT.', certo: true },
    { texto: 'Os horários foram convertidos de UTC para o horário de Brasília (UTC-3), com indicação do fuso.', certo: true },
    { texto: 'O perito acessou a conta do investigado com a senha encontrada no post-it para agilizar a análise.', certo: false },
    { texto: 'Foi executado antivírus no disco original para remover ameaças antes da análise.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', se: ['usou_senha_postit'], pergunta: 'Vossa Senhoria usou a senha do meu cliente, achada num post-it, para entrar na conta dele. Com que autorização?', opcoes: [
      { texto: 'Nenhuma específica. Foi um erro, e o laudo informa o que esse acesso alterou.', certa: true, reacao: 'A juíza anota. A transparência evita o pior, mas a defesa vai pedir a exclusão desse trecho.' },
      { texto: 'A senha estava à vista, então era pública.', certa: false, reacao: 'A juíza ergue as sobrancelhas. "Pública" não é a palavra que o Código usa para isso.' },
    ] },
    { quem: 'defesa', se: ['desligou_menu'], pergunta: 'O desligamento pelo menu não alterou dezenas de arquivos do sistema? Como confiar no resto?', opcoes: [
      { texto: 'Alterou arquivos de sistema e eu documentei. Os artefatos analisados (USBSTOR, LNK, Prefetch, $MFT) têm datas anteriores e não foram afetados pelo encerramento.', certa: true, reacao: 'Explicação técnica, específica e honesta. A defesa recua um passo.' },
      { texto: 'Desligar pelo menu é o jeito certo, todo mundo faz.', certa: false, reacao: 'Todo mundo faz em casa. Em perícia, não. A defesa sorri.' },
    ] },
    { quem: 'defesa', pergunta: 'O número de série que o senhor(a) aponta pode ser de qualquer pendrive. Meu cliente tinha vários!', opcoes: [
      { texto: 'É o serial do dispositivo que o Windows registrou em USBSTOR, com última escrita às 22h58 de 29/10, ligado à letra E: no MountedDevices. Os atalhos LNK mostram a planilha aberta de E: minutos depois. Basta comparar com o pendrive apreendido com ele.', certa: true, reacao: 'O promotor pede para constar. A defesa pede um copo d\'água.' },
      { texto: 'Pode ser, mas é bem provável que seja esse.', certa: false, reacao: '"Bem provável" é música para a defesa.' },
    ] },
    { quem: 'juiza', pergunta: 'O Prefetch diz 30 de outubro. O laudo diz 29. Qual é?', opcoes: [
      { texto: 'O mesmo instante: 02h41 UTC do dia 30 são 23h41 do dia 29 em Brasília. O Windows grava em UTC; o laudo informa os dois.', certa: true, reacao: 'A juíza agradece. A data da demissão é 30 de manhã, então tudo aconteceu na véspera, como diz a denúncia.' },
      { texto: 'Arredondei para o dia anterior.', certa: false, reacao: 'Arredondar datas em laudo. A defesa já está escrevendo o recurso.' },
    ] },
    { quem: 'defesa', pergunta: 'O arquivo notas_wagner.txt é de 2019, está na data dele. Que adulteração é essa?', opcoes: [
      { texto: 'A data de 2019 está só no $STANDARD_INFORMATION, que programas conseguem alterar. O $FILE_NAME, mantido pelo sistema, registra criação em 30/10/2026. A data de 2019 foi forjada.', certa: true, reacao: 'Silêncio na sala. O cliente da defesa olha para os sapatos.' },
      { texto: 'O Windows às vezes erra as datas.', certa: false, reacao: 'Você acabou de entregar à defesa o argumento de que nenhuma data do laudo é confiável.' },
    ] },
  ],
  dicas: [
    'Primeiro de tudo\n`bloqueador on`, `lsblk`, `imajador adquirir /dev/sdb CONTAB07.E01`, `imajador montar /evidencias/CONTAB07.E01`.',
    'Serial do pendrive\n`regripador -r /mnt/CONTAB07/Windows/System32/config/SYSTEM -p usbstor` mostra os dispositivos e o LastWrite de cada um. `-p mountdev` liga as letras de unidade aos dispositivos.',
    'Que planilha?\n`lnkeco -d /mnt/CONTAB07/Users/wagner/AppData/Roaming/Microsoft/Windows/Recent`. Procure alvo em E:.',
    'Programa de limpeza\n`pfeco -d /mnt/CONTAB07/Windows/Prefetch | grep -i -A 4 "Executable name"`. Ou o UserAssist: `regripador -r NTUSER.DAT -k "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist"` e `conv rot13`.',
    'Fuso\nPrefetch e $MFT estão em UTC. `conv fuso "2026-10-30 02:41:17" -3`. FILETIME do UserAssist: `conv filetime 0x...`.',
    'Timestomping\n`mfteco -f \'/mnt/CONTAB07/$MFT\' --csv ~/mft.csv` e `grep -i wagner\\\\Documents ~/mft.csv`. Compare Created0x10 com Created0x30.',
  ],
  falhas: {
    desligou_menu: 'O computador foi desligado pelo menu, alterando arquivos de sistema.',
    usou_senha_postit: 'A conta do investigado foi acessada com a senha do post-it, sem autorização.',
    aquisicao_sem_bloqueador: 'Aquisição sem bloqueador de escrita: o hash de verificação não bateu.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_pc: 'Gabinete acondicionado em embalagem inadequada.',
    nao_coletou_pc: 'O computador do investigado não foi coletado.',
    sem_chave_bitlocker: 'O disco criptografado foi desligado sem a chave de recuperação: dados perdidos.',
  },
};
