// Caso 5: nuvem. Chave de acesso esquecida no histórico do Git e um bucket aberto tipo porteira.
import type { Caso } from './tipos';
import { arq, pasta } from '../motor/vfs';
import type { No } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { datasEntre } from './ruido';

const U = (s: string) => T.data(s, 0);
const IP_INVASOR = '203.0.113.77';
const CHAVE_VAZADA = 'NBIA4Q7XK2ZVAQUINHA9';
const PRIMEIRO = U('2026-09-02 06:47:19');
const DOWNLOADS = 412;
const BUCKET = 'vaquinha-facil-docs-prod';

function trilha(): No {
  const r = new Rng(505);
  const recs: Record<string, unknown>[] = [];
  const internos = ['10.20.1.11', '10.20.1.12', '10.20.3.40', '172.31.8.9'];
  const chaves = ['NBIAAPPSERVER0000001', 'NBIACICDPIPELINE0002', 'NBIABACKUPJOB0000003', CHAVE_VAZADA];
  const eventos = ['GetObject', 'GetObject', 'GetObject', 'PutObject', 'PutObject', 'ListObjects', 'DescribeInstances', 'AssumeRole', 'GetBucketLocation', 'HeadObject'];
  let id = 0;
  const rec = (t: Date, nome: string, ip: string, chave: string, extra: Record<string, unknown> = {}) => recs.push({
    eventVersion: '1.09', eventTime: T.iso(t), eventSource: nome.includes('Instance') ? 'compute.nimbus.exemplo' : nome.includes('Role') ? 'iam.nimbus.exemplo' : 'storage.nimbus.exemplo', eventName: nome, awsRegion: 'sa-leste-1',
    sourceIPAddress: ip, userAgent: ip === IP_INVASOR ? 'nimbus-cli/2.13.4 Python/3.11 Linux/6.5 exec-env/none' : r.pick(['nimbus-sdk-js/3.4', 'nimbus-sdk-go/1.21', 'console.nimbus.exemplo']),
    userIdentity: { type: 'IAMUser', accessKeyId: chave, userName: chave === CHAVE_VAZADA ? 'deploy-antigo' : r.pick(['app-server', 'ci-pipeline', 'backup-job']) },
    requestParameters: nome.includes('Object') ? { bucketName: BUCKET, key: `comprovantes/${r.int(2024, 2026)}/${r.hex(10)}.pdf` } : { bucketName: BUCKET },
    responseElements: null, eventID: `${r.hex(8)}-${r.hex(4)}-${r.hex(4)}-${r.hex(12)}`, readOnly: nome.startsWith('Get') || nome.startsWith('List') || nome.startsWith('Describe') || nome.startsWith('Head'), requestID: String(id++), ...extra,
  });
  for (const t of datasEntre(r, U('2026-08-25 00:00:00'), U('2026-09-09 00:00:00'), 1600)) {
    const k = r.pick(chaves.slice(0, 3));
    rec(t, r.pick(eventos), r.pick(internos), k);
  }
  // a chave antiga de deploy ainda funcionava e foi usada uma vez, legitimamente, meses antes? Não: só pelo invasor.
  let t = PRIMEIRO.getTime();
  rec(new Date(t), 'ListBuckets', IP_INVASOR, CHAVE_VAZADA);
  t += 14000; rec(new Date(t), 'GetBucketAcl', IP_INVASOR, CHAVE_VAZADA);
  t += 9000; rec(new Date(t), 'ListObjects', IP_INVASOR, CHAVE_VAZADA);
  for (let i = 0; i < DOWNLOADS; i++) { t += r.int(400, 2600); rec(new Date(t), 'GetObject', IP_INVASOR, CHAVE_VAZADA); }
  t += 30000; rec(new Date(t), 'PutBucketPolicy', IP_INVASOR, CHAVE_VAZADA, { requestParameters: { bucketName: BUCKET, policy: '{"Statement":[{"Effect":"Allow","Principal":"*","Action":"storage:GetObject"}]}' } });
  t += 60000; rec(new Date(t), 'DeleteTrail', IP_INVASOR, CHAVE_VAZADA, { errorCode: 'AccessDenied', errorMessage: 'Usuário deploy-antigo não tem permissão para iam:DeleteTrail' });
  recs.sort((a, b) => String(a.eventTime).localeCompare(String(b.eventTime)));
  return arq(JSON.stringify({ Records: recs }) + '\n');
}

function gitLog(): No {
  return arq([
    'commit 9f1c2ab7e0d4  (HEAD -> main)',
    'Author: cleiton <cleiton@vaquinha.exemplo>',
    'Date:   Thu Mar 12 18:40:11 2026 -0300',
    '',
    '    remove chave do repo (agora sim seguro)',
    '',
    'diff --git a/config/.env.producao b/config/.env.producao',
    '-NIMBUS_ACCESS_KEY_ID=' + CHAVE_VAZADA,
    '-NIMBUS_SECRET=2f9c....................................',
    '+# chaves agora ficam no cofre, confia',
    '',
    'commit 41ab88c0f2e1',
    'Author: cleiton <cleiton@vaquinha.exemplo>',
    'Date:   Thu Mar 12 18:02:55 2026 -0300',
    '',
    '    deploy de sexta (é quinta mas tô cansado)',
    '',
    'diff --git a/config/.env.producao b/config/.env.producao',
    '+NIMBUS_ACCESS_KEY_ID=' + CHAVE_VAZADA,
    '+NIMBUS_SECRET=2f9c....................................',
    '+NIMBUS_REGION=sa-leste-1',
    '',
    ...Array.from({ length: 60 }, (_, i) => [`commit ${(0x51ab00 + i * 977).toString(16)}e${i}`, 'Author: kaua <ceo@vaquinha.exemplo>', `Date:   ${['Mon', 'Tue', 'Wed'][i % 3]} Feb ${(i % 27) + 1} 1${i % 10}:00:00 2026 -0300`, '', `    ${['ajusta cor do botão', 'muda o logo de novo', 'pivotando', 'feat: modo escuro', 'fix: modo escuro', 'revert modo escuro', 'disruptando o footer'][i % 7]}`, '']).flat(),
    '',
    '# repositório público no GitHost desde 2026-03-12 (alguém clicou em "tornar público" para mostrar a um investidor)',
  ].join('\n') + '\n');
}

function acessoBucket(): No {
  const r = new Rng(8);
  const linhas: string[] = [];
  const fmt = (d: Date) => { const s = d.toUTCString(); return `[${s.slice(5, 7)}/${s.slice(8, 11)}/${s.slice(12, 16)}:${s.slice(17, 25)} +0000]`; };
  for (const d of datasEntre(r, U('2026-09-01 00:00:00'), U('2026-09-03 00:00:00'), 900)) linhas.push(`7f3a ${BUCKET} ${fmt(d)} ${r.pick(['10.20.1.11', '10.20.1.12', '172.31.8.9'])} app-server ${r.hex(16).toUpperCase()} REST.GET.OBJECT comprovantes/2026/${r.hex(10)}.pdf "GET /comprovantes HTTP/1.1" 200 - ${r.int(20000, 900000)}`);
  let t = PRIMEIRO.getTime() + 23000;
  for (let i = 0; i < DOWNLOADS; i++) { t += r.int(400, 2600); linhas.push(`7f3a ${BUCKET} ${fmt(new Date(t))} ${IP_INVASOR} deploy-antigo ${r.hex(16).toUpperCase()} REST.GET.OBJECT comprovantes/${r.int(2024, 2026)}/${r.hex(10)}.pdf "GET /comprovantes HTTP/1.1" 200 - ${r.int(20000, 900000)}`); }
  linhas.sort((a, b) => a.split(' ')[2].localeCompare(b.split(' ')[2]));
  return arq(linhas.join('\n') + '\n');
}

export const caso05: Caso = {
  id: 'c05',
  numero: 5,
  titulo: 'Bucket Aberto Tipo Porteira',
  subtitulo: 'Startup de vaquinha online, CEO de 19 anos, chave de acesso no Git e 412 comprovantes de doadores vazados.',
  modulo: 'Coleta e análise de ambientes cloud computing',
  dificuldade: 3,
  resumo: 'A startup Vaquinha Fácil descobriu à venda num fórum um pacote com comprovantes de doação (nome, CPF, valor) de seus usuários. Os arquivos ficavam num bucket de armazenamento no provedor de nuvem Nimbus. A empresa comunicou o incidente à ANPD e à polícia.',
  canal: 'email',
  chamado: [
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Vazamento em nuvem. Não tem HD para apreender, tem trilha de auditoria para preservar. Vai até a startup e garante a exportação dos logs.', hora: '09:00' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O CTO quer "apagar o bucket e começar do zero". Não deixa. O log de acesso do bucket fica DENTRO dele.', hora: '09:01' },
    { de: 'Você', texto: 'E a chave usada?', hora: '09:02', eu: true },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Ninguém sabe. O CEO acha que foi "um hacker russo". Ele tem 19 anos e um podcast.', hora: '09:02' },
  ],
  oficio: ['Delegacia de Crimes Cibernéticos. IP nº 2026.0801. Comunicação de incidente de segurança com dados pessoais (LGPD, art. 48).', 'Requisita exame dos registros do provedor de nuvem e do repositório de código para identificar a credencial utilizada, a origem do acesso e o volume de dados extraídos.'],
  quesitos: [
    { id: 'q1', texto: 'Qual identificador de chave de acesso (access key id) foi usado nos downloads indevidos?', formato: 'access key id', tipo: 'texto', respostas: [CHAVE_VAZADA], explicacao: 'Na trilha, os eventos vindos do IP externo usam userIdentity.accessKeyId = NBIA4Q7XK2ZVAQUINHA9, do usuário "deploy-antigo". A mesma chave aparece no histórico do Git: foi "removida" num commit posterior, mas Git não esquece. Tirar do arquivo não tira do histórico; só revogar a chave resolve.', prejudicado: (f) => !f.has('exportou_trilha') },
    { id: 'q2', texto: 'Qual o endereço IP de origem do acesso indevido?', formato: 'endereço IPv4', tipo: 'texto', respostas: [IP_INVASOR], explicacao: `jq -r '.Records[].sourceIPAddress' | sort | uniq -c | sort -nr separa os IPs internos (10.x e 172.31.x) do único IP externo, ${IP_INVASOR}. O próximo passo é requisitar ao provedor de conexão os dados do assinante daquele IP naquele horário (Marco Civil, art. 10 e 22).`, prejudicado: (f) => !f.has('exportou_trilha') },
    { id: 'q3', texto: 'Quantos objetos foram baixados (GetObject) a partir desse IP?', formato: 'número inteiro', tipo: 'numero', respostas: [String(DOWNLOADS)], explicacao: `jq -c '.Records[] | select(.eventName=="GetObject" and .sourceIPAddress=="${IP_INVASOR}")' trilha.json | wc -l dá ${DOWNLOADS}, e o log de acesso do bucket confirma (grep -c). Duas fontes independentes, mesmo número.`, prejudicado: (f) => !f.has('exportou_trilha') },
    { id: 'q4', texto: 'Quando (Brasília) ocorreu o primeiro evento registrado a partir do IP do invasor?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-09-02 03:47'], explicacao: 'O primeiro registro do IP é ListBuckets em 2026-09-02T06:47:19Z. O Z é UTC: em Brasília, 03:47. Madrugada, como manda a tradição.', prejudicado: (f) => !f.has('exportou_trilha') },
    { id: 'q5', texto: 'Pelo Marco Civil da Internet, por quanto tempo o provedor de aplicação deve guardar os registros de acesso a aplicações?', formato: 'tempo (ex.: 1 ano)', tipo: 'texto', respostas: ['6 meses', 'seis meses'], explicacao: 'Lei 12.965/2014, art. 15: registros de acesso a aplicações de internet por 6 meses (o art. 13 dá 1 ano para registros de conexão, pelo provedor de conexão). A autoridade pode pedir guarda por prazo maior.' },
  ],
  cena: {
    local: 'Escritório da Vaquinha Fácil, coworking no Rebouças',
    largura: 8,
    profundidade: 6,
    piso: '#ffffff',
    parede: '#e5e7eb',
    pisoTex: 'smooth_concrete_floor',
    pisoEscala: 2.5,
    paredeTex: 'concrete_wall_003',
    luz: 'fluor',
    inicio: [4, 5.3, 0],
    saida: [7.4, 5.5],
    moveis: [
      { tipo: 'glb', glb: 'metal_office_desk', pos: [2.0, 0, 1.4] },
      { tipo: 'glb', glb: 'metal_office_desk', pos: [5.5, 0, 1.4] },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [1.6, 0, 2.15], rot: Math.PI, escala: 0.85 },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [5.2, 0, 2.15], rot: Math.PI, escala: 0.85 },
      { tipo: 'glb', glb: 'GreenChair_01', pos: [7.2, 0, 2.8], rot: -2 },
      { tipo: 'glb', glb: 'sofa_03', pos: [1.6, 0, 4.9], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'modern_coffee_table_01', pos: [2.7, 0, 4.9] },
      { tipo: 'glb', glb: 'CoffeeCart_01', pos: [7.2, 0, 0.6], rot: -Math.PI / 2, escala: 0.8 },
      { tipo: 'glb', glb: 'potted_plant_01', pos: [0.5, 0, 0.5] },
      { tipo: 'glb', glb: 'potted_plant_02', pos: [7.5, 0, 4.2] },
      { tipo: 'glb', glb: 'dartboard', pos: [4.0, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_01', pos: [6.0, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'gaming_console', pos: [2.7, 0.39, 4.9], solido: false },
      { tipo: 'glb', glb: 'gamepad', pos: [2.4, 0.39, 4.7], solido: false },
      { tipo: 'glb', glb: 'rubber_duck_toy', pos: [2.6, 0.79, 1.15], escala: 0.5, solido: false },
      { tipo: 'glb', glb: 'stationery_supplies', pos: [5.9, 0.86, 1.2], solido: false },
      { tipo: 'janela', pos: [2.0, 0.9, 0.02], tam: [2.0, 1.4, 0] },
      { tipo: 'porta', pos: [7.4, 0, 5.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'console', modelo: 'notebook', pos: [5.5, 0.79, 1.3], rot: Math.PI, cor: '#9ca3af', relevante: true,
        tela: ['#Console Nimbus', 'Trilha de auditoria: ATIVA', 'Bucket: vaquinha-facil-docs-prod', '[ Apagar bucket ]  [ Exportar ]'],
        nome: 'Notebook da CTO com o console da nuvem aberto',
        descricao: 'Console do provedor Nimbus logado com perfil de administradora. Botão de "Apagar bucket" a um clique. A trilha de auditoria guarda 90 dias de eventos: o incidente foi há 81. O relógio está correndo.',
        detalhes: ['Retenção da trilha: 90 dias (o incidente foi há 81)', 'Log de acesso do bucket: gravado no próprio bucket', 'Conta com MFA: não (claro que não)'],
        acoes: [
          { id: 'exportar', rotulo: 'Pedir à CTO que exporte a trilha e o log de acesso, com hash, na sua frente', unica: true, flags: ['exportou_trilha'], integridade: 5, texto: 'Exportação feita na sua frente, em mídia estéril, com hash SHA-256 calculado e anotado. Também pediu à autoridade o ofício de preservação ao provedor (Marco Civil, art. 15). Faltavam 9 dias para a trilha se autodestruir.' },
          { id: 'apagar', rotulo: 'Deixar a CTO apagar o bucket e revogar tudo "para estancar"', unica: true, bloqueiaSe: ['exportou_trilha'], flags: ['apagou_bucket'], integridade: -20, texto: 'Bucket apagado. Junto com ele, o log de acesso que morava dentro. A chave foi revogada (isso estava certo), mas a evidência foi junto (isso não). Contenção que destrói prova é incêndio apagado com gasolina.' },
          { id: 'revogar', rotulo: 'Recomendar revogar a chave vazada só DEPOIS de exportar', unica: true, requer: ['exportou_trilha'], integridade: 2, texto: 'Ordem certa no ciclo de resposta a incidentes: preservar, conter, erradicar. Chave revogada, evidência guardada.' },
        ],
      },
      { id: 'notedev', modelo: 'notebook', pos: [2.0, 0.79, 1.3], rot: Math.PI, tela: ['#$ git log --oneline', '9f1c2ab remove chave do repo', '41ab88c deploy de sexta', '...'], nome: 'Notebook do dev Cleiton', descricao: 'Terminal aberto com o histórico do repositório. O repositório ficou público por meses porque o CEO quis "mostrar o código a um investidor". Dá para clonar o histórico inteiro (com autorização da empresa, que está aqui querendo colaborar).', acoes: [{ id: 'clonar', rotulo: 'Exportar o histórico do Git (com autorização escrita da empresa)', unica: true, flags: ['exportou_git'], integridade: 3, texto: 'Histórico exportado com hash, termo de autorização assinado pelo CEO (que perguntou se podia postar a foto da assinatura).' }] },
      { id: 'pato', modelo: 'caneca', pos: [2.6, 0.79, 1.6], nome: 'Caneca "It works on my machine"', descricao: 'Lema da empresa, segundo a CTO. Com café de ontem.', acoes: [] },
      { id: 'celceo', modelo: 'iphone', pos: [2.7, 0.39, 5.1], rot: 0.6, tela: ['#Podcast', '"Disrupção" ep. 88', 'Gravando ●'], nome: 'iPhone do CEO (gravando podcast)', descricao: 'Ele está gravando um episódio sobre "resiliência após ataque hacker". Não é evidência. É conteúdo.', acoes: [] },
      { id: 'servidor', modelo: 'nobreak', pos: [7.6, 0, 1.5], nome: 'Nobreak sem servidor nenhum', descricao: 'A empresa é 100% nuvem. O nobreak segura só a cafeteira e o videogame.', acoes: [] },
    ],
    pessoas: [
      { id: 'yara', nome: 'Yara', papel: 'CTO da startup', modelo: 'yara', pos: [6.3, 2.6], rot: -2.6, falas: ['Eu quero apagar tudo e subir de novo. Infra como código, sabe? Dois minutos.', 'A trilha guarda 90 dias. Por quê? Era o padrão.', 'A chave deploy-antigo? Achei que tinha sido desativada em março.'], reage: [{ flag: 'exportou_trilha', fala: 'Exportado e com hash. Ok, entendi: primeiro a prova, depois a faxina.' }] },
      { id: 'kaua', nome: 'Kauã', papel: 'CEO e fundador, 19 anos', modelo: 'kaua', pos: [3.2, 4.2], rot: 2.4, falas: ['Foi um hacker russo, com certeza. Ou chinês. Ou um concorrente invejoso.', 'Repositório público? Eu só cliquei para o investidor ver. Ele não viu.', 'Posso gravar a perícia para o podcast? É bom para o branding.'] },
      { id: 'cleiton', nome: 'Cleiton', papel: 'desenvolvedor', modelo: 'cleiton', pos: [1.2, 2.6], rot: 1.0, falas: ['Eu apaguei a chave do arquivo no mesmo dia. Em março!', 'Histórico do Git? Mas eu apaguei... ah. Ah não.', 'A gente ia trocar a chave. Tava no backlog. Prioridade baixa.'] },
    ],
  },
  lab: (c) => {
    const rec: Record<string, No> = {};
    if (c.flags.has('exportou_trilha')) {
      rec['trilha_nimbus_2026-08-25_a_2026-09-08.json'] = trilha();
      if (!c.flags.has('apagou_bucket')) rec['log_acesso_bucket.txt'] = acessoBucket();
    }
    if (c.flags.has('exportou_git')) rec['historico_git.txt'] = gitLog();
    rec['LEIA-ME.txt'] = arq([
      'Material recebido:',
      c.flags.has('exportou_trilha') ? '  trilha_nimbus_*.json   trilha de auditoria (JSON, horários em UTC, campo Records)' : '  (trilha de auditoria não exportada: expirou com a retenção de 90 dias)',
      c.flags.has('exportou_trilha') && !c.flags.has('apagou_bucket') ? '  log_acesso_bucket.txt  log de acesso do bucket (formato de servidor, UTC)' : '  (log de acesso do bucket: apagado junto com o bucket ou não exportado)',
      c.flags.has('exportou_git') ? '  historico_git.txt      git log -p do repositório' : '  (histórico do Git não exportado)',
    ].join('\n') + '\n');
    return {
      dispositivos: [],
      recebidos: pasta(rec),
      boasVindas: [
        'Caso: vazamento de comprovantes no bucket vaquinha-facil-docs-prod.',
        'Material: arquivos em /casos/c05/recebidos (não há disco: é tudo nuvem).',
        '',
        'Dicas de jq:',
        "  jq '.Records | length' arquivo.json",
        "  jq -r '.Records[].sourceIPAddress' arquivo.json | sort | uniq -c | sort -nr",
        "  jq -c '.Records[] | select(.sourceIPAddress==\"X\") | {t:.eventTime, e:.eventName, k:.userIdentity.accessKeyId}' arquivo.json | head",
      ],
    };
  },
  metodologia: [
    { texto: 'A trilha de auditoria e o log de acesso do bucket foram exportados antes de qualquer medida de contenção, com hash registrado.', certo: true },
    { texto: 'Foi solicitada à autoridade a preservação dos registros junto ao provedor, nos termos do Marco Civil da Internet.', certo: true },
    { texto: 'Os registros em JSON foram filtrados por origem e tipo de evento, e a contagem foi confirmada em duas fontes independentes.', certo: true },
    { texto: 'Os horários em UTC (sufixo Z) foram convertidos para o horário de Brasília.', certo: true },
    { texto: 'O perito acessou a conta do provedor com a senha da CTO para conferir os eventos diretamente no console.', certo: false },
    { texto: 'Para estancar o incidente, o bucket foi apagado antes da exportação.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', pergunta: 'O IP 203.0.113.77 identifica meu cliente?', opcoes: [
      { texto: 'Não sozinho. Identifica a conexão usada. Vincular a uma pessoa depende dos dados cadastrais do provedor de conexão para aquele IP, data e hora (com porta lógica, se houver NAT), pedidos pela autoridade.', certa: true, reacao: 'O promotor já tem o ofício pronto. A juíza aprecia a precisão.' },
      { texto: 'Sim, IP é como um CPF da internet.', certa: false, reacao: 'IP não é CPF. Tem NAT, Wi-Fi aberto, VPN. A defesa tem uma lista inteira.' },
    ] },
    { quem: 'defesa', se: ['apagou_bucket'], pergunta: 'O log de acesso do bucket foi apagado com ele. Como confiar na contagem de 412?', opcoes: [
      { texto: 'A contagem vem só da trilha de auditoria, exportada antes. Sem o log do bucket, não há confirmação independente, e isso consta como limitação.', certa: true, reacao: 'Uma fonte em vez de duas. A prova fica de pé, mas mancando.' },
      { texto: 'O número está certo, eu conferi duas vezes.', certa: false, reacao: 'Conferir duas vezes a mesma fonte não é confirmação independente. A defesa explica isso melhor que você.' },
    ] },
    { quem: 'juiza', pergunta: 'Os registros dizem 06h47, mas o laudo fala em madrugada, 03h47. Por quê?', opcoes: [
      { texto: 'O registro está em UTC, indicado pelo Z no final. Brasília é UTC-3, então 06h47Z são 03h47 no horário local.', certa: true, reacao: 'A juíza anota: "Z é UTC". Frase curta, laudo claro.' },
      { texto: 'O provedor está em outro país, então o horário é do país dele.', certa: false, reacao: 'Não é do país dele, é UTC. A defesa pede esclarecimento por escrito. Mais trabalho para você.' },
    ] },
    { quem: 'promotoria', pergunta: 'Como a chave de acesso foi parar nas mãos do invasor?', opcoes: [
      { texto: 'Ela foi gravada num commit em 12/03 e "apagada" em outro commit no mesmo dia, mas continuou no histórico do repositório, que ficou público. Qualquer um que clonasse o repositório tinha a chave, ainda ativa.', certa: true, reacao: 'O promotor anota "histórico do Git". O CEO, na plateia, desliga o microfone do podcast.' },
      { texto: 'Provavelmente um ataque sofisticado de força bruta.', certa: false, reacao: 'Não foi força bruta, foi descuido. O histórico mostra. Você acabou de inventar um hacker.' },
    ] },
  ],
  dicas: [
    'O que chegou\n`cat /casos/c05/recebidos/LEIA-ME.txt`.',
    'Quem acessou de fora?\n`jq -r \'.Records[].sourceIPAddress\' trilha*.json | sort | uniq -c | sort -nr`. 10.x e 172.31.x são internos.',
    'Chave e primeiro evento\n`jq -c \'.Records[] | select(.sourceIPAddress=="203.0.113.77") | {t:.eventTime,e:.eventName,k:.userIdentity.accessKeyId}\' trilha*.json | head -3`.',
    'Quantos downloads?\nAcrescente `and .eventName=="GetObject"` no select e conte com `wc -l`. Confirme com `grep -c 203.0.113.77 log_acesso_bucket.txt`.',
    'Git\n`grep -n ACCESS_KEY historico_git.txt`: um commit põe, outro tira. O histórico guarda os dois.',
    'Marco Civil\nArt. 13: registros de conexão, 1 ano (provedor de conexão). Art. 15: registros de acesso a aplicações, 6 meses (provedor de aplicação).',
  ],
  falhas: {
    apagou_bucket: 'O bucket foi apagado antes da exportação, levando o log de acesso junto.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
  },
};
