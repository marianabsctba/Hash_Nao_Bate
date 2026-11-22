// Dossiê de cada caso: o que aconteceu, o que você precisa fazer e onde costuma dar errado.
export interface Missao {
  /** uma frase: o caso em uma linha */
  manchete: string;
  /** o que aconteceu, em linguagem de gente */
  contexto: string;
  /** o que a autoridade quer de você */
  objetivo: string;
  /** passo a passo das fases (cena, custódia, laboratório) */
  passos: string[];
  /** armadilhas do caso */
  atencao: string[];
  /** técnicas que o caso ensina */
  aprende: string[];
}

export const MISSOES: Record<string, Missao> = {
  c00: {
    manchete: 'Um pendrive pode provar que o gabarito do concurso vazou antes da prova.',
    contexto: 'A PM pegou um homem saindo da gráfica que imprimiu as provas do concurso da Guarda Municipal com um pendrive e uma folha impressa. Ele diz que o pendrive "só tem música". O material está na mesa do delegado, que adora "dar uma olhadinha".',
    objetivo: 'Preservar o pendrive sem alterar nada, fazer a imagem forense e descobrir se há um gabarito apagado, para quem era o pagamento e quando a prova foi fotografada.',
    passos: [
      'Na delegacia: fotografe o ambiente (F olhando para o nada), calce as luvas (G) e fotografe cada evidência antes de pegar.',
      'Colete o pendrive e a folha. Não espete o pendrive em computador nenhum.',
      'Na custódia: escolha a embalagem certa para mídia e para papel e ordene as 10 etapas da cadeia de custódia.',
      'No laboratório: bloqueador de escrita, imagem forense, hash, recuperação de apagados e leitura de metadados.',
      'Responda os 3 quesitos e assine o laudo.',
    ],
    atencao: ['Conectar o pendrive sem bloqueador de escrita altera a prova e o hash não bate.', 'O pendrive azul é da escrivã. Apreender o que não é do caso tem preço.', 'Horário de foto pode estar em UTC. O quesito pede Brasília.'],
    aprende: ['fixação do local', 'cadeia de custódia (CPP 158-A a F)', 'bloqueador de escrita', 'hash SHA-256', 'recuperação por assinatura', 'EXIF e fuso horário'],
  },
  c01: {
    manchete: 'O estagiário foi demitido e a planilha de clientes foi parar no concorrente.',
    contexto: 'O escritório Dinheiro Certo Contabilidade demitiu o estagiário de TI, Wagner, na manhã de 30/10. Dias depois, os clientes começaram a receber propostas de um concorrente com os próprios números. O computador dele está ligado e bloqueado desde a demissão, e o disco tem BitLocker.',
    objetivo: 'Provar qual pendrive foi conectado na véspera da demissão, qual planilha saiu, qual programa de limpeza ele rodou e quando, e se ele adulterou datas de arquivos.',
    passos: [
      'Na sala: verifique a criptografia antes de desligar e consiga a chave de recuperação com o suporte (Rogério).',
      'Desligue do jeito certo (cabo de energia, não o menu) e colete o gabinete.',
      'No laboratório: adquira o SSD, monte e analise o registro (SYSTEM e NTUSER.DAT), os atalhos LNK, o Prefetch e a $MFT.',
      'Converta os horários de UTC para Brasília e responda os 5 quesitos.',
    ],
    atencao: ['Desligar disco com BitLocker sem a chave transforma a prova em tijolo.', 'Não use a senha do post-it: acesso não autorizado é nulidade.', 'O serial do dispositivo USB não é o mesmo que o serial do volume.', 'Na conversão para Brasília, a data muda de dia.'],
    aprende: ['BitLocker', 'USBSTOR e MountedDevices', 'atalhos LNK', 'Prefetch', 'UserAssist em ROT13', 'timestomping na $MFT'],
  },
  c02: {
    manchete: 'A central do golpe do falso sobrinho tem um celular ligado que alguém quer apagar de longe.',
    contexto: 'Dona Zilá, 74 anos, mandou R$ 4.800 para o "sobrinho que trocou de número". A polícia chegou à quitinete usada como central do golpe. Na mesa, um celular ligado, desbloqueado e carregando, recebendo "apaga tudo" do comparsa.',
    objetivo: 'Garantir que o celular não seja formatado remotamente nem trancado, extrair os dados e provar: a chave Pix passada à vítima, quando começou a conversa, quantas vítimas receberam o golpe, onde fica o outro endereço da quadrilha e quando o painel foi acessado.',
    passos: [
      'Na quitinete: fotografe, calce luvas e, antes de qualquer coisa, isole o celular (modo avião, bolsa Faraday e energia).',
      'Colete também o caderno de anotações. Os celulares velhos e os chips são opcionais.',
      'No laboratório: extração de sistema de arquivos com o Celebrita, índice com o LEAPPinho e consultas SQL nos bancos.',
      'Converta milissegundos Unix e tempo WebKit para Brasília, ache a foto certa com ver e converta o GPS.',
    ],
    atencao: ['Celular conectado à rede pode receber apagamento remoto no caminho.', 'Desligado, o aparelho volta trancado (BFU) e não sai nada.', 'Ler as mensagens na tela altera o banco e avisa a quadrilha.', 'A extração lógica não traz o mensageiro: use a de sistema de arquivos.'],
    aprende: ['Faraday', 'AFU e BFU', 'extração lógica e de sistema de arquivos', 'SQLite com JOIN e contagem', 'tempo Unix e WebKit', 'GPS do EXIF'],
  },
  c03: {
    manchete: 'A influencer diz que foi hackeada. O iPhone dela vai contar quem publicou a rifa.',
    contexto: 'O perfil da influencer Thaís publicou a rifa de um carro que não existia e arrecadou uns R$ 100 mil. Ela diz que foi invadida e que estava jantando com a mãe. O iPhone está na mesa, ligado e bloqueado, com o advogado vigiando cada passo.',
    objetivo: 'Preservar o iPhone sem forçar senha nem biometria, extrair os dados e provar qual app estava aberto na hora da publicação, se o aparelho estava desbloqueado, quem orientou a postagem e quando.',
    passos: [
      'No apartamento: não peça senha nem use o rosto dela. Ponha em modo avião pela Central de Controle, Faraday e energia.',
      'Colete o iPhone (o iPad é opcional) e anote a câmera de reality como diligência.',
      'No laboratório: extração completa com o Celebrita e consultas no knowledgeC.db e no sms.db.',
      'Converta o tempo da Apple (segundos e nanossegundos desde 2001) para Brasília.',
    ],
    atencao: ['Ninguém é obrigado a produzir prova contra si: senha e rosto, só com ordem específica.', 'Desligar o iPhone tranca tudo (BFU).', 'No sms.db a data está em nanossegundos; no KnowledgeC, em segundos.'],
    aprende: ['AFU sem senha', 'direito de não se autoincriminar', 'KnowledgeC', 'sms.db', 'Mac Absolute Time'],
  },
  c04: {
    manchete: 'Furto sem arrombamento numa casa inteligente que lembra de tudo, menos de acertar o relógio.',
    contexto: 'Marlene registrou o furto de R$ 82 mil (com seguro) na casa dela enquanto estava num hotel em Balneário. Não houve arrombamento. A casa tem fechadura com app, câmera, roteador, assistente de voz e uma geladeira que posta em rede social. A seguradora desconfia.',
    objetivo: 'Descobrir quem destrancou a porta, quem criou essa credencial, o horário real da entrada (corrigindo o relógio da câmera) e qual aparelho entrou no Wi-Fi minutos antes.',
    passos: [
      'Na casa: exporte o log do roteador ANTES de desligar qualquer coisa (ele vive na RAM).',
      'Fotografe o horário da câmera ao lado de um relógio de referência e colete o cartão de memória.',
      'Registre o modelo e o serial da fechadura para pedir o histórico à fabricante. O assistente de voz é opcional.',
      'No laboratório: jq no JSON da fechadura, grep no log do roteador, imagem do cartão, metadados dos clipes e correção do relógio.',
    ],
    atencao: ['Desligar o roteador apaga o log de quem se conectou.', 'O relógio da câmera está adiantado: horário de clipe precisa de correção.', 'Não use o app no celular da investigada.'],
    aprende: ['ordem de volatilidade', 'coleta ao vivo', 'correção de relógio', 'JSON e JSON Lines com jq', 'correlação de fontes'],
  },
  c05: {
    manchete: 'Comprovantes de doadores vazaram de um bucket na nuvem. Não tem HD para apreender, tem log para salvar.',
    contexto: 'A startup Vaquinha Fácil descobriu à venda comprovantes de doação de seus usuários (nome, CPF, valor). Os arquivos ficavam num bucket de armazenamento na nuvem. A CTO quer apagar tudo e recomeçar, e a trilha de auditoria se apaga sozinha em 9 dias.',
    objetivo: 'Preservar os registros antes que sumam e provar qual chave de acesso foi usada, de qual IP, quantos arquivos saíram, quando começou e qual o prazo legal de guarda.',
    passos: [
      'No escritório: peça a exportação da trilha de auditoria e do log do bucket com hash, ANTES de qualquer contenção.',
      'Exporte também o histórico do Git, com autorização da empresa.',
      'Só depois recomende revogar a chave vazada.',
      'No laboratório: jq na trilha, contagem confirmada no log do bucket, grep no Git e conversão de UTC.',
    ],
    atencao: ['Apagar o bucket leva junto o log de acesso que mora dentro dele.', 'Apagar a chave do arquivo não apaga do histórico do Git.', 'O Z no fim do horário quer dizer UTC.'],
    aprende: ['preservação em nuvem', 'trilha de auditoria em JSON', 'jq', 'histórico do Git', 'Marco Civil (arts. 13 e 15)'],
  },
  c06: {
    manchete: 'Alguém está vendendo os orçamentos da fábrica para o concorrente. A rede vai entregar quem.',
    contexto: 'A Móveis Pinhão perdeu duas licitações por centavos. A TI notou tráfego estranho e quer formatar o computador do setor de compras. O dono jura que é o vizinho concorrente.',
    objetivo: 'Capturar o tráfego com o malware vivo e provar qual máquina está comprometida, por qual domínio os dados saem, qual arquivo saiu, a senha de FTP que vazou e o endereço do servidor de comando.',
    passos: [
      'Na sala de TI: impeça a formatação e capture 30 minutos de tráfego com o TAP passivo (ou porta espelho).',
      'Depois da captura, desconecte o computador da rede sem desligar.',
      'No laboratório: estatística de conversas, filtros de DNS, HTTP e FTP no Tubarão e decodificação de base64.',
    ],
    atencao: ['Formatar antes de capturar elimina o malware e a prova.', 'Porta espelho muda a configuração do switch: documente.', 'Base64 no DNS vem sem o "=" no final.'],
    aprende: ['TAP passivo', 'pcap', 'túnel DNS', 'base64', 'FTP em texto claro', 'beacon de comando e controle'],
  },
  c07: {
    manchete: 'O site da prefeitura amanheceu pichado e o servidor tem mais usuários do que funcionários.',
    contexto: 'O portal da Prefeitura de Vila Pitanga do Norte mostra "HACKEADO". O servidor Linux fica numa salinha com goteira. O técnico quer restaurar o backup por cima agora, porque o prefeito tem live às 15h.',
    objetivo: 'Preservar o disco antes de qualquer restauração e provar de onde veio o ataque, qual conta foi usada, qual usuário foi criado com poder de root, onde está o webshell e quando foi o primeiro login.',
    passos: [
      'No servidor: faça a triagem ao vivo com binários do seu pendrive e não deixe restaurar o backup por cima.',
      'Desligue puxando o cabo e colete o disco. O pendrive de backup serve de comparação.',
      'No laboratório: monte o disco e analise auth.log, access.log, passwd, crontab, wtmp e .bash_history.',
      'Use grep, awk, sort e uniq para separar o ataque do ruído de robôs.',
    ],
    atencao: ['Restaurar por cima apaga o ataque inteiro.', 'O auth.log tem milhares de tentativas de robôs: o que importa é o login aceito.', 'O servidor está em UTC e o syslog não grava o ano.'],
    aprende: ['triagem ao vivo', 'auth.log', 'UID 0', 'webshell', 'cron de persistência', 'grep, awk, sort e uniq'],
  },
  c08: {
    manchete: 'Sexta, 17h55: o ransomware está criptografando a clínica ao vivo.',
    contexto: 'A recepção da Clínica Sorriso Pleno abriu um "boleto" e a tela ficou vermelha. Os prontuários estão virando ".sorriso_trancado" a cada segundo. O técnico mandou desligar tudo pelo telefone e a dentista quer pagar o resgate.',
    objetivo: 'Coletar a memória RAM antes de qualquer desligamento, conter o ataque sem destruir prova e descobrir o processo do ransomware, onde ele se injetou, o servidor de comando, o comando que apagou as cópias e a fase do ciclo de incidente.',
    passos: [
      'Na recepção: capture a RAM primeiro, depois puxe o cabo de rede (sem desligar).',
      'Desconecte o HD de backup do servidor e não recomende pagar o resgate.',
      'No laboratório: Volátil com pstree, malfind, netscan e cmdline, mais strings no dump.',
    ],
    atencao: ['Desligar antes de coletar a RAM perde processos, conexões e talvez a chave.', '"svch0st" com zero não é o svchost do Windows.', 'Perito não recomenda pagar resgate.'],
    aprende: ['ordem de volatilidade (RFC 3227)', 'coleta de RAM', 'Volátil', 'processo disfarçado e injeção', 'NIST SP 800-61'],
  },
  c09: {
    manchete: 'Um drone entregou celulares no presídio e caiu. Um carro estacionado lá fora tem memória.',
    contexto: 'Na madrugada de 07/11, um drone soltou um pacote de celulares no pátio da penitenciária e caiu sem bateria. A PM abordou um carro numa estrada de terra perto dali. O motorista é o Washington, velho conhecido do caso da quitinete. O agente quer jogar o drone no lixo.',
    objetivo: 'Preservar o drone e a central multimídia do carro e provar de onde o drone decolou, a altitude máxima, quando soltou a carga, qual celular estava pareado ao carro e quando o carro chegou ao ponto de decolagem.',
    passos: [
      'No pátio: não deixe descartar nem ligar o drone. Colete com a bateria separada.',
      'Remova a central multimídia do carro para extração, sem ligar a ignição.',
      'Colete o controle e o pacote, registrando quem manuseou antes.',
      'No laboratório: imagem da memória do drone, DatCão para o log de voo, Berlinda iVê para a central e cruzamento das coordenadas.',
    ],
    atencao: ['Ligar o drone grava um voo novo no meio da prova.', 'Ligar a ignição gera eventos novos na central.', 'Altitude de drone é relativa à decolagem, não ao nível do mar.'],
    aprende: ['log de voo de drone', 'altitude relativa', 'central multimídia veicular', 'correlação de GPS', 'análise de CSV'],
  },
};
