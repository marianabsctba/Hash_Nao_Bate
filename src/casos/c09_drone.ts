// Caso 9: drone e veículo. Celular entregue por drone no presídio, drone caído no pátio e um carro que lembra de tudo.
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';

const BR = (s: string) => T.data(s, -3);
const HOME = { lat: -25.50123, lon: -49.30456 };
const ALVO = { lat: -25.4901, lon: -49.2922 };
const DECOLA = BR('2026-11-07 01:12:04');
const CHEGADA_CARRO = BR('2026-11-07 00:58:40');
const ALT_MAX = 118.4;

function logVoo(): string {
  const r = new Rng(909);
  const linhas = ['offset_s,gps_time_utc,lat,lon,alt_rel_m,vel_ms,bateria_pct,estado'];
  const pontos = 600;
  for (let i = 0; i <= pontos; i++) {
    const s = i * 2;
    const t = new Date(DECOLA.getTime() + s * 1000);
    let f: number;
    let estado: string;
    let alt: number;
    if (i < 20) { f = 0; estado = 'DECOLANDO'; alt = i * 5.5; }
    else if (i < 220) { f = (i - 20) / 200; estado = 'VOANDO'; alt = 110 + Math.sin(i / 9) * 6; }
    else if (i < 300) { f = 1; estado = i === 260 ? 'SOLTOU_CARGA' : 'PAIRANDO'; alt = i < 250 ? 110 - (i - 220) * 2.6 : 32 + r.prox(); }
    else if (i < 560) { f = 1 - (i - 300) / 600; estado = 'RETORNANDO'; alt = 70 + Math.sin(i / 7) * 3; }
    else { f = 0.57 - (i - 560) * 0.001; estado = i > 590 ? 'QUEDA' : 'BATERIA_CRITICA'; alt = Math.max(0, 70 - (i - 560) * 2.4); }
    if (i === 140) alt = ALT_MAX;
    const lat = HOME.lat + (ALVO.lat - HOME.lat) * f + (r.prox() - 0.5) * 0.00002;
    const lon = HOME.lon + (ALVO.lon - HOME.lon) * f + (r.prox() - 0.5) * 0.00002;
    const bat = Math.max(3, 100 - Math.round(i * 0.165));
    linhas.push([s, T.iso(t), (i === 0 ? HOME.lat : lat).toFixed(5), (i === 0 ? HOME.lon : lon).toFixed(5), alt.toFixed(1), (estado === 'VOANDO' || estado === 'RETORNANDO' ? 8 + r.prox() * 6 : r.prox()).toFixed(1), bat, estado].join(','));
    if (estado === 'QUEDA' && alt === 0) break;
  }
  return linhas.join('\n') + '\n';
}

function carro(): () => import('../motor/vfs').Pasta {
  return () => {
    const r = new Rng(19);
    const trilha = ['unix_s,lat,lon,vel_kmh'];
    let t = BR('2026-11-06 23:40:00').getTime();
    const origem = { lat: -25.4290, lon: -49.2710 };
    for (let i = 0; i <= 120; i++) {
      const f = i / 120;
      const lat = i === 120 ? HOME.lat : origem.lat + (HOME.lat - origem.lat) * f + (r.prox() - 0.5) * 0.0003;
      const lon = i === 120 ? HOME.lon : origem.lon + (HOME.lon - origem.lon) * f + (r.prox() - 0.5) * 0.0003;
      trilha.push([T.unix(new Date(t)), lat.toFixed(5), lon.toFixed(5), i === 120 ? 0 : r.int(20, 80)].join(','));
      t = i === 119 ? CHEGADA_CARRO.getTime() : t + r.int(25, 45) * 1000;
    }
    for (let k = 1; k <= 30; k++) trilha.push([T.unix(new Date(CHEGADA_CARRO.getTime() + k * 60e3)), HOME.lat.toFixed(5), HOME.lon.toFixed(5), 0].join(','));
    const eventos = ['unix_s,evento', ...[[CHEGADA_CARRO.getTime() + 20e3, 'MARCHA_P'], [CHEGADA_CARRO.getTime() + 45e3, 'PORTA_MOTORISTA_ABERTA'], [CHEGADA_CARRO.getTime() + 60e3, 'PORTA_MALAS_ABERTO'], [CHEGADA_CARRO.getTime() + 300e3, 'PORTA_MALAS_FECHADO'], [BR('2026-11-07 01:35:10').getTime(), 'PORTA_MOTORISTA_ABERTA'], [BR('2026-11-07 01:35:40').getTime(), 'IGNICAO_LIGADA']].map(([ms, e]) => `${Math.floor(Number(ms) / 1000)},${e}`)];
    return pasta({
      'info_central.txt': arq('Central multimídia VELOZ MX-7\nVeículo: hatch vermelho, placa ABC1D23\nVIN: 9BWZZZ377VT004251\nFuso dos registros: UTC (unix)\n'),
      'dispositivos_pareados.json': arq(JSON.stringify({ pareados: [
        { nome: 'Celumax do Washington', mac: '6A:1F:02:9C:33:E1', ultimo_uso_unix: T.unix(CHEGADA_CARRO), contatos_sincronizados: 312 },
        { nome: 'Celular Mãe', mac: '44:10:AA:20:91:07', ultimo_uso_unix: T.unix(BR('2026-10-02 12:00:00')), contatos_sincronizados: 88 },
        { nome: 'Caixinha Som Bom', mac: '00:11:22:33:44:55', ultimo_uso_unix: T.unix(BR('2026-09-19 22:00:00')), contatos_sincronizados: 0 },
      ] }, null, 2) + '\n'),
      'chamadas.csv': arq(['unix_s,numero,nome,direcao,duracao_s', `${T.unix(BR('2026-11-07 00:59:30'))},+5541991127788,Parça do Painel,saida,42`, `${T.unix(BR('2026-11-07 01:29:02'))},+5541991127788,Parça do Painel,entrada,18`, `${T.unix(BR('2026-11-06 19:10:00'))},+5541988120033,Mãe,entrada,300`].join('\n') + '\n'),
      'gps_trilha.csv': arq(trilha.join('\n') + '\n'),
      'eventos.csv': arq(eventos.join('\n') + '\n'),
    });
  };
}

export const caso09: Caso = {
  id: 'c09',
  numero: 9,
  titulo: 'Entrega Expressa',
  subtitulo: 'Um drone soltou celulares dentro do presídio e caiu sem bateria. Lá fora, um carro com a central multimídia mais fofoqueira do Paraná.',
  modulo: 'Coleta e análise em veículos, drones e casos integrados',
  dificuldade: 3,
  resumo: 'Na madrugada de 07/11/2026, um drone sobrevoou a Penitenciária de Piraquara, soltou um pacote com celulares no pátio e caiu perto do muro, sem bateria. A PM abordou um hatch vermelho estacionado numa estrada de terra a 1,6 km, com o motorista dentro. Ele diz que parou "para ver as estrelas".',
  canal: 'zap',
  chamado: [
    { de: 'Sd. Josué', texto: 'Perito(a), drone caído no pátio do presídio e um carro suspeito lá fora. O motorista é o Washington. Aquele da quitinete.', hora: '02:10' },
    { de: 'Você', texto: 'O do falso sobrinho? Saiu?', hora: '02:11', eu: true },
    { de: 'Sd. Josué', texto: 'Saiu na audiência de custódia. Diversificou o negócio.', hora: '02:11' },
    { de: 'Sd. Josué', texto: 'O agente penitenciário quer jogar o drone no lixo. Diz que "já tá quebrado mesmo".', hora: '02:12' },
    { de: 'Você', texto: 'Ninguém joga nada. O drone grava o voo inteiro. E o carro também tem memória.', hora: '02:12', eu: true },
  ],
  oficio: ['Delegacia de Polícia de Piraquara. Auto de prisão em flagrante nº 2026.1107. Art. 349-A do Código Penal (ingresso de aparelho telefônico em estabelecimento prisional).', 'Requisita exame no drone apreendido e na central multimídia do veículo, para estabelecer o trajeto do voo e a relação entre o veículo e o ponto de decolagem.'],
  quesitos: [
    { id: 'q1', texto: 'Qual a latitude do ponto de decolagem (home point) do drone? Use graus decimais com 4 casas.', formato: '-25.xxxx', tipo: 'numero', tolerancia: 0.00015, respostas: [HOME.lat.toFixed(4)], explicacao: 'O log decodificado pelo DatCão começa no offset 0 com o estado DECOLANDO: lat -25.50123, lon -49.30456. É a primeira linha de dados do CSV.', prejudicado: (f) => f.has('nao_coletou_drone') || f.has('descartou_drone') },
    { id: 'q2', texto: 'Qual a altitude máxima, relativa à decolagem, registrada no voo? (em metros)', formato: 'número com uma casa decimal', tipo: 'numero', tolerancia: 0.05, respostas: [String(ALT_MAX)], explicacao: `sort -t, -k5 -n voo.csv | tail -1 (ou awk) mostra ${ALT_MAX} m. Altitude de drone é relativa ao ponto de decolagem, não ao nível do mar. O limite usual para voo recreativo é 120 m acima do solo: ele voou no limite para não ser visto.`, prejudicado: (f) => f.has('nao_coletou_drone') || f.has('descartou_drone') },
    { id: 'q3', texto: 'Em que horário (Brasília) o log registra a soltura da carga?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-07 01:20'], explicacao: 'A linha com estado SOLTOU_CARGA tem gps_time_utc 2026-11-07T04:20:44Z. Em Brasília, 01:20. O GPS do drone é a referência de tempo mais confiável do caso: vem dos satélites.', prejudicado: (f) => f.has('nao_coletou_drone') || f.has('descartou_drone') },
    { id: 'q4', texto: 'Qual o nome do celular pareado por Bluetooth com a central multimídia do carro, usado por último na noite dos fatos?', formato: 'nome do dispositivo', tipo: 'texto', respostas: ['Celumax do Washington'], explicacao: 'dispositivos_pareados.json: "Celumax do Washington", com último uso às 00:58:40 (Brasília) de 07/11, e o MAC 6A:1F:02:9C:33:E1. Esse MAC é o mesmo do aparelho que aparece no roteador da casa do caso 4. Mundo pequeno, crime pequeno.', prejudicado: (f) => !f.has('extraiu_central') },
    { id: 'q5', texto: 'Em que horário (Brasília) o carro chegou e parou no ponto de onde o drone decolou?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-07 00:58'], explicacao: 'Na trilha de GPS do carro, o primeiro registro com as coordenadas do home point (-25.50123, -49.30456) e velocidade 0 é o unix 1794023920: 00:58:40 em Brasília. Treze minutos depois, o drone decolou dali. Grep pelas coordenadas e conv unix.', prejudicado: (f) => !f.has('extraiu_central') },
  ],
  cena: {
    local: 'Guarita e pátio externo da Penitenciária de Piraquara',
    largura: 9,
    profundidade: 7,
    altura: 3.2,
    piso: '#ffffff',
    parede: '#b8b5ad',
    pisoTex: 'garage_floor',
    pisoEscala: 2.5,
    paredeTex: 'grey_plaster',
    luz: 'garagem',
    inicio: [4.5, 6.3, 0],
    saida: [8.4, 6.4],
    moveis: [
      { tipo: 'glb', glb: 'metal_office_desk', pos: [1.3, 0, 1.0], escala: 0.8 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [1.3, 0, 1.8], rot: Math.PI },
      { tipo: 'glb', glb: 'metal_trash_can#0', pos: [0.5, 0, 3.0] },
      { tipo: 'glb', glb: 'old_tyre', pos: [8.5, 0.3, 1.0], rot: 0.4, solido: false },
      { tipo: 'glb', glb: 'plastic_crate_01', pos: [8.4, 0, 2.0] },
      { tipo: 'glb', glb: 'plastic_crate_01', pos: [8.4, 0.26, 2.05], rot: 0.3 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [7.8, 0, 0.4] },
      { tipo: 'glb', glb: 'security_camera_01', pos: [8.8, 2.9, 0.2], rot: -2.4, solido: false },
      { tipo: 'glb', glb: 'korean_fire_extinguisher_01', pos: [0.4, 0, 0.4] },
      { tipo: 'glb', glb: 'wall_clock', pos: [1.3, 2.3, 0.03], solido: false },
      { tipo: 'portao', pos: [4.5, 0, 0.05] },
      { tipo: 'porta', pos: [8.4, 0, 6.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'drone', modelo: 'drone', pos: [3.0, 0, 3.4], rot: 0.7, escala: 1.4, relevante: true,
        nome: 'Drone caído (sem bateria)',
        descricao: 'Quadricóptero de uns 900 g, com hélice quebrada e bateria em 3%. Tem um gancho de soltura improvisado com abraçadeira. Guarda o log de voo completo na memória interna e no cartão.',
        detalhes: ['Fabricante: Zangão Aero', 'Modelo: ZA-Mini 4', 'Serial: ZA4-2611-00987', 'Bateria: 3%'],
        acoes: [
          { id: 'ligar', rotulo: 'Ligar o drone para "ver se ainda funciona"', toca: true, unica: true, credibilidade: -3, flags: ['ligou_drone'], texto: 'Ligou, apitou, tentou buscar o controle e começou um voo novo no log: um registro de 40 segundos às 02:30, no pátio. Agora o log tem um voo "da perícia" misturado. Documente no laudo.' },
          { id: 'descartar', rotulo: 'Deixar o agente jogar no lixo "porque já tá quebrado"', unica: true, flags: ['descartou_drone'], integridade: -25, texto: 'O drone foi para a caçamba e de lá para o caminhão de lixo. Junto, o trajeto do voo, o ponto de decolagem e o horário da entrega.' },
          { id: 'coletar', rotulo: 'Coletar o drone, o gancho e a bateria separadamente', toca: true, bloqueiaSe: ['descartou_drone'], coleta: { rotulo: 'Drone Zangão Aero ZA-Mini 4, serial ZA4-2611-00987, com bateria e gancho', embalagens: ['caixa', 'faraday'], dispositivo: 'drone' }, texto: 'Coletado em caixa, com a bateria retirada e embalada à parte (bateria de lítio danificada é risco de incêndio). Hélices e gancho também.' },
        ],
      },
      {
        id: 'carro', modelo: 'carro', glb: 'covered_car', pos: [5.6, 0, 3.4], rot: Math.PI / 2, relevante: true,
        nome: 'Hatch vermelho do investigado',
        descricao: 'Carro guinchado até o pátio e coberto com lona, como manda o procedimento (chuva e curioso destroem vestígio). Debaixo da lona, um hatch vermelho. No porta-malas, uma caixa de abraçadeiras e um carregador de bateria de drone ainda morno. No painel, a central multimídia, que sincroniza celular, guarda trilha de GPS e registra quando cada porta abre.',
        detalhes: ['Placa: ABC1D23', 'Central: VELOZ MX-7', 'No porta-malas: carregador de bateria de drone', 'No console: um bilhete "PIRAQUARA 01h"'],
        acoes: [
          { id: 'central', rotulo: 'Remover a central multimídia (com autorização no auto) para extração no laboratório', toca: true, unica: true, flags: ['extraiu_central'], coleta: { rotulo: 'Central multimídia VELOZ MX-7 do veículo ABC1D23', embalagens: ['antiestatico', 'caixa'], dispositivo: 'carro' }, texto: 'Central removida pelo técnico do pátio, com fotos de cada conector antes de soltar. Vai para a extração com o Berlinda iVê.' },
          { id: 'mexer', rotulo: 'Sentar no carro e navegar no menu da central para ver o histórico', toca: true, unica: true, credibilidade: -4, flags: ['mexeu_central'], texto: 'Você mexeu no menu, ligou a ignição para a tela acender e gerou eventos novos: "IGNICAO_LIGADA" e "PORTA_MOTORISTA_ABERTA" às 02:40, misturados com os da noite. Documente.' },
        ],
      },
      { id: 'controle', modelo: 'controle', pos: [1.6, 0.63, 1.2], rot: 1.2, nome: 'Controle remoto do drone (achado no banco do carro)', descricao: 'Controle do ZA-Mini 4 com tela pequena, que estava embaixo do banco do passageiro (junto com um saco de batatinha). A PM retirou antes do guincho e deixou na mesa da guarita, com termo. Também guarda um resumo dos voos.', acoes: [{ id: 'coletar', rotulo: 'Coletar o controle', toca: true, coleta: { rotulo: 'Controle remoto Zangão Aero', embalagens: ['faraday', 'antiestatico'] }, integridade: 2, texto: 'Coletado. Corrobora o vínculo entre o carro e o drone (pareamento pelo serial).' }] },
      { id: 'pacote', modelo: 'caixa', pos: [1.2, 0.63, 1.0], escala: 0.5, nome: 'Pacote que caiu no pátio (já com o agente)', descricao: 'Fita adesiva marrom, 4 celulares e 4 carregadores dentro. Foi recolhido pelos agentes antes da sua chegada, sem registro de quem pegou. Registre a lacuna.', acoes: [{ id: 'coletar', rotulo: 'Coletar o pacote e registrar quem manuseou antes', toca: true, coleta: { rotulo: 'Pacote com 4 celulares e 4 carregadores', embalagens: ['caixa'] }, integridade: 1, texto: 'Coletado, com termo dos agentes que manusearam antes (nome, horário, onde guardaram). Cadeia de custódia começa quando a polícia toca, não quando a perícia chega.' }] },
      { id: 'radio', modelo: 'celular', pos: [1.6, 0.63, 0.9], cor: '#1f2937', tela: ['#Rádio HT', 'Canal 3'], nome: 'Rádio da guarita', descricao: 'Rádio HT dos agentes. Chiando. Não é evidência.', acoes: [] },
    ],
    pessoas: [
      { id: 'gilson', nome: 'Agente Gilson', papel: 'agente penitenciário', modelo: 'gilson', pos: [2.2, 2.4], rot: 1.0, falas: ['Esse drone já tá quebrado, vou jogar no lixo e acabou.', 'Toda semana cai um. Já tenho uma coleção na sala.', 'O pacote? Peguei com a mão e guardei na gaveta. Fiz errado?'], reage: [{ flag: 'descartou_drone', fala: 'Pronto, joguei. Ficou mais organizado o pátio, né?' }] },
      { id: 'washington', nome: 'Washington', papel: 'investigado (de novo)', modelo: 'washington', pos: [7.0, 5.2], rot: -2.6, falas: ['Eu parei pra ver as estrelas. Gosto de astronomia.', 'Esse carregador de drone no porta-malas? É de um amigo.', 'Doutor(a) de novo? A gente tem que parar de se encontrar assim.'] },
      { id: 'josue', nome: 'Sd. Josué', papel: 'policial militar', modelo: 'josue', pos: [2.6, 5.6], rot: 2.2, falas: ['O carro tava com o motor frio e o carregador quente. Astronomia, sei.', 'Guinchamos até aqui pra senhora (o senhor) trabalhar no claro.', 'Esse Washington tem mais passagem que ônibus.'] },
    ],
  },
  lab: (c) => {
    const drone: Dispositivo = {
      id: 'drone', dev: '/dev/sdd', rotulo: 'Memória interna do drone ZA-Mini 4 (via adaptador)', tipo: 'disco', tamanho: '7.4G', semente: 7909,
      conteudo: () => pasta({
        FLY_LOGS: pasta({
          'FLY041.DAT': esp({ tipo: 'binario', magia: [0x5a, 0x41, 0x34, 0x01], texto: ['ZA4 flight record'], formato: 'data (log de voo de drone, cifrado)', decodificado: 'offset_s,gps_time_utc,lat,lon,alt_rel_m,vel_ms,bateria_pct,estado\n0,2026-10-30T22:10:00Z,-25.44100,-49.26900,0.0,0.0,100,DECOLANDO\n30,2026-10-30T22:10:30Z,-25.44110,-49.26910,12.0,1.2,98,PAIRANDO\n60,2026-10-30T22:11:00Z,-25.44100,-49.26900,0.0,0.0,97,POUSADO\n' }),
          'FLY042.DAT': esp({ tipo: 'binario', magia: [0x5a, 0x41, 0x34, 0x01], texto: ['ZA4 flight record'], formato: 'data (log de voo de drone, cifrado)', decodificado: logVoo() }),
          ...(c.flags.has('ligou_drone') ? { 'FLY043.DAT': esp({ tipo: 'binario', magia: [0x5a, 0x41, 0x34, 0x01], texto: ['ZA4 flight record'], formato: 'data (log de voo de drone, cifrado)', decodificado: 'offset_s,gps_time_utc,lat,lon,alt_rel_m,vel_ms,bateria_pct,estado\n0,2026-11-07T05:30:00Z,-25.49050,-49.29300,0.0,0.0,3,LIGADO_SEM_CONTROLE\n' }) } : {}),
        }),
        DCIM: pasta({ 'ZA_0001.JPG': esp({ tipo: 'jpeg', legenda: 'Foto de teste do drone: o quintal de uma casa com uma piscina de plástico e um cachorro olhando para cima.', exif: { 'Make': 'Zangão Aero', 'Camera Model Name': 'ZA-Mini 4', 'Date/Time Original': '2026:10:30 19:10:31' } }) }),
        'info.txt': arq('Zangão Aero ZA-Mini 4\nSerial: ZA4-2611-00987\nFirmware: 01.04.0500\nRegistro de voo: FLY_LOGS/*.DAT (decodificar com DatCão)\n'),
      }),
    };
    const veic: Dispositivo = { id: 'carro', dev: 'usb:veiculo-1', rotulo: 'Central VELOZ MX-7 (hatch ABC1D23)', tipo: 'veiculo', tamanho: '16G', semente: 7919, extracoes: { fs: carro() } };
    return {
      dispositivos: [drone, veic],
      boasVindas: [
        'Caso: drone com celulares no presídio de Piraquara (07/11/2026).',
        'Material: memória do drone em /dev/sdd; central do veículo no Berlinda iVê.',
        '',
        'Roteiro:',
        '  bloqueador on; imajador adquirir /dev/sdd DRONE.E01; imajador montar /evidencias/DRONE.E01',
        '  datcao /mnt/DRONE/FLY_LOGS/FLY042.DAT -o ~/voo.csv',
        '  sort -t, -k5 -n ~/voo.csv | tail -1     (altitude máxima)',
        '  berlinda listar; berlinda extrair carro',
        '  conv unix <segundos>',
      ],
    };
  },
  metodologia: [
    { texto: 'O drone foi coletado com a bateria removida e embalada separadamente, sem ser ligado.', certo: true },
    { texto: 'A memória do drone foi adquirida com bloqueador de escrita e o log de voo decodificado para CSV.', certo: true },
    { texto: 'A central multimídia foi removida com registro fotográfico e extraída em laboratório.', certo: true },
    { texto: 'A trilha de GPS do veículo foi correlacionada com o ponto de decolagem do drone, em horário de Brasília.', certo: true },
    { texto: 'O drone foi ligado no local para verificar se ainda voava.', certo: false },
    { texto: 'O histórico da central foi consultado ligando a ignição do veículo no pátio.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', pergunta: 'O carro estava parado na estrada. Isso prova que meu cliente pilotava o drone?', opcoes: [
      { texto: 'Prova que o carro chegou às 00h58 exatamente ao ponto de onde o drone decolou às 01h12, que o celular dele estava pareado ao carro nesse horário e que houve ligação para o mesmo "Parça do Painel" antes e depois da soltura. Quem segurava o controle é conclusão que junta isso às demais provas.', certa: true, reacao: 'O promotor só precisou ler o laudo em voz alta. A defesa pede um recesso.' },
      { texto: 'Prova sim, sem dúvida, ele pilotava.', certa: false, reacao: 'O laudo não filma ninguém pilotando. A defesa explora o exagero.' },
    ] },
    { quem: 'defesa', se: ['ligou_drone'], pergunta: 'O log tem um voo às 2h30, depois da prisão. Quem estava voando?', opcoes: [
      { texto: 'Fui eu, ao ligar o drone no local, erro que está documentado. É o FLY043, de 40 segundos e sem controle, separado do FLY042, que é o voo dos fatos.', certa: true, reacao: 'Erro admitido e isolado. A juíza anota e segue.' },
      { texto: 'Deve ser um erro do equipamento.', certa: false, reacao: 'A defesa mostra a foto sua segurando o drone às 2h30. Constrangedor.' },
    ] },
    { quem: 'juiza', pergunta: 'A altitude de 118 metros é acima do mar?', opcoes: [
      { texto: 'Não. É relativa ao ponto de decolagem, como todo registro de drone. Significa que ele voou a 118 metros do chão da estrada, perto do limite de 120 metros do voo recreativo.', certa: true, reacao: 'A juíza agradece: "então ele voou alto para não ser visto". Exato.' },
      { texto: 'Sim, é a altitude padrão.', certa: false, reacao: 'Piraquara fica a uns 900 metros acima do mar. Se fosse isso, o drone estaria cavando.' },
    ] },
    { quem: 'promotoria', se: ['descartou_drone'], pergunta: 'Onde está o drone?', opcoes: [
      { texto: 'Foi descartado no local antes da coleta, com minha anuência, o que foi um erro grave. Os quesitos sobre o voo ficaram prejudicados.', certa: true, reacao: 'O promotor fecha os olhos por um longo segundo. Mas pelo menos você não mentiu.' },
      { texto: 'Estava quebrado, não tinha valor de prova.', certa: false, reacao: 'Quebrado por fora, com o log inteiro por dentro. A defesa agradece a "sinceridade".' },
    ] },
  ],
  dicas: [
    'Drone\n`bloqueador on`, `imajador adquirir /dev/sdd DRONE.E01`, `imajador montar /evidencias/DRONE.E01`, `ls /mnt/DRONE/FLY_LOGS`. São dois voos: qual é o da noite?',
    'Decodificar\n`datcao /mnt/DRONE/FLY_LOGS/FLY042.DAT -o ~/voo.csv` e `head ~/voo.csv`.',
    'Altitude máxima\n`sort -t, -k5 -n ~/voo.csv | tail -1`.',
    'Soltura\n`grep SOLTOU ~/voo.csv` e `conv fuso` (o horário vem em UTC com Z).',
    'Carro\n`berlinda extrair carro`, depois `cat` no JSON de pareados e `grep "-25.50123" gps_trilha.csv | head -1` e `conv unix`.',
  ],
  falhas: {
    descartou_drone: 'O drone foi descartado no local antes da coleta.',
    ligou_drone: 'O drone foi ligado no local, gerando um registro de voo novo.',
    mexeu_central: 'A central do veículo foi manipulada no local, gerando eventos novos.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    nao_coletou_drone: 'O drone não foi coletado.',
    nao_coletou_carro: 'A central do veículo não foi coletada.',
    embalagem_drone: 'Drone acondicionado de forma inadequada.',
  },
};
