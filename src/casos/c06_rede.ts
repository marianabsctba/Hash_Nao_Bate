// Caso 6: rede. Uma fábrica de móveis, um computador do setor de compras falando demais e um pcap cheio de fofoca.
import type { Caso } from './tipos';
import { arq, esp, pasta } from '../motor/vfs';
import type { No, Pacote } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';

const U = (s: string) => T.data(s, 0);
const INFECTADO = '10.0.0.23';
const C2 = '198.51.100.23';
const FTP = '203.0.113.50';
const DOMINIO = 'dados-nuvem.exemplo';
const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function captura(): No {
  const r = new Rng(606);
  const ps: Pacote[] = [];
  const ini = U('2026-11-10 13:00:00').getTime();
  const fim = ini + 30 * 60e3;
  const hosts = ['10.0.0.11', '10.0.0.12', '10.0.0.15', '10.0.0.31', '10.0.0.40', INFECTADO];
  const sites = ['www.buscador.exemplo', 'noticias.exemplo', 'email.exemplo', 'erp.pinhao.exemplo', 'video.exemplo', 'cdn.redesocial.exemplo', 'update.sistema.exemplo', 'banco-confiavel.exemplo', 'nfe.fazenda.exemplo', 'musica.exemplo'];
  let fluxo = 100;
  for (let i = 0; i < 1400; i++) {
    const t = new Date(ini + r.prox() * (fim - ini));
    const h = r.pick(hosts);
    const tipo = r.int(0, 9);
    if (tipo < 4) {
      const s = r.pick(sites);
      const id = r.hex(4);
      ps.push({ t, src: h, dst: '10.0.0.1', sport: r.int(40000, 65000), dport: 53, proto: 'UDP', app: 'DNS', info: `Standard query 0x${id} A ${s}` });
      ps.push({ t: new Date(t.getTime() + 12), src: '10.0.0.1', dst: h, sport: 53, dport: 40000, proto: 'UDP', app: 'DNS', info: `Standard query response 0x${id} A ${s} A 192.0.2.${r.int(1, 254)}` });
    } else if (tipo < 8) {
      const s = r.pick(sites);
      ps.push({ t, src: h, dst: `192.0.2.${r.int(1, 254)}`, sport: r.int(40000, 65000), dport: 443, proto: 'TCP', app: 'TLS', info: `Client Hello SNI=${s}`, fluxo: fluxo++ });
    } else if (tipo === 8) {
      ps.push({ t, src: h, dst: '10.0.0.5', sport: r.int(40000, 65000), dport: 445, proto: 'TCP', app: 'SMB', info: `Tree Connect Request Tree: \\\\FILESERVER\\${r.pick(['compras', 'rh', 'projetos', 'publico'])}` });
    } else {
      ps.push({ t, src: h, dst: '192.0.2.123', sport: 123, dport: 123, proto: 'UDP', app: 'NTP', info: 'NTP Version 4, client' });
    }
  }
  // túnel DNS: o arquivo sai em pedacinhos como subdomínio
  const conteudo = 'arquivo=custos_pinhao_2027.xlsx|linha=cadeira dobravel PINHAO|custo=87,40|margem=38%|fornecedor=Madeireira Sul|' + 'x'.repeat(10);
  const partes = conteudo.match(/.{1,32}/g)!;
  partes.forEach((p, i) => {
    const t = new Date(ini + 7 * 60e3 + i * 4100);
    const id = r.hex(4);
    ps.push({ t, src: INFECTADO, dst: '10.0.0.1', sport: 51000 + i, dport: 53, proto: 'UDP', app: 'DNS', info: `Standard query 0x${id} TXT ${b64url(p)}.${i}.${DOMINIO}` });
    ps.push({ t: new Date(t.getTime() + 40), src: '10.0.0.1', dst: INFECTADO, sport: 53, dport: 51000 + i, proto: 'UDP', app: 'DNS', info: `Standard query response 0x${id} TXT ${b64url(p)}.${i}.${DOMINIO} TXT "ok"` });
  });
  // beacon HTTP para o C2, a cada 5 minutos
  for (let k = 0; k < 6; k++) {
    const t = new Date(ini + 2 * 60e3 + k * 300e3);
    const f = 7 + k * 100;
    ps.push({ t, src: INFECTADO, dst: C2, sport: 49200 + k, dport: 80, proto: 'TCP', app: 'HTTP', info: 'POST /gate.php HTTP/1.1', dados: `POST /gate.php HTTP/1.1\nHost: ${C2}\nUser-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)\nContent-Type: application/x-www-form-urlencoded\n\nid=PC-COMPRAS-03&os=win10&av=AntivirusBarato&ver=2.1`, fluxo: f });
    ps.push({ t: new Date(t.getTime() + 180), src: C2, dst: INFECTADO, sport: 80, dport: 49200 + k, proto: 'TCP', app: 'HTTP', info: 'HTTP/1.1 200 OK (text/plain)', dados: `HTTP/1.1 200 OK\nServer: nginx\nContent-Type: text/plain\n\n${k === 1 ? 'cmd=exfil dns ' + DOMINIO : 'cmd=sleep 300'}`, fluxo: f });
  }
  // FTP em texto claro: o "envio para o fornecedor"
  const tf = ini + 18 * 60e3;
  const ftp: [number, string, string, string, string][] = [
    [0, FTP, INFECTADO, 'Response: 220 FTP pronto (vsftpd)', '220 FTP pronto (vsftpd)'],
    [300, INFECTADO, FTP, 'Request: USER compras', 'USER compras'],
    [420, FTP, INFECTADO, 'Response: 331 Please specify the password.', '331 Please specify the password.'],
    [900, INFECTADO, FTP, 'Request: PASS Pinhao@2026', 'PASS Pinhao@2026'],
    [1100, FTP, INFECTADO, 'Response: 230 Login successful.', '230 Login successful.'],
    [1500, INFECTADO, FTP, 'Request: STOR orcamento_concorrencia_2027.zip', 'STOR orcamento_concorrencia_2027.zip'],
    [9000, FTP, INFECTADO, 'Response: 226 Transfer complete.', '226 Transfer complete.'],
    [9300, INFECTADO, FTP, 'Request: QUIT', 'QUIT'],
  ];
  for (const [dt, src, dst, info, dados] of ftp) ps.push({ t: new Date(tf + dt), src, dst, sport: src === INFECTADO ? 50122 : 21, dport: src === INFECTADO ? 21 : 50122, proto: 'TCP', app: 'FTP', info, dados, fluxo: 12 });
  ps.sort((a, b) => a.t.getTime() - b.t.getTime());
  return esp({ tipo: 'pcap', pacotes: ps });
}

export const caso06: Caso = {
  id: 'c06',
  numero: 6,
  titulo: 'O Pcap da Discórdia',
  subtitulo: 'Fábrica de móveis, um PC do setor de compras falando demais e um pcap de 30 minutos cheio de fofoca.',
  modulo: 'Coleta e análise em ambientes de rede',
  dificuldade: 3,
  resumo: 'A Móveis Pinhão Ltda., de Araucária, perdeu duas licitações para um concorrente que cobriu suas propostas por centavos. A TI notou tráfego estranho saindo da rede à noite e de dia. Suspeita-se de espionagem empresarial com malware num computador interno.',
  canal: 'zap',
  chamado: [
    { de: 'Dr. Adamastor (dono da fábrica)', texto: 'Doutor(a), alguém tá vendendo meus orçamentos pro concorrente. Eu sei que é o Valmir do outro lado da rua.', hora: '12:01' },
    { de: 'Dr. Adamastor (dono da fábrica)', texto: 'Meu técnico quer formatar tudo hoje. Eu disse para esperar a polícia. Esperei. Já são 12h.', hora: '12:02' },
    { de: 'Você', texto: 'Não formatem nada. Vou capturar o tráfego com a rede funcionando normalmente. O malware precisa estar vivo para falar.', hora: '12:03', eu: true },
    { de: 'Dr. Adamastor (dono da fábrica)', texto: 'Capturar tráfego? Tipo grampo?', hora: '12:03' },
    { de: 'Você', texto: 'Na rede do senhor, com autorização do senhor, como dono do ambiente. Por escrito, por favor.', hora: '12:04', eu: true },
  ],
  oficio: ['Delegacia de Crimes Cibernéticos. IP nº 2026.0912. Termo de autorização do representante legal da empresa para monitoramento da rede corporativa.', 'Requisita exame para identificar equipamento comprometido, canais de exfiltração e destinos externos.'],
  quesitos: [
    { id: 'q1', texto: 'Qual o endereço IP interno do equipamento comprometido?', formato: 'IPv4', tipo: 'texto', respostas: [INFECTADO], explicacao: 'A estatística de conversas (-z conv,ip) e os filtros de DNS TXT, HTTP POST e FTP apontam todos para 10.0.0.23, o PC-COMPRAS-03.', prejudicado: (f) => !f.has('capturou') },
    { id: 'q2', texto: 'Qual domínio foi usado para exfiltração por consultas DNS?', formato: 'domínio', tipo: 'texto', respostas: [DOMINIO], explicacao: 'Consultas TXT com subdomínios longos e aleatórios, todas terminando em .dados-nuvem.exemplo. Túnel DNS: o dado viaja dentro do nome perguntado. Firewall que só olha HTTP não vê.', prejudicado: (f) => !f.has('capturou') },
    { id: 'q3', texto: 'Qual nome de arquivo aparece no primeiro fragmento exfiltrado por DNS (depois de decodificado)?', formato: 'nome do arquivo', tipo: 'texto', respostas: ['custos_pinhao_2027.xlsx'], explicacao: 'O primeiro subdomínio (índice .0.) é base64 sem padding, variante URL: YXJxdWl2bz1jdXN0b3NfcGluaGFvXzIwMjcueGxzeHw decodifica para "arquivo=custos_pinhao_2027.xlsx|". Os demais pedaços trazem linha de produto, custo e margem. A ordem vem do número no meio do nome.', prejudicado: (f) => !f.has('capturou') },
    { id: 'q4', texto: 'Qual a senha de FTP transmitida em texto claro?', formato: 'senha exata', tipo: 'texto', respostas: ['Pinhao@2026'], explicacao: 'FTP não cifra nada: o comando PASS Pinhao@2026 aparece inteiro no fluxo TCP 12 (tubarao --seguir 12). Recomendação no laudo: SFTP ou FTPS e troca imediata da senha.', prejudicado: (f) => !f.has('capturou') },
    { id: 'q5', texto: 'Para qual IP externo o equipamento envia o beacon (POST periódico) de comando e controle?', formato: 'IPv4', tipo: 'texto', respostas: [C2], explicacao: 'POST /gate.php a cada 5 minutos para 198.51.100.23, com User-Agent de Internet Explorer 6 (ninguém usa IE6 em 2026: assinatura de malware preguiçoso). A resposta de uma das chamadas manda "cmd=exfil dns": é o C2 ordenando o túnel.', prejudicado: (f) => !f.has('capturou') },
  ],
  cena: {
    local: 'Sala de TI da Móveis Pinhão, Araucária',
    largura: 5.5,
    profundidade: 4.5,
    piso: '#ffffff',
    parede: '#d6d6d2',
    pisoTex: 'garage_floor',
    pisoEscala: 2,
    paredeTex: 'painted_plaster_wall',
    luz: 'fluor',
    inicio: [2.7, 3.9, 0],
    saida: [5.0, 4.0],
    moveis: [
      { tipo: 'glb', glb: 'metal_office_desk', pos: [1.3, 0, 3.2], rot: Math.PI / 2, escala: 0.8 },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [2.1, 0, 3.3], rot: -Math.PI / 2, escala: 0.85 },
      { tipo: 'glb', glb: 'worn_metal_rack', pos: [5.15, 0, 1.0], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'steel_frame_shelves_02', pos: [5.2, 0, 2.6], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [4.4, 0, 0.4] },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [4.42, 0.34, 0.38], rot: 0.4 },
      { tipo: 'glb', glb: 'metal_toolbox', pos: [1.2, 0.63, 2.6], solido: false },
      { tipo: 'glb', glb: 'wooden_ladder', pos: [0.4, 0, 1.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'korean_fire_extinguisher_01', pos: [0.4, 0, 0.4] },
      { tipo: 'glb', glb: 'WetFloorSign_01', pos: [3.6, 0, 3.8], rot: 0.4 },
      { tipo: 'glb', glb: 'fire_alarm', pos: [3.0, 1.6, 0.02], solido: false },
      { tipo: 'glb', glb: 'security_camera_01', pos: [5.3, 2.4, 4.3], rot: Math.PI + 0.7, solido: false },
      { tipo: 'porta', pos: [5.0, 0, 4.47], rot: Math.PI },
    ],
    itens: [
      { id: 'rack', modelo: 'servidor', pos: [2.4, 0, 0.55], escala: 1, nome: 'Rack com servidor de arquivos e firewall', descricao: 'Rack de 42U com servidor de arquivos, firewall de prateleira e um emaranhado de cabos que é tecnicamente um ninho. O firewall registra só bloqueios, não o que passou.', detalhes: ['Firewall: logs só de bloqueio, 7 dias', 'Servidor de arquivos: FILESERVER'], acoes: [] },
      {
        id: 'switch', modelo: 'switch', pos: [4.4, 0.68, 0.4], relevante: true,
        nome: 'Switch gerenciável (núcleo da rede)',
        descricao: 'Switch de 24 portas que liga todos os computadores ao firewall. Tem porta de espelhamento (SPAN) configurável. Do lado, a TI deixou um TAP de rede passivo ainda na caixa.',
        detalhes: ['Uplink do firewall: porta 24', 'TAP passivo: caixa lacrada ao lado', 'Último reboot: 214 dias'],
        acoes: [
          { id: 'tap', rotulo: 'Instalar o TAP passivo no uplink e capturar 30 minutos com o notebook forense', toca: true, unica: true, flags: ['capturou', 'usou_tap'], integridade: 5, texto: 'TAP passivo instalado entre switch e firewall: copia o tráfego sem alterar configuração nenhuma. 30 minutos de captura, arquivo .pcap com hash, horário do notebook sincronizado com NTP e anotado. Perfeito.' },
          { id: 'span', rotulo: 'Configurar porta espelho (SPAN) no switch e capturar', unica: true, bloqueiaSe: ['capturou'], flags: ['capturou', 'usou_span'], integridade: 2, texto: 'Porta espelho configurada e captura feita. Funciona, mas você alterou a configuração do switch: registre o antes e o depois no laudo. O TAP seria mais limpo.' },
          { id: 'reiniciar', rotulo: 'Reiniciar o switch para "começar do zero"', toca: true, unica: true, credibilidade: -4, texto: 'A fábrica inteira ficou sem rede por 4 minutos. O ERP caiu, a nota fiscal travou e o Dr. Adamastor perdeu dois anos de vida. E o malware? Voltou a falar logo depois.' },
        ],
      },
      {
        id: 'pccompras', modelo: 'desktop', pos: [0.55, 0, 3.9],
        nome: 'PC-COMPRAS-03 (trazido para a sala de TI)',
        descricao: 'O técnico trouxe o computador do setor de compras porque "estava lento". Ele queria formatar. Está ligado na rede. Se desligar agora, a captura não vê nada; se formatar, adeus malware.',
        detalhes: ['Hostname: PC-COMPRAS-03', 'Usuário: compras', 'Antivírus: AntivirusBarato (expirado em 2024)'],
        acoes: [
          { id: 'formatar', rotulo: 'Deixar o técnico formatar', unica: true, bloqueiaSe: ['capturou'], integridade: -15, flags: ['formatou_pc'], texto: 'Formatado. Malware erradicado, prova também. E sem captura antes, você não sabe nem para onde os dados foram.' },
          { id: 'isolar', rotulo: 'Depois da captura: desconectar o cabo de rede (contenção) sem desligar', unica: true, requer: ['capturou'], flags: ['conteve'], integridade: 2, texto: 'Cabo desconectado, máquina ligada. Contenção sem perder a memória. Próximo passo seria a coleta da RAM (tema de outro caso).' },
          { id: 'coletar', rotulo: 'Coletar o computador (depois da captura e da contenção)', toca: true, requer: ['conteve'], coleta: { rotulo: 'Desktop PC-COMPRAS-03', embalagens: ['antiestatico', 'caixa'] }, texto: 'Coletado para exame posterior do disco. O pcap já conta a história da rede.' },
        ],
      },
      { id: 'monitor', modelo: 'monitor', pos: [1.3, 0.63, 3.2], rot: Math.PI / 2, tela: ['#Painel do firewall', 'Bloqueios hoje: 0', '(regra "permitir tudo" ativa)'], nome: 'Monitor do painel do firewall', descricao: 'Regra número 1: permitir tudo. Regra número 2: nunca chega a ser avaliada.', acoes: [] },
      { id: 'cabo', modelo: 'cabo', pos: [2.9, 0, 1.4], nome: 'Novelo de cabos de rede no chão', descricao: 'Cabos sem identificação. Um deles liga a cafeteira à rede, por algum motivo.', acoes: [] },
      { id: 'caixa', modelo: 'caixa', pos: [4.4, 0, 3.6], nome: 'Caixa "NÃO JOGAR FORA"', descricao: 'Dentro: 14 mouses de bolinha, um modem discado e um manual do Windows 98. Herança cultural.', acoes: [] },
    ],
    pessoas: [
      { id: 'adamastor', nome: 'Dr. Adamastor', papel: 'dono da fábrica', modelo: 'adamastor', pos: [3.6, 2.4], rot: 2.8, falas: ['É o Valmir, tenho certeza. Ele sempre sabe o meu preço.', 'Pode grampear tudo, a rede é minha, eu assino o que precisar.', 'Quanto custa um negócio desses de TAP? Coloca na conta do Valmir.'] },
      { id: 'washington', nome: 'Washington', papel: 'técnico de TI (único)', modelo: 'washington', pos: [2.0, 1.8], rot: 0.4, falas: ['Eu ia formatar e reinstalar. Sempre resolve.', 'O antivírus venceu em 2024, mas ele ainda aparece verde. Achei que tava valendo.', 'O FTP é pra mandar orçamento pro fornecedor. A senha é Pinhao@2026, todo mundo sabe. Ops.'] },
    ],
  },
  lab: (c) => {
    const rec: Record<string, No> = {};
    if (c.flags.has('capturou')) rec['captura_uplink_2026-11-10_1000.pcap'] = captura();
    rec['LEIA-ME.txt'] = arq([
      c.flags.has('capturou') ? `Captura: ${c.flags.has('usou_tap') ? 'TAP passivo no uplink' : 'porta espelho (SPAN) no switch'}, 30 minutos, 10/11/2026 a partir das 10:00 (Brasília) = 13:00 UTC.` : 'Nenhuma captura foi feita.',
      'Rede interna: 10.0.0.0/24. Gateway/DNS: 10.0.0.1. Servidor de arquivos: 10.0.0.5.',
    ].join('\n') + '\n');
    return {
      dispositivos: [],
      recebidos: pasta(rec),
      boasVindas: [
        'Caso: espionagem empresarial na Móveis Pinhão.',
        'Material: pcap em /casos/c06/recebidos.',
        '',
        'Roteiro:',
        '  tubarao -r captura.pcap -z conv,ip               (quem fala com quem)',
        '  tubarao -r captura.pcap -Y dns -T fields -e ip.src -e dns.qry.name | sort | uniq -c | sort -nr | head',
        '  tubarao -r captura.pcap -Y "http.request.method == POST"',
        '  tubarao -r captura.pcap -Y ftp     e    --seguir <tcp.stream>',
        '  conv b64 <texto>    (base64 sem "=" também vale)',
      ],
    };
  },
  metodologia: [
    { texto: 'O tráfego foi capturado por TAP passivo no enlace de saída, sem alteração da configuração dos equipamentos.', certo: true },
    { texto: 'Obteve-se autorização escrita do representante legal da empresa para o monitoramento da rede corporativa.', certo: true },
    { texto: 'A captura teve hash calculado e horário de início registrado com relógio sincronizado.', certo: true },
    { texto: 'Foram analisados fluxos DNS, HTTP e FTP, com decodificação dos dados em base64.', certo: true },
    { texto: 'O computador suspeito foi formatado para conter o incidente antes da captura.', certo: false },
    { texto: 'A senha de FTP descoberta foi usada para acessar o servidor externo e baixar os arquivos enviados.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', pergunta: 'Isso não foi interceptação telemática sem ordem judicial? Lei 9.296!', opcoes: [
      { texto: 'A captura foi feita na rede da própria empresa, pela empresa vítima, que autorizou por escrito, para apurar um ataque contra ela. Não se interceptou comunicação de terceiros fora desse ambiente.', certa: true, reacao: 'O promotor acrescenta a jurisprudência. A juíza acena e segue.' },
      { texto: 'Era só para ver se a internet estava lenta.', certa: false, reacao: 'A defesa: "Então a perícia admite que não havia finalidade definida?" Pronto, virou discussão de nulidade.' },
    ] },
    { quem: 'defesa', se: ['usou_span'], pergunta: 'A perícia mexeu na configuração do switch. Isso não comprometeu a captura?', opcoes: [
      { texto: 'Configurei uma porta espelho, que só copia o tráfego. A configuração antes e depois está documentada no laudo e não altera o conteúdo dos pacotes.', certa: true, reacao: 'Documentado é documentado. A defesa muda de assunto.' },
      { texto: 'Não mexi em nada.', certa: false, reacao: 'O log do switch mostra a alteração com seu usuário. Que feio.' },
    ] },
    { quem: 'juiza', pergunta: 'Explique em português: o que é um túnel DNS?', opcoes: [
      { texto: 'O computador "pergunta" endereços de sites cujo nome é o próprio dado, picado e codificado. O servidor do criminoso recebe as perguntas e remonta o arquivo. Como DNS é liberado em quase toda rede, passa despercebido.', certa: true, reacao: 'A juíza: "então o dado viaja dentro da pergunta". Exato. Ela vai usar isso numa palestra.' },
      { texto: 'É um tipo de vírus que cava a rede.', certa: false, reacao: 'Ninguém cavou nada. A defesa pede outro perito para explicar.' },
    ] },
    { quem: 'promotoria', pergunta: 'Os dados exfiltrados eram mesmo da empresa?', opcoes: [
      { texto: 'O primeiro fragmento decodificado traz "arquivo=custos_pinhao_2027.xlsx", com linha de produto, custo e margem que a empresa reconhece como suas. Para o conteúdo integral, juntei os fragmentos em ordem pelo índice no nome.', certa: true, reacao: 'O promotor sorri. O Dr. Adamastor, na plateia, grita "Valmir!" e é advertido.' },
      { texto: 'Provavelmente, pelo tamanho do tráfego.', certa: false, reacao: 'Tamanho não diz conteúdo. Você tinha o conteúdo e não usou.' },
    ] },
  ],
  dicas: [
    'Quem fala com quem?\n`tubarao -r captura*.pcap -z conv,ip`. IPs 198.51.100.x e 203.0.113.x são externos fora do padrão da rede.',
    'DNS estranho\n`tubarao -r captura*.pcap -Y dns -T fields -e dns.qry.name | grep -v -E "buscador|noticias|email|erp|video|cdn|update|banco|nfe|musica" | head`.',
    'Decodificar\nPegue o rótulo antes de `.0.` e rode `conv b64 <texto>`. É base64 variante URL, sem "=".',
    'HTTP\n`tubarao -r captura*.pcap -Y "http.request.method == POST" -T fields -e ip.dst -e http.request.uri -e http.user_agent`.',
    'FTP\n`tubarao -r captura*.pcap -Y ftp` mostra os comandos. `--seguir 12` mostra a conversa inteira.',
  ],
  falhas: {
    formatou_pc: 'O computador comprometido foi formatado antes de qualquer coleta.',
    usou_span: 'A configuração do switch foi alterada para a captura (porta espelho).',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    sem_luvas: 'Manipulação de equipamentos sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
  },
};
