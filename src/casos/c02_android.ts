// Caso 2: Android. Central do golpe do falso sobrinho numa quitinete, com um celular ligado que alguém pode apagar de longe.
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import type { Celula, No, Pasta } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { MSG_FAMILIA, NOMES, SITES, SOBRENOMES, datasEntre, fotosRuido } from './ruido';

const BR = (s: string) => T.data(s, -3);
const PRIMEIRA = BR('2026-11-03 10:12:44');
const PIX = BR('2026-11-03 10:31:02');
const PAINEL = BR('2026-11-21 21:37:05');
const CHAVE_PIX = 'e2f1a7c4-9b3d-4f60-8a21-5d7c3e9b1f08';
const ZILA = '5541998765432@s.zapeia.net';
const VITIMAS = 37;
const GOLPE = ['Oi tia, tudo bem? Troquei de número, salva esse aqui', 'Oi tio! Troquei de número, anota aí', 'Oi madrinha, troquei de número! Esse é o novo', 'Oii vó, troquei de número, salva aí tá'];

function msgstore(): No {
  const r = new Rng(2002);
  const jid: Celula[][] = [];
  const chat: Celula[][] = [];
  const msg: Celula[][] = [];
  let idMsg = 1;
  const add = (chatId: number, fromMe: number, t: Date, texto: string, tipo = 0) => msg.push([idMsg++, chatId, fromMe, T.unixMs(t), texto, tipo]);
  // grupos de ruído: família do golpista, futebol, "promoções"
  const grupos = ['Família Silva Oficial 🏠', 'Pelada de quinta ⚽', 'Promoções Imperdíveis 💸', 'Turma do Fundão 2009', 'Igreja Monte Sião - Avisos'];
  grupos.forEach((g, i) => {
    jid.push([i + 1, `1203630${r.hex(10)}@g.zapeia.net`]);
    chat.push([i + 1, i + 1, g]);
    for (const d of datasEntre(r, BR('2026-08-01 07:00:00'), BR('2026-11-21 23:00:00'), r.int(300, 700))) add(i + 1, r.chance(0.1) ? 1 : 0, d, r.pick(MSG_FAMILIA), r.chance(0.15) ? 1 : 0);
  });
  // vítimas: todas recebem a mesma abertura
  let id = grupos.length + 1;
  const numeros: string[] = [];
  for (let v = 0; v < VITIMAS; v++) {
    const numero = v === 0 ? ZILA : `55${r.pick(['41', '43', '44', '11', '21', '51', '48'])}9${r.int(8000, 9999)}${r.int(1000, 9999)}@s.zapeia.net`;
    numeros.push(numero);
    jid.push([id, numero]);
    chat.push([id, id, null]);
    const ini = v === 0 ? PRIMEIRA : new Date(BR('2026-10-15 09:00:00').getTime() + r.prox() * 35 * 864e5);
    add(id, 1, ini, v === 0 ? GOLPE[0] : r.pick(GOLPE));
    if (v === 0) {
      add(id, 0, new Date(PRIMEIRA.getTime() + 95e3), 'Oi meu querido! Salvei sim. É o Juninho?');
      add(id, 1, new Date(PRIMEIRA.getTime() + 140e3), 'Isso tia, o Juninho! Celular caiu na privada kkk');
      add(id, 1, new Date(PRIMEIRA.getTime() + 900e3), 'Tia, tô numa situação chata, preciso pagar um fornecedor hoje e meu app do banco tá bloqueado');
      add(id, 0, new Date(PRIMEIRA.getTime() + 1020e3), 'Ai meu Deus, quanto é?');
      add(id, 1, new Date(PIX.getTime() - 60e3), 'R$ 4.800, amanhã cedo te devolvo, juro');
      add(id, 1, PIX, `Chave Pix aleatória: ${CHAVE_PIX} (aparece Fernandes Comércio, é meu sócio)`);
      add(id, 0, new Date(PIX.getTime() + 600e3), '[foto] comprovante', 1);
      add(id, 1, new Date(PIX.getTime() + 660e3), 'Obrigado tia!!! Te amo ❤️ não fala nada pra minha mãe');
      add(id, 0, BR('2026-11-04 09:02:00'), 'Juninho, e o dinheiro? Sua mãe disse que você tá em Portugal.');
    } else if (r.chance(0.5)) {
      add(id, 0, new Date(ini.getTime() + r.int(60, 4000) * 1000), r.pick(['Quem é?', 'Salvei! É o Pedrinho?', 'Golpe isso aí, vou denunciar', 'Oi filho', '???', 'Bloqueado.']));
      if (r.chance(0.5)) add(id, 1, new Date(ini.getTime() + 5e6), 'Tia, preciso de uma ajuda rapidinha...');
    }
    id++;
  }
  // contatos pessoais de ruído (mãe, pizzaria, "parceiro")
  for (const [nomeC, textos] of [['Mãe', ['Já almoçou?', 'Leva o lixo', 'Te amo filho', 'Cadê você?']], ['Pizzaria Bom Sabor', ['Seu pedido saiu para entrega 🛵']], ['Parça do Painel', ['Lista nova de idosos subiu no painel', 'Pix caiu, divide amanhã', 'Apaga as conversas toda sexta']]] as [string, string[]][]) {
    jid.push([id, `55419${r.int(80000000, 99999999)}@s.zapeia.net`]);
    chat.push([id, id, nomeC]);
    for (const d of datasEntre(r, BR('2026-09-01 08:00:00'), BR('2026-11-21 22:00:00'), r.int(20, 80))) add(id, r.chance(0.5) ? 1 : 0, d, r.pick(textos));
    id++;
  }
  msg.sort((a, b) => (a[3] as number) - (b[3] as number));
  msg.forEach((m, i) => (m[0] = i + 1));
  void numeros;
  return esp({
    tipo: 'sqlite',
    tabelas: {
      jid: { colunas: ['_id', 'raw_string'], linhas: jid },
      chat: { colunas: ['_id', 'jid_row_id', 'subject'], linhas: chat },
      message: { colunas: ['_id', 'chat_row_id', 'from_me', 'timestamp', 'text_data', 'message_type'], linhas: msg },
      props: { colunas: ['key', 'value'], linhas: [['db_version', '1'], ['backup_enabled', '0'], ['dica', 'timestamp em milissegundos desde 1970 (UTC)']] },
    },
  });
}

function mmssms(): No {
  const r = new Rng(77);
  const linhas: Celula[][] = [];
  let i = 1;
  for (const d of datasEntre(r, BR('2026-09-01 08:00:00'), BR('2026-11-21 22:00:00'), 160)) {
    const [addr, body] = r.pick([
      ['27845', `Seu código Zapeia: ${r.int(100, 999)}-${r.int(100, 999)}. Não compartilhe.`],
      ['28950', 'BANCO: compra aprovada R$ 37,90 em ZE DELIVERY'],
      ['OPERADORA', 'Sua franquia de internet acabou. Contrate mais 1GB por R$ 9,99'],
      ['+5541988120033', 'Vc vai ou n'],
      ['29901', 'Parabéns! Você ganhou um prêmio, clique: http://premio-garantido.exemplo'],
    ] as [string, string][]);
    linhas.push([i++, addr, T.unixMs(d), body, r.pick([1, 1, 1, 2])]);
  }
  return esp({ tipo: 'sqlite', tabelas: { sms: { colunas: ['_id', 'address', 'date', 'body', 'type'], linhas } } });
}

function historico(): No {
  const r = new Rng(91);
  const linhas: Celula[][] = [];
  let i = 1;
  for (const d of datasEntre(r, BR('2026-10-01 08:00:00'), BR('2026-11-21 23:30:00'), 240)) {
    const u = r.pick(SITES);
    linhas.push([i++, u, u.split('/')[2], r.int(1, 40), T.webkit(d).toString()]);
  }
  linhas.push([i++, 'https://painel-cobranca.exemplo/login', 'Painel - Login', 58, T.webkit(BR('2026-11-20 20:11:00')).toString()]);
  linhas.push([i++, 'https://painel-cobranca.exemplo/listas/idosos-pr', 'Painel - Listas', 41, T.webkit(PAINEL).toString()]);
  linhas.push([i++, 'https://buscador.exemplo/search?q=pix+chave+aleatoria+rastreia', 'pix chave aleatoria rastreia - Buscador', 3, T.webkit(BR('2026-11-12 23:02:00')).toString()]);
  linhas.push([i++, 'https://buscador.exemplo/search?q=como+formatar+celular+a+distancia', 'como formatar celular a distancia', 2, T.webkit(BR('2026-11-18 01:15:00')).toString()]);
  // o SQLite guarda número; aqui vira texto grande para não perder precisão (o sqlite3 compara bem)
  return esp({ tipo: 'sqlite', tabelas: { urls: { colunas: ['id', 'url', 'title', 'visit_count', 'last_visit_time'], linhas: linhas.map((l) => [l[0], l[1], l[2], l[3], Number(l[4])]) } } });
}

function contatos(): No {
  const r = new Rng(13);
  const linhas: Celula[][] = [[1, 'Tia Zilá (aposentada, viúva)', '+55 41 99876-5432'], [2, 'Mãe', '+55 41 98812-0033'], [3, 'Parça do Painel', '+55 41 99112-7788']];
  for (let i = 4; i < 220; i++) linhas.push([i, `${r.pick(NOMES)} ${r.pick(SOBRENOMES)} ${r.pick(['', '(lista)', '(lista nova)', '(idosa)', 'Trabalho', 'Academia'])}`.trim(), `+55 ${r.pick(['41', '43', '11'])} 9${r.int(8000, 9999)}-${r.int(1000, 9999)}`]);
  return esp({ tipo: 'sqlite', tabelas: { raw_contacts: { colunas: ['_id', 'display_name', 'number'], linhas } } });
}

function dcim(): Record<string, No> {
  const r = new Rng(404);
  const fotos = fotosRuido(r, 60, BR('2026-08-10 10:00:00'), BR('2026-11-21 20:00:00'), 'IMG_') as Record<string, No>;
  const cartoes = esp({ tipo: 'jpeg', legenda: 'Mesa com dezenas de cartões bancários em nome de terceiros, maços de chips de operadora e um caderno aberto escrito "META DA SEMANA: 30 TIAS".', exif: { 'Make': 'Celumax', 'Camera Model Name': 'Celumax Turbo 5G', 'Date/Time Original': '2026:11:19 15:30:12', 'Offset Time Original': '-03:00', 'GPS Latitude Ref': 'South', 'GPS Latitude': '25 deg 25\' 41.50"', 'GPS Longitude Ref': 'West', 'GPS Longitude': '49 deg 16\' 22.30"', 'GPS Position': '25 deg 25\' 41.50" S, 49 deg 16\' 22.30" W', 'Image Width': '4000', 'Image Height': '3000' } });
  const selfie = esp({ tipo: 'jpeg', legenda: 'Selfie no espelho de academia, com a legenda mental "foco, força e fé".', exif: { 'Make': 'Celumax', 'Camera Model Name': 'Celumax Turbo 5G', 'Date/Time Original': '2026:11:10 18:02:44', 'Offset Time Original': '-03:00', 'GPS Latitude Ref': 'South', 'GPS Latitude': '25 deg 26\' 10.20"', 'GPS Longitude Ref': 'West', 'GPS Longitude': '49 deg 14\' 05.90"', 'GPS Position': '25 deg 26\' 10.20" S, 49 deg 14\' 05.90" W' } });
  const praia = esp({ tipo: 'jpeg', legenda: 'Pôr do sol numa praia lotada. Nenhum cartão bancário à vista.', exif: { 'Make': 'Celumax', 'Camera Model Name': 'Celumax Turbo 5G', 'Date/Time Original': '2026:10:12 18:44:01', 'Offset Time Original': '-03:00', 'GPS Latitude Ref': 'South', 'GPS Latitude': '25 deg 50\' 31.00"', 'GPS Longitude Ref': 'West', 'GPS Longitude': '48 deg 32\' 40.10"', 'GPS Position': '25 deg 50\' 31.00" S, 48 deg 32\' 40.10" W' } });
  return { ...fotos, 'IMG_20261119_153012.jpg': cartoes, 'IMG_20261110_180244.jpg': selfie, 'IMG_20261012_184401.jpg': praia };
}

function sistemaArquivos(): Pasta {
  return pasta({
    data: pasta({
      data: pasta({
        'com.zapeia': pasta({ databases: pasta({ 'msgstore.db': msgstore(), 'wa.db': esp({ tipo: 'sqlite', tabelas: { wa_contacts: { colunas: ['jid', 'display_name'], linhas: [[ZILA, 'Tia Zilá'], ['5541991127788@s.zapeia.net', 'Parça do Painel']] } } }) }), shared_prefs: pasta({ 'com.zapeia_preferences.xml': arq('<map><string name="registration_jid">5541997001122@s.zapeia.net</string><boolean name="two_step" value="false" /></map>\n') }) }),
        'com.android.providers.telephony': pasta({ databases: pasta({ 'mmssms.db': mmssms() }) }),
        'com.android.providers.contacts': pasta({ databases: pasta({ 'contacts2.db': contatos() }) }),
        'com.navegador.android': pasta({ app_navegador: pasta({ Default: pasta({ History: historico() }) }) }),
        'com.jogo.cartas': pasta({ databases: pasta({ 'ranking.db': esp({ tipo: 'sqlite', tabelas: { ranking: { colunas: ['pos', 'nick', 'pontos'], linhas: [[1, 'ReiDaTia', 99821], [2, 'xX_golpe_Xx', 87211]] } } }) }) }),
      }),
    }),
    sdcard: pasta({ DCIM: pasta({ Camera: pasta(dcim()) }), Download: pasta({ 'roteiro_atendimento_v3.pdf': esp({ tipo: 'binario', magia: [...new TextEncoder().encode('%PDF-1.7\n')], texto: ['ROTEIRO', '1. Diga que trocou de número', '2. Espere a vítima falar um nome', '3. Use o nome que ela falou', '4. Urgência + vergonha + segredo'], formato: 'PDF document, version 1.7' }) }), WhatsLixo: pasta({}) }),
  });
}

export const caso02: Caso = {
  id: 'c02',
  numero: 2,
  titulo: 'Central do Falso Sobrinho',
  subtitulo: 'Uma quitinete, 11 celulares, 300 chips e um aparelho ligado que alguém quer apagar de longe.',
  modulo: 'Coleta e análise em dispositivos móveis (Android)',
  dificuldade: 2,
  resumo: 'Dona Zilá, 74 anos, transferiu R$ 4.800 para o "sobrinho Juninho", que tinha "trocado de número". A investigação chegou a uma quitinete no Capão Raso, Curitiba, usada como central do golpe. No cumprimento do mandado de busca, um celular estava ligado, desbloqueado e carregando.',
  canal: 'zap',
  chamado: [
    { de: 'Dr. Anselmo (Delegado)', texto: 'Perito(a), cumprimento de mandado agora. Central de golpe do falso parente.', hora: '06:20' },
    { de: 'Dr. Anselmo (Delegado)', texto: 'Tem um celular aqui desbloqueado, carregando, apitando que nem doido. O soldado quer ver as mensagens.', hora: '06:20' },
    { de: 'Você', texto: 'Ninguém toca. Se a quadrilha tiver o painel de gerenciamento, apaga o aparelho remotamente em minutos.', hora: '06:21', eu: true },
    { de: 'Dr. Anselmo (Delegado)', texto: 'Apaga como? Tá na minha frente kkkk', hora: '06:21' },
    { de: 'Você', texto: 'Pela internet. Chego em 15.', hora: '06:22', eu: true },
  ],
  oficio: ['Delegacia de Estelionato. IP nº 2026.0519. Mandado de busca e apreensão nº 0004421-11.2026, com autorização expressa de acesso ao conteúdo dos aparelhos apreendidos.', 'Requisita exame em aparelho celular apreendido no local, com extração e análise de conversas, contatos, fotografias e histórico de navegação.'],
  quesitos: [
    { id: 'q1', texto: 'Qual chave Pix foi indicada à vítima Zilá para a transferência?', formato: 'chave Pix completa', tipo: 'texto', respostas: [CHAVE_PIX], explicacao: 'No msgstore.db do mensageiro, a conversa com o JID 5541998765432 traz a mensagem com a chave aleatória. Chave aleatória (UUID) não revela o titular: o próximo passo é o ofício ao banco via autoridade.', prejudicado: (f) => f.has('wipe_remoto') || f.has('bfu') || f.has('nao_coletou_cel') },
    { id: 'q2', texto: 'Em que data e hora (Brasília) o aparelho enviou a primeira mensagem para a vítima Zilá?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-03 10:12'], explicacao: 'O campo timestamp está em milissegundos Unix (UTC): 1793711564000. datetime(timestamp/1000, \'unixepoch\', \'-3 hours\') dá 2026-11-03 10:12:44. Divida por 1000 antes, senão o SQLite te manda para o ano 58 mil.', prejudicado: (f) => f.has('wipe_remoto') || f.has('bfu') || f.has('nao_coletou_cel') },
    { id: 'q3', texto: 'Quantas conversas individuais distintas receberam, do aparelho, mensagem de "troquei de número"?', formato: 'número inteiro', tipo: 'numero', respostas: [String(VITIMAS)], explicacao: `SELECT count(DISTINCT chat_row_id) FROM message WHERE from_me = 1 AND text_data LIKE '%troquei de número%' dá ${VITIMAS}. É análise de dados: o volume prova a habitualidade (e ajuda a achar outras vítimas).`, prejudicado: (f) => f.has('wipe_remoto') || f.has('bfu') || f.has('nao_coletou_cel') },
    { id: 'q4', texto: 'A foto que mostra os cartões bancários de terceiros foi tirada em que latitude? Responda em graus decimais, com 4 casas.', formato: '-25.xxxx', tipo: 'numero', tolerancia: 0.0006, respostas: ['-25.4282'], explicacao: 'Use ver para achar a foto certa entre dezenas (IMG_20261119_153012.jpg), exifeiro para o GPS e conv dms: 25° 25\' 41,50" S = 25 + 25/60 + 41,5/3600 = 25,4282, negativo por ser Sul. Não é a quitinete: é outro endereço da quadrilha.', prejudicado: (f) => f.has('wipe_remoto') || f.has('bfu') || f.has('nao_coletou_cel') },
    { id: 'q5', texto: 'Quando (Brasília) o navegador acessou pela última vez a página de listas de idosos do painel de cobrança?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-21 21:37'], explicacao: 'O History do navegador base Chromium grava last_visit_time em microssegundos desde 1601 (WebKit). datetime(last_visit_time/1000000 - 11644473600, \'unixepoch\', \'-3 hours\') ou conv webkit dá 21/11/2026 21:37, horas antes da prisão.', prejudicado: (f) => f.has('wipe_remoto') || f.has('bfu') || f.has('nao_coletou_cel') },
  ],
  cena: {
    local: 'Quitinete no Capão Raso, Curitiba',
    largura: 5.5,
    profundidade: 5,
    piso: '#ffffff',
    parede: '#d9d2c3',
    pisoTex: 'worn_tile_floor',
    pisoEscala: 1.2,
    paredeTex: 'white_plaster_02',
    luz: 'noite',
    inicio: [2.8, 4.4, 0],
    saida: [4.9, 4.5],
    moveis: [
      { tipo: 'glb', glb: 'old_bed_frame', pos: [0.6, 0, 1.3] },
      { tipo: 'glb', glb: 'round_wooden_table_01', pos: [3.2, 0, 1.6], escala: 0.75 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [2.6, 0, 1.2], rot: 0.9 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [3.9, 0, 2.2], rot: -2.4 },
      { tipo: 'glb', glb: 'sofa_02', pos: [4.6, 0, 3.0], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'worn_metal_rack', pos: [5.2, 0, 0.5], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [5.05, 0, 1.35] },
      { tipo: 'glb', glb: 'plastic_crate_01', pos: [1.8, 0, 0.35], rot: 0.2 },
      { tipo: 'glb', glb: 'television_02', pos: [1.8, 0.26, 0.35], solido: false },
      { tipo: 'glb', glb: 'trashbag', pos: [0.4, 0, 4.4] },
      { tipo: 'glb', glb: 'trashbag', pos: [0.8, 0, 4.6], rot: 1 },
      { tipo: 'glb', glb: 'gamepad', pos: [0.75, 0.42, 1.6], rot: 0.5, solido: false },
      { tipo: 'glb', glb: 'gaming_console', pos: [1.8, 0, 0.75], solido: false },
      { tipo: 'glb', glb: 'ceiling_fan', pos: [2.75, 2.7, 2.5], solido: false },
      { tipo: 'janela', pos: [3.6, 1.0, 0.02], tam: [1.0, 1.0, 0] },
      { tipo: 'cortina', pos: [3.6, 0.35, 0.06], tam: [1.3, 1.9, 0], cor: '#7c2d12' },
      { tipo: 'porta', pos: [4.9, 0, 4.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'cel', modelo: 'celular', pos: [3.15, 0.76, 1.55], rot: 0.3, cor: '#111827', relevante: true,
        tela: ['#06:41', 'Zapeia: 14 mensagens', '"Parça do Painel": apaga tudo', 'Desbloqueado'],
        nome: 'Celular ligado, desbloqueado, no carregador',
        descricao: 'Android de tela trincada, ligado no carregador, desbloqueado. As notificações não param. A última diz: "Parça do Painel: tão aí? apaga tudo". O painel da quadrilha tem função de formatar aparelhos a distância.',
        detalhes: ['Modelo: Celumax Turbo 5G', 'IMEI (etiqueta na bandeja): 35-209411-882104-6', 'Bateria: 34%', 'Wi-Fi conectado e dados móveis ativos'],
        acoes: [
          { id: 'ler', rotulo: 'Ler as mensagens rapidinho na tela', toca: true, unica: true, credibilidade: -4, flags: ['mexeu_no_cel'], texto: 'Você rolou a conversa no próprio aparelho. Cada toque marca mensagem como lida, dispara confirmação de leitura para a quadrilha e altera o banco de dados. Agora eles sabem que tem alguém olhando.' },
          { id: 'isolar', rotulo: 'Ativar modo avião e pôr na bolsa Faraday com power bank', toca: true, unica: true, flags: ['isolou_cel'], integridade: 4, tela: ['#06:43', '✈ Modo avião', 'Desbloqueado', 'Bateria 34% (carregando)'], texto: 'Modo avião ligado, bolsa Faraday fechada, power bank conectado. Sem rede, nenhum comando remoto chega. Com energia, o aparelho continua no estado AFU (já desbloqueado após o boot), com as chaves de criptografia na memória. É o melhor cenário para a extração.' },
          { id: 'desligar', rotulo: 'Desligar o aparelho para preservar a bateria', toca: true, unica: true, flags: ['bfu'], integridade: -15, tela: [], texto: 'Desligado. No próximo boot ele entra em BFU (antes do primeiro desbloqueio): com criptografia baseada em arquivo, os dados de usuário ficam cifrados até alguém digitar a senha. Que você não tem. Bateria preservada, prova também, só que trancada.' },
          { id: 'coletar', rotulo: 'Coletar (já isolado)', toca: true, requer: ['isolou_cel'], coleta: { rotulo: 'Celular Celumax Turbo 5G, IMEI 35-209411-882104-6, em modo avião', embalagens: ['faraday'], dispositivo: 'cel' }, texto: 'Coletado na bolsa Faraday, energizado. Vai assim até a mesa do laboratório.' },
          { id: 'coletar_sem', rotulo: 'Coletar do jeito que está', toca: true, bloqueiaSe: ['isolou_cel', 'bfu'], flags: ['wipe_remoto'], integridade: -20, coleta: { rotulo: 'Celular Celumax Turbo 5G, IMEI 35-209411-882104-6', embalagens: ['faraday'], dispositivo: 'cel' }, texto: 'Você guardou o celular conectado à rede. No caminho, a tela piscou: "Redefinição de fábrica solicitada pelo administrador". O "Parça do Painel" apagou tudo de longe.' },
          { id: 'coletar_desl', rotulo: 'Coletar (desligado)', toca: true, requer: ['bfu'], bloqueiaSe: ['isolou_cel'], coleta: { rotulo: 'Celular Celumax Turbo 5G, IMEI 35-209411-882104-6, desligado', embalagens: ['faraday', 'antiestatico'], dispositivo: 'cel' }, texto: 'Coletado desligado. Seguro contra comando remoto. Trancado contra você.' },
        ],
      },
      { id: 'velhos', modelo: 'celular', pos: [3.4, 0.76, 1.8], rot: 2.1, cor: '#4b5563', nome: 'Pilha de 10 celulares velhos', descricao: 'Dez aparelhos sem bateria, alguns sem tela. Provavelmente "queimados" depois de denúncia. Valem apreensão (vão para outro laudo), mas não são o foco dos quesitos.', acoes: [{ id: 'coletar', rotulo: 'Coletar a pilha (lacre único, listando os IMEIs)', toca: true, coleta: { rotulo: '10 celulares sem bateria, IMEIs listados no auto', embalagens: ['caixa', 'antiestatico'] }, texto: 'Coletados com lista de IMEIs no auto. Vão para a fila de laudo, que hoje tem 14 meses.' }] },
      { id: 'chips', modelo: 'chip', pos: [2.95, 0.76, 1.85], rot: 0.4, escala: 3, nome: 'Saco com uns 300 chips de operadora', descricao: 'Chips pré-pagos, muitos ainda no cartão. Cada um é um número novo para o "troquei de número". Material de prova para as operadoras.', acoes: [{ id: 'coletar', rotulo: 'Coletar os chips', toca: true, coleta: { rotulo: 'Saco com aproximadamente 300 chips de operadora', embalagens: ['envelope', 'antiestatico'] }, texto: 'Chips coletados. As ICCIDs vão para ofício às operadoras.' }] },
      { id: 'caderno', modelo: 'livro', pos: [3.5, 0.76, 1.35], rot: -0.6, cor: '#7f1d1d', relevante: true, nome: 'Caderno "META DA SEMANA"', descricao: 'Caderno escolar com nomes, telefones e valores. Na capa: "META DA SEMANA: 30 TIAS". Cruza com o digital: os nomes batem com contatos do celular.', acoes: [{ id: 'coletar', rotulo: 'Coletar o caderno', toca: true, coleta: { rotulo: 'Caderno de capa vermelha com anotações manuscritas', embalagens: ['envelope'] }, texto: 'Caderno coletado. Prova física que conversa com a digital.' }] },
      { id: 'note', modelo: 'notebook', pos: [0.75, 0.42, 1.1], rot: 1.4, tela: ['#Filme pirata', '1:12:44 / 2:01:10', 'Legendado'], nome: 'Notebook com filme pirata pausado', descricao: 'Pausado na metade de um filme de assalto. Ironia não é crime. O histórico mostra só streaming pirata e jogo. Não há indício de uso no golpe.', acoes: [] },
      { id: 'pizza', modelo: 'pizza', pos: [2.2, 0, 3.7], rot: 0.4, nome: 'Três caixas de pizza no chão', descricao: 'A mais antiga é de setembro. Ecossistema próprio.', acoes: [] },
      { id: 'roteador', modelo: 'roteador', pos: [5.2, 1.3, 0.55], nome: 'Roteador do vizinho (Wi-Fi "puxado")', descricao: 'O sinal é do vizinho, com fio passando pela janela. O vizinho vai ter uma manhã interessante.', acoes: [] },
    ],
    pessoas: [
      { id: 'anselmo', nome: 'Dr. Anselmo', papel: 'delegado', modelo: 'anselmo', pos: [1.6, 3.4], rot: 2.2, falas: ['Esse celular não para de apitar. Não dá pra só ver quem é?', 'O mandado autoriza acesso aos dados, tá escrito ali. Pode ler, né?', 'Faraday? Tipo o físico? Ele era da polícia?'], reage: [{ flag: 'isolou_cel', fala: 'Parou de apitar! Que bruxaria é essa? Ah, a bolsa. Chique.' }, { flag: 'wipe_remoto', fala: 'Formatou SOZINHO? Na viatura? Isso é coisa do capeta.' }] },
      { id: 'josue', nome: 'Sd. Josué', papel: 'policial militar', modelo: 'josue', pos: [3.9, 3.9], rot: -2.6, falas: ['O cara jogou um celular no vaso quando a gente bateu. Esse aí ficou na mesa.', 'Eu ia desligar pra não descarregar, mas lembrei da senhora (do senhor) falando no curso.', 'Tem chip pra cacete aqui. Dá pra abrir uma operadora.'] },
      { id: 'wash', nome: 'Washington', papel: 'investigado', modelo: 'washington', pos: [4.4, 3.0], rot: -Math.PI / 2, sentado: true, falas: ['Esse celular nem é meu. Achei na rua.', 'Eu trabalho com vendas. Por telefone. De vários números.', 'Quero meu advogado. E minha pizza.'] },
    ],
  },
  lab: (c) => {
    const wipe = c.flags.has('wipe_remoto');
    const bfu = c.flags.has('bfu');
    const cel: Dispositivo = {
      id: 'cel', dev: 'usb:android-1', rotulo: 'Celumax Turbo 5G (Android 14)', tipo: 'android', tamanho: '128G', semente: 7202,
      info: [
        `Estado: ${wipe ? 'restaurado para padrão de fábrica (tela "Bem-vindo")' : bfu ? 'BFU (reiniciado, não desbloqueado desde o boot)' : 'AFU, modo avião, depuração ativada pelo procedimento de extração'}`,
        'Criptografia: baseada em arquivo (FBE)',
        'Métodos: --logica (backup do sistema), --fs (sistema de arquivos completo), --fisica',
      ],
      extracoes: wipe
        ? { logica: () => pasta({ 'LEIA.txt': arq('Aparelho restaurado de fábrica. Contas: nenhuma. Mensagens: nenhuma. Fotos: nenhuma.\nApagamento remoto registrado às 06:58.\n') }) }
        : bfu
          ? { logica: () => pasta({ 'device_info.txt': arq('Celumax Turbo 5G\nAndroid 14\nEstado: BFU. Apenas dados Device Encrypted (alarmes, toques, configurações de acessibilidade).\n'), 'alarmes.xml': arq('<alarms><alarm hour="6" minute="0" label="ACORDA PRA TRABALHAR" /></alarms>\n') }) }
          : {
              logica: () => pasta({ 'contacts2.db': contatos(), 'mmssms.db': mmssms(), 'LEIA.txt': arq('Extração lógica: o backup do Android não inclui o banco do mensageiro Zapeia (o app proíbe backup). Para as conversas, faça a extração de sistema de arquivos (--fs).\n') }),
              fs: sistemaArquivos,
            },
      motivoSemExtracao: wipe
        ? { fs: 'o aparelho foi restaurado para o padrão de fábrica. Não há dados de usuário.', fisica: 'chip com criptografia de hardware: extração física indisponível.' }
        : bfu
          ? { fs: 'aparelho em BFU: os dados de usuário (Credential Encrypted) continuam cifrados sem a senha de desbloqueio.', fisica: 'chip com criptografia de hardware: extração física indisponível.' }
          : { fisica: 'chip com criptografia de hardware: extração física não suportada para este modelo. Use --fs.' },
    };
    return {
      dispositivos: [cel],
      boasVindas: [
        'Caso: central do golpe do falso sobrinho (vítima: Zilá, JID 5541998765432).',
        'Material: celular conectado ao Celebrita UFOD pelo cabo USB, dentro da caixa blindada.',
        '',
        'Roteiro:',
        '  celebrita listar',
        '  celebrita extrair cel --fs   (a lógica não traz o mensageiro)',
        '  leappinho /evidencias/<pasta da extração>',
        '  sqlite3 -header -column <banco> ".tables"   depois SELECT com datetime()',
        '  ver <foto>   exifeiro <foto>   conv dms "..."',
      ],
    };
  },
  metodologia: [
    { texto: 'O aparelho foi isolado da rede (modo avião e bolsa Faraday) e mantido energizado até a extração, preservando o estado AFU.', certo: true },
    { texto: 'Realizou-se extração do sistema de arquivos com ferramenta forense, com cálculo de hash do pacote de extração.', certo: true },
    { texto: 'Os bancos SQLite foram consultados em modo somente leitura, com conversão dos carimbos Unix (ms) e WebKit para o horário de Brasília.', certo: true },
    { texto: 'A localização da foto foi obtida dos metadados EXIF e convertida de graus, minutos e segundos para graus decimais.', certo: true },
    { texto: 'Para ganhar tempo, as conversas foram lidas e fotografadas diretamente na tela do aparelho no local.', certo: false },
    { texto: 'O aparelho foi reiniciado para limpar a memória antes da extração.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', se: ['mexeu_no_cel'], pergunta: 'A perícia admite que navegou no celular no local, antes de qualquer extração. Quantas mensagens foram alteradas por esse "passeio"?', opcoes: [
      { texto: 'Mensagens foram marcadas como lidas e há registro do horário da manipulação, que está no laudo. O conteúdo das mensagens analisadas não foi alterado.', certa: true, reacao: 'Ponto para a transparência. A defesa anota, mas não tem para onde correr.' },
      { texto: 'Nenhuma, eu só olhei.', certa: false, reacao: 'O banco do mensageiro tem o horário de leitura de cada mensagem. A defesa mostra o print. Ai.' },
    ] },
    { quem: 'defesa', seNao: ['wipe_remoto', 'bfu'], pergunta: 'Como saber que essas mensagens não foram inseridas pela polícia depois da apreensão?', opcoes: [
      { texto: 'O aparelho ficou isolado da rede desde a coleta, a extração tem hash registrado na custódia e os horários das mensagens são anteriores à apreensão. Qualquer perito pode refazer a análise sobre a mesma extração.', certa: true, reacao: 'Cadeia de custódia contada como história: começo, meio e hash. A juíza gosta.' },
      { texto: 'Porque a polícia não faria isso.', certa: false, reacao: 'Confiança não é método. A defesa sorri e pede perícia complementar.' },
    ] },
    { quem: 'juiza', pergunta: 'O número 1793711564000 é a data da mensagem? Parece um telefone.', opcoes: [
      { texto: 'É a quantidade de milissegundos desde 1º de janeiro de 1970, em UTC. Convertido e ajustado para Brasília, dá 3 de novembro de 2026, às 10h12.', certa: true, reacao: 'A juíza anota "milissegundos desde 1970" com cara de quem vai usar isso num jantar.' },
      { texto: 'É um código interno do aplicativo, a data eu estimei pelo contexto.', certa: false, reacao: '"Estimei pelo contexto" num laudo. A defesa agradece de pé.' },
    ] },
    { quem: 'defesa', se: ['wipe_remoto'], pergunta: 'O celular chegou formatado ao laboratório. A perícia deixou o aparelho conectado à internet?', opcoes: [
      { texto: 'Sim. O aparelho não foi isolado na coleta e recebeu comando de apagamento remoto. Por isso os quesitos foram respondidos como prejudicados.', certa: true, reacao: 'A promotoria baixa a cabeça. A honestidade salvou sua credibilidade, não o processo.' },
      { texto: 'O réu deve ter apagado antes da busca.', certa: false, reacao: 'O log diz 06:58, durante a busca. A defesa lê em voz alta.' },
    ] },
    { quem: 'promotoria', pergunta: 'A localização da foto dos cartões é a da quitinete?', opcoes: [
      { texto: 'Não. A latitude é -25,4282, outro endereço. Indica um segundo local usado pela quadrilha, que merece diligência.', certa: true, reacao: 'O promotor já está mandando mensagem para o delegado. Novo mandado a caminho.' },
      { texto: 'Sim, deve ser, a foto foi tirada com o mesmo celular.', certa: false, reacao: 'O celular anda. As coordenadas mostram outro lugar. Pista desperdiçada.' },
    ] },
  ],
  dicas: [
    'Por onde começo?\n`celebrita listar` e depois `celebrita extrair cel --fs`. A lógica não traz o mensageiro.',
    'Achar os bancos\n`leappinho /evidencias/<lacre>_fs` lista onde está cada banco.',
    'Chave Pix\n`sqlite3 msgstore.db "SELECT text_data FROM message WHERE text_data LIKE \'%pix%\'"`. Repare que há ruído com "pix" em grupos.',
    'Primeira mensagem para a Zilá\nAche o _id do JID 5541998765432 na tabela jid; o chat tem jid_row_id; message tem chat_row_id. Depois `datetime(timestamp/1000,\'unixepoch\',\'-3 hours\')` com ORDER BY timestamp LIMIT 1.',
    'Quantas vítimas?\n`SELECT count(DISTINCT chat_row_id) FROM message WHERE from_me=1 AND text_data LIKE \'%troquei de número%\'`.',
    'Foto dos cartões\n`ver` em cada foto suspeita (ou `ver /evidencias/.../Camera/*.jpg | grep -i cart`), depois `exifeiro` e `conv dms`.',
    'Navegador\nTabela urls, last_visit_time em WebKit: `datetime(last_visit_time/1000000-11644473600,\'unixepoch\',\'-3 hours\')`.',
  ],
  falhas: {
    mexeu_no_cel: 'O celular foi manuseado no local antes da extração.',
    wipe_remoto: 'O celular foi coletado sem isolamento de rede e recebeu apagamento remoto.',
    bfu: 'O celular foi desligado e voltou em BFU: dados de usuário inacessíveis.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_cel: 'Celular acondicionado sem bolsa Faraday.',
    nao_coletou_cel: 'O celular ativo nem foi coletado.',
    nao_coletou_caderno: 'O caderno de anotações ficou na quitinete.',
  },
};
