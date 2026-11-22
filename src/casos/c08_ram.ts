// Caso 8: memória e resposta a incidente. Sexta, 17h55, ransomware criptografando ao vivo numa clínica.
import type { Caso } from './tipos';
import { arq, esp, pasta } from '../motor/vfs';
import type { Conexao, No, Processo } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';

const U = (s: string) => T.data(s, 0);
const CAPTURA = U('2026-11-20 21:12:40');
const C2 = '198.51.100.66';

function memoria(): No {
  const r = new Rng(808);
  const boot = U('2026-11-20 11:02:10');
  const ps: Processo[] = [];
  const p = (pid: number, ppid: number, nome: string, ini: Date, cmd: string, extra: Partial<Processo> = {}) => ps.push({ pid, ppid, nome, inicio: ini, cmd, ...extra });
  p(4, 0, 'System', boot, '');
  p(88, 4, 'Registry', boot, '');
  p(396, 4, 'smss.exe', boot, '\\SystemRoot\\System32\\smss.exe');
  p(520, 512, 'csrss.exe', boot, '%SystemRoot%\\system32\\csrss.exe ObjectDirectory=\\Windows');
  p(604, 512, 'wininit.exe', boot, 'wininit.exe');
  p(744, 604, 'services.exe', boot, 'C:\\Windows\\system32\\services.exe');
  p(760, 604, 'lsass.exe', boot, 'C:\\Windows\\system32\\lsass.exe');
  let pid = 900;
  for (let i = 0; i < 18; i++) { p(pid, 744, 'svchost.exe', boot, `C:\\Windows\\system32\\svchost.exe -k ${r.pick(['netsvcs', 'LocalService', 'NetworkService', 'DcomLaunch', 'RPCSS', 'UnistackSvcGroup'])} -p`); pid += r.int(8, 60) * 4; }
  p(3120, 3080, 'explorer.exe', U('2026-11-20 11:05:44'), 'C:\\Windows\\Explorer.EXE');
  const apps: [string, string][] = [['navegador.exe', '"C:\\Program Files\\Navegador\\navegador.exe" --type=renderer'], ['OdontoSys.exe', '"C:\\OdontoSys\\OdontoSys.exe" /clinica=SorrisoPleno'], ['WhatsLixo.exe', 'C:\\Users\\recepcao\\AppData\\Local\\WhatsLixo\\WhatsLixo.exe'], ['tray.exe', 'C:\\Program Files\\AntivirusBarato\\tray.exe'], ['OneDrive.exe', '"C:\\Program Files\\OneDrive\\OneDrive.exe" /background'], ['Spotifai.exe', 'C:\\Users\\recepcao\\AppData\\Roaming\\Spotifai\\Spotifai.exe']];
  for (const [n, c] of apps) for (let k = 0; k < (n === 'navegador.exe' ? 6 : 1); k++) { p(pid, 3120, n, new Date(U('2026-11-20 11:06:00').getTime() + r.int(0, 30000) * 1000), c); pid += r.int(8, 60) * 4; }
  p(6644, 744, 'RuntimeBroker.exe', U('2026-11-20 11:06:12'), 'C:\\Windows\\System32\\RuntimeBroker.exe -Embedding', { injetado: true });
  // a infecção: anexo "boleto" aberto às 17h31 (Brasília), 20:31 UTC
  p(7012, 3120, 'Boleto_Novembro.pdf.exe', U('2026-11-20 20:31:05'), '"C:\\Users\\recepcao\\Downloads\\Boleto_Novembro.pdf.exe"');
  p(7188, 7012, 'svch0st.exe', U('2026-11-20 20:31:22'), '"C:\\Users\\recepcao\\AppData\\Local\\Temp\\svch0st.exe" -k cripto --alvo C:\\ --alvo \\\\SERVIDOR\\pacientes');
  p(7240, 7188, 'cmd.exe', U('2026-11-20 20:31:40'), 'cmd.exe /c vssadmin delete shadows /all /quiet & bcdedit /set {default} recoveryenabled no');
  p(7262, 7240, 'vssadmin.exe', U('2026-11-20 20:31:41'), 'vssadmin delete shadows /all /quiet');
  p(7400, 3120, 'notepad.exe', U('2026-11-20 20:55:10'), 'notepad.exe C:\\Users\\recepcao\\Desktop\\LEIA_PARA_RECUPERAR.txt');
  const cx: Conexao[] = [];
  for (let i = 0; i < 25; i++) cx.push({ pid: r.pick(ps.filter((x) => x.nome === 'navegador.exe')).pid, proto: 'TCPv4', local: `10.10.0.31:${r.int(49152, 65000)}`, remoto: `192.0.2.${r.int(1, 254)}:443`, estado: r.pick(['ESTABLISHED', 'CLOSE_WAIT', 'TIME_WAIT']) });
  cx.push({ pid: 744 + 0, proto: 'TCPv4', local: '0.0.0.0:135', remoto: '0.0.0.0:0', estado: 'LISTENING' });
  cx.push({ pid: 6644, proto: 'TCPv4', local: '10.10.0.31:51822', remoto: `${C2}:8443`, estado: 'ESTABLISHED' });
  cx.push({ pid: 7188, proto: 'TCPv4', local: '10.10.0.31:51901', remoto: '10.10.0.5:445', estado: 'ESTABLISHED' });
  cx.push({ pid: 3120 + 0, proto: 'TCPv4', local: '10.10.0.31:50110', remoto: '10.10.0.5:445', estado: 'ESTABLISHED' });
  const ruido = ['MZ', 'This program cannot be run in DOS mode', 'kernel32.dll', 'ntdll.dll', 'https://www.buscador.exemplo/', 'OdontoSys - Agenda do dia', 'Paciente: ********', 'SEUS ARQUIVOS FORAM CRIPTOGRAFADOS', 'Para recuperar, envie 0,8 BTC para a carteira bc1qexemplofalsodemaisparaexistir0000', `http://${C2}:8443/painel/chave`, '-----BEGIN PUBLIC KEY-----', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAexemplo', '-----END PUBLIC KEY-----', 'extensão: .sorriso_trancado', 'vssadmin delete shadows /all /quiet', 'Boleto_Novembro.pdf.exe', 'Prezado cliente, segue boleto em anexo'];
  for (let i = 0; i < 400; i++) ruido.push(r.pick(['GetProcAddress', 'LoadLibraryA', 'C:\\Windows\\System32\\', 'Mozilla/5.0', 'en-US', 'pt-BR', 'Segoe UI', 'msvcrt.dll', `{${r.hex(8)}-${r.hex(4)}}`, 'HTTP/1.1 200 OK']));
  return esp({ tipo: 'mem', perfil: '26100.1.amd64fre.ge_release.240331-1435 (Windows 11 24H2)', capturada: CAPTURA, processos: ps, conexoes: cx, ruido }, { tam: 17179869184 });
}

export const caso08: Caso = {
  id: 'c08',
  numero: 8,
  titulo: 'Ransomware na Sexta às 17h55',
  subtitulo: 'Clínica odontológica, tela vermelha, arquivos virando ".sorriso_trancado" ao vivo e uma dentista querendo pagar em bitcoin.',
  modulo: 'Ciclo de vida do incidente e coleta de artefatos via endpoint',
  dificuldade: 3,
  resumo: 'Na sexta, 20/11/2026, às 17h55, a recepção da Clínica Sorriso Pleno ligou: a tela do computador mostra pedido de resgate e os prontuários no servidor estão mudando de nome. O computador continua ligado e o ransomware ainda está trabalhando.',
  canal: 'zap',
  chamado: [
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Ransomware ativo numa clínica no Água Verde. Ainda criptografando. Sai agora.', hora: '17:58' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O técnico terceirizado mandou desligar tudo pelo telefone. A recepcionista ainda não desligou porque estava no banheiro chorando.', hora: '17:59' },
    { de: 'Você', texto: 'Pede para ela NÃO desligar. Só puxar o cabo de rede do computador. A chave pode estar na memória.', hora: '17:59', eu: true },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Ela perguntou qual é o cabo de rede. Mandei foto. Vai lá.', hora: '18:00' },
  ],
  oficio: ['Delegacia de Crimes Cibernéticos. IP nº 2026.1120. Comunicação de incidente de segurança com dados de saúde (dado pessoal sensível, LGPD art. 5º, II).', 'Requisita exame no equipamento da recepção para identificar o artefato malicioso, o vetor de entrada, a infraestrutura de comando e as ações de destruição de cópias.'],
  quesitos: [
    { id: 'q1', texto: 'Qual o nome do processo do ransomware que criptografava os arquivos?', formato: 'nome do executável', tipo: 'texto', respostas: ['svch0st.exe'], explicacao: 'No pstree, svch0st.exe (com ZERO no lugar do O) roda de AppData\\Local\\Temp, é filho do Boleto_Novembro.pdf.exe e tem argumentos "-k cripto --alvo". O svchost legítimo é filho do services.exe e fica em System32. Disfarce de nome é clássico; parentesco e caminho entregam.', prejudicado: (f) => !f.has('ram') },
    { id: 'q2', texto: 'Em qual processo legítimo houve injeção de código? Informe o PID.', formato: 'número do PID', tipo: 'numero', respostas: ['6644'], explicacao: 'O windows.malfind encontra no RuntimeBroker.exe (PID 6644) uma região privada com permissão PAGE_EXECUTE_READWRITE começando com MZ: um executável inteiro injetado, sem arquivo no disco. É esse processo que mantém a conexão com o C2.', prejudicado: (f) => !f.has('ram') },
    { id: 'q3', texto: 'Qual o IP do servidor de comando e controle (C2) com conexão estabelecida no momento da captura?', formato: 'IPv4', tipo: 'texto', respostas: [C2], explicacao: 'O windows.netscan mostra o PID 6644 (o RuntimeBroker injetado) com conexão ESTABLISHED para 198.51.100.66:8443. O strings no dump também revela http://198.51.100.66:8443/painel/chave.', prejudicado: (f) => !f.has('ram') },
    { id: 'q4', texto: 'Qual comando foi executado para apagar as cópias de sombra (shadow copies) do Windows?', formato: 'linha de comando', tipo: 'texto', respostas: ['vssadmin delete shadows /all /quiet'], explicacao: 'O windows.cmdline do PID 7262 (filho do cmd.exe, neto do svch0st.exe): vssadmin delete shadows /all /quiet. Apagar as cópias de sombra impede a restauração pelo próprio Windows. Clássico de ransomware.', prejudicado: (f) => !f.has('ram') },
    { id: 'q5', texto: 'Desconectar o cabo de rede mantendo a máquina ligada pertence a qual fase do ciclo de vida de resposta a incidentes (NIST SP 800-61)?', formato: 'nome da fase', tipo: 'texto', respostas: ['contenção', 'contencao', 'contenção, erradicação e recuperação'], explicacao: 'NIST SP 800-61: Preparação; Detecção e Análise; Contenção, Erradicação e Recuperação; Atividades Pós-Incidente. Isolar a máquina sem desligar é contenção que preserva evidência volátil.' },
  ],
  cena: {
    local: 'Recepção da Clínica Sorriso Pleno, Água Verde',
    largura: 7,
    profundidade: 5.5,
    piso: '#ffffff',
    parede: '#e6f0ef',
    pisoTex: 'large_grey_tiles',
    pisoEscala: 1.4,
    paredeTex: 'painted_plaster_wall',
    luz: 'fluor',
    inicio: [3.5, 4.9, 0],
    saida: [6.4, 5.0],
    moveis: [
      { tipo: 'balcao', pos: [2.2, 0, 1.3], tam: [2.6, 1.05, 0.6], cor: '#f8fafc' },
      { tipo: 'glb', glb: 'modern_arm_chair_01', pos: [2.2, 0, 0.55], escala: 0.85 },
      { tipo: 'glb', glb: 'sofa_02', pos: [5.6, 0, 1.0], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'dining_chair_02', pos: [4.6, 0, 3.5], rot: Math.PI },
      { tipo: 'glb', glb: 'dining_chair_02', pos: [5.2, 0, 3.5], rot: Math.PI },
      { tipo: 'glb', glb: 'side_table_01', pos: [5.6, 0, 2.4] },
      { tipo: 'glb', glb: 'potted_plant_01', pos: [6.6, 0, 0.4] },
      { tipo: 'glb', glb: 'potted_plant_04', pos: [5.6, 0.55, 2.4], solido: false },
      { tipo: 'glb', glb: 'wall_clock', pos: [2.2, 2.15, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_02', pos: [5.2, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'fancy_picture_frame_01', pos: [6.97, 1.6, 3.0], rot: -Math.PI / 2, solido: false },
      { tipo: 'glb', glb: 'drawer_cabinet', pos: [0.32, 0, 3.0], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'trashbag', pos: [0.5, 0, 0.4] },
      { tipo: 'janela', pos: [5.6, 0.9, 0.02], tam: [1.4, 1.2, 0] },
      { tipo: 'porta', pos: [6.4, 0, 5.47], rot: Math.PI },
    ],
    itens: [
      {
        id: 'pc', modelo: 'desktop', pos: [1.2, 1.05, 1.35], relevante: true, escala: 0.8,
        nome: 'Computador da recepção (ransomware ativo)',
        descricao: 'Gabinete ligado, LED de disco aceso direto. A cada segundo, um arquivo vira ".sorriso_trancado" no servidor de pacientes. O antivírus mostra um escudo verde, sorrindo.',
        detalhes: ['Hostname: RECEPCAO-01', 'IP: 10.10.0.31', 'Mapeado: \\\\SERVIDOR\\pacientes (Z:)', 'Antivírus: AntivirusBarato (vencido)'],
        acoes: [
          { id: 'ram', rotulo: 'Capturar a RAM com o Volátil Coletor (pendrive de resposta)', toca: true, unica: true, flags: ['ram'], integridade: 5, texto: 'Dump de 16 GB da RAM gravado no seu disco externo de resposta, com hash. Levou 4 minutos (cada minuto, uns 300 arquivos a menos). Mas agora você tem os processos, as conexões e, talvez, a chave.' },
          { id: 'cabo', rotulo: 'Puxar o cabo de rede (manter ligado)', toca: true, unica: true, flags: ['isolou_rede'], integridade: 3, texto: 'Cabo de rede fora. O ransomware perdeu o acesso ao servidor de pacientes e ao C2. A máquina segue ligada, com a memória intacta. Contenção sem destruir prova.' },
          { id: 'desligar', rotulo: 'Desligar no botão, como o técnico mandou', toca: true, unica: true, bloqueiaSe: ['ram'], flags: ['desligou_sem_ram'], integridade: -15, texto: 'Desligou. A criptografia parou, sim. E a memória, com processos, conexões, comando executado e possivelmente a chave, sumiu. Do vírus, só sobrou o que estava no disco.' },
          { id: 'coletar', rotulo: 'Coletar o computador (depois da RAM e da contenção)', toca: true, requer: ['ram'], coleta: { rotulo: 'Gabinete RECEPCAO-01 e mídia com dump de memória (hash registrado)', embalagens: ['antiestatico', 'caixa'], dispositivo: 'pc' }, texto: 'Gabinete e dump lacrados. O disco será analisado depois; a memória é o ouro deste caso.' },
          { id: 'coletar_x', rotulo: 'Coletar o computador', toca: true, bloqueiaSe: ['ram'], coleta: { rotulo: 'Gabinete RECEPCAO-01', embalagens: ['antiestatico', 'caixa'] }, texto: 'Coletado sem a memória. O disco conta só metade da história.' },
        ],
      },
      { id: 'monitor', modelo: 'monitor', pos: [2.2, 1.05, 1.15], tela: ['!SEUS ARQUIVOS FORAM', '!CRIPTOGRAFADOS', 'Envie 0,8 BTC em 72h', 'Contador: 71:58:12'], nome: 'Monitor com o pedido de resgate', descricao: 'Tela vermelha com caveira sorridente (de dentista, com aparelho). Pede 0,8 BTC em 72 horas e oferece "suporte ao cliente 24h". Fotografe tudo, inclusive o contador.', acoes: [{ id: 'pagar', rotulo: 'Aconselhar a clínica a pagar o resgate "para resolver logo"', unica: true, credibilidade: -8, texto: 'Perito não aconselha pagamento. Pagar financia o crime, não garante a chave e marca a clínica como "pagadora" para o próximo ataque. A decisão é da vítima, com orientação jurídica, e a polícia não recomenda.' }] },
      { id: 'servidor', modelo: 'hd', pos: [0.4, 1.33, 3.0], escala: 2.5, nome: 'Servidor de arquivos (NAS) com os prontuários', descricao: 'NAS pequeno no armário. Os prontuários estão virando .sorriso_trancado. Tem um backup em HD USB espetado nele, também conectado. Ou seja: também criptografado. Backup conectado não é backup.', acoes: [{ id: 'desplugar', rotulo: 'Desconectar o HD de backup do NAS', toca: true, unica: true, integridade: 2, texto: 'HD de backup desconectado. Talvez salve uma parte. A recomendação no laudo vai ser a regra 3-2-1 (três cópias, duas mídias, uma fora do lugar e desconectada).' }] },
      { id: 'celular', modelo: 'celular', pos: [2.9, 1.05, 1.4], rot: 0.5, tela: ['#Rogério TI', 'Chamada perdida (4)', '"DESLIGA TUDO"'], nome: 'Celular da recepcionista', descricao: '4 chamadas perdidas do técnico e uma mensagem em maiúsculas: "DESLIGA TUDO". Não é evidência. É pânico em texto.', acoes: [] },
      { id: 'revistas', modelo: 'livro', pos: [5.6, 0.55, 2.55], cor: '#0ea5e9', nome: 'Revistas da sala de espera', descricao: 'Uma de 2019, com a manchete "Seus dados estão seguros na nuvem?". Não estavam.', acoes: [] },
      { id: 'cafe', modelo: 'cafeteira', pos: [3.2, 1.05, 1.3], nome: 'Cafeteira de cápsula da recepção', descricao: 'A única coisa que continua funcionando na clínica. Respeite.', acoes: [] },
    ],
    pessoas: [
      { id: 'rosana', nome: 'Dra. Rosana', papel: 'dentista, dona da clínica', modelo: 'celeste', pos: [4.7, 2.7], rot: -2.6, falas: ['Quanto é 0,8 bitcoin? Dá pra parcelar?', 'Meus 4 mil pacientes... os prontuários, os raios X...', 'O backup? O Rogério disse que era automático.'] },
      { id: 'kelly', nome: 'Kelly', papel: 'recepcionista', modelo: 'yara', pos: [0.9, 2.4], rot: 1.3, falas: ['Eu só abri o boleto que chegou no e-mail. O nome era Boleto_Novembro.pdf.', 'Aí apareceu essa tela e o Rogério mandou desligar tudo. Eu não desliguei. Fiz certo?', 'O antivírus estava verdinho o tempo todo.'] },
      { id: 'rogerio', nome: 'Rogério', papel: 'TI terceirizado (chegou correndo)', modelo: 'rogerio', pos: [5.0, 4.3], rot: -2.2, falas: ['Desliga tudo! Sempre funcionou desligar!', 'O backup era automático. No HD espetado no servidor. Ah.', 'Eu também atendo a contabilidade do Batel. Mundo pequeno, né?'], reage: [{ flag: 'ram', fala: 'Você copiou a memória antes? Nunca pensei nisso. Vou anotar.' }] },
    ],
  },
  lab: (c) => {
    const rec: Record<string, No> = {};
    if (c.flags.has('ram')) rec['RECEPCAO-01_memoria.raw'] = memoria();
    rec['LEIA-ME.txt'] = arq([
      c.flags.has('ram') ? 'Dump de memória coletado ao vivo às 18:12:40 (Brasília) de 20/11/2026, 16 GB, hash registrado no auto.' : 'Nenhum dump de memória foi coletado (equipamento desligado antes).',
      'Rede da clínica: 10.10.0.0/24. Servidor de arquivos (NAS): 10.10.0.5.',
    ].join('\n') + '\n');
    return {
      dispositivos: [],
      recebidos: pasta(rec),
      boasVindas: [
        'Caso: ransomware na Clínica Sorriso Pleno (20/11/2026).',
        'Material: dump de memória em /casos/c08/recebidos.',
        '',
        'Roteiro do Volátil:',
        '  volatil -f <dump> windows.info',
        '  volatil -f <dump> windows.pstree      (quem é filho de quem)',
        '  volatil -f <dump> windows.cmdline     (argumentos)',
        '  volatil -f <dump> windows.netscan     (conexões)',
        '  volatil -f <dump> windows.malfind     (código injetado)',
        '  strings <dump> | grep -i http',
      ],
    };
  },
  metodologia: [
    { texto: 'A memória RAM foi coletada antes de qualquer desligamento, em mídia de resposta própria, com hash registrado (ordem de volatilidade, RFC 3227).', certo: true },
    { texto: 'O equipamento foi isolado da rede mantendo-se ligado, como medida de contenção.', certo: true },
    { texto: 'O dump foi analisado quanto a árvore de processos, linhas de comando, conexões de rede e regiões de memória com código injetado.', certo: true },
    { texto: 'Foi recomendada a política de backups desconectados (regra 3-2-1).', certo: true },
    { texto: 'O equipamento foi desligado imediatamente para interromper a criptografia, antes de qualquer coleta.', certo: false },
    { texto: 'A perícia recomendou o pagamento do resgate para recuperar os prontuários.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', se: ['desligou_sem_ram'], pergunta: 'Sem a memória, como a perícia afirma qual processo criptografava?', opcoes: [
      { texto: 'Não afirma. Com o desligamento antes da coleta, os quesitos sobre processo, injeção e conexões ficaram prejudicados. O disco ainda permite análise do executável, em laudo complementar.', certa: true, reacao: 'Limitação assumida. A juíza aprecia a honestidade, a promotoria lamenta o desligamento.' },
      { texto: 'Pelo nome dos arquivos criptografados dá para deduzir.', certa: false, reacao: 'Dedução não é exame. A defesa pede a exclusão da conclusão.' },
    ] },
    { quem: 'juiza', pergunta: 'O laudo diz que o vírus se chamava "svch0st". O Windows não tem um "svchost" de verdade?', opcoes: [
      { texto: 'Tem, com a letra O, rodando de System32 e filho do services.exe. O malicioso usa o número zero, roda da pasta temporária do usuário e é filho de um falso boleto. Nome parecido, origem e parentesco diferentes.', certa: true, reacao: 'A juíza anota "zero no lugar do O". O advogado do réu fecha a pasta.' },
      { texto: 'É o mesmo programa, só que infectado.', certa: false, reacao: 'Não é o mesmo programa. Agora a defesa diz que o laudo confunde arquivo do sistema com malware.' },
    ] },
    { quem: 'defesa', pergunta: 'A perícia copiou a memória de um computador ligado. Isso não altera a máquina?', opcoes: [
      { texto: 'Altera minimamente: a ferramenta ocupa um pouco de memória. Isso é inerente à coleta ao vivo, está documentado com hora e hash, e é muito menor que a perda total que o desligamento causaria.', certa: true, reacao: 'Explicação de quem conhece o trade-off. A juíza segue.' },
      { texto: 'Não altera nada, é só uma cópia.', certa: false, reacao: 'O assistente técnico da defesa sorri: toda coleta ao vivo altera algo. Ponto para eles.' },
    ] },
    { quem: 'promotoria', pergunta: 'Como o ransomware entrou?', opcoes: [
      { texto: 'Pelo anexo Boleto_Novembro.pdf.exe, aberto pela recepção às 17h31. Extensão dupla: o Windows escondia o ".exe". O processo dele é o pai do svch0st.exe.', certa: true, reacao: 'O promotor anota. A recepcionista, na plateia, enterra o rosto nas mãos. Não foi culpa dela: foi falta de preparação (fase 1 do NIST).' },
      { texto: 'Por uma falha de segurança avançada no Windows.', certa: false, reacao: 'Foi um boleto falso. Exagerar a sofisticação ajuda a defesa e não ajuda a próxima vítima.' },
    ] },
  ],
  dicas: [
    'Começo\n`volatil -f /casos/c08/recebidos/RECEPCAO-01_memoria.raw windows.info` confirma o sistema e a hora da captura.',
    'Quem é o vilão?\n`windows.pstree`: procure processo com nome de sistema fora do lugar, com pai estranho.',
    'Injeção\n`windows.malfind`: região RWX com MZ é executável injetado.',
    'C2\n`windows.netscan` e procure ESTABLISHED para IP externo. `strings dump | grep -i http` confirma.',
    'Shadow copies\n`windows.cmdline | grep -i vss`.',
    'NIST SP 800-61\nPreparação; Detecção e Análise; Contenção, Erradicação e Recuperação; Pós-Incidente.',
  ],
  falhas: {
    desligou_sem_ram: 'O equipamento foi desligado antes da coleta da memória.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_pc: 'Gabinete acondicionado em embalagem inadequada.',
    nao_coletou_pc: 'O computador da recepção não foi coletado.',
  },
};
