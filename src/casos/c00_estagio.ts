// Caso 0: tutorial. Pendrive do gabarito vendido, numa delegacia onde todo mundo quer "só dar uma olhadinha".
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import { Rng } from '../motor/rng';
import { sha256 } from '../motor/hash';
import { dadosDispositivo } from '../motor/ferramentas';
import { fotosRuido } from './ruido';
import * as T from '../motor/tempo';

const enc = new TextEncoder();
const bin = (magia: string, texto: string[], formato?: string) => esp({ tipo: 'binario', magia: [...enc.encode(magia)], texto, formato });

const FOTO_UTC = T.data('2026-11-20 23:14:51', 0); // câmera do celular estava em UTC
const PEN: Dispositivo = {
  id: 'pen',
  dev: '/dev/sdb',
  rotulo: 'Pendrive 16 GB BRINDE COPA 2014',
  tipo: 'disco',
  tamanho: '14.9G',
  semente: 7001,
  conteudo: () => {
    const r = new Rng(11);
    return pasta({
      'LEIA-ME.txt': arq('Pendrive da Copa. Se achar, devolva para o Gilmar.\nNão tem nada demais aqui, pode olhar.\n'),
      'Musicas': pasta(Object.fromEntries(['Amado Batista - Ao Vivo 01.mp3', 'Amado Batista - Ao Vivo 02.mp3', 'Hino do Clube.mp3', 'Sertanejo Universitario Mix 2014.mp3', 'Toque de celular nokia.mp3'].map((n) => [n, bin('ID3\x04\x00', [n.replace('.mp3', ''), 'LAME3.100'], 'Audio file with ID3 version 2.4.0, contains: MPEG ADTS, layer III, v1, 128 kbps, 44.1 kHz, JntStereo')]))),
      'Fotos churrasco': pasta(fotosRuido(r, 37, T.data('2026-01-10 12:00'), T.data('2026-10-02 18:00'), 'IMG_')),
      'TCC_final_FINAL_agora_vai.docx': bin('PK\x03\x04', ['word/document.xml', 'Gestão de Pessoas no Setor Público: um estudo de caso'], 'Microsoft Word 2007+'),
      'curriculo_gilmar.pdf': bin('%PDF-1.7\n', ['Gilmar Paixão', 'Experiência: 12 anos em consultoria para concursos', 'Habilidades: discrição, pontualidade, Pix'], 'PDF document, version 1.7'),
    });
  },
  apagados: [
    { nome: 'gabarito.pdf', arquivo: () => bin('%PDF-1.7\n', ['GABARITO PRELIMINAR', 'CONCURSO GUARDA MUNICIPAL DE VILA SERENA 2026', 'PROVA TIPO 2', '01-C 02-A 03-D 04-B 05-E 06-A 07-C 08-C 09-D 10-B', 'Valor por candidato: R$ 3.500,00 (à vista no Pix)', 'Chave Pix: gilmar.gabaritos@banco.exemplo', 'Apague depois de ler. Sério.'], 'PDF document, version 1.7') },
    { nome: 'foto_prova.jpg', arquivo: () => esp({ tipo: 'jpeg', legenda: 'foto da prova impressa em cima de uma mesa', exif: { 'Make': 'Celumax', 'Camera Model Name': 'Celumax Turbo 5G', 'Date/Time Original': T.fmt(FOTO_UTC).replace(/-/g, ':'), 'Offset Time Original': '+00:00', 'Image Description': 'prova tipo 2 pagina 1', 'Image Width': '4000', 'Image Height': '3000' } }) },
    { nome: 'lista.txt', arquivo: () => arq('lista de compras: arroz, feijão, carvão, gelo\n') },
  ],
};

export const HASH_PEN = sha256(dadosDispositivo(PEN, false));

export const caso00: Caso = {
  id: 'c00',
  numero: 0,
  titulo: 'Estágio Probatório',
  subtitulo: 'Um pendrive, um gabarito vendido e um delegado que quer "só dar uma olhadinha".',
  modulo: 'Identificação, coleta, aquisição e preservação da evidência digital',
  dificuldade: 1,
  resumo: 'Na madrugada de 21/11/2026, policiais militares abordaram um homem na saída da gráfica que imprimiu as provas do concurso da Guarda Municipal de Vila Serena. Com ele: um pendrive e uma folha impressa. O material está na mesa do plantão da 3ª DP.',
  canal: 'zap',
  chamado: [
    { de: 'Dr. Anselmo (Delegado Plantonista)', texto: 'Bom dia perito(a). Tenho um pendrive aqui de um elemento que tava vendendo gabarito de concurso.', hora: '06:12' },
    { de: 'Dr. Anselmo (Delegado Plantonista)', texto: 'O soldado já queria espetar no notebook pra ver, eu segurei. Tô aprendendo kkk', hora: '06:12' },
    { de: 'Dr. Anselmo (Delegado Plantonista)', texto: 'Mandei a requisição. É simples, coisa de meia hora. O juiz quer pra ontem.', hora: '06:13' },
    { de: 'Você', texto: 'Ninguém mexe em nada. Estou indo.', hora: '06:15', eu: true },
    { de: 'Dr. Anselmo (Delegado Plantonista)', texto: '👍 Tem pizza de ontem aqui se quiser', hora: '06:15' },
  ],
  oficio: [
    'Delegacia de Polícia de Vila Serena, 3ª DP. IP nº 2026.0311.',
    'Encaminha material apreendido em flagrante (art. 6º do CPP) e requisita exame pericial em mídia de armazenamento.',
  ],
  quesitos: [
    { id: 'q1', texto: 'Qual o hash SHA-256 da imagem forense do pendrive, calculado na aquisição?', formato: '64 caracteres hexadecimais', tipo: 'hash', respostas: [HASH_PEN], explicacao: 'O hash vem do log do imajador, com bloqueador de escrita ligado. Sem bloqueador, o hash de verificação não bate com o de aquisição e a imagem não serve para provar nada.', prejudicado: (f) => f.has('nao_coletou_pen') },
    { id: 'q2', texto: 'Há arquivo apagado relacionado ao concurso? Se houver, informe a chave Pix indicada nele.', formato: 'chave Pix (como aparece no documento)', tipo: 'texto', respostas: ['gilmar.gabaritos@banco.exemplo'], explicacao: 'O PDF foi apagado e não aparece no ls. A recuperação por assinatura (formiga) procura o cabeçalho %PDF direto nos setores da imagem. Depois, strings no arquivo recuperado mostra o texto.', prejudicado: (f) => f.has('nao_coletou_pen') },
    { id: 'q3', texto: 'Em que data e hora, no horário de Brasília, foi tirada a foto da prova recuperada do pendrive?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-20 20:14'], explicacao: 'O EXIF mostra 2026:11:20 23:14:51 com Offset Time Original +00:00: o relógio da câmera estava em UTC. Brasília é UTC-3, então 20:14. Detalhe importante: isso é ANTES da impressão oficial das provas, que foi às 22h. Vazou de dentro.', prejudicado: (f) => f.has('nao_coletou_pen') },
  ],
  cena: {
    local: 'Plantão da 3ª DP de Vila Serena',
    largura: 6,
    profundidade: 5,
    piso: '#ffffff',
    parede: '#efe6cf',
    pisoTex: 'terrazzo_tiles',
    pisoEscala: 1.2,
    paredeTex: 'painted_plaster_wall',
    luz: 'fluor',
    inicio: [3.2, 4.2, 0],
    saida: [5.4, 4.5],
    moveis: [
      // mesa do delegado, cadeira de diretor e as duas monobloco de visita (patrimônio de toda delegacia)
      { tipo: 'glb', glb: 'metal_office_desk', pos: [3, 0, 1.3] },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [3, 0, 0.45], escala: 0.85 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [2.5, 0, 2.35], rot: Math.PI + 0.25 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [3.6, 0, 2.4], rot: Math.PI - 0.2 },
      // mesa da escrivã, encostada na parede esquerda
      { tipo: 'glb', glb: 'metal_office_desk', pos: [0.52, 0, 3.3], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [1.45, 0, 3.4], rot: -Math.PI / 2, escala: 0.85 },
      // arquivo, estante de aço com caixas de apreensão de 2019 e o extintor vencido
      { tipo: 'glb', glb: 'drawer_cabinet', pos: [5.72, 0, 1.3], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'steel_frame_shelves_02', pos: [0.32, 0, 0.75], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [0.45, 0, 1.65], rot: 0.3 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [0.47, 0.34, 1.62], rot: -0.15 },
      { tipo: 'glb', glb: 'korean_fire_extinguisher_01', pos: [5.75, 0, 3.7], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'trashbag', pos: [4.75, 0, 0.4] },
      { tipo: 'glb', glb: 'WetFloorSign_01', pos: [4.4, 0, 4.4], rot: 0.6 },
      // parede: relógio atrasado, quadro de aviso, alarme e câmera que não grava desde 2022
      { tipo: 'glb', glb: 'wall_clock', pos: [1.5, 2.25, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_02', pos: [4.6, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'fire_alarm', pos: [5.4, 1.55, 0.02], solido: false },
      { tipo: 'glb', glb: 'security_camera_01', pos: [5.75, 2.45, 0.25], rot: -2.4, solido: false },
      // em cima da mesa
      { tipo: 'glb', glb: 'clipboard', pos: [2.45, 0.79, 1.1], rot: 0.2, solido: false },
      { tipo: 'glb', glb: 'stationery_supplies', pos: [3.6, 0.86, 1.5], rot: 0.3, solido: false },
      { tipo: 'glb', glb: 'binder_notebook', pos: [0.5, 0.79, 3.15], rot: 1.4, solido: false },
      { tipo: 'janela', pos: [3, 1.0, 0.02], tam: [1.6, 1.1, 0] },
      { tipo: 'porta', pos: [5.4, 0, 4.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'pen', modelo: 'pendrive', pos: [2.75, 0.79, 1.25], rot: 0.4, cor: '#15803d', relevante: true,
        nome: 'Pendrive verde (BRINDE COPA 2014)',
        descricao: 'Pendrive de brinde, com o adesivo meio descascado. Foi apreendido com o suspeito. Está sobre um papel-toalha engordurado de pizza, o que diz muito sobre a cadeia de custódia até aqui.',
        detalhes: ['Etiqueta: "COPA 2014 · 16 GB"', 'Sem tampa', 'Sem LED'],
        acoes: [
          { id: 'espetar', rotulo: 'Espetar no notebook do delegado para ver rapidinho', toca: true, integridade: -25, flags: ['espetou_pendrive'], unica: true, texto: 'O Windows do delegado montou o pendrive com escrita, criou System Volume Information, mexeu em data de último acesso e o antivírus "limpou" um arquivo. Você acabou de alterar a evidência original. Rapidinho.' },
          { id: 'coletar', rotulo: 'Coletar (luvas, etiqueta, lacre)', toca: true, coleta: { rotulo: 'Pendrive 16 GB, verde, brinde Copa 2014', embalagens: ['antiestatico', 'envelope'], dispositivo: 'pen' }, texto: 'Pendrive coletado sem ser conectado a nada. Mídia de armazenamento se preserva desligada: ela não tem bateria nem rede, então o risco é alguém conectar.' },
        ],
      },
      {
        id: 'folha', modelo: 'papel', pos: [3.4, 0.79, 1.35], rot: -0.2, relevante: true,
        nome: 'Folha impressa dobrada',
        descricao: 'Uma folha A4 com o cabeçalho "PROVA TIPO 2" e uma mancha de café em forma de Brasil. Evidência física, mas que conversa com a digital.',
        acoes: [
          { id: 'coletar', rotulo: 'Coletar a folha', toca: true, coleta: { rotulo: 'Folha A4 impressa, cabeçalho PROVA TIPO 2', embalagens: ['envelope'] }, texto: 'Folha coletada. Documento vai para exame de documentoscopia depois. Papel é papel: envelope de papel, nunca plástico.' },
        ],
      },
      {
        id: 'note', modelo: 'notebook', pos: [3.55, 0.79, 0.95], rot: Math.PI, tela: ['#Paciência', 'Pontuação: 4.120', 'Tempo: 03:12:44'], cor: '#4b5563',
        nome: 'Notebook do delegado',
        descricao: 'O notebook funcional do Dr. Anselmo, com uma partida de Paciência que já dura 3 horas. Não é evidência. É só um notebook muito perigoso para pendrives alheios.',
        acoes: [
          { id: 'fechar', rotulo: 'Fechar a tampa "para ninguém cair em tentação"', toca: true, credibilidade: -2, texto: 'O delegado olhou para você com a dor de quem perdeu uma partida de 3 horas. Não era evidência. Você fez um inimigo.', unica: true },
        ],
      },
      {
        id: 'pen2', modelo: 'pendrive', pos: [0.75, 0.79, 3.65], cor: '#1d4ed8',
        nome: 'Pendrive azul na mesa da escrivã',
        descricao: 'Outro pendrive, este na mesa da escrivã. Escrito à caneta: "MODELOS DE OFÍCIO + AMADO BATISTA".',
        acoes: [
          { id: 'coletar', rotulo: 'Coletar também (vai que...)', toca: true, credibilidade: -4, coleta: { rotulo: 'Pendrive azul da escrivã (modelos de ofício)', embalagens: ['antiestatico', 'envelope'] }, texto: 'Você apreendeu o pendrive da escrivã com os modelos de ofício. A delegacia parou. Dona Lurdes nunca vai te perdoar. Isso não estava no auto de apreensão.' },
        ],
      },
      { id: 'celpm', modelo: 'celular', pos: [2.65, 0.79, 1.48], rot: 1.2, tela: ['#06:41', '23 notificações', 'Grupo do Batalhão'], cor: '#334155', nome: 'Celular do soldado Josué', descricao: 'É do PM que fez a abordagem. Vibrou 4 vezes enquanto você olhava. Não é evidência, é só um grupo de batalhão muito ativo.', acoes: [{ id: 'pegar', rotulo: 'Pegar o celular para "conferir" alguma coisa', toca: true, credibilidade: -3, unica: true, texto: 'O soldado pegou o celular da sua mão. "É meu, doutor(a)." Você não tinha mandado nem ordem para isso.' }] },
      { id: 'pizza', modelo: 'pizza', pos: [0.55, 0.79, 4.0], nome: 'Caixa de pizza de calabresa', descricao: 'Sobrou um pedaço. Frio. Com cebola. Está chamando você. Não é evidência, é tentação.', acoes: [{ id: 'comer', rotulo: 'Comer o pedaço (de luvas?)', unica: true, credibilidade: -1, texto: 'Você comeu pizza fria de luvas nitrílicas no meio de uma cena. Ninguém viu. Todo mundo viu.' }] },
      { id: 'postit', modelo: 'postit', pos: [3.75, 0.79, 1.22], nome: 'Post-it amarelo', descricao: 'Escrito: "Wi-Fi DP: delegacia123". Não tem nada a ver com o caso, mas agora você sabe a senha do Wi-Fi.', acoes: [] },
      { id: 'caneca', modelo: 'caneca', pos: [2.45, 0.79, 1.45], nome: 'Caneca "Melhor Delegado do Mundo"', descricao: 'Presente da própria mãe dele, segundo a escrivã.', acoes: [] },
      { id: 'impressora', modelo: 'impressora', pos: [0.55, 0.79, 2.65], nome: 'Impressora do plantão', descricao: 'Com uma luz laranja piscando desde 2019. Tem uma folha atolada que ninguém tem coragem de puxar.', acoes: [] },
      { id: 'planta', modelo: 'planta', glb: 'potted_plant_01', pos: [5.45, 0, 2.6], nome: 'Comigo-ninguém-pode', descricao: 'Protege a delegacia contra mau-olhado. Contra contaminação de evidência, não.', acoes: [] },
    ],
    pessoas: [
      { id: 'delegado', nome: 'Dr. Anselmo Carimbo', papel: 'delegado plantonista', modelo: 'anselmo', pos: [3, 0.5], rot: 0, sentado: true, roupa: '#1f2937', pele: '#e0ac69', cabelo: '#4b5563', falas: ['Bom dia! É aquele pendrive verde ali. A folha também.', 'Meia hora dá, né? O juiz tá me ligando.', 'O soldado queria espetar no meu notebook, eu falei que não. Tô evoluindo.', 'Tem pizza. Fica à vontade. Menos no pendrive.'], reage: [{ flag: 'espetou_pendrive', fala: 'Ué, você mesmo(a) espetou no meu notebook? Então tá liberado agora? Vou avisar o soldado.' }] },
      { id: 'pm', nome: 'Sd. Josué', papel: 'policial que fez a abordagem', modelo: 'josue', pos: [1.9, 1.95], rot: 0.8, roupa: '#334155', pele: '#8d5524', cabelo: '#111', falas: ['O cara tava com o pendrive no bolso e a folha na mão. Eu peguei e coloquei aí na mesa.', 'Eu peguei com a mão mesmo, foi mal. Era de madrugada.', 'Eu ia ver o que tinha no pendrive pelo meu celular com adaptador, mas o delegado não deixou.'] },
      { id: 'escriva', nome: 'Dona Lurdes', papel: 'escrivã há 31 anos', modelo: 'lurdes', pos: [1.45, 3.4], rot: -Math.PI / 2, sentado: true, roupa: '#9d174d', pele: '#c68642', cabelo: '#d4d4d8', falas: ['O pendrive azul é MEU. Tem todos os modelos de ofício desde 1998. Nem pense.', 'Já vi perito(a) passar por aqui que apreendeu até o micro-ondas.', 'Faz o auto de apreensão direitinho que eu digito.'] },
    ],
  },
  lab: () => ({
    dispositivos: [PEN],
    boasVindas: [
      'Caso: gabarito vazado do concurso da Guarda Municipal de Vila Serena.',
      'Material: pendrive conectado à estação pelo leitor USB (/dev/sdb), ainda SEM bloqueador ligado.',
      '',
      'Roteiro sugerido (tutorial):',
      '  1. bloqueador on                     (sempre antes de tudo)',
      '  2. lsblk                             (veja o pendrive como sdb)',
      '  3. imajador adquirir /dev/sdb PEN.E01',
      '  4. imajador montar /evidencias/PEN.E01 e explore com ls e cat',
      '  5. Os arquivos apagados não aparecem no ls. Tente: formiga -i /evidencias/PEN.E01 -o ~/recuperados',
      '  6. file, strings e exifeiro nos arquivos recuperados',
      '  7. conv fuso "AAAA-MM-DD HH:MM:SS" -3   para passar de UTC para Brasília',
    ],
  }),
  metodologia: [
    { texto: 'A mídia foi conectada à estação pericial por meio de bloqueador de escrita (Trava-Bit T8).', certo: true },
    { texto: 'Foi gerada imagem forense (E01) com cálculo e verificação de hash SHA-256.', certo: true },
    { texto: 'Arquivos apagados foram recuperados por assinatura (carving) a partir da imagem, sem uso do original.', certo: true },
    { texto: 'Metadados EXIF foram analisados com ajuste do fuso horário registrado na foto.', certo: true },
    { texto: 'Para triagem rápida, o pendrive foi aberto no notebook da autoridade policial.', certo: false },
    { texto: 'Após a cópia, o pendrive foi formatado para ser devolvido limpo ao proprietário.', certo: false },
    { texto: 'O pendrive foi desfragmentado para facilitar a leitura dos arquivos.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', se: ['espetou_pendrive'], pergunta: 'Vossa Senhoria confirma que conectou o pendrive no notebook do delegado ANTES de qualquer cópia forense?', opcoes: [
      { texto: 'Confirmo, e registrei no laudo o que foi alterado e por quê. A análise foi feita na imagem posterior.', certa: true, reacao: 'A defesa insiste, mas a transparência salvou parte da prova. A juíza anota: "alteração documentada pelo próprio perito".' },
      { texto: 'Não lembro. Pode ter sido o soldado.', certa: false, reacao: 'O soldado está na plateia e faz que não com a cabeça. A juíza faz uma careta que vai custar caro.' },
    ] },
    { quem: 'defesa', se: ['aquisicao_sem_bloqueador'], pergunta: 'O próprio log da sua ferramenta diz "NÃO CONFERE" na verificação. O hash não bate, doutor(a). Como garantir que nada foi plantado?', opcoes: [
      { texto: 'Não garanto que a primeira imagem seja fiel. Por isso refiz a aquisição com bloqueador e expliquei a divergência no laudo.', certa: true, reacao: 'A promotoria respira aliviada. A defesa anota "erro confessado" e vai explorar no recurso.' },
      { texto: 'Hash é só um detalhe técnico, o conteúdo é o mesmo.', certa: false, reacao: 'Hash é exatamente o detalhe que prova que o conteúdo é o mesmo. A juíza pede para constar em ata.' },
    ] },
    { quem: 'defesa', pergunta: 'O arquivo do gabarito não aparece no pendrive quando a gente abre no computador. Como Vossa Senhoria explica um arquivo "invisível"? Não seria plantado?', opcoes: [
      { texto: 'Foi apagado. Apagar só marca o espaço como livre. Recuperei por assinatura direto da imagem, cujo hash bate com o da aquisição. O procedimento é reproduzível por outro perito.', certa: true, reacao: 'A juíza acena. "Reproduzível" é a palavra mágica. A defesa muda de assunto.' },
      { texto: 'Recuperei com um programa que acha arquivos escondidos. Ele é muito bom.', certa: false, reacao: '"Muito bom" não é metodologia. A defesa sorri pela primeira vez na manhã.' },
    ] },
    { quem: 'juiza', pergunta: 'O metadado diz 23h14. O laudo diz 20h14. Qual é o certo?', opcoes: [
      { texto: 'Os dois, em fusos diferentes. A câmera gravou em UTC (offset +00:00). Em Brasília, UTC-3, foram 20h14. O laudo informa o fuso de cada horário.', certa: true, reacao: 'A juíza agradece a didática. O promotor anota "20h14, antes da impressão oficial".' },
      { texto: 'Devo ter errado a conta, Excelência. Fica 23h14.', certa: false, reacao: 'Você jogou fora o ponto mais forte do laudo: a foto é anterior à impressão oficial. A defesa agradece.' },
    ] },
    { quem: 'defesa', se: ['custodia_quebrada'], pergunta: 'Onde o pendrive passou a noite entre a coleta e o laboratório? Há registro de quem teve acesso?', opcoes: [
      { texto: 'Não há registro completo desse período. Reconheço a falha e ela consta no laudo.', certa: true, reacao: 'Honestidade não conserta a cadeia de custódia, mas evita um processo por falso testemunho.' },
      { texto: 'Ficou em lugar seguro, pode confiar.', certa: false, reacao: '"Pode confiar" é tudo o que a cadeia de custódia existe para não precisar dizer.' },
    ] },
    { quem: 'defesa', se: ['embalagem_pen'], pergunta: 'O pendrive foi transportado em embalagem inadequada. Isso não pode ter danificado ou alterado a mídia?', opcoes: [
      { texto: 'A embalagem não era a ideal. O hash da imagem e a ausência de erro de leitura mostram que não houve dano aos dados, e isso consta no laudo.', certa: true, reacao: 'Ponto para a técnica. A juíza segue.' },
      { texto: 'Embalagem não faz diferença nenhuma.', certa: false, reacao: 'Faz. Estática queima mídia. A defesa adorou.' },
    ] },
  ],
  dicas: [
    'Por onde começo?\nLeia o LEIA-ME.txt (`cat LEIA-ME.txt`). Depois: `bloqueador on`, `lsblk`, `imajador adquirir /dev/sdb PEN.E01`.',
    'Onde está o hash?\nNo log que o imajador grava junto da imagem: `cat /evidencias/PEN.E01.txt`. Use o SHA256 da aquisição.',
    'Não acho o arquivo do concurso\nArquivo apagado não aparece no `ls`. Rode `formiga -i /evidencias/PEN.E01 -o ~/recuperados` e depois `ls -R`... ops, use `tree ~/recuperados`.',
    'Como leio o PDF?\n`file` confirma o tipo, `strings arquivo.pdf` mostra o texto.',
    'E a foto?\n`exifeiro arquivo.jpg`. Repare no Offset Time Original. Depois `conv fuso "2026-11-20 23:14:51" -3`.',
  ],
  falhas: {
    espetou_pendrive: 'O pendrive foi conectado ao notebook do delegado antes da aquisição: a evidência original foi alterada.',
    aquisicao_sem_bloqueador: 'Aquisição feita sem bloqueador de escrita: o hash de verificação não bateu.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral (fixação incompleta).',
    mexeu_sem_foto: 'Evidência foi manipulada antes de ser fotografada na posição original.',
    sem_luvas: 'Coleta sem luvas: suas digitais agora estão no material.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_pen: 'Pendrive acondicionado em embalagem inadequada.',
    embalagem_folha: 'Documento em papel acondicionado em embalagem inadequada.',
    nao_coletou_pen: 'O pendrive nem foi coletado.',
    nao_coletou_folha: 'A folha impressa ficou na delegacia.',
  },
};
