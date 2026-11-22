// Caso 3: iOS. "Meu celular foi hackeado." O KnowledgeC discorda.
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import type { Celula, No, Pasta } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { datasEntre } from './ruido';

const BR = (s: string) => T.data(s, -3);
const POST = BR('2026-09-14 20:03:10');
const MSG_POSTA = BR('2026-09-14 19:41:27');
const ASSESSORIA = '+5541996660101';
const APP = 'com.instagrama.app';

function smsDb(): No {
  const r = new Rng(303);
  const handle: Celula[][] = [[1, ASSESSORIA], [2, '+5541988001122'], [3, 'mae@icloud.exemplo'], [4, '+5511977001234'], [5, '27845']];
  const msgs: Celula[][] = [];
  let id = 1;
  const add = (h: number, eu: number, d: Date, txt: string, serv = 'iMessage') => msgs.push([id++, `${r.hex(8)}-${r.hex(4)}-${r.hex(4)}`.toUpperCase(), txt, h, Number(T.macNs(d)) + r.int(0, 999) * 1e6, eu, serv]);
  const ruido: [number, string[]][] = [
    [2, ['Amiga vc viu o look?', 'Hoje tem publi às 18', 'Me marca no story', 'kkkkkkkk', 'Amei!!!']],
    [3, ['Filha, comeu?', 'Liga pra sua avó', 'Te amo', 'Vc tá muito magra nessas fotos']],
    [4, ['Proposta de parceria: R$ 800 por 3 stories', 'Aguardo retorno', 'Segue contrato']],
    [5, ['Seu código Instagrama: 448 210', 'Seu código Instagrama: 119 004']],
  ];
  for (const [h, textos] of ruido) for (const d of datasEntre(r, BR('2026-08-01 09:00:00'), BR('2026-09-20 23:00:00'), r.int(40, 120))) add(h, r.chance(0.4) ? 1 : 0, d, r.pick(textos), h === 5 ? 'SMS' : 'iMessage');
  add(1, 0, BR('2026-09-14 18:58:02'), 'Thaís, a rifa do carro tá pronta. 5 mil números a R$ 20.');
  add(1, 1, BR('2026-09-14 19:20:45'), 'Mas o carro existe mesmo?');
  add(1, 0, BR('2026-09-14 19:33:10'), 'Existe na foto kkk. Sorteio a gente "faz" depois.');
  add(1, 0, MSG_POSTA, 'Posta você mesma, do seu celular, que engaja mais. Ninguém vai saber.');
  add(1, 1, BR('2026-09-14 19:44:02'), 'Tá bom. Posto às 20h que é horário de pico.');
  add(1, 1, BR('2026-09-14 20:05:33'), 'Postado ✅ já tem 300 comentários');
  add(1, 0, BR('2026-09-21 10:12:00'), 'Deu ruim, a polícia tá em cima. Diz que foi hackeada.');
  msgs.sort((a, b) => (a[4] as number) - (b[4] as number));
  return esp({ tipo: 'sqlite', tabelas: {
    handle: { colunas: ['ROWID', 'id'], linhas: handle },
    message: { colunas: ['ROWID', 'guid', 'text', 'handle_id', 'date', 'is_from_me', 'service'], linhas: msgs },
  } });
}

function knowledgeC(): No {
  const r = new Rng(31);
  const linhas: Celula[][] = [];
  let pk = 1;
  const apps = ['com.apple.mobilesafari', 'com.apple.camera', 'com.apple.MobileSMS', 'com.zapeia.app', 'com.musicafy.app', APP, 'com.apple.Maps', 'com.tiktaka.app', 'com.apple.mobileslideshow'];
  // uso do dia inteiro, com o Instagrama dominando
  let t = BR('2026-09-14 07:30:00').getTime();
  const fim = BR('2026-09-15 01:00:00').getTime();
  while (t < fim) {
    const dur = r.int(30, 900) * 1000;
    const ini = new Date(t);
    const dentroPost = t <= POST.getTime() && t + dur >= POST.getTime();
    let app = r.chance(0.35) ? APP : r.pick(apps);
    if (t > BR('2026-09-14 19:50:00').getTime() && t < BR('2026-09-14 20:15:00').getTime()) app = APP;
    if (dentroPost) app = APP;
    linhas.push([pk++, '/app/inFocus', app, null, T.mac(ini), T.mac(new Date(t + dur)), 'iPhone de Thaís']);
    t += dur + r.int(5, 1800) * 1000;
  }
  // bloqueio: 1 bloqueado, 0 desbloqueado
  const blocos: [string, string, number][] = [
    ['2026-09-14 19:38:00', '2026-09-14 19:39:10', 1],
    ['2026-09-14 19:39:10', '2026-09-14 20:22:40', 0],
    ['2026-09-14 20:22:40', '2026-09-14 20:31:00', 1],
    ['2026-09-14 18:10:00', '2026-09-14 19:38:00', 0],
  ];
  for (const [a, b, v] of blocos) linhas.push([pk++, '/device/isLocked', null, v, T.mac(BR(a)), T.mac(BR(b)), 'iPhone de Thaís']);
  for (const d of datasEntre(r, BR('2026-09-14 08:00:00'), BR('2026-09-14 23:00:00'), 30)) linhas.push([pk++, '/device/batteryPercentage', null, r.int(12, 100), T.mac(d), T.mac(d), 'iPhone de Thaís']);
  linhas.sort((a, b) => (a[4] as number) - (b[4] as number));
  linhas.forEach((l, i) => (l[0] = i + 1));
  return esp({ tipo: 'sqlite', tabelas: { ZOBJECT: { colunas: ['Z_PK', 'ZSTREAMNAME', 'ZVALUESTRING', 'ZVALUEINTEGER', 'ZSTARTDATE', 'ZENDDATE', 'ZDEVICENAME'], linhas } } });
}

function photos(): No {
  const r = new Rng(88);
  const linhas: Celula[][] = [];
  let pk = 1;
  for (const d of datasEntre(r, BR('2026-08-01 09:00:00'), BR('2026-09-20 22:00:00'), 300)) linhas.push([pk++, `IMG_${4000 + pk}.HEIC`, T.mac(d), r.chance(0.6) ? -25.43 + r.prox() * 0.02 : null, r.chance(0.6) ? -49.29 + r.prox() * 0.02 : null, r.pick(['selfie', 'look do dia', 'comida', 'espelho', 'paisagem'])]);
  linhas.push([pk++, 'IMG_9001.JPG', T.mac(BR('2026-09-10 14:20:00')), null, null, 'foto baixada: carro vermelho em concessionária (sem metadado de câmera)']);
  return esp({ tipo: 'sqlite', tabelas: { ZASSET: { colunas: ['Z_PK', 'ZFILENAME', 'ZDATECREATED', 'ZLATITUDE', 'ZLONGITUDE', 'ZDESCRICAO_PERITO'], linhas } } });
}

function chamadas(): No {
  const r = new Rng(41);
  const linhas: Celula[][] = [];
  for (const d of datasEntre(r, BR('2026-09-01 09:00:00'), BR('2026-09-20 22:00:00'), 70)) linhas.push([linhas.length + 1, r.pick([ASSESSORIA, '+5541988001122', '+5511977001234', '+5541933332222']), T.mac(d), r.int(0, 900), r.pick([0, 1])]);
  return esp({ tipo: 'sqlite', tabelas: { ZCALLRECORD: { colunas: ['Z_PK', 'ZADDRESS', 'ZDATE', 'ZDURATION', 'ZORIGINATED'], linhas } } });
}

function ffs(): Pasta {
  return pasta({
    private: pasta({ var: pasta({ mobile: pasta({ Library: pasta({
      SMS: pasta({ 'sms.db': smsDb() }),
      CoreDuet: pasta({ Knowledge: pasta({ 'knowledgeC.db': knowledgeC() }) }),
      CallHistoryDB: pasta({ 'CallHistory.storedata': chamadas() }),
      Accounts: pasta({ 'Accounts3.sqlite': esp({ tipo: 'sqlite', tabelas: { ZACCOUNT: { colunas: ['Z_PK', 'ZUSERNAME', 'ZACCOUNTDESCRIPTION'], linhas: [[1, 'thais.influ@icloud.exemplo', 'iCloud'], [2, 'thais.oficial', 'Instagrama']] } } }) }),
      Logs: pasta({ 'login_instagrama.log': arq(['2026-09-14T22:59:55Z sessão ativa desde 2026-08-02, dispositivo: iPhone de Thaís (este aparelho)', '2026-09-14T23:03:10Z POST /media/publicar origem=app iOS, IP 177.32.10.88 (Wi-Fi residencial)', '2026-09-15T10:00:00Z nenhuma sessão em outro dispositivo nos últimos 90 dias'].join('\n') + '\n') }),
    }), Media: pasta({ PhotoData: pasta({ 'Photos.sqlite': photos() }) }) }) }) }),
  });
}

export const caso03: Caso = {
  id: 'c03',
  numero: 3,
  titulo: 'Álibi de Story',
  subtitulo: 'A influencer jura que foi hackeada. O iPhone dela tem outra versão, com hora, minuto e segundo.',
  modulo: 'Análise de dados de sistemas operacionais (iOS)',
  dificuldade: 2,
  resumo: 'Em 14/09/2026, o perfil @thais.oficial (2 milhões de seguidores) publicou uma rifa de um carro que não existia, arrecadando cerca de R$ 100 mil. Thaís diz que o perfil foi invadido e que ela estava jantando com a família. O iPhone dela foi apreendido em cumprimento de mandado, no apartamento, na presença do advogado.',
  canal: 'zap',
  chamado: [
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Mandado na casa de influencer. Tem advogado lá, câmera de reality e ring light. Comporte-se.', hora: '07:10' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O iPhone está na mesa, bloqueado mas ligado desde ontem. Ela desbloqueou de manhã para gravar story.', hora: '07:11' },
    { de: 'Você', texto: 'Então está em AFU. Não deixa ninguém desligar. Nem reiniciar. Nem "dar uma olhadinha".', hora: '07:12', eu: true },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O advogado já disse que ela não vai dar a senha. Direito dela.', hora: '07:12' },
    { de: 'Você', texto: 'Perfeito. Eu não preciso da senha se ninguém desligar o aparelho.', hora: '07:13', eu: true },
  ],
  oficio: ['Delegacia de Estelionato. IP nº 2026.0611. Mandado de busca e apreensão com autorização judicial de acesso aos dados armazenados no aparelho.', 'Requisita exame para verificar se a publicação de 14/09/2026, às 20h03, partiu do aparelho apreendido e em que condições de uso.'],
  quesitos: [
    { id: 'q1', texto: 'Qual aplicativo estava em primeiro plano no aparelho no momento da publicação (14/09/2026, 20h03, Brasília)? Informe o identificador (bundle id).', formato: 'bundle id, ex.: com.empresa.app', tipo: 'texto', respostas: [APP], explicacao: 'No knowledgeC.db, ZOBJECT com ZSTREAMNAME = /app/inFocus guarda o app em uso. ZSTARTDATE e ZENDDATE estão em segundos desde 2001 (Mac Absolute Time): some 978307200 para chegar ao Unix. O intervalo que contém 20:03:10 tem ZVALUESTRING = com.instagrama.app.', prejudicado: (f) => f.has('bfu_ios') || f.has('nao_coletou_iphone') },
    { id: 'q2', texto: 'O aparelho estava desbloqueado no momento da publicação?', formato: 'sim ou não', tipo: 'texto', respostas: ['sim'], explicacao: 'O fluxo /device/isLocked tem ZVALUEINTEGER = 0 (desbloqueado) de 19:39:10 a 20:22:40. Somado ao log da sessão sem outro dispositivo, a hipótese de invasão remota perde força.', prejudicado: (f) => f.has('bfu_ios') || f.has('nao_coletou_iphone') },
    { id: 'q3', texto: 'Em que data e hora (Brasília) o aparelho recebeu a mensagem que orienta "posta você mesma"?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-09-14 19:41'], explicacao: 'No sms.db, o campo date do iOS moderno está em NANOSSEGUNDOS desde 2001. datetime(date/1000000000 + 978307200, \'unixepoch\', \'-3 hours\') = 2026-09-14 19:41:27. Esqueça de dividir e o SQLite devolve vazio; divida por mil só e você vai parar no século 27.', prejudicado: (f) => f.has('bfu_ios') || f.has('nao_coletou_iphone') },
    { id: 'q4', texto: 'Qual o número de telefone do interlocutor que orientou a publicação?', formato: '+55DDDNÚMERO', tipo: 'texto', respostas: [ASSESSORIA], explicacao: 'message.handle_id = 1 aponta para handle.ROWID = 1, cujo id é +5541996660101. JOIN entre message e handle.', prejudicado: (f) => f.has('bfu_ios') || f.has('nao_coletou_iphone') },
  ],
  cena: {
    local: 'Apartamento de Thaís, Ecoville, Curitiba',
    largura: 6.5,
    profundidade: 5.5,
    piso: '#ffffff',
    parede: '#f1ece4',
    pisoTex: 'herringbone_parquet',
    pisoEscala: 1.6,
    paredeTex: 'white_plaster_02',
    luz: 'dia',
    inicio: [3.2, 4.8, 0],
    saida: [6.0, 5.0],
    moveis: [
      { tipo: 'glb', glb: 'sofa_03', pos: [3.2, 0, 3.6], rot: Math.PI },
      { tipo: 'glb', glb: 'throw_pillows_01', pos: [3.2, 0.45, 3.85], rot: Math.PI, solido: false },
      { tipo: 'glb', glb: 'modern_coffee_table_01', pos: [3.2, 0, 2.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'modern_wooden_cabinet', pos: [3.2, 0, 0.3] },
      { tipo: 'glb', glb: 'ArmChair_01', pos: [5.3, 0, 2.2], rot: -2.2 },
      { tipo: 'glb', glb: 'side_table_01', pos: [1.2, 0, 3.6] },
      { tipo: 'glb', glb: 'potted_plant_01', pos: [0.5, 0, 0.5] },
      { tipo: 'glb', glb: 'potted_plant_02', pos: [6.0, 0, 0.5] },
      { tipo: 'glb', glb: 'potted_plant_04', pos: [1.2, 0.55, 3.6], solido: false },
      { tipo: 'glb', glb: 'standing_picture_frame_01', pos: [2.2, 0.68, 0.35], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_01', pos: [3.2, 1.75, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_03', pos: [0.03, 1.6, 2.4], rot: Math.PI / 2, solido: false },
      { tipo: 'glb', glb: 'vintage_suitcase#0', pos: [5.6, 0, 4.6], rot: 0.4 },
      { tipo: 'janela', pos: [5.2, 0.9, 0.02], tam: [1.8, 1.4, 0] },
      { tipo: 'cortina', pos: [5.2, 0.2, 0.06], tam: [2.2, 2.3, 0], cor: '#e7e5e4' },
      { tipo: 'tapete', pos: [3.2, 0, 2.7], tam: [3.0, 0, 2.0], cor: '#d6d3d1' },
      { tipo: 'porta', pos: [6.0, 0, 5.47], rot: Math.PI },
    ],
    itens: [
      {
        id: 'iphone', modelo: 'iphone', pos: [3.3, 0.39, 2.55], rot: 0.4, relevante: true,
        tela: ['#07:42', 'Bloqueado', '❤️ 3.412 curtidas'],
        nome: 'iPhone da Thaís (bloqueado, ligado)',
        descricao: 'iPhone recente, capinha com strass. Ligado e bloqueado, mas já foi desbloqueado hoje cedo (AFU). Recebe notificação a cada dez segundos. Bateria em 41%.',
        detalhes: ['Capinha: "Abençoada e Patrocinada"', 'Bateria: 41%', 'Face ID e código de 6 dígitos'],
        acoes: [
          { id: 'senha', rotulo: 'Pedir à Thaís que desbloqueie "para colaborar"', unica: true, credibilidade: -4, flags: ['pressionou_senha'], texto: 'O Dr. Lourival se levantou: "Minha cliente não é obrigada a produzir prova contra si". Ele está certo (nemo tenetur se detegere) e anotou seu nome num caderninho de couro.' },
          { id: 'faceid', rotulo: 'Encostar o iPhone no rosto dela enquanto ela se distrai', unica: true, integridade: -20, credibilidade: -10, flags: ['faceid_forcado'], texto: 'Não. Desbloqueio biométrico forçado, sem ordem específica, é exatamente o tipo de coisa que faz um juiz anular uma prova inteira. O advogado filmou tudo com o celular dele.' },
          { id: 'isolar', rotulo: 'Pôr em modo avião pela Central de Controle e na Faraday com energia', toca: true, unica: true, flags: ['isolou_iphone'], integridade: 4, tela: ['#07:44', '✈', 'Bloqueado'], texto: 'Com a Central de Controle acessível na tela bloqueada, modo avião ativado sem desbloquear. Faraday, power bank. O aparelho segue em AFU: as chaves da classe de proteção "até o primeiro desbloqueio" ficam na memória. Se ninguém desligar, a extração completa é possível.' },
          { id: 'desligar', rotulo: 'Desligar para não receber mais notificações', toca: true, unica: true, flags: ['bfu_ios'], integridade: -18, tela: [], texto: 'Desligado. Quando ligar, o iPhone estará em BFU e quase todos os dados de usuário estarão cifrados com uma chave que depende do código de 6 dígitos que ninguém vai te dar.' },
          { id: 'coletar', rotulo: 'Coletar (isolado e energizado)', toca: true, requer: ['isolou_iphone'], coleta: { rotulo: 'iPhone com capinha de strass, em modo avião, energizado', embalagens: ['faraday'], dispositivo: 'iphone' }, texto: 'Coletado em AFU, energizado, isolado. Lacre e para o laboratório antes que a bateria acabe.' },
          { id: 'coletar_x', rotulo: 'Coletar', toca: true, bloqueiaSe: ['isolou_iphone'], coleta: { rotulo: 'iPhone com capinha de strass', embalagens: ['faraday', 'antiestatico'], dispositivo: 'iphone' }, flags: ['iphone_sem_isolar'], texto: 'Coletado. Se não está isolado, pode receber um "Apagar iPhone" pelo serviço de localização. Se está desligado, está em BFU.' },
        ],
      },
      { id: 'ringlight', modelo: 'lampada', pos: [1.9, 1.5, 2.2], escala: 4, nome: 'Ring light gigante', descricao: 'Ilumina o rosto, aquece o ambiente e apaga as olheiras. Não apaga provas.', acoes: [] },
      { id: 'ipad', modelo: 'tablet', pos: [2.8, 0.39, 2.75], rot: -0.4, tela: ['#Roteiro de publis', 'Setembro', '14/09: ??? RIFA'], nome: 'iPad com roteiro de publicações', descricao: 'Aberto num calendário de publicidade. No dia 14/09 está escrito "RIFA (Kleber manda arte)". Está desbloqueado e não tem senha. Sincroniza com a mesma conta do iPhone.', acoes: [{ id: 'coletar', rotulo: 'Coletar o iPad também', toca: true, coleta: { rotulo: 'iPad com calendário de publicações', embalagens: ['faraday'] }, integridade: 1, texto: 'Coletado, isolado. Bom para corroborar, não necessário para os quesitos.' }] },
      { id: 'notebook', modelo: 'notebook', pos: [1.2, 0.55, 3.55], rot: 0.8, tela: ['#Editor de vídeo', 'publi_creme_v7_FINAL.mp4'], nome: 'Notebook de edição', descricao: 'Exportando um vídeo de publi de creme facial. 7ª versão. Não é o equipamento da publicação questionada.', acoes: [] },
      { id: 'camera', modelo: 'camera', pos: [5.8, 2.69, 4.9], nome: 'Câmera de reality no teto', descricao: 'Ela grava um reality da própria vida. 24 horas. O HD fica na nuvem do fornecedor. Uma requisição ao fornecedor pode mostrar onde ela estava às 20h03 de 14/09. Anote para sugerir à autoridade.', acoes: [{ id: 'anotar', rotulo: 'Registrar e sugerir requisição das gravações ao fornecedor', unica: true, integridade: 2, texto: 'Anotado no relatório como diligência complementar. O Marco Civil (art. 15) obriga provedor de aplicação a guardar registros de acesso por 6 meses; as gravações dependem do contrato. A autoridade pede com ordem judicial.' }] },
      { id: 'caneca', modelo: 'caneca', pos: [3.6, 0.39, 2.45], nome: 'Copo de matcha com canudo de bambu', descricao: 'Ainda gelado. Publi.', acoes: [] },
    ],
    pessoas: [
      { id: 'thais', nome: 'Thaís', papel: 'investigada, influencer', modelo: 'thais', pos: [2.6, 3.65], rot: Math.PI, sentado: true, falas: ['Eu estava jantando com a minha mãe. Fui hackeada, isso acontece direto.', 'Posso fazer um story agora? É sobre resiliência.', 'Não vou dar a senha. Meu advogado mandou.'] },
      { id: 'lourival', nome: 'Dr. Lourival Brecha', papel: 'advogado da investigada', modelo: 'lourival', pos: [4.4, 3.2], rot: -2.5, falas: ['Estou acompanhando cada passo. Cada. Passo.', 'Minha cliente não fornecerá senha nem biometria. Está na Constituição.', 'O senhor (a senhora) vai explicar em juízo como manteve esse aparelho íntegro, imagino.'], reage: [{ flag: 'faceid_forcado', fala: 'Filmei. Obrigado pela prova da nulidade.' }, { flag: 'isolou_iphone', fala: 'Faraday. Hum. Pelo menos alguém aqui leu um livro.' }] },
      { id: 'yara', nome: 'Investigadora Yara', papel: 'polícia civil', modelo: 'yara', pos: [1.4, 1.6], rot: 0.9, falas: ['O mandado está na mão. Autoriza acesso aos dados, mas não obriga ninguém a desbloquear.', 'A mãe dela disse que o jantar foi às 21h30. Mas mãe é mãe.', 'Se precisar, chamo o suporte da operadora. Mas eles atendem na terça.'] },
    ],
  },
  lab: (c) => {
    const bfu = c.flags.has('bfu_ios');
    const d: Dispositivo = {
      id: 'iphone', dev: 'usb:ios-1', rotulo: 'iPhone (iOS 18.1)', tipo: 'ios', tamanho: '256G', semente: 7303,
      info: [`Estado: ${bfu ? 'BFU (desligado na coleta e religado)' : 'AFU, modo avião, bloqueado'}`, 'Backup local: protegido por senha (senha desconhecida)', 'Métodos: --logica (backup), --fs (sistema de arquivos completo, via agente em AFU)'],
      extracoes: bfu ? {} : { fs: ffs },
      motivoSemExtracao: bfu
        ? { logica: 'backup criptografado por senha desconhecida e aparelho em BFU.', fs: 'BFU: sem o código, as classes de proteção de dados do usuário continuam cifradas.', fisica: 'não existe extração física para este modelo.' }
        : { logica: 'o backup do aparelho é criptografado com senha que ninguém informou. Use --fs.', fisica: 'não existe extração física para este modelo.' },
    };
    return {
      dispositivos: [d],
      boasVindas: [
        'Caso: rifa falsa publicada em 14/09/2026, 20h03 (Brasília), no perfil @thais.oficial.',
        'Material: iPhone conectado ao Celebrita UFOD dentro da caixa blindada.',
        '',
        'Datas no iOS:',
        '  knowledgeC.db (ZSTARTDATE): SEGUNDOS desde 2001-01-01  -> +978307200 vira Unix',
        '  sms.db (date): NANOSSEGUNDOS desde 2001-01-01           -> /1000000000 e depois +978307200',
        '  conv mac <valor>  faz as duas contas',
      ],
    };
  },
  metodologia: [
    { texto: 'O aparelho foi isolado em modo avião sem desbloqueio e mantido energizado, preservando o estado AFU.', certo: true },
    { texto: 'Foi realizada extração do sistema de arquivos completo, com registro de hash do pacote.', certo: true },
    { texto: 'Os carimbos de tempo do iOS (Mac Absolute Time em segundos e nanossegundos) foram convertidos para o horário de Brasília.', certo: true },
    { texto: 'Correlacionaram-se os fluxos /app/inFocus e /device/isLocked do KnowledgeC com o horário da publicação.', certo: true },
    { texto: 'Para viabilizar o acesso, o aparelho foi desbloqueado por Face ID aproximando-o do rosto da investigada.', certo: false },
    { texto: 'O aparelho foi reiniciado em modo de recuperação para acelerar a extração.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', se: ['faceid_forcado'], pergunta: 'Vossa Senhoria aproximou o aparelho do rosto da minha cliente para desbloqueá-lo. Confirma?', opcoes: [
      { texto: 'Confirmo. Não havia autorização para isso e o fato consta no laudo.', certa: true, reacao: 'A juíza suspende a sessão por dez minutos. Você vai precisar de um café e talvez de um advogado.' },
      { texto: 'Foi só para ver as horas.', certa: false, reacao: 'O advogado reproduz o vídeo no telão. Silêncio absoluto.' },
    ] },
    { quem: 'defesa', pergunta: 'Minha cliente foi hackeada. O laudo consegue excluir que alguém publicou de outro aparelho?', opcoes: [
      { texto: 'O laudo mostra que o aparelho dela estava desbloqueado, com o Instagrama em primeiro plano às 20h03, e que a sessão não tinha outro dispositivo. Também há mensagem orientando-a a postar "do seu celular". Não afirmo quem segurava o aparelho: isso é com a prova testemunhal.', certa: true, reacao: 'Técnico, limitado ao que a prova mostra. A juíza gosta de perito que sabe onde a ciência termina.' },
      { texto: 'Foi ela, com certeza absoluta.', certa: false, reacao: 'Perito não afirma autoria física sem base. A defesa pergunta "o senhor estava lá?". Não estava.' },
    ] },
    { quem: 'juiza', pergunta: 'Esse número 811119790 é a data? Por que tão diferente dos outros?', opcoes: [
      { texto: 'É Mac Absolute Time: segundos contados a partir de 1º de janeiro de 2001, não de 1970. Somando 978.307.200 segundos, vira o padrão Unix e dá 14/09/2026.', certa: true, reacao: 'A juíza anota "a Apple conta o tempo desde 2001". Uma frase que ela vai repetir em outras audiências.' },
      { texto: 'É a data em formato americano.', certa: false, reacao: 'Formato americano seria mês antes do dia. Isso é um número de nove dígitos. A defesa se diverte.' },
    ] },
    { quem: 'defesa', se: ['bfu_ios'], pergunta: 'A perícia desligou o aparelho e depois não conseguiu extrair nada. Por que desligou?', opcoes: [
      { texto: 'Foi um erro de procedimento. Desligado, o aparelho volta em BFU e os dados ficam cifrados sem o código. Os quesitos ficaram prejudicados.', certa: true, reacao: 'Admitir o erro dói menos do que inventar desculpa sob juramento.' },
      { texto: 'Para preservar a bateria, que é o procedimento padrão.', certa: false, reacao: 'Procedimento padrão é Faraday com energia. O assistente técnico da defesa mostra o manual. Ai.' },
    ] },
  ],
  dicas: [
    'Extração\n`celebrita extrair iphone --fs`. O backup (--logica) está cifrado por senha.',
    'Que app estava aberto às 20h03?\n`SELECT ZVALUESTRING, datetime(ZSTARTDATE+978307200,\'unixepoch\',\'-3 hours\'), datetime(ZENDDATE+978307200,\'unixepoch\',\'-3 hours\') FROM ZOBJECT WHERE ZSTREAMNAME=\'/app/inFocus\' AND ZSTARTDATE <= X AND ZENDDATE >= X`. Calcule X com `conv`... ou filtre por datetime entre 19:55 e 20:10.',
    'Bloqueado ou não?\nMesmo banco, ZSTREAMNAME = \'/device/isLocked\'. 0 é desbloqueado.',
    'Mensagem "posta você mesma"\n`sqlite3 sms.db "SELECT datetime(date/1000000000+978307200,\'unixepoch\',\'-3 hours\'), text FROM message WHERE text LIKE \'%posta%\'"`.',
    'Quem mandou?\nJOIN de message.handle_id com handle.ROWID.',
  ],
  falhas: {
    faceid_forcado: 'O aparelho foi desbloqueado por biometria forçada, sem autorização: risco de nulidade.',
    pressionou_senha: 'A investigada foi pressionada a fornecer a senha.',
    bfu_ios: 'O iPhone foi desligado e voltou em BFU: dados inacessíveis.',
    iphone_sem_isolar: 'O iPhone foi coletado sem isolamento de rede.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_iphone: 'iPhone acondicionado sem bolsa Faraday.',
    nao_coletou_iphone: 'O iPhone nem foi coletado.',
  },
};
