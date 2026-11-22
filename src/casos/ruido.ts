// Ruído: a parte da perícia que ninguém mostra na série de TV. 99% do que você acha não importa.
import { Rng } from '../motor/rng';
import { arq, esp, pasta } from '../motor/vfs';
import type { Arquivo, No, Pasta, RegMft } from '../motor/vfs';
import * as T from '../motor/tempo';

export const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Kelly', 'Lucas', 'Marcela', 'Nelson', 'Odete', 'Paulo', 'Quitéria', 'Rafael', 'Simone', 'Thiago', 'Úrsula', 'Valter', 'Wesley', 'Yasmin', 'Zé', 'Cleide', 'Juvenal', 'Rosângela', 'Adalberto', 'Neusa'];
export const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Pereira', 'Lima', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Gomes', 'Ribeiro', 'Martins', 'Rocha', 'Barbosa'];

export const MSG_FAMILIA = [
  'Bom dia grupo 🌻☕', 'BOM DIA!!! Deus abençoe a todos 🙏🙏', 'Quem vai no almoço de domingo?', 'Gente olha isso kkkkkkk', '[figurinha]', '[áudio 2:47]', '[foto]', 'Amém', 'Vcs viram o preço do tomate???', 'Alguém tem o telefone do encanador?', 'Parabéns tia!!! Muitos anos de vida 🎂🎉', 'Isso é fake news, não compartilhem', 'Mas eu recebi de uma fonte confiável', 'Qual fonte?', 'Do grupo da igreja', 'kkkkkkkkkkkk', 'Boa noite família 🌙', 'Chegou bem?', 'Cheguei', 'Saudades de todos ❤️', 'Alguém sabe se vai chover amanhã?', 'Olha a promoção do mercado', 'Não cliquem nesse link!!', 'Já cliquei 😬', 'Esse vídeo é muito bom, assistam até o final', '[vídeo]', 'Que lindo', 'Meu Deus', 'Foi o celular que mandou sozinho', 'Kkkk', 'Bom dia, sextou! 🍻', 'Quem pegou meu pote de sorvete com feijão dentro?',
];
export const MSG_TRABALHO = ['Pessoal, reunião às 14h', 'Alguém viu o relatório?', 'Mandei no e-mail', 'Não chegou', 'Olha o spam', 'Ok', 'Vou ver e te falo', 'Pode ser amanhã?', '👍', 'Bom fim de semana a todos', 'A impressora travou de novo', 'Liguem para o suporte', 'O suporte sou eu', 'Café acabou', 'Quem é o responsável pelo café?', 'Segue a planilha atualizada', 'Qual versão?', 'final_v2_agora_vai', 'Reunião remarcada', 'Desculpem o atraso, trânsito'];
export const SITES = ['https://www.buscador.exemplo/search?q=previsao+do+tempo', 'https://noticias.exemplo/brasil/', 'https://video.exemplo/watch?v=dQw4w9', 'https://rede-social.exemplo/feed', 'https://banco-confiavel.exemplo/login', 'https://loja.exemplo/ofertas', 'https://receitas.exemplo/bolo-de-cenoura', 'https://mapas.exemplo/rotas', 'https://email.exemplo/inbox', 'https://futebol.exemplo/tabela', 'https://wiki.exemplo/wiki/Cadeia_de_custodia', 'https://streaming.exemplo/series', 'https://horoscopo.exemplo/aries'];

export function nome(r: Rng) {
  return `${r.pick(NOMES)} ${r.pick(SOBRENOMES)}`;
}
export function telefone(r: Rng, ddd = '41') {
  return `+55${ddd}9${r.int(8000, 9999)}${r.int(1000, 9999)}`;
}

/** Datas espalhadas entre dois instantes, ordenadas. */
export function datasEntre(r: Rng, ini: Date, fim: Date, n: number): Date[] {
  const a = ini.getTime();
  const b = fim.getTime();
  return Array.from({ length: n }, () => new Date(a + r.prox() * (b - a))).sort((x, y) => x.getTime() - y.getTime());
}

/** Fotos de bom dia, memes e prints que lotam qualquer celular. */
export function fotosRuido(r: Rng, n: number, ini: Date, fim: Date, prefixo = 'IMG-'): Record<string, No> {
  const out: Record<string, No> = {};
  const legendas = ['flor de bom dia com brilho', 'meme do gato', 'print de conversa', 'foto do almoço', 'selfie no espelho', 'paisagem desfocada', 'boleto (já pago, esperamos)', 'cachorro de óculos', 'pôr do sol número 47', 'foto acidental do bolso'];
  for (const d of datasEntre(r, ini, fim, n)) {
    const nomeArq = `${prefixo}${T.fmt(d, -3).slice(0, 10).replace(/-/g, '')}-WA${String(r.int(0, 9999)).padStart(4, '0')}.jpg`;
    out[nomeArq] = esp({ tipo: 'jpeg', legenda: r.pick(legendas), exif: { 'Software': 'Zapeia', 'Image Width': String(r.pick([720, 1080, 1280])), 'Image Height': String(r.pick([1280, 1600, 960])) } }, { mtime: d });
  }
  return out;
}

/** Ruído do Windows: arquivos de sistema, cache, atualização, tudo com cara de importante. */
export function ruidoMft(r: Rng, n: number, ini: Date, fim: Date, inicioEntrada = 1000): RegMft[] {
  const pastas = ['C:\\Windows\\SoftwareDistribution\\Download', 'C:\\Windows\\WinSxS\\amd64_microsoft-windows', 'C:\\Windows\\System32\\winevt\\Logs', 'C:\\Users\\Public\\Documents', 'C:\\ProgramData\\Antivirus\\Updates', 'C:\\Windows\\Temp', 'C:\\Windows\\Prefetch', 'C:\\Program Files\\Navegador\\Application', 'C:\\Users\\Default\\AppData\\Local'];
  const exts = ['.dll', '.cab', '.tmp', '.log', '.dat', '.mui', '.cat', '.etl', '.pf', '.manifest', '.json'];
  const out: RegMft[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(ini.getTime() + r.prox() * (fim.getTime() - ini.getTime()));
    const nm = `${r.pick(['kb', 'wu', 'cache', 'svc', 'upd', 'msi', 'tmp', 'idx'])}${r.hex(6)}${r.pick(exts)}`;
    out.push({ entrada: inicioEntrada + i, caminho: `${r.pick(pastas)}\\${nm}`, tamanho: r.int(512, 9_000_000), si: [d, d, d, d], fn: [d, d, d, d], apagado: r.chance(0.04) });
  }
  return out;
}

export function textoGrande(linhas: string[]): Arquivo {
  return arq(linhas.join('\n') + '\n');
}

export function arvore(obj: Record<string, No>): Pasta {
  return pasta(obj);
}

/** Log de acesso de servidor web com tráfego normal. */
export function logAcessoRuido(r: Rng, n: number, ini: Date, fim: Date): string[] {
  const ips = Array.from({ length: 40 }, () => `${r.pick(['177', '189', '191', '200', '201', '179'])}.${r.int(1, 254)}.${r.int(1, 254)}.${r.int(1, 254)}`);
  const caminhos = ['/', '/index.php', '/servicos', '/noticias/2026', '/contato', '/static/css/site.css', '/static/js/app.js', '/favicon.ico', '/iptu/segunda-via', '/licitacoes', '/robots.txt', '/transparencia'];
  const uas = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Navegador/131.0', 'Mozilla/5.0 (Linux; Android 14) Navegador/130.0 Mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)', 'Buscador-Robo/2.1 (+https://buscador.exemplo/robo)'];
  return datasEntre(r, ini, fim, n).map((d) => {
    const s = d.toUTCString();
    const dataApache = `${s.slice(5, 7)}/${s.slice(8, 11)}/${s.slice(12, 16)}:${s.slice(17, 25)} +0000`;
    return `${r.pick(ips)} - - [${dataApache}] "GET ${r.pick(caminhos)} HTTP/1.1" ${r.chance(0.93) ? 200 : r.pick([304, 404, 301])} ${r.int(200, 48000)} "-" "${r.pick(uas)}"`;
  });
}
