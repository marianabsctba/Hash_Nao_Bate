// Ferramentas periciais. Os nomes são paródia; as técnicas são de verdade.
import { COMANDOS, HOME, caminho, cor, hexdump, opcoes, pegarArq, pegarNo, podeGravar, registrar } from './shell';
import type { Ctx, Dispositivo } from './shell';
import { achar, andar, arq, bytesDe, esp, gravar, pasta, textoDe } from './vfs';
import type { Arquivo, Especial, No, Pacote, Pasta } from './vfs';
import { Rng } from './rng';
import { md5, sha1, sha256 } from './hash';
import * as T from './tempo';
import { executar, formatar } from './sql';
import { jq } from './jq';

const enc = new TextEncoder();
type Esp<K extends Especial['tipo']> = Extract<Especial, { tipo: K }>;
function especial<K extends Especial['tipo']>(ctx: Ctx, p: string, tipo: K, nomeFmt: string): Esp<K> {
  const a = pegarArq(ctx, p);
  if (a.especial?.tipo !== tipo) throw new Error(`${p}: não parece ser ${nomeFmt}. Confira com o comando file.`);
  return a.especial as Esp<K>;
}
function gravarSaida(ctx: Ctx, p: string, conteudo: string): string {
  const alvo = caminho(ctx, p);
  if (!podeGravar(alvo)) throw new Error(`${alvo}: Sistema de arquivos somente leitura. Grave na sua pasta (${HOME}).`);
  gravar(ctx.raiz, alvo, arq(conteudo));
  return alvo;
}

// ---------- dados do disco (determinísticos) ----------
const memoDados = new Map<string, Uint8Array>();
function dadosDispositivo(d: Dispositivo, adulterado: boolean): Uint8Array {
  const k = `${d.id}:${adulterado}`;
  if (memoDados.has(k)) return memoDados.get(k)!;
  const r = new Rng(d.semente);
  const b = new Uint8Array(65536);
  for (let i = 0; i < b.length; i++) b[i] = r.int(0, 255);
  b.set(enc.encode(`VOLUME ${d.rotulo.toUpperCase()}`), 0x2b);
  if (adulterado) {
    // o sistema operacional "só" escreveu um System Volume Information e atualizou o último acesso. Só isso. Só.
    b.set(enc.encode('System Volume Information\\IndexerVolumeGuid'), 0x8000);
    b[0x4010] ^= 0xff;
  }
  memoDados.set(k, b);
  return b;
}
const imagens = new WeakMap<Arquivo, Dispositivo>();
function hashes(b: Uint8Array) {
  return { md5: md5(b), sha1: sha1(b), sha256: sha256(b) };
}
function achaDispositivo(ctx: Ctx, ref: string): Dispositivo {
  const d = ctx.dispositivos.find((x) => x.dev === ref || x.id === ref || x.lacre === ref);
  if (!d) throw new Error(`${ref}: dispositivo não encontrado. Veja lsblk (discos) ou celebrita listar (celulares).`);
  return d;
}

registrar('bloqueador', {
  resumo: 'liga/desliga o bloqueador de escrita Trava-Bit T8',
  uso: 'bloqueador on | off | status',
  nota: 'Sem bloqueador, o sistema operacional da estação escreve no disco suspeito (indexação, lixeira, último acesso). A prova muda e o hash não bate. Liga ANTES de conectar.',
}, (args, _e, ctx) => {
  const a = args[0] ?? 'status';
  if (a === 'on') { ctx.bloqueador = true; ctx.evento('bloqueador', { ligado: true }); return cor.verde('Trava-Bit T8: PROTEÇÃO DE ESCRITA ATIVA. LED vermelho aceso (o bom vermelho).'); }
  if (a === 'off') { ctx.bloqueador = false; ctx.evento('bloqueador', { ligado: false }); return cor.amar('Trava-Bit T8: proteção DESLIGADA. Se tiver evidência conectada, reze.'); }
  return ctx.bloqueador ? cor.verde('Trava-Bit T8: proteção de escrita ATIVA') : cor.amar('Trava-Bit T8: proteção de escrita DESLIGADA');
});

registrar('lsblk', { resumo: 'lista discos conectados', uso: 'lsblk' }, (_a, _e, ctx) => {
  const ds = ctx.dispositivos.filter((d) => d.tipo === 'disco');
  if (!ds.length) return 'Nenhum disco de evidência conectado. (O sda é a estação, não mexa.)';
  const l = ['NAME     SIZE    RO  TYPE  MODELO / LACRE', 'sda      1.8T     0  disk  estação pericial (não é evidência)'];
  for (const d of ds) l.push(`${d.dev.replace('/dev/', '').padEnd(8)} ${d.tamanho.padEnd(7)} ${ctx.bloqueador ? ' 1' : ' 0'}  disk  ${d.rotulo}${d.lacre ? `  [${d.lacre}]` : ''}`);
  return l.join('\n');
});

registrar('imajador', {
  resumo: 'Imajador FKT: aquisição forense de disco, verificação e montagem',
  uso: 'imajador adquirir <dispositivo> <saída.E01|saída.dd>\n  imajador verificar <imagem>\n  imajador montar <imagem>',
  exemplos: ['bloqueador on', 'lsblk', 'imajador adquirir /dev/sdb LACRE-0001.E01', 'imajador montar /evidencias/LACRE-0001.E01'],
  nota: 'A imagem vai para o storage de evidências (/evidencias). O hash de aquisição é do CONTEÚDO do disco. No formato E01 o arquivo é um contêiner (com compressão e metadados), então o sha256sum do .E01 não é igual ao hash de aquisição: para conferir, use imajador verificar. No .dd (bruto) os dois batem.',
}, (args, _e, ctx) => {
  const [sub, a1, a2] = args;
  if (sub === 'adquirir') {
    if (!a1 || !a2) throw new Error('uso: imajador adquirir <dispositivo> <saída.E01>');
    const d = achaDispositivo(ctx, a1);
    if (d.tipo !== 'disco') throw new Error(`${a1} é ${d.tipo}. Celular se extrai com celebrita.`);
    const nome = a2.split('/').pop()!;
    const bruto = /\.(dd|raw|img|001)$/i.test(nome);
    if (!bruto && !/\.E01$/i.test(nome)) throw new Error('formato de saída: use .E01 (contêiner pericial) ou .dd (bruto)');
    const adulterado = !ctx.bloqueador;
    const original = dadosDispositivo(d, false);
    const lido = dadosDispositivo(d, adulterado);
    const hAq = hashes(lido);
    // verificação relê o disco depois: sem bloqueador, o Windows da estação já mexeu de novo
    const hVer = adulterado ? hashes(dadosDispositivo({ ...d, semente: d.semente + 1, id: d.id + '-v' }, true)) : hAq;
    const conteudo = bruto ? lido : new Uint8Array([...enc.encode('EVF\x09\x0d\x0a\xff\x00'), 1, 1, 0, ...lido.slice(0, 2048).map((x) => x ^ 0x5a), ...enc.encode(`header2 caso perito ${d.lacre ?? d.id}`)]);
    const img: Arquivo = { tipo: 'arq', especial: { tipo: 'binario', magia: [], texto: [], formato: bruto ? 'DOS/MBR boot sector; partition 1 : ID=0x7, start-CHS (0x0,32,33), startsector 2048' : 'EWF/Expert Witness/EnCase image file format' }, _cache: conteudo, tam: bruto ? 65536 : 31337, mtime: new Date(Date.UTC(2026, 10, 22, 14, 0)) };
    imagens.set(img, d);
    gravar(ctx.raiz, `/evidencias/${nome}`, img);
    const log = [
      'Imajador FKT 4.7.1.2 (versão que a TI deixou instalar)',
      `Caso: ${ctx.host}   Examinador: ${ctx.usuario}`,
      `Origem: ${d.dev} | ${d.rotulo}${d.lacre ? ` | lacre ${d.lacre}` : ''}`,
      `Tamanho: ${d.tamanho}   Setores: ${Math.round(parseFloat(d.tamanho) * 2097152)}`,
      `Bloqueador de escrita: ${ctx.bloqueador ? 'SIM (Trava-Bit T8)' : 'NÃO'}`,
      `Início: 2026-11-22 14:00:03 UTC   Fim: 2026-11-22 14:41:52 UTC`,
      '',
      '[Hashes calculados na aquisição]',
      `MD5:     ${hAq.md5}`,
      `SHA1:    ${hAq.sha1}`,
      `SHA256:  ${hAq.sha256}`,
      '',
      '[Hashes da verificação (releitura da imagem contra a origem)]',
      `MD5:     ${hVer.md5}  ${hVer.md5 === hAq.md5 ? 'confere' : 'NÃO CONFERE'}`,
      `SHA1:    ${hVer.sha1}  ${hVer.sha1 === hAq.sha1 ? 'confere' : 'NÃO CONFERE'}`,
      `SHA256:  ${hVer.sha256}  ${hVer.sha256 === hAq.sha256 ? 'confere' : 'NÃO CONFERE'}`,
    ].join('\n');
    gravar(ctx.raiz, `/evidencias/${nome}.txt`, arq(log + '\n'));
    ctx.evento('aquisicao', { dispositivo: d.id, lacre: d.lacre, bloqueador: ctx.bloqueador, sha256: hAq.sha256, original: sha256(original), arquivo: `/evidencias/${nome}` });
    const barra = '[' + '#'.repeat(30) + '] 100%';
    let s = `Adquirindo ${d.dev} -> /evidencias/${nome}\n${barra}  (41 min e 49 s, o café esfriou)\n\n${log}`;
    if (adulterado) s += `\n\n${cor.verm(cor.neg('HASH NÃO BATE.'))}\n${cor.verm('O disco foi montado com escrita pela estação: o Windows indexou, criou System Volume Information e mexeu em data de acesso.')}\n${cor.verm('A defesa agradece. Ligue o bloqueador e adquira de novo (e explique tudo isso no laudo).')}`;
    else s += `\n\n${cor.verde('Hashes conferem. Imagem íntegra. Anote o SHA-256 na cadeia de custódia.')}`;
    return s;
  }
  if (sub === 'verificar') {
    if (!a1) throw new Error('uso: imajador verificar <imagem>');
    const a = pegarArq(ctx, a1);
    const d = imagens.get(a);
    if (!d) throw new Error(`${a1}: não é uma imagem gerada pelo Imajador nesta estação`);
    const log = textoDe(pegarArq(ctx, a1 + '.txt')) ?? '';
    const sha = log.match(/SHA256:\s+([0-9a-f]{64})/)?.[1];
    return `Verificando ${a1}...\nSHA256 registrado na aquisição: ${sha}\nSHA256 recalculado do conteúdo: ${sha}\n${cor.verde('Verificação OK: a imagem não mudou desde a aquisição.')}`;
  }
  if (sub === 'montar') {
    if (!a1) throw new Error('uso: imajador montar <imagem>');
    const a = pegarArq(ctx, a1);
    const d = imagens.get(a);
    if (!d) throw new Error(`${a1}: não é uma imagem gerada pelo Imajador nesta estação`);
    if (d.cifrado) { ctx.evento('cifrado', { dispositivo: d.id }); throw new Error(d.cifrado); }
    if (!d.conteudo) throw new Error('imagem sem sistema de arquivos reconhecível (tente formiga)');
    const ponto = `/mnt/${a1.split('/').pop()!.replace(/\.(E01|dd|raw|img|001)$/i, '')}`;
    gravar(ctx.raiz, ponto, d.conteudo());
    ctx.evento('montar', { dispositivo: d.id, ponto });
    return `Imagem montada em ${cor.ciano(ponto)} (somente leitura, como manda o figurino).\nArquivos apagados não aparecem aqui: para eles, use mfteco ou formiga.`;
  }
  throw new Error('subcomando: adquirir, verificar ou montar. Veja man imajador.');
});

registrar('formiga', {
  resumo: 'Formiga: recuperação de arquivos por assinatura (carving)',
  uso: 'formiga -i <imagem> -o <pasta de saída>',
  exemplos: ['formiga -i /evidencias/LACRE-0001.dd -o ~/recuperados'],
  nota: 'Carving ignora o sistema de arquivos e procura cabeçalhos (FF D8 FF de JPEG, %PDF, PK de ZIP/DOCX) direto nos setores. Recupera arquivo apagado, mas perde nome e data originais.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-i', '-o']);
  if (!o.valores.i || !o.valores.o) throw new Error('uso: formiga -i <imagem> -o <pasta>');
  const a = pegarArq(ctx, o.valores.i);
  const d = imagens.get(a);
  if (!d) throw new Error(`${o.valores.i}: use a imagem adquirida (o carving roda na imagem, nunca no original)`);
  const saida = caminho(ctx, o.valores.o);
  if (!podeGravar(saida)) throw new Error(`${saida}: somente leitura. Use uma pasta em ${HOME}.`);
  const r = new Rng(d.semente + 7);
  const linhas: string[] = ['Formiga 1.5.7 (carrega dez vezes o próprio peso)', `Arquivo: ${o.valores.i}`, 'Início: Sun Nov 22 14:50:11 2026', '', 'Num   Nome (bs=512)        Tamanho  Deslocamento'];
  const cont: Record<string, number> = {};
  (d.apagados ?? []).forEach((ap, i) => {
    const ext = ap.nome.split('.').pop()!.toLowerCase();
    const setor = String(r.int(100000, 9999999)).padStart(8, '0');
    const nome = `${setor}.${ext}`;
    const arqv = ap.arquivo();
    gravar(ctx.raiz, `${saida}/${ext}/${nome}`, arqv);
    cont[ext] = (cont[ext] ?? 0) + 1;
    linhas.push(`${String(i).padEnd(5)} ${nome.padEnd(20)} ${String(bytesDe(arqv).length).padStart(7)}  ${Number(setor) * 512}`);
  });
  linhas.push('', ...Object.entries(cont).map(([k, v]) => `${k}:= ${v}`), `${(d.apagados ?? []).length} ARQUIVOS EXTRAÍDOS`);
  gravar(ctx.raiz, `${saida}/audit.txt`, arq(linhas.join('\n') + '\n'));
  ctx.evento('carving', { dispositivo: d.id });
  return linhas.join('\n') + `\n\nResultado em ${cor.ciano(saida)}`;
});

registrar('celebrita', {
  resumo: 'Celebrita UFOD: extração de celulares (lógica, sistema de arquivos, física)',
  uso: 'celebrita listar\n  celebrita extrair <id> --logica | --fs | --fisica',
  exemplos: ['celebrita listar', 'celebrita extrair cel1 --fs'],
  nota: 'Lógica: o que o sistema deixa (backup, contatos, SMS). Sistema de arquivos (FFS): bancos dos apps, inclusive o que o backup não leva. Física: bit a bit, inclusive espaço não alocado, quando o aparelho permite (cada vez mais raro com criptografia). O estado do aparelho (ligado e já desbloqueado uma vez, AFU, ou recém-ligado, BFU) decide o que dá para tirar.',
}, (args, _e, ctx) => {
  const [sub, id] = args;
  const cels = ctx.dispositivos.filter((d) => d.tipo === 'android' || d.tipo === 'ios');
  if (sub === 'listar' || !sub) {
    if (!cels.length) return 'Nenhum aparelho conectado ao Celebrita. (O cabo é o original. Não, não tem outro.)';
    return cels.map((d) => `${cor.ciano(d.id.padEnd(6))} ${d.rotulo}${d.lacre ? `  [${d.lacre}]` : ''}\n${(d.info ?? []).map((l) => '       ' + l).join('\n')}`).join('\n\n');
  }
  if (sub === 'extrair') {
    if (!id) throw new Error('uso: celebrita extrair <id> --logica|--fs|--fisica');
    const d = achaDispositivo(ctx, id);
    if (d.tipo !== 'android' && d.tipo !== 'ios') throw new Error(`${id} não é celular`);
    const tipo = args.includes('--fisica') ? 'fisica' : args.includes('--fs') ? 'fs' : args.includes('--logica') ? 'logica' : null;
    if (!tipo) throw new Error('escolha o tipo: --logica, --fs ou --fisica');
    const fn = d.extracoes?.[tipo];
    if (!fn) {
      ctx.evento('extracao_falhou', { dispositivo: d.id, tipo });
      return cor.verm(`Extração ${tipo} indisponível: ${d.motivoSemExtracao?.[tipo] ?? 'o aparelho não suporta esse método.'}`);
    }
    const destino = `/evidencias/${d.lacre ?? d.id}_${tipo}`;
    gravar(ctx.raiz, destino, fn());
    const conteudo = dadosDispositivo({ ...d, semente: d.semente + tipo.length }, false);
    const h = sha256(conteudo);
    gravar(ctx.raiz, `${destino}.txt`, arq(`Celebrita UFOD 7.71\nAparelho: ${d.rotulo}\nTipo: ${tipo}\nSHA256 do pacote de extração: ${h}\n`));
    ctx.evento('extracao', { dispositivo: d.id, tipo, sha256: h });
    return `Conectando a ${d.rotulo}...\nConfiando no computador... (alguém precisou tocar em "Confiar"? torça para não ter sido o PM)\nExtraindo (${tipo})... [${'#'.repeat(30)}] 100%\nPacote: ${cor.ciano(destino)}\nSHA256: ${h}\n${cor.verde('Extração concluída. Rode leappinho na pasta para o índice de artefatos.')}`;
  }
  throw new Error('subcomando: listar ou extrair');
});

const ARTEFATOS: [RegExp, string][] = [
  [/msgstore\.db$/, 'Mensageiro Zapeia: mensagens (tabela message, chat, jid)'],
  [/wa\.db$/, 'Mensageiro Zapeia: contatos (wa_contacts)'],
  [/contacts2\.db$/, 'Android: agenda de contatos'],
  [/mmssms\.db$/, 'Android: SMS (tabela sms, date em milissegundos Unix)'],
  [/calllog\.db$/, 'Android: registro de chamadas'],
  [/History$/, 'Navegador base Chromium: histórico (urls, visits; tempo WebKit, microssegundos desde 1601)'],
  [/sms\.db$/, 'iOS: iMessage/SMS (message, handle; date em nanossegundos desde 2001)'],
  [/KnowledgeC\.db$/, 'iOS: uso do aparelho (ZOBJECT; ZSTARTDATE em segundos desde 2001)'],
  [/Photos\.sqlite$/, 'iOS: biblioteca de fotos (ZASSET; ZDATECREATED desde 2001, ZLATITUDE/ZLONGITUDE)'],
  [/CallHistory\.storedata$/, 'iOS: chamadas (ZCALLRECORD)'],
  [/Cache\.sqlite$/, 'iOS: localização (routined)'],
  [/DCIM\/.*\.(jpg|jpeg|heic)$/i, 'Foto da câmera (veja EXIF com exifeiro)'],
  [/\.pf$/i, 'Windows Prefetch (pfeco)'],
  [/NTUSER\.DAT$/i, 'Registro do usuário (regripador)'],
  [/(SYSTEM|SOFTWARE|SAM)$/, 'Registro do sistema (regripador)'],
  [/\$MFT$/, 'Tabela mestra do NTFS (mfteco)'],
  [/\.lnk$/i, 'Atalho do Windows (lnkeco)'],
  [/\.evtx$/i, 'Log de eventos do Windows (evtxeco)'],
  [/locations?\.json$|gps.*\.json$/i, 'Histórico de localização (jq)'],
];
registrar('leappinho', {
  resumo: 'LEAPPinho: índice dos artefatos de uma extração de celular ou pasta',
  uso: 'leappinho <pasta>',
  exemplos: ['leappinho /evidencias/LACRE-0002_fs'],
  nota: 'Ele aponta ONDE estão os artefatos. Tirar a conclusão continua sendo trabalho seu (e é por isso que pagam você, ou pelo menos prometem pagar).',
}, (args, _e, ctx) => {
  if (!args[0]) throw new Error('uso: leappinho <pasta>');
  const no = pegarNo(ctx, args[0]);
  const base = caminho(ctx, args[0]);
  const achados: string[] = [];
  for (const [p, n] of andar(no, base === '/' ? '' : base)) {
    if (n.tipo !== 'arq' || n.apagado) continue;
    const a = ARTEFATOS.find(([re]) => re.test(p));
    if (a) achados.push(`  ${cor.ciano(p)}\n      ${a[1]}`);
  }
  ctx.evento('leappinho', { pasta: base });
  if (!achados.length) return 'Nenhum artefato conhecido. Ou a extração veio vazia, ou a pasta está errada.';
  const lim = achados.slice(0, 40);
  return `LEAPPinho 2.0: ${achados.length} artefatos reconhecidos\n${lim.join('\n')}${achados.length > 40 ? `\n  ${cor.cinza(`(+${achados.length - 40} outros, a maioria fotos de bom dia)`)}` : ''}`;
});

registrar('sqlite3', {
  resumo: 'consulta banco SQLite',
  uso: 'sqlite3 [-header] [-column] [-csv] <banco> "<SQL>"\n  sqlite3 <banco> .tables\n  sqlite3 <banco> ".schema tabela"',
  exemplos: [
    'sqlite3 msgstore.db .tables',
    'sqlite3 -header -column mmssms.db "SELECT address, body FROM sms LIMIT 5"',
    "sqlite3 mmssms.db \"SELECT datetime(date/1000,'unixepoch','-3 hours'), body FROM sms WHERE body LIKE '%pix%'\"",
    "sqlite3 sms.db \"SELECT datetime(date/1000000000 + 978307200,'unixepoch') FROM message\"",
    "sqlite3 History \"SELECT datetime(last_visit_time/1000000 - 11644473600,'unixepoch'), url FROM urls\"",
  ],
  nota: 'Datas em banco vêm cruas: Unix (s ou ms), Mac/Cocoa (desde 2001, às vezes em ns), WebKit (µs desde 1601). Converta no próprio SELECT. O modificador localtime desta estação usa Brasília (UTC-3).',
}, (args, _e, ctx) => {
  const o = opcoes(args);
  const [db, ...resto] = o.resto;
  if (!db) throw new Error('uso: sqlite3 <banco> "<consulta>"');
  const e = especial(ctx, db, 'sqlite', 'banco SQLite');
  const q = resto.join(' ').trim();
  if (!q) throw new Error('o modo interativo foi desativado pela TI. Passe a consulta entre aspas.');
  if (q === '.tables') return Object.keys(e.tabelas).sort().join('  ');
  if (q.startsWith('.schema')) {
    const t = q.split(/\s+/)[1];
    return Object.entries(e.tabelas).filter(([n]) => !t || n.toLowerCase() === t.toLowerCase()).map(([n, tb]) => `CREATE TABLE ${n} (${tb.colunas.join(', ')});`).join('\n');
  }
  if (q.startsWith('.')) throw new Error(`comando ${q.split(' ')[0]} não suportado (use .tables ou .schema)`);
  if (!/^\s*select/i.test(q)) throw new Error('somente SELECT. Perito não faz UPDATE em evidência, nem de brincadeira.');
  const r = executar(e.tabelas, q);
  ctx.evento('sql', { banco: db, consulta: q });
  const modo = o.flags.has('column') ? 'column' : o.flags.has('csv') ? 'csv' : 'list';
  return formatar(r, modo, o.flags.has('header'));
});

registrar('jq', {
  resumo: 'filtra JSON (logs de nuvem, exportações de app)',
  uso: "jq [-r] [-c] '<filtro>' [arquivo]",
  exemplos: [
    "jq '.Records | length' trilha.json",
    "jq -c '.Records[] | select(.eventName==\"GetObject\") | {t:.eventTime, ip:.sourceIPAddress}' trilha.json",
    "jq -r '.Records[].sourceIPAddress' trilha.json | sort | uniq -c | sort -nr",
  ],
}, (args, entrada, ctx) => {
  const o = opcoes(args);
  const [filtro, arqv] = o.resto;
  if (filtro === undefined) throw new Error("uso: jq '<filtro>' [arquivo]");
  const txt = arqv ? textoDe(pegarArq(ctx, arqv)) ?? '' : entrada ?? '';
  return jq(filtro, txt, o.flags.has('r'), o.flags.has('c'));
});

registrar('exifeiro', {
  resumo: 'Exifeiro: metadados de foto e vídeo (EXIF, GPS, câmera)',
  uso: 'exifeiro <arquivo...>',
  exemplos: ['exifeiro DCIM/IMG_2041.jpg', 'exifeiro *.jpg | grep -i gps'],
  nota: 'GPS no EXIF vem em graus, minutos e segundos com referência (N/S, E/W). Sul e Oeste são negativos em graus decimais. Para converter: conv dms "25 deg 25\' 44.60\\" S".',
}, (args, _e, ctx) => args.map((p) => {
  const a = pegarArq(ctx, p);
  const e = a.especial;
  let meta: Record<string, string>;
  if (e?.tipo === 'jpeg') meta = e.exif;
  else if (e?.tipo === 'binario' && e.meta) meta = e.meta;
  else meta = {};
  const base: Record<string, string> = { 'File Name': p.split('/').pop()!, 'File Size': `${bytesDe(a).length} bytes`, 'File Type': e?.tipo === 'jpeg' ? 'JPEG' : (e?.tipo === 'binario' && e.formato) || 'desconhecido' };
  const tudo = { ...base, ...meta };
  return (args.length > 1 ? `======== ${p}\n` : '') + Object.entries(tudo).map(([k, v]) => `${k.padEnd(32)}: ${v}`).join('\n');
}).join('\n'));

registrar('ver', {
  resumo: 'abre a imagem no visualizador da estação (descreve o que aparece)',
  uso: 'ver <imagem.jpg>',
  nota: 'Olhar a imagem é obrigatório antes de concluir qualquer coisa sobre ela. Metadado sem conteúdo é meia prova.',
}, (args, _e, ctx) => args.map((p) => {
  const a = pegarArq(ctx, p);
  if (a.especial?.tipo !== 'jpeg') throw new Error(`${p}: não é imagem que o visualizador abra`);
  ctx.evento('ver', { arquivo: p });
  return `[${p.split('/').pop()}] ${a.especial.legenda}`;
}).join('\n'));

// ---------- conversor ----------
function linhaData(rotulo: string, d: Date): string {
  if (isNaN(d.getTime())) return `${rotulo}: valor fora de faixa (formato errado?)`;
  return `${rotulo}\n  UTC:      ${T.fmt(d)}\n  Brasília: ${T.fmt(d, -3)} (UTC-3)`;
}
registrar('conv', {
  resumo: 'conversor do perito: datas, little-endian, hex, base64, ROT13, GPS',
  uso: [
    'conv unix <n>        segundos (ou milissegundos) desde 1970',
    'conv filetime <n>    Windows FILETIME: 100 ns desde 1601 (decimal ou 0x...)',
    'conv webkit <n>      Chrome/WebKit: microssegundos desde 1601',
    'conv mac <n>         Mac/Cocoa Absolute Time: segundos (ou ns) desde 2001',
    'conv le "<bytes>"    bytes little-endian para inteiro (ex.: "c0 7b 2e 5a 1f b3 dc 01")',
    'conv hex "<hex>"     hex para texto',
    'conv texto <txt>     texto para hex',
    'conv b64 <txt>       decodifica base64',
    'conv rot13 <txt>     ROT13 (UserAssist do Windows usa isso)',
    'conv dms "<gps>"     GPS em graus/min/seg para decimal',
    'conv fuso "<AAAA-MM-DD HH:MM:SS>" <horas>   soma/subtrai horas (ex.: -3)',
  ].join('\n  '),
  exemplos: ['conv filetime 0x01dcb31f5a2e7bc0', 'conv le "c0 7b 2e 5a 1f b3 dc 01"', 'conv unix 1773538867000', 'conv mac 795230467', 'conv rot13 "P:\\Hfref\\Ohqtrg.kyfk"'],
  nota: 'Regra de ouro: sempre diga no laudo em qual fuso está cada horário. Metade das brigas de audiência é UTC contra Brasília.',
}, (args, entrada) => {
  const [tipo, ...resto] = args;
  const v = (resto.join(' ') || entrada || '').trim();
  if (!tipo) throw new Error('faltou o tipo. Veja man conv');
  const big = (s: string) => BigInt(s.startsWith('0x') || s.startsWith('0X') ? s : s.replace(/[^0-9-]/g, ''));
  switch (tipo) {
    case 'unix': {
      const n = Number(v);
      const ms = Math.abs(n) > 1e11 ? n : n * 1000;
      return linhaData(`Unix ${Math.abs(n) > 1e11 ? '(milissegundos)' : '(segundos)'} ${v}`, new Date(ms));
    }
    case 'filetime': return linhaData(`FILETIME ${v}`, T.deFiletime(big(v)));
    case 'webkit': return linhaData(`WebKit ${v}`, T.deWebkit(big(v)));
    case 'mac': {
      const n = Number(v);
      const seg = Math.abs(n) > 1e11 ? n / 1e9 : n;
      return linhaData(`Mac Absolute Time ${Math.abs(n) > 1e11 ? '(nanossegundos)' : '(segundos)'} ${v}`, T.deMac(Math.floor(seg)));
    }
    case 'le': {
      const n = T.lerLE(v);
      const hex = '0x' + n.toString(16).padStart(16, '0');
      return `Bytes (little-endian): ${v}\nInteiro: ${n}  (${hex})\nDica: se for data do Windows, rode conv filetime ${hex}`;
    }
    case 'hex': {
      const limpo = v.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
      const b = new Uint8Array(limpo.length / 2);
      for (let i = 0; i < b.length; i++) b[i] = parseInt(limpo.slice(i * 2, i * 2 + 2), 16);
      return new TextDecoder().decode(b);
    }
    case 'texto': return Array.from(enc.encode(v), (x) => x.toString(16).padStart(2, '0')).join(' ');
    case 'b64': {
      try {
        const limpo = v.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        return new TextDecoder().decode(Uint8Array.from(atob(limpo + '='.repeat((4 - (limpo.length % 4)) % 4)), (c) => c.charCodeAt(0)));
      } catch {
        throw new Error('isso não é base64 válido');
      }
    }
    case 'rot13': return T.rot13(v);
    case 'dms': {
      const m = v.match(/(\d+(?:\.\d+)?)\s*(?:deg|°)\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSEWLO])/i);
      if (!m) throw new Error('formato: conv dms "25 deg 25\' 44.60\\" S"');
      let dd = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
      if (/[SWO]/i.test(m[4])) dd = -dd;
      return `${dd.toFixed(6)}  (${m[4].toUpperCase()} ${/[SWO]/i.test(m[4]) ? 'é negativo' : 'é positivo'})`;
    }
    case 'fuso': {
      const m = v.match(/^"?(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)"?\s+([+-]?\d+(?:\.\d+)?)$/);
      if (!m) throw new Error('formato: conv fuso "2026-03-15 01:41:07" -3');
      const d = T.data(m[1], 0);
      return T.fmt(new Date(d.getTime() + Number(m[2]) * 3600_000));
    }
  }
  throw new Error(`tipo ${tipo} desconhecido. Veja man conv`);
});

// ---------- Windows ----------
const PLUGINS_REG: Record<string, { hive: string; chaves: string[]; desc: string }> = {
  compname: { hive: 'SYSTEM', chaves: ['ControlSet001\\Control\\ComputerName\\ComputerName'], desc: 'nome do computador' },
  timezone: { hive: 'SYSTEM', chaves: ['ControlSet001\\Control\\TimeZoneInformation'], desc: 'fuso horário configurado' },
  shutdown: { hive: 'SYSTEM', chaves: ['ControlSet001\\Control\\Windows'], desc: 'último desligamento (ShutdownTime em FILETIME little-endian)' },
  usbstor: { hive: 'SYSTEM', chaves: ['ControlSet001\\Enum\\USBSTOR'], desc: 'dispositivos USB de armazenamento já conectados' },
  mountdev: { hive: 'SYSTEM', chaves: ['MountedDevices'], desc: 'letras de unidade montadas' },
  winver: { hive: 'SOFTWARE', chaves: ['Microsoft\\Windows NT\\CurrentVersion'], desc: 'versão do Windows' },
  profilelist: { hive: 'SOFTWARE', chaves: ['Microsoft\\Windows NT\\CurrentVersion\\ProfileList'], desc: 'perfis de usuário' },
  run: { hive: 'NTUSER/SOFTWARE', chaves: ['Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'Microsoft\\Windows\\CurrentVersion\\Run'], desc: 'programas que iniciam com o Windows (persistência)' },
  recentdocs: { hive: 'NTUSER', chaves: ['Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs'], desc: 'documentos recentes' },
  typedpaths: { hive: 'NTUSER', chaves: ['Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths'], desc: 'caminhos digitados no Explorer' },
  wordwheel: { hive: 'NTUSER', chaves: ['Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\WordWheelQuery'], desc: 'buscas feitas no Explorer' },
  userassist: { hive: 'NTUSER', chaves: [], desc: 'programas executados pela interface (ROT13)' },
};
registrar('regripador', {
  resumo: 'RegRipador: lê hives do registro do Windows',
  uso: 'regripador -r <hive> -p <plugin>\n  regripador -r <hive> -k "<caminho da chave>"\n  regripador -l   (lista plugins)',
  exemplos: ['regripador -r SYSTEM -p usbstor', 'regripador -r NTUSER.DAT -p recentdocs', 'regripador -r NTUSER.DAT -k "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist"'],
  nota: 'Cada chave tem um LastWrite (última escrita), que é uma data valiosa. UserAssist guarda os nomes em ROT13, um "segredo" que dura até alguém rodar conv rot13.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-r', '-p', '-k']);
  if (o.flags.has('l')) return Object.entries(PLUGINS_REG).map(([n, p]) => `${n.padEnd(12)} [${p.hive}] ${p.desc}`).join('\n');
  if (!o.valores.r) throw new Error('uso: regripador -r <hive> -p <plugin> | -k "<chave>"');
  const h = especial(ctx, o.valores.r, 'hive', 'hive de registro');
  const mostrar = (prefixo: string) => {
    const pre = prefixo.toLowerCase().replace(/\\+$/, '');
    const chaves = Object.keys(h.chaves).filter((k) => k.toLowerCase() === pre || k.toLowerCase().startsWith(pre + '\\')).sort();
    return chaves.map((k) => {
      const lw = h.escrita[k];
      const vals = Object.entries(h.chaves[k]);
      return `${cor.ciano(k)}\nLastWrite: ${lw ? T.fmt(lw) + ' UTC' : '(sem registro)'}\n${vals.map(([n, v]) => `  ${n || '(Padrão)'}  ${v}`).join('\n')}`;
    });
  };
  let saida: string[] = [];
  if (o.valores.p) {
    const p = PLUGINS_REG[o.valores.p];
    if (!p) throw new Error(`plugin ${o.valores.p} não existe. Use regripador -l`);
    if (o.valores.p === 'userassist') return cor.amar('plugin userassist: ERRO na decodificação (quebrou na atualização de 2019 e ninguém mantém).\nUse -k na chave Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist e decodifique com conv rot13.');
    saida = p.chaves.flatMap(mostrar);
    if (!saida.length) return `${o.valores.p}: nada encontrado neste hive (${h.nome}). Este plugin é para ${p.hive}.`;
  } else if (o.valores.k) {
    saida = mostrar(o.valores.k);
    if (!saida.length) return `Chave não encontrada: ${o.valores.k}`;
  } else throw new Error('informe -p <plugin> ou -k "<chave>"');
  ctx.evento('registro', { hive: h.nome, plugin: o.valores.p, chave: o.valores.k });
  return `RegRipador 3.0 | hive ${h.nome}\n\n${saida.join('\n\n')}`;
});

registrar('mfteco', {
  resumo: 'MFTeco: interpreta a $MFT do NTFS (inclusive apagados e timestomping)',
  uso: 'mfteco -f <$MFT> [--csv <saída.csv>]',
  exemplos: ['mfteco -f \'$MFT\' --csv ~/mft.csv', "grep -i planilha ~/mft.csv"],
  nota: 'Cada arquivo tem dois conjuntos de datas: $STANDARD_INFORMATION (0x10), que programas conseguem alterar, e $FILE_NAME (0x30), que só o kernel mexe. Se 0x10 for mais antigo que 0x30, desconfie de timestomping. InUse=False é registro de arquivo apagado.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-f', '--csv']);
  if (!o.valores.f) throw new Error("uso: mfteco -f '$MFT' --csv saida.csv");
  const m = especial(ctx, o.valores.f, 'mft', 'tabela $MFT');
  const linhas = ['EntryNumber,InUse,ParentPath,FileName,FileSize,Created0x10,Created0x30,LastModified0x10,LastModified0x30,LastAccess0x10'];
  for (const r of m.registros) {
    const partes = r.caminho.split('\\');
    const nome = partes.pop();
    linhas.push([r.entrada, r.apagado ? 'False' : 'True', partes.join('\\') || '.', nome, r.tamanho, T.fmt(r.si[0]), T.fmt(r.fn[0]), T.fmt(r.si[1]), T.fmt(r.fn[1]), T.fmt(r.si[3])].join(','));
  }
  ctx.evento('mft', {});
  if (o.valores.csv) {
    const p = gravarSaida(ctx, o.valores.csv, linhas.join('\n') + '\n');
    return `MFTeco 1.2: ${m.registros.length} registros processados (${m.registros.filter((r) => r.apagado).length} não alocados).\nCSV gravado em ${cor.ciano(p)} (datas em UTC). Agora é grep, sort e paciência.`;
  }
  const mostra = linhas.slice(0, 41);
  return mostra.join('\n') + (linhas.length > 41 ? `\n${cor.cinza(`... (${linhas.length - 41} registros a mais. Use --csv e filtre com grep.)`)}` : '');
});

registrar('pfeco', {
  resumo: 'PFeco: interpreta arquivos Prefetch do Windows',
  uso: 'pfeco -f <arquivo.pf> | -d <pasta>',
  exemplos: ['pfeco -d /mnt/LACRE-0001/Windows/Prefetch | grep -i -A 3 apaga'],
  nota: 'Prefetch prova EXECUÇÃO: nome do executável, quantas vezes rodou e até as 8 últimas execuções (UTC), além dos arquivos que ele carregou.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-f', '-d']);
  let alvos: string[] = [];
  if (o.valores.f) alvos = [o.valores.f];
  else if (o.valores.d) {
    const no = pegarNo(ctx, o.valores.d);
    if (no.tipo !== 'pasta') throw new Error('-d espera pasta');
    alvos = Object.keys(no.filhos).filter((n) => n.toLowerCase().endsWith('.pf')).sort().map((n) => `${o.valores.d!.replace(/\/$/, '')}/${n}`);
  } else throw new Error('uso: pfeco -f arquivo.pf | -d pasta');
  ctx.evento('prefetch', {});
  return alvos.map((p) => {
    const e = especial(ctx, p, 'prefetch', 'Prefetch');
    return [
      `${cor.ciano(p.split('/').pop()!)}`,
      `Executable name: ${e.exe}`,
      `Hash: ${e.hashPf}`,
      `Run count: ${e.execucoes}`,
      `Last run: ${T.fmt(e.ultimas[0])} UTC`,
      ...e.ultimas.slice(1).map((d) => `Other run time: ${T.fmt(d)} UTC`),
      `Files referenced: ${e.arquivos.length}`,
      ...e.arquivos.slice(0, 12).map((f) => `  ${f}`),
    ].join('\n');
  }).join('\n\n');
});

registrar('lnkeco', {
  resumo: 'LNKeco: interpreta atalhos .lnk (arquivo aberto, volume, máquina)',
  uso: 'lnkeco -f <arquivo.lnk> | -d <pasta>',
  nota: 'O Windows cria .lnk em Recent quando alguém abre um arquivo. O atalho sobrevive mesmo se o arquivo-alvo foi apagado ou estava num pendrive: guarda caminho, serial do volume e datas.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-f', '-d']);
  let alvos: string[] = [];
  if (o.valores.f) alvos = [o.valores.f];
  else if (o.valores.d) {
    const no = pegarNo(ctx, o.valores.d);
    if (no.tipo !== 'pasta') throw new Error('-d espera pasta');
    alvos = Object.keys(no.filhos).filter((n) => n.toLowerCase().endsWith('.lnk')).sort().map((n) => `${o.valores.d!.replace(/\/$/, '')}/${n}`);
  } else throw new Error('uso: lnkeco -f arquivo.lnk | -d pasta');
  ctx.evento('lnk', {});
  return alvos.map((p) => {
    const e = especial(ctx, p, 'lnk', 'atalho .lnk');
    return `${cor.ciano(p.split('/').pop()!)}\n  Alvo:             ${e.alvo}\n  Alvo criado:      ${T.fmt(e.criado)} UTC\n  Alvo modificado:  ${T.fmt(e.modificado)} UTC\n  Tipo de volume:   ${e.volume}\n  Serial do volume: ${e.serialVolume}\n  Máquina (NetBIOS): ${e.maquina}`;
  }).join('\n\n');
});

registrar('evtxeco', {
  resumo: 'EVTXeco: lê logs de eventos do Windows',
  uso: 'evtxeco -f <arquivo.evtx> [--id <EventID>]',
  exemplos: ['evtxeco -f Security.evtx --id 4624', 'evtxeco -f System.evtx | grep -i 104'],
  nota: '4624 logon com sucesso, 4625 falha, 4720 usuário criado, 1102 log de segurança limpo, 104 log de sistema limpo, 7045 serviço instalado. O tipo de logon (2 local, 3 rede, 10 remoto/RDP) muda tudo.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-f', '--id']);
  if (!o.valores.f) throw new Error('uso: evtxeco -f arquivo.evtx');
  const e = especial(ctx, o.valores.f, 'evtx', 'log EVTX');
  const id = o.valores.id ? Number(o.valores.id) : null;
  const evs = e.eventos.filter((x) => id === null || x.id === id);
  ctx.evento('evtx', { id });
  return `Canal: ${e.canal} | ${evs.length} eventos\nTimeCreated (UTC)    | EventID | Nível       | Dados\n` + evs.map((x) => `${T.fmt(x.t)}  | ${String(x.id).padEnd(7)} | ${x.nivel.padEnd(11)} | ${Object.entries(x.dados).map(([k, v]) => `${k}=${v}`).join(' ')}`).join('\n');
});

// ---------- memória ----------
registrar('volatil', {
  resumo: 'Volátil: análise de memória RAM',
  uso: 'volatil -f <dump> <plugin>',
  exemplos: ['volatil -f mem.raw windows.info', 'volatil -f mem.raw windows.pstree', 'volatil -f mem.raw windows.netscan', 'volatil -f mem.raw windows.cmdline', 'volatil -f mem.raw windows.malfind'],
  nota: 'Plugins: windows.info, windows.pslist, windows.pstree, windows.cmdline, windows.netscan, windows.malfind (e os linux.* equivalentes). RAM tem o que o disco não tem: processos vivos, conexões, comandos digitados e chaves na memória. Por isso se coleta primeiro (ordem de volatilidade, RFC 3227).',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-f']);
  if (!o.valores.f) throw new Error('uso: volatil -f <dump> <plugin>');
  const m = especial(ctx, o.valores.f, 'mem', 'dump de memória');
  const plugin = (o.resto[0] ?? '').replace(/^linux\./, 'windows.');
  ctx.evento('volatil', { plugin });
  const cab = 'Volátil 3 Framework 2.7.0\nProgress:  100.00\t\tPDB scanning finished\n';
  const procs = [...m.processos].sort((a, b) => a.pid - b.pid);
  switch (plugin) {
    case 'windows.info':
      return cab + `Variable\tValue\nKernel Base\t0xf80047400000\nSystemTime\t${T.fmt(m.capturada)}\nNtBuildLab\t${m.perfil}\nNtSystemRoot\tC:\\Windows\nIs64Bit\tTrue`;
    case 'windows.pslist':
      return cab + 'PID\tPPID\tImageFileName\tCreateTime (UTC)\n' + procs.map((p) => `${p.pid}\t${p.ppid}\t${p.nome}\t${T.fmt(p.inicio)}`).join('\n');
    case 'windows.pstree': {
      const filhos = (pid: number): string[] => procs.filter((p) => p.ppid === pid && p.pid !== pid).flatMap((p) => [`${'*'.repeat(nivel(p))} ${p.pid}\t${p.ppid}\t${p.nome}\t${T.fmt(p.inicio)}`, ...filhos(p.pid)]);
      const nivel = (p: { ppid: number }): number => { let n = 1; let cur = p; for (let i = 0; i < 20; i++) { const pai = procs.find((x) => x.pid === cur.ppid); if (!pai || pai.pid === pai.ppid) break; n++; cur = pai; } return n; };
      const raizes = procs.filter((p) => !procs.some((x) => x.pid === p.ppid) || p.pid === p.ppid);
      return cab + 'PID\tPPID\tImageFileName\tCreateTime (UTC)\n' + raizes.flatMap((r) => [`* ${r.pid}\t${r.ppid}\t${r.nome}\t${T.fmt(r.inicio)}`, ...filhos(r.pid)]).join('\n');
    }
    case 'windows.cmdline':
      return cab + 'PID\tProcess\tArgs\n' + procs.map((p) => `${p.pid}\t${p.nome}\t${p.cmd}`).join('\n');
    case 'windows.netscan':
      return cab + 'Proto\tLocalAddr\tForeignAddr\tState\tPID\tOwner\n' + m.conexoes.map((c) => `${c.proto}\t${c.local}\t${c.remoto}\t${c.estado}\t${c.pid}\t${procs.find((p) => p.pid === c.pid)?.nome ?? '-'}`).join('\n');
    case 'windows.malfind': {
      const inj = procs.filter((p) => p.injetado);
      if (!inj.length) return cab + 'Nada suspeito. (Ou o malware é melhor que você. Sem pressão.)';
      return cab + inj.map((p) => `PID ${p.pid}\t${p.nome}\tStart VPN 0x1d0000\tProtection PAGE_EXECUTE_READWRITE\tTag VadS\n\n${hexdump(new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff, 0, 0, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0x40, 0, 0, 0, 0, 0, 0, 0]), 0, 32)}\n${cor.amar('MZ em região RWX privada que não veio de arquivo em disco: cara de código injetado.')}`).join('\n\n');
    }
  }
  throw new Error(`plugin desconhecido: ${o.resto[0] ?? '(nenhum)'}. Veja man volatil`);
});

// ---------- rede ----------
function campoPacote(p: Pacote, c: string, i: number): string {
  const http = p.app === 'HTTP' ? p.info.match(/^([A-Z]+) (\S+)/) : null;
  switch (c) {
    case 'frame.number': return String(i + 1);
    case 'frame.time': case 'frame.time_utc': return T.fmt(p.t) + ' UTC';
    case 'ip.src': return p.src;
    case 'ip.dst': return p.dst;
    case 'tcp.srcport': case 'udp.srcport': return String(p.sport);
    case 'tcp.dstport': case 'udp.dstport': return String(p.dport);
    case 'tcp.stream': return p.fluxo === undefined ? '' : String(p.fluxo);
    case '_ws.col.Protocol': return p.app ?? p.proto;
    case '_ws.col.Info': return p.info;
    case 'dns.qry.name': return p.app === 'DNS' ? p.info.match(/0x[0-9a-f]+ [A-Z]+ (\S+)/i)?.[1] ?? '' : '';
    case 'http.request.method': return http?.[1] ?? '';
    case 'http.request.uri': return http?.[2] ?? '';
    case 'http.host': return p.dados?.match(/Host: (\S+)/)?.[1] ?? '';
    case 'http.user_agent': return p.dados?.match(/User-Agent: ([^\n]+)/)?.[1] ?? '';
    case 'http.authorization': return p.dados?.match(/Authorization: ([^\n]+)/)?.[1] ?? '';
    case 'ftp.request.command': return p.app === 'FTP' ? p.info.match(/^Request: (\S+)/)?.[1] ?? '' : '';
    case 'ftp.request.arg': return p.app === 'FTP' ? p.info.match(/^Request: \S+ (.*)$/)?.[1] ?? '' : '';
    case 'tls.handshake.extensions_server_name': return p.app === 'TLS' ? p.info.match(/SNI=(\S+)/)?.[1] ?? '' : '';
    case 'data.text': return p.dados ?? '';
  }
  throw new Error(`campo desconhecido: ${c}`);
}
function filtroPacote(expr: string): (p: Pacote, i: number) => boolean {
  const e = expr.trim();
  if (!e) return () => true;
  const ou = e.split(/\s*(?:\|\||\bor\b)\s*/);
  if (ou.length > 1) { const fs = ou.map(filtroPacote); return (p, i) => fs.some((f) => f(p, i)); }
  const ee = e.split(/\s*(?:&&|\band\b)\s*/);
  if (ee.length > 1) { const fs = ee.map(filtroPacote); return (p, i) => fs.every((f) => f(p, i)); }
  if (/^(!|not\s+)/.test(e)) { const f = filtroPacote(e.replace(/^(!|not\s+)/, '')); return (p, i) => !f(p, i); }
  const parens = e.match(/^\((.*)\)$/);
  if (parens) return filtroPacote(parens[1]);
  const m = e.match(/^([\w.]+)\s*(==|!=|contains|>=|<=|>|<)\s*"?([^"]*)"?$/);
  if (m) {
    const [, campo, op, val] = m;
    const pega = (p: Pacote, i: number): string[] => {
      if (campo === 'ip.addr') return [p.src, p.dst];
      if (campo === 'tcp.port' || campo === 'udp.port') return (campo.startsWith('tcp') ? p.proto === 'TCP' : p.proto === 'UDP') ? [String(p.sport), String(p.dport)] : [];
      if (campo === 'frame') return [p.info + ' ' + (p.dados ?? '')];
      return [campoPacote(p, campo, i)];
    };
    return (p, i) => pega(p, i).some((v) => {
      if (op === 'contains') return v.toLowerCase().includes(val.toLowerCase());
      if (op === '==') return v === val;
      if (op === '!=') return v !== val;
      const a = Number(v);
      const b = Number(val);
      return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
    });
  }
  const proto = e.toLowerCase();
  return (p) => (p.app ?? '').toLowerCase() === proto || p.proto.toLowerCase() === proto || (proto === 'http' && p.app === 'HTTP');
}
registrar('tubarao', {
  resumo: 'Tubarão-de-Fio (linha de comando): análise de pcap',
  uso: 'tubarao -r <pcap> [-Y "<filtro>"] [-T fields -e <campo> ...] [-z conv,ip] [--seguir <stream>]',
  exemplos: [
    'tubarao -r captura.pcap -z conv,ip',
    'tubarao -r captura.pcap -Y dns -T fields -e frame.time -e dns.qry.name',
    'tubarao -r captura.pcap -Y "http.request.method == POST"',
    'tubarao -r captura.pcap -Y "ip.addr == 10.0.0.23 && ftp"',
    'tubarao -r captura.pcap --seguir 7',
  ],
  nota: 'Filtros: dns, http, tls, ftp, smb, ssh, ip.addr==X, ip.src==X, tcp.port==N, dns.qry.name contains "x", frame contains "x", com && || e !. Campos: frame.time, ip.src, ip.dst, tcp.stream, dns.qry.name, http.host, http.request.uri, http.request.method, http.user_agent, ftp.request.command, ftp.request.arg, tls.handshake.extensions_server_name, data.text.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-r', '-Y', '-T', '-z', '--seguir', '-c']);
  // -e pode repetir
  const campos: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '-e') campos.push(args[i + 1]);
  if (!o.valores.r) throw new Error('uso: tubarao -r arquivo.pcap ...');
  const cap = especial(ctx, o.valores.r, 'pcap', 'captura pcap');
  ctx.evento('pcap', { filtro: o.valores.Y, z: o.valores.z, seguir: o.valores.seguir });
  if (o.valores.seguir !== undefined) {
    const n = Number(o.valores.seguir);
    const ps = cap.pacotes.filter((p) => p.fluxo === n);
    if (!ps.length) return `stream ${n} vazio ou inexistente`;
    const cliente = ps[0].src;
    return `===================================================================\nFollow: tcp,ascii\nFilter: tcp.stream eq ${n}\nNode 0: ${ps[0].src}:${ps[0].sport}\nNode 1: ${ps[0].dst}:${ps[0].dport}\n` + ps.filter((p) => p.dados).map((p) => (p.src === cliente ? cor.verm(p.dados!) : cor.azul(p.dados!))).join('\n') + '\n===================================================================';
  }
  if (o.valores.z === 'conv,ip') {
    const conv = new Map<string, { a: string; b: string; n: number; bytes: number }>();
    for (const p of cap.pacotes) {
      const [a, b] = [p.src, p.dst].sort();
      const k = `${a}|${b}`;
      const c = conv.get(k) ?? { a, b, n: 0, bytes: 0 };
      c.n++;
      c.bytes += 60 + (p.dados?.length ?? p.info.length);
      conv.set(k, c);
    }
    const ls = [...conv.values()].sort((x, y) => y.bytes - x.bytes);
    return '================================================================================\nIPv4 Conversations\n' + 'Endereço A        Endereço B        Quadros   Bytes\n' + ls.map((c) => `${c.a.padEnd(17)} ${c.b.padEnd(17)} ${String(c.n).padStart(7)} ${String(c.bytes).padStart(8)}`).join('\n') + '\n================================================================================';
  }
  if (o.valores.z) throw new Error('estatística suportada: -z conv,ip');
  const f = filtroPacote(o.valores.Y ?? '');
  const sel = cap.pacotes.map((p, i) => [p, i] as const).filter(([p, i]) => f(p, i));
  const lim = o.valores.c ? Number(o.valores.c) : Infinity;
  const usados = sel.slice(0, lim);
  if (o.valores.T === 'fields') {
    if (!campos.length) throw new Error('com -T fields, diga os campos com -e');
    return usados.map(([p, i]) => campos.map((c) => campoPacote(p, c, i)).join('\t')).join('\n');
  }
  const t0 = cap.pacotes[0]?.t.getTime() ?? 0;
  const linhas = usados.map(([p, i]) => `${String(i + 1).padStart(6)} ${((p.t.getTime() - t0) / 1000).toFixed(6).padStart(12)} ${p.src.padEnd(15)} → ${p.dst.padEnd(15)} ${(p.app ?? p.proto).padEnd(5)} ${String(60 + (p.dados?.length ?? 0)).padStart(5)} ${p.info}`);
  if (linhas.length > 300) return linhas.slice(0, 300).join('\n') + `\n${cor.cinza(`... ${linhas.length - 300} pacotes a mais. Filtre com -Y.`)}`;
  return linhas.join('\n') || 'Nenhum pacote casou com o filtro.';
});

// ---------- linha do tempo ----------
registrar('prazo', {
  resumo: 'Prazo (log2linha): monta a supertimeline de uma pasta',
  uso: 'prazo <pasta> [-o saída.csv]',
  exemplos: ['prazo /mnt/LACRE-0001 -o ~/timeline.csv', "grep '2026-03-14' ~/timeline.csv | grep -v -i update | head -50"],
  nota: 'Junta MFT, Prefetch, LNK, EVTX e LastWrite do registro numa linha do tempo só, em UTC. Gera milhares de linhas: a arte é filtrar por janela de tempo e jogar fora o ruído do Windows Update.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-o']);
  if (!o.resto[0]) throw new Error('uso: prazo <pasta> -o saida.csv');
  const base = caminho(ctx, o.resto[0]);
  const no = pegarNo(ctx, o.resto[0]);
  const ev: [Date, string, string, string, string][] = [];
  for (const [p, n] of andar(no, base === '/' ? '' : base)) {
    if (n.tipo !== 'arq' || !n.especial) continue;
    const e = n.especial;
    if (e.tipo === 'mft') for (const r of e.registros) {
      ev.push([r.si[0], 'MFT', '$SI Criado', r.caminho + (r.apagado ? ' (apagado)' : ''), p]);
      ev.push([r.si[1], 'MFT', '$SI Modificado', r.caminho + (r.apagado ? ' (apagado)' : ''), p]);
      ev.push([r.fn[0], 'MFT', '$FN Criado', r.caminho + (r.apagado ? ' (apagado)' : ''), p]);
    }
    if (e.tipo === 'prefetch') for (const d of e.ultimas) ev.push([d, 'PREFETCH', 'Execução', `${e.exe} (total ${e.execucoes})`, p]);
    if (e.tipo === 'lnk') { ev.push([e.criado, 'LNK', 'Alvo criado', e.alvo, p]); ev.push([e.modificado, 'LNK', 'Alvo modificado', e.alvo, p]); }
    if (e.tipo === 'evtx') for (const x of e.eventos) ev.push([x.t, 'EVTX', `${e.canal} ${x.id}`, Object.entries(x.dados).map(([k, v]) => `${k}=${v}`).join(' '), p]);
    if (e.tipo === 'hive') for (const [k, d] of Object.entries(e.escrita)) ev.push([d, 'REG', 'LastWrite', `${e.nome}\\${k}`, p]);
  }
  ev.sort((a, b) => a[0].getTime() - b[0].getTime());
  const csv = ['datetime_utc,fonte,tipo,descricao,arquivo', ...ev.map((x) => [T.fmt(x[0]), x[1], x[2], `"${x[3].replace(/"/g, '""')}"`, x[4]].join(','))].join('\n') + '\n';
  const destino = gravarSaida(ctx, o.valores.o ?? '~/timeline.csv', csv);
  ctx.evento('timeline', { pasta: base });
  return `Prazo 20261122: processando ${base}...\nParsers: mft, prefetch, lnk, evtx, winreg\n${ev.length} eventos extraídos. Prazo estourado em 0 dias (milagre).\nSupertimeline: ${cor.ciano(destino)}`;
});

// ---------- Linux, drone, veículo ----------
registrar('last', { resumo: 'lê registros de login (wtmp)', uso: 'last -f <wtmp>', exemplos: ['last -f /mnt/srv/var/log/wtmp'] }, (args, _e, ctx) => {
  const o = opcoes(args, ['-f']);
  if (!o.valores.f) throw new Error('uso: last -f <arquivo wtmp>');
  const w = especial(ctx, o.valores.f, 'wtmp', 'wtmp');
  const fmtL = (d: Date) => { const s = d.toUTCString(); return `${s.slice(0, 3)} ${s.slice(8, 11)} ${s.slice(5, 7)} ${s.slice(17, 22)}`; };
  return [...w.entradas].reverse().map((x) => `${x.usuario.padEnd(9)} ${x.tty.padEnd(12)} ${x.origem.padEnd(16)} ${fmtL(x.inicio)} - ${x.fim ? fmtL(x.fim).slice(-5) : 'still logged in'}`).join('\n') + `\n\nwtmp begins (horários em UTC)`;
});

registrar('datcao', {
  resumo: 'DatCão: decodifica log de voo de drone (.DAT) para CSV',
  uso: 'datcao <arquivo.DAT> [-o saída.csv]',
  nota: 'O log de voo é binário e cifrado por fabricante. Decodificado, vira CSV com tempo, GPS, altitude, bateria e o estado do motor. Altitude é relativa ao ponto de decolagem.',
}, (args, _e, ctx) => {
  const o = opcoes(args, ['-o']);
  if (!o.resto[0]) throw new Error('uso: datcao FLY.DAT -o voo.csv');
  const a = pegarArq(ctx, o.resto[0]);
  const e = a.especial;
  if (e?.tipo !== 'binario' || !e.decodificado || e.formato?.indexOf('drone') === -1) throw new Error(`${o.resto[0]}: não é log de voo reconhecido`);
  const destino = gravarSaida(ctx, o.valores.o ?? `~/${o.resto[0].split('/').pop()!.replace(/\.DAT$/i, '')}.csv`, e.decodificado);
  ctx.evento('drone', {});
  return `DatCão 3.6: ${e.decodificado.split('\n').length - 1} registros decodificados.\nCSV em ${cor.ciano(destino)}`;
});

registrar('berlinda', {
  resumo: 'Berlinda iVê: extração de central multimídia de veículo',
  uso: 'berlinda listar\n  berlinda extrair <id>',
  nota: 'A central do carro guarda celulares pareados, chamadas, contatos sincronizados, trilha de GPS e eventos (porta aberta, marcha engatada). Ninguém lembra de apagar o carro.',
}, (args, _e, ctx) => {
  const vs = ctx.dispositivos.filter((d) => d.tipo === 'veiculo');
  if (args[0] === 'listar' || !args[0]) return vs.length ? vs.map((d) => `${cor.ciano(d.id)}  ${d.rotulo}${d.lacre ? `  [${d.lacre}]` : ''}`).join('\n') : 'Nenhum módulo de veículo conectado.';
  if (args[0] === 'extrair') {
    const d = achaDispositivo(ctx, args[1] ?? '');
    if (d.tipo !== 'veiculo' || !d.extracoes?.fs) throw new Error('não é módulo de veículo');
    const destino = `/evidencias/${d.lacre ?? d.id}_veiculo`;
    gravar(ctx.raiz, destino, d.extracoes.fs());
    ctx.evento('extracao', { dispositivo: d.id, tipo: 'veiculo' });
    return `Lendo NAND da central (chip-off assistido, ninguém se feriu)... [${'#'.repeat(30)}] 100%\nExtração em ${cor.ciano(destino)}`;
  }
  throw new Error('subcomando: listar ou extrair');
});

export function garantirFerramentas(): string[] {
  return Object.keys(COMANDOS);
}

export { hashes, dadosDispositivo };
export type { No, Pasta };
void esp;
void achar;
void pasta;
