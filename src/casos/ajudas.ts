// A estagiária do laboratório: para cada quesito, onde procurar e os comandos prontos.
// Marcadores resolvidos na hora de rodar:
//   {FS}    pasta da extração de sistema de arquivos em /evidencias (termina em _fs)
//   {VEIC}  pasta da extração do veículo em /evidencias (termina em _veiculo)
export interface Ajuda {
  onde: string;
  comandos: string[];
}

const DISCO = (dev: string, nome: string) => ['bloqueador on', `imajador adquirir ${dev} ${nome}.E01`, `imajador montar /evidencias/${nome}.E01`];

export const AJUDAS: Record<string, Record<string, Ajuda>> = {
  c00: {
    q1: { onde: 'O hash sai no log da aquisição do pendrive. Ligue o bloqueador ANTES de adquirir, senão o hash de verificação não bate. Copie a linha SHA256 dos "Hashes calculados na aquisição".', comandos: ['bloqueador on', 'imajador adquirir /dev/sdb PEN.E01', 'cat /evidencias/PEN.E01.txt'] },
    q2: { onde: 'O arquivo foi apagado, então não aparece no ls. A Formiga recupera pela assinatura (cabeçalho %PDF). Depois, strings mostra o texto do PDF; procure a linha da chave Pix.', comandos: ['bloqueador on', 'imajador adquirir /dev/sdb PEN.E01', 'formiga -i /evidencias/PEN.E01 -o ~/recuperados', 'strings ~/recuperados/pdf/* | grep -i pix'] },
    q3: { onde: 'A foto recuperada tem EXIF. Olhe "Date/Time Original" e "Offset Time Original": +00:00 quer dizer UTC. Brasília é 3 horas a menos.', comandos: ['bloqueador on', 'imajador adquirir /dev/sdb PEN.E01', 'formiga -i /evidencias/PEN.E01 -o ~/recuperados', 'exifeiro ~/recuperados/jpg/*', 'conv fuso "2026-11-20 23:14:51" -3'] },
  },
  c01: {
    q1: { onde: 'No registro SYSTEM, a chave USBSTOR lista cada pendrive já conectado, com a data da última escrita. Procure o que foi conectado na noite de 29/10 (30/10 em UTC). O serial é o trecho antes do "&0". O MountedDevices confirma que ele virou a letra E:.', comandos: [...DISCO('/dev/sdb', 'CONTAB07'), 'regripador -r /mnt/CONTAB07/Windows/System32/config/SYSTEM -p usbstor', 'regripador -r /mnt/CONTAB07/Windows/System32/config/SYSTEM -p mountdev'] },
    q2: { onde: 'Quando alguém abre um arquivo, o Windows cria um atalho .lnk na pasta Recent. Procure o atalho cujo alvo está em E:, que é o pendrive.', comandos: [...DISCO('/dev/sdb', 'CONTAB07'), 'lnkeco -d /mnt/CONTAB07/Users/wagner/AppData/Roaming/Microsoft/Windows/Recent'] },
    q3: { onde: 'O Prefetch prova que um programa foi executado. Liste os .pf e procure um nome de "limpador" no meio dos programas comuns.', comandos: [...DISCO('/dev/sdb', 'CONTAB07'), 'ls /mnt/CONTAB07/Windows/Prefetch', 'pfeco -f /mnt/CONTAB07/Windows/Prefetch/LIMPADISCO64.EXE-7C2E91AF.pf'] },
    q4: { onde: 'O "Last run" do Prefetch está em UTC. Converta para Brasília (menos 3 horas). Repare que a data muda de dia.', comandos: [...DISCO('/dev/sdb', 'CONTAB07'), 'pfeco -f /mnt/CONTAB07/Windows/Prefetch/LIMPADISCO64.EXE-7C2E91AF.pf', 'conv fuso "2026-10-30 02:41:17" -3'] },
    q5: { onde: 'Na $MFT, cada arquivo tem duas datas de criação: Created0x10 (que programas conseguem mudar) e Created0x30 (que só o sistema mexe). Se a 0x10 for muito mais antiga que a 0x30, a data foi forjada. Gere o CSV e olhe os arquivos do Wagner.', comandos: [...DISCO('/dev/sdb', 'CONTAB07'), "mfteco -f '/mnt/CONTAB07/$MFT' --csv ~/mft.csv", 'grep -i wagner ~/mft.csv | grep -i documents'] },
  },
  c02: {
    q1: { onde: 'A chave está numa mensagem no banco do mensageiro (msgstore.db). Filtre as mensagens com "pix" e pegue a que começa com "Chave Pix aleatória".', comandos: ['celebrita extrair cel --fs', 'cd /evidencias/{FS}/data/data/com.zapeia/databases', 'sqlite3 msgstore.db "SELECT text_data FROM message WHERE text_data LIKE \'%pix%\'"'] },
    q2: { onde: 'O número da Zilá é 5541998765432. A consulta liga mensagem, conversa e contato e já converte: o timestamp está em milissegundos (divide por 1000) e em UTC (menos 3 horas). A primeira linha é a resposta.', comandos: ['celebrita extrair cel --fs', 'cd /evidencias/{FS}/data/data/com.zapeia/databases', 'sqlite3 -header -column msgstore.db "SELECT datetime(m.timestamp/1000,\'unixepoch\',\'-3 hours\') AS hora, m.text_data FROM message m JOIN chat c ON m.chat_row_id = c._id JOIN jid j ON c.jid_row_id = j._id WHERE j.raw_string LIKE \'5541998765432%\' ORDER BY m.timestamp LIMIT 1"'] },
    q3: { onde: 'Conte quantas conversas diferentes receberam, do aparelho (from_me = 1), uma mensagem com "troquei de número".', comandos: ['celebrita extrair cel --fs', 'cd /evidencias/{FS}/data/data/com.zapeia/databases', 'sqlite3 msgstore.db "SELECT count(DISTINCT chat_row_id) FROM message WHERE from_me = 1 AND text_data LIKE \'%troquei de número%\'"'] },
    q4: { onde: 'São dezenas de fotos. O ver descreve cada uma: procure a dos cartões. O exifeiro mostra o GPS em graus, minutos e segundos; o conv dms transforma em decimal (Sul é negativo).', comandos: ['celebrita extrair cel --fs', 'cd /evidencias/{FS}/sdcard/DCIM/Camera', 'ver *.jpg | grep -i cart', 'exifeiro IMG_20261119_153012.jpg | grep -i gps', 'conv dms "25 deg 25\' 41.50\\" S"'] },
    q5: { onde: 'O histórico do navegador guarda last_visit_time em microssegundos desde 1601 (tempo WebKit). A consulta divide por um milhão, tira 11644473600 segundos e ajusta para Brasília.', comandos: ['celebrita extrair cel --fs', 'sqlite3 /evidencias/{FS}/data/data/com.navegador.android/app_navegador/Default/History "SELECT datetime(last_visit_time/1000000 - 11644473600,\'unixepoch\',\'-3 hours\'), url FROM urls WHERE url LIKE \'%idosos%\'"'] },
  },
  c03: {
    q1: { onde: 'O knowledgeC.db registra qual app estava em primeiro plano (/app/inFocus). As datas são segundos desde 2001: some 978307200. A consulta procura o intervalo que contém o instante da publicação (811119790).', comandos: ['celebrita extrair iphone --fs', 'sqlite3 /evidencias/{FS}/private/var/mobile/Library/CoreDuet/Knowledge/knowledgeC.db "SELECT ZVALUESTRING, datetime(ZSTARTDATE+978307200,\'unixepoch\',\'-3 hours\'), datetime(ZENDDATE+978307200,\'unixepoch\',\'-3 hours\') FROM ZOBJECT WHERE ZSTREAMNAME=\'/app/inFocus\' AND ZSTARTDATE <= 811119790 AND ZENDDATE >= 811119790"'] },
    q2: { onde: 'Mesmo banco, fluxo /device/isLocked: 0 é desbloqueado, 1 é bloqueado. Veja qual intervalo cobre 20:03 em Brasília.', comandos: ['celebrita extrair iphone --fs', 'sqlite3 /evidencias/{FS}/private/var/mobile/Library/CoreDuet/Knowledge/knowledgeC.db "SELECT ZVALUEINTEGER, datetime(ZSTARTDATE+978307200,\'unixepoch\',\'-3 hours\'), datetime(ZENDDATE+978307200,\'unixepoch\',\'-3 hours\') FROM ZOBJECT WHERE ZSTREAMNAME=\'/device/isLocked\'"'] },
    q3: { onde: 'No sms.db do iPhone, a data está em NANOSSEGUNDOS desde 2001: divida por um bilhão, some 978307200 e ajuste para Brasília.', comandos: ['celebrita extrair iphone --fs', 'sqlite3 /evidencias/{FS}/private/var/mobile/Library/SMS/sms.db "SELECT datetime(date/1000000000+978307200,\'unixepoch\',\'-3 hours\'), text FROM message WHERE text LIKE \'%posta você%\'"'] },
    q4: { onde: 'A mensagem tem um handle_id; a tabela handle diz qual telefone é. Um JOIN resolve.', comandos: ['celebrita extrair iphone --fs', 'sqlite3 /evidencias/{FS}/private/var/mobile/Library/SMS/sms.db "SELECT h.id, m.text FROM message m JOIN handle h ON m.handle_id = h.ROWID WHERE m.text LIKE \'%posta você%\'"'] },
  },
  c04: {
    q1: { onde: 'A exportação da fabricante (JSON) tem a lista de usuários e os eventos. Procure o DESTRANCADA da madrugada de 19/10 e veja de qual usuario_id ele é.', comandos: ['cd /casos/c04/recebidos', "jq '.usuarios' fechadura_trancatech_export.json", "jq -c '.eventos[] | select(.usuario_id == 3)' fechadura_trancatech_export.json"] },
    q2: { onde: 'No mesmo JSON, o evento CREDENCIAL_CRIADA diz quem (usuario_id) criou o usuário 3. Compare com a lista de usuários.', comandos: ['cd /casos/c04/recebidos', "jq -c '.eventos[] | select(.evento == \"CREDENCIAL_CRIADA\")' fechadura_trancatech_export.json", "jq '.usuarios' fechadura_trancatech_export.json"] },
    q3: { onde: 'Os nomes dos clipes estão no relógio da câmera, que estava 7 min 12 s adiantado. Ache o clipe da entrada (exifeiro mostra a descrição) e subtraia 7 min 12 s (0,12 hora).', comandos: [...DISCO('/dev/sdc', 'SD'), 'ls /mnt/SD/DCIM/2026/10', 'exifeiro /mnt/SD/DCIM/2026/10/20261019_022115.mp4', 'conv fuso "2026-10-19 02:21:15" -0.12'] },
    q4: { onde: 'No log do roteador, tire os aparelhos conhecidos da casa e veja quem pegou IP às 2h13.', comandos: ['cd /casos/c04/recebidos', 'grep -v -E "TV-Sala|Lumen|Aspirador|Lampada|Camera|TT900|Geladeira" roteador_logs_dhcp.txt'] },
  },
  c05: {
    q1: { onde: 'Na trilha de auditoria, filtre os eventos que vêm do IP externo e veja o accessKeyId.', comandos: ['cd /casos/c05/recebidos', "jq -c '.Records[] | select(.sourceIPAddress==\"203.0.113.77\") | {t:.eventTime, e:.eventName, k:.userIdentity.accessKeyId}' trilha_nimbus_2026-08-25_a_2026-09-08.json | head -3"] },
    q2: { onde: 'Conte os IPs de origem: os que começam com 10. e 172.31. são internos. Sobra um externo.', comandos: ['cd /casos/c05/recebidos', "jq -r '.Records[].sourceIPAddress' trilha_nimbus_2026-08-25_a_2026-09-08.json | sort | uniq -c | sort -nr"] },
    q3: { onde: 'Filtre GetObject do IP externo e conte as linhas. Confirme no log do bucket.', comandos: ['cd /casos/c05/recebidos', "jq -c '.Records[] | select(.eventName==\"GetObject\" and .sourceIPAddress==\"203.0.113.77\")' trilha_nimbus_2026-08-25_a_2026-09-08.json | wc -l", 'grep -c 203.0.113.77 log_acesso_bucket.txt'] },
    q4: { onde: 'O primeiro evento do IP está em UTC (o Z no final). Converta para Brasília.', comandos: ['cd /casos/c05/recebidos', "jq -c '.Records[] | select(.sourceIPAddress==\"203.0.113.77\") | .eventTime' trilha_nimbus_2026-08-25_a_2026-09-08.json | head -1", 'conv fuso "2026-09-02 06:47:19" -3'] },
    q5: { onde: 'Marco Civil da Internet (Lei 12.965/2014): o art. 13 trata de conexão (1 ano) e o art. 15 trata de aplicações. O quesito pergunta de aplicações.', comandos: [] },
  },
  c06: {
    q1: { onde: 'A estatística de conversas mostra quem fala com IPs externos estranhos. Um IP interno aparece em todas as conversas suspeitas.', comandos: ['tubarao -r /casos/c06/recebidos/captura_uplink_2026-11-10_1000.pcap -z conv,ip'] },
    q2: { onde: 'Liste os nomes perguntados ao DNS e tire os sites comuns. Sobram nomes enormes e aleatórios terminando no mesmo domínio.', comandos: ['tubarao -r /casos/c06/recebidos/captura_uplink_2026-11-10_1000.pcap -Y dns -T fields -e ip.src -e dns.qry.name | grep -v -E "buscador|noticias|email|erp|video|cdn|update|banco|nfe|musica" | head -4'] },
    q3: { onde: 'Pegue o primeiro pedaço do nome (o que tem ".0." depois) e decodifique como base64.', comandos: ['tubarao -r /casos/c06/recebidos/captura_uplink_2026-11-10_1000.pcap -Y "dns.qry.name contains .0.dados" -T fields -e dns.qry.name | head -1', 'conv b64 YXJxdWl2bz1jdXN0b3NfcGluaGFvXzIwMjcueGxzeHw'] },
    q4: { onde: 'FTP não criptografa: os comandos USER e PASS passam em texto claro.', comandos: ['tubarao -r /casos/c06/recebidos/captura_uplink_2026-11-10_1000.pcap -Y ftp'] },
    q5: { onde: 'Procure os POST HTTP periódicos e veja o IP de destino.', comandos: ['tubarao -r /casos/c06/recebidos/captura_uplink_2026-11-10_1000.pcap -Y "http.request.method == POST" -T fields -e ip.src -e ip.dst -e http.request.uri'] },
  },
  c07: {
    q1: { onde: 'O auth.log tem milhares de falhas de robôs. Procure os logins por senha ACEITOS: só um vem de IP externo.', comandos: [...DISCO('/dev/sdb', 'SRV'), 'grep "Accepted password" /mnt/SRV/var/log/auth.log'] },
    q2: { onde: 'Na mesma linha do login aceito aparece o nome da conta usada.', comandos: [...DISCO('/dev/sdb', 'SRV'), 'grep "Accepted password" /mnt/SRV/var/log/auth.log | head -1'] },
    q3: { onde: 'No /etc/passwd, o terceiro campo é o UID. UID 0 é root, qualquer que seja o nome.', comandos: [...DISCO('/dev/sdb', 'SRV'), "awk -F: '$3 == 0 {print $1}' /mnt/SRV/etc/passwd"] },
    q4: { onde: 'O access.log mostra um "imagem.php" recebendo comandos. A raiz do site é /var/www/html.', comandos: [...DISCO('/dev/sdb', 'SRV'), 'grep imagem.php /mnt/SRV/var/log/apache2/access.log | head -3', 'find /mnt/SRV/var/www -name "*.php"'] },
    q5: { onde: 'O servidor está em UTC (veja etc/timezone). Pegue a hora do primeiro "Accepted password" do atacante e tire 3 horas.', comandos: [...DISCO('/dev/sdb', 'SRV'), 'cat /mnt/SRV/etc/timezone', 'grep "Accepted password for estagiario" /mnt/SRV/var/log/auth.log', 'conv fuso "2026-11-14 03:42:57" -3'] },
  },
  c08: {
    q1: { onde: 'Na árvore de processos, procure um nome de sistema fora do lugar: roda da pasta Temp e é filho de um "boleto".', comandos: ['volatil -f /casos/c08/recebidos/RECEPCAO-01_memoria.raw windows.pstree'] },
    q2: { onde: 'O malfind acha código injetado (região RWX começando com MZ). Ele mostra o PID.', comandos: ['volatil -f /casos/c08/recebidos/RECEPCAO-01_memoria.raw windows.malfind'] },
    q3: { onde: 'O netscan mostra as conexões. Procure ESTABLISHED para IP externo que não seja 192.0.2.x (navegação comum).', comandos: ['volatil -f /casos/c08/recebidos/RECEPCAO-01_memoria.raw windows.netscan | grep ESTABLISHED | grep -v 192.0.2'] },
    q4: { onde: 'O cmdline mostra os argumentos de cada processo. Procure "vss".', comandos: ['volatil -f /casos/c08/recebidos/RECEPCAO-01_memoria.raw windows.cmdline | grep -i vss'] },
    q5: { onde: 'NIST SP 800-61: Preparação; Detecção e Análise; Contenção, Erradicação e Recuperação; Pós-Incidente. Isolar sem desligar é qual delas?', comandos: [] },
  },
  c09: {
    q1: { onde: 'Adquira a memória do drone, decodifique o FLY042.DAT (o voo da noite) e olhe a primeira linha de dados: é o ponto de decolagem.', comandos: [...DISCO('/dev/sdd', 'DRONE'), 'datcao /mnt/DRONE/FLY_LOGS/FLY042.DAT -o ~/voo.csv', 'head -3 ~/voo.csv'] },
    q2: { onde: 'Ordene o CSV pela coluna 5 (altitude) e pegue a última linha.', comandos: [...DISCO('/dev/sdd', 'DRONE'), 'datcao /mnt/DRONE/FLY_LOGS/FLY042.DAT -o ~/voo.csv', 'sort -t, -k5 -n ~/voo.csv | tail -1'] },
    q3: { onde: 'Procure a linha com estado SOLTOU_CARGA. A hora está em UTC (Z): tire 3 horas.', comandos: [...DISCO('/dev/sdd', 'DRONE'), 'datcao /mnt/DRONE/FLY_LOGS/FLY042.DAT -o ~/voo.csv', 'grep SOLTOU ~/voo.csv', 'conv fuso "2026-11-07 04:20:44" -3'] },
    q4: { onde: 'Extraia a central do carro e leia a lista de dispositivos pareados.', comandos: ['berlinda extrair carro', 'cat /evidencias/{VEIC}/dispositivos_pareados.json'] },
    q5: { onde: 'Na trilha de GPS do carro, procure a primeira vez que aparecem as coordenadas da decolagem (-25.50123). O tempo é unix em segundos: converta.', comandos: ['berlinda extrair carro', 'grep -25.50123 /evidencias/{VEIC}/gps_trilha.csv | head -1', 'conv unix 1794023920'] },
  },
};
