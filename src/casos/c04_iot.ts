// Caso 4: IoT. Um "furto" numa casa inteligente que lembra de tudo, menos de acertar o relógio.
import type { Caso } from './tipos';
import type { Dispositivo } from '../motor/shell';
import { arq, esp, pasta } from '../motor/vfs';
import type { No } from '../motor/vfs';
import { Rng } from '../motor/rng';
import * as T from '../motor/tempo';
import { datasEntre } from './ruido';

const BR = (s: string) => T.data(s, -3);
const ENTRADA = BR('2026-10-19 02:14:03');
const OFFSET_S = 7 * 60 + 12; // relógio da câmera adiantado
/** relógio da câmera: horário local (Brasília) */
const fc = (d: Date) => T.fmt(d, -3);
const cam = (d: Date) => new Date(d.getTime() + OFFSET_S * 1000);

function fechaduraJson(): No {
  const r = new Rng(404);
  const eventos: Record<string, unknown>[] = [];
  for (const d of datasEntre(r, BR('2026-10-01 06:00:00'), BR('2026-10-17 23:00:00'), 70)) eventos.push({ ts: T.iso(d), evento: r.pick(['DESTRANCADA', 'TRANCADA']), metodo: r.pick(['digital', 'app', 'senha']), usuario_id: r.pick([1, 1, 2]) });
  eventos.push({ ts: T.iso(BR('2026-10-17 18:22:40')), evento: 'CREDENCIAL_CRIADA', metodo: 'app', usuario_id: 1, detalhe: { novo_usuario_id: 3, validade: '2026-10-18T03:00:00Z/2026-10-19T09:00:00Z' } });
  eventos.push({ ts: T.iso(BR('2026-10-18 07:40:02')), evento: 'TRANCADA', metodo: 'app', usuario_id: 1, detalhe: { origem: 'app remoto (4G)' } });
  eventos.push({ ts: T.iso(ENTRADA), evento: 'DESTRANCADA', metodo: 'senha', usuario_id: 3 });
  eventos.push({ ts: T.iso(BR('2026-10-19 02:41:55')), evento: 'TRANCADA', metodo: 'senha', usuario_id: 3 });
  eventos.push({ ts: T.iso(BR('2026-10-19 09:00:00')), evento: 'CREDENCIAL_EXPIRADA', metodo: 'sistema', usuario_id: 3 });
  eventos.push({ ts: T.iso(BR('2026-10-20 15:10:00')), evento: 'DESTRANCADA', metodo: 'digital', usuario_id: 1 });
  eventos.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return arq(JSON.stringify({
    fabricante: 'Trancatech',
    modelo: 'TT-900 Wi-Fi',
    serial: 'TT9-00A1-77F3',
    fuso_dos_registros: 'UTC (Z)',
    usuarios: [{ id: 1, nome: 'Marlene (administradora)', criado_por: null }, { id: 2, nome: 'Diarista Eunice', criado_por: 1 }, { id: 3, nome: 'Visitante Cleiton', criado_por: 1 }],
    eventos,
  }, null, 2) + '\n');
}

function assistenteJson(): No {
  const r = new Rng(5);
  const itens: Record<string, unknown>[] = [];
  for (const d of datasEntre(r, BR('2026-10-10 07:00:00'), BR('2026-10-17 22:00:00'), 50)) itens.push({ ts: T.iso(d), transcricao: r.pick(['Lúmen, que horas são', 'Lúmen, tocar sertanejo', 'Lúmen, previsão do tempo', 'Lúmen, adicionar leite na lista', 'Lúmen, apagar a luz da sala', 'Lúmen, conta uma piada']), voz_reconhecida: r.pick(['Marlene', 'desconhecida']) });
  itens.push({ ts: T.iso(BR('2026-10-19 02:15:20')), transcricao: 'Lúmen, desativar alarme', voz_reconhecida: 'desconhecida', resultado: 'pediu PIN; PIN correto' });
  itens.push({ ts: T.iso(BR('2026-10-19 02:16:02')), transcricao: 'Lúmen, cadê a TV... digo, apagar luz da sala', voz_reconhecida: 'desconhecida' });
  return arq(itens.map((i) => JSON.stringify(i)).join('\n') + '\n');
}

function roteadorLog(): No {
  const r = new Rng(7);
  const macs = [['a4:5e:60:01:22:10', 'TV-Sala'], ['3c:22:fb:9a:00:01', 'Lumen-Echo'], ['b8:27:eb:44:12:aa', 'Aspirador-Robo'], ['d0:73:d5:11:aa:02', 'Lampada-Sala'], ['00:1a:79:3f:20:11', 'Camera-Garagem'], ['f4:f5:d8:01:02:03', 'TT900-Fechadura'], ['9c:b6:d0:aa:bb:cc', 'Geladeira-Smart']];
  const linhas: string[] = [];
  for (const d of datasEntre(r, BR('2026-10-18 20:00:00'), BR('2026-10-19 10:00:00'), 180)) {
    const [mac, host] = r.pick(macs);
    const ip = `192.168.0.${10 + macs.findIndex((m) => m[0] === mac)}`;
    const s = d.toUTCString();
    linhas.push(`${T.fmt(new Date(d.getTime() - 3 * 3600e3)).replace(/^\d{4}-/, '')} dnsmasq-dhcp[812]: DHCPACK(br0) ${ip} ${mac} ${host}`);
    void s;
  }
  linhas.push(`${T.fmt(new Date(BR('2026-10-19 02:13:51').getTime() - 3 * 3600e3)).replace(/^\d{4}-/, '')} dnsmasq-dhcp[812]: DHCPDISCOVER(br0) 6a:1f:02:9c:33:e1`);
  linhas.push(`${T.fmt(new Date(BR('2026-10-19 02:13:51').getTime() - 3 * 3600e3)).replace(/^\d{4}-/, '')} dnsmasq-dhcp[812]: DHCPACK(br0) 192.168.0.57 6a:1f:02:9c:33:e1 Celumax-do-Cleiton`);
  linhas.push(`${T.fmt(new Date(BR('2026-10-19 02:40:30').getTime() - 3 * 3600e3)).replace(/^\d{4}-/, '')} hostapd: wlan0: STA 6a:1f:02:9c:33:e1 IEEE 802.11: disassociated`);
  linhas.sort();
  return arq('# Exportado da interface web do roteador. Horário do roteador: Brasília (UTC-3). Log em memória volátil.\n' + linhas.join('\n') + '\n');
}

function cartaoSd(): () => import('../motor/vfs').Pasta {
  return () => {
    const r = new Rng(19);
    const clipes: Record<string, No> = {};
    const motivos = ['gato atravessando o quintal', 'farol de carro na rua', 'mariposa na lente', 'vento balançando a planta', 'vizinho passeando com cachorro', 'chuva forte'];
    for (const d of datasEntre(r, BR('2026-10-17 18:00:00'), BR('2026-10-19 12:00:00'), 45)) {
      const c = cam(d);
      const nome = `${fc(c).replace(/[-: ]/g, '').slice(0, 8)}_${fc(c).slice(11).replace(/:/g, '')}.mp4`;
      clipes[nome] = esp({ tipo: 'binario', magia: [0, 0, 0, 0x20, ...new TextEncoder().encode('ftypisom')], texto: ['moov', 'mvhd'], formato: 'ISO Media, MP4 Base Media v1 [ISO 14496-12:2003]', meta: { 'Create Date (relógio da câmera)': fc(c).replace(/-/g, ':'), 'Duration': `${r.int(8, 30)} s`, 'Track': 'H.264 1920x1080', 'Evento': 'movimento', 'Descrição (visualização)': r.pick(motivos) } });
    }
    const ce = cam(ENTRADA);
    const nomeE = `${fc(ce).replace(/[-: ]/g, '').slice(0, 8)}_${fc(ce).slice(11).replace(/:/g, '')}.mp4`;
    clipes[nomeE] = esp({ tipo: 'binario', magia: [0, 0, 0, 0x20, ...new TextEncoder().encode('ftypisom')], texto: ['moov', 'mvhd'], formato: 'ISO Media, MP4 Base Media v1 [ISO 14496-12:2003]', meta: { 'Create Date (relógio da câmera)': fc(ce).replace(/-/g, ':'), 'Duration': '41 s', 'Track': 'H.264 1920x1080', 'Evento': 'movimento', 'Descrição (visualização)': 'homem de boné digita a senha na fechadura, a porta abre e ele entra sem forçar nada; leva uma mochila vazia' } });
    const log = [
      'TT-CAM v2.3 system.log',
      `${fc(cam(BR('2026-09-30 08:00:00')))} boot ok`,
      `${fc(cam(BR('2026-09-30 08:00:05')))} ntp: servidor pool.ntp.exemplo inacessível (DNS bloqueado pelo controle parental do roteador)`,
      `${fc(cam(BR('2026-09-30 08:00:06')))} ntp: mantendo relógio local`,
      ...Array.from({ length: 30 }, () => `${fc(cam(new Date(BR('2026-10-01 00:00:00').getTime() + r.prox() * 18 * 864e5)))} motion: clipe gravado`),
      `${fc(cam(BR('2026-10-20 16:00:00')))} app: usuário consultou gravações; app informa horário do celular 2026-10-20 16:00:00, câmera ${fc(cam(BR('2026-10-20 16:00:00')))} (diferença registrada)`,
    ].sort().join('\n');
    return pasta({ DCIM: pasta({ '2026': pasta({ '10': pasta(clipes) }) }), 'system.log': arq(log + '\n') });
  };
}

export const caso04: Caso = {
  id: 'c04',
  numero: 4,
  titulo: 'A Casa Que Viu Tudo',
  subtitulo: 'Furto numa casa inteligente. A fechadura lembra quem entrou, a câmera erra a hora e o roteador esquece tudo se você desligar.',
  modulo: 'Coleta e análise em dispositivos IoT',
  dificuldade: 3,
  resumo: 'Marlene registrou furto de joias e eletrônicos (R$ 82 mil, com seguro) na casa dela, no Santa Felicidade, na madrugada de 19/10/2026, enquanto estava num hotel em Balneário Camboriú. Sem arrombamento. A seguradora desconfia. A casa é cheia de dispositivos conectados.',
  canal: 'zap',
  chamado: [
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Casa inteligente, furto sem arrombamento, seguro alto. A delegada quer saber quem entrou e quando.', hora: '10:02' },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'Tem fechadura com app, câmera, assistente de voz, roteador, lâmpada que muda de cor, aspirador robô e uma geladeira que posta em rede social. Sério.', hora: '10:03' },
    { de: 'Você', texto: 'O roteador tá ligado? Não deixa ninguém desligar. Log de DHCP fica na RAM.', hora: '10:04', eu: true },
    { de: 'Dra. Ivone (chefe da seção)', texto: 'O síndico queria "resetar tudo pra ver se volta". Segurei ele pela gola.', hora: '10:04' },
  ],
  oficio: ['Delegacia de Furtos e Roubos. IP nº 2026.0733.', 'Requisita exame no local e nos dispositivos conectados da residência, para identificar o acesso à casa na madrugada de 19/10/2026.'],
  quesitos: [
    { id: 'q1', texto: 'Qual credencial da fechadura destrancou a porta na madrugada de 19/10/2026? Informe o nome do usuário cadastrado.', formato: 'nome como aparece no cadastro', tipo: 'texto', respostas: ['Visitante Cleiton', 'Cleiton'], explicacao: 'A exportação da fabricante mostra DESTRANCADA por senha, usuario_id 3, às 05:14:03Z (02:14:03 em Brasília). No cadastro, o id 3 é "Visitante Cleiton".', prejudicado: (f) => !f.has('requisitou_fechadura') },
    { id: 'q2', texto: 'Quem criou essa credencial, e quando (Brasília)? Informe o nome do usuário criador.', formato: 'nome do usuário criador', tipo: 'texto', respostas: ['Marlene', 'Marlene (administradora)'], explicacao: 'Evento CREDENCIAL_CRIADA em 17/10/2026 18:22:40 (Brasília), pelo usuario_id 1, Marlene, com validade exatamente na madrugada do "furto". Quem estava no hotel deixou a chave digital pronta.', prejudicado: (f) => !f.has('requisitou_fechadura') },
    { id: 'q3', texto: 'O clipe da câmera que mostra a entrada traz um horário no nome e nos metadados. Qual o horário REAL (Brasília) da entrada, corrigindo o relógio da câmera?', formato: 'AAAA-MM-DD HH:MM (Brasília)', tipo: 'hora', respostas: ['2026-10-19 02:14'], explicacao: 'O relógio da câmera não sincronizava (NTP bloqueado) e estava 7 min 12 s adiantado, o que aparece na foto do relógio na cena e no próprio system.log (diferença registrada em 20/10). O clipe diz 02:21:15; corrigindo, 02:14:03, batendo com a fechadura. Correlacionar fontes é a forma de validar relógio.', prejudicado: (f) => f.has('nao_coletou_camera') },
    { id: 'q4', texto: 'Qual o nome de host do aparelho que se conectou ao Wi-Fi da casa minutos antes da entrada?', formato: 'hostname', tipo: 'texto', respostas: ['Celumax-do-Cleiton'], explicacao: 'No log do dnsmasq exportado do roteador, às 02:13:51 um MAC novo recebeu IP com o hostname Celumax-do-Cleiton. Esse log vive na RAM: desligar o roteador apagaria a prova (ordem de volatilidade).', prejudicado: (f) => !f.has('exportou_roteador') },
  ],
  cena: {
    local: 'Casa de Marlene, Santa Felicidade, Curitiba',
    largura: 7,
    profundidade: 6,
    piso: '#ffffff',
    parede: '#ede7dd',
    pisoTex: 'laminate_floor_02',
    pisoEscala: 2,
    paredeTex: 'painted_plaster_wall',
    luz: 'dia',
    inicio: [3.5, 5.0, 0],
    saida: [6.4, 5.5],
    moveis: [
      { tipo: 'glb', glb: 'sofa_02', pos: [2.2, 0, 3.6], rot: Math.PI },
      { tipo: 'glb', glb: 'modern_coffee_table_01', pos: [2.2, 0, 2.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'modern_wooden_cabinet', pos: [2.2, 0, 0.3] },
      { tipo: 'glb', glb: 'dining_table', pos: [5.2, 0, 2.2], rot: Math.PI / 2, escala: 0.8 },
      { tipo: 'glb', glb: 'dining_chair_02', pos: [4.7, 0, 1.6], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'dining_chair_02', pos: [4.7, 0, 2.8], rot: Math.PI / 2 },
      { tipo: 'glb', glb: 'dining_chair_02', pos: [5.7, 0, 1.6], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'painted_wooden_shelves', pos: [6.75, 0, 4.0], rot: -Math.PI / 2 },
      { tipo: 'glb', glb: 'potted_plant_02', pos: [0.5, 0, 0.5] },
      { tipo: 'glb', glb: 'potted_plant_01', pos: [0.5, 0, 5.4] },
      { tipo: 'glb', glb: 'wall_clock', pos: [3.7, 2.1, 0.03], solido: false },
      { tipo: 'glb', glb: 'fancy_picture_frame_01', pos: [2.2, 1.7, 0.03], solido: false },
      { tipo: 'glb', glb: 'hanging_picture_frame_02', pos: [0.03, 1.6, 2.6], rot: Math.PI / 2, solido: false },
      { tipo: 'janela', pos: [5.2, 0.9, 0.02], tam: [1.6, 1.3, 0] },
      { tipo: 'tapete', pos: [2.2, 0, 2.8], tam: [2.6, 0, 1.8], cor: '#57534e' },
      { tipo: 'porta', pos: [6.4, 0, 5.97], rot: Math.PI },
    ],
    itens: [
      {
        id: 'roteador', modelo: 'roteador', pos: [6.62, 1.13, 4.0], rot: -Math.PI / 2,
        nome: 'Roteador Wi-Fi da casa (ligado)',
        descricao: 'Roteador com LEDs piscando, ligado há 41 dias. A interface web mostra log do servidor DHCP (quem recebeu IP e quando), mas o log fica só na memória: reiniciou, perdeu.',
        detalhes: ['Uptime: 41 dias', 'Log do sistema: em RAM, 512 KB circulares', 'Controle parental ativo (bloqueia vários domínios)'],
        acoes: [
          { id: 'exportar', rotulo: 'Acessar a interface web e exportar os logs (fotografando cada tela)', unica: true, flags: ['exportou_roteador'], integridade: 4, texto: 'Logs exportados para mídia estéril, com hash, e cada tela fotografada com o relógio do roteador visível. Coleta ao vivo documentada: o que é volátil sai primeiro.' },
          { id: 'desligar', rotulo: 'Desligar o roteador e levar para o laboratório', toca: true, unica: true, bloqueiaSe: ['exportou_roteador'], flags: ['perdeu_log_roteador'], integridade: -12, texto: 'Desligou. 41 dias de log de DHCP evaporaram junto com a energia. O roteador chega ao laboratório com a memória tão vazia quanto a desculpa da proprietária.' },
          { id: 'coletar', rotulo: 'Coletar o roteador (depois da exportação)', toca: true, requer: ['exportou_roteador'], coleta: { rotulo: 'Roteador Wi-Fi da residência', embalagens: ['caixa', 'antiestatico'] }, texto: 'Coletado depois de exportar o volátil. Ordem certa.' },
        ],
      },
      {
        id: 'camera', modelo: 'camera', pos: [6.2, 2.69, 5.2], relevante: true,
        nome: 'Câmera Wi-Fi apontada para a porta',
        descricao: 'Câmera com cartão microSD. O display do app no celular da Marlene mostra o horário da câmera 7 minutos adiantado em relação ao relógio de parede. Grava clipes por movimento.',
        detalhes: ['Modelo: TT-CAM v2.3', 'Armazenamento: microSD 32 GB', 'Horário na câmera agora: 10:47:12', 'Relógio oficial (celular da perícia, sincronizado): 10:40:00'],
        acoes: [
          { id: 'relogio', rotulo: 'Fotografar o horário da câmera ao lado do relógio de referência', unica: true, flags: ['anotou_relogio'], integridade: 3, texto: 'Registrado: câmera 10:47:12, referência 10:40:00. Diferença de +7 min 12 s. Sem isso, cada horário dos clipes seria discutível em juízo.' },
          { id: 'coletar', rotulo: 'Retirar e coletar o cartão microSD', toca: true, coleta: { rotulo: 'Cartão microSD 32 GB da câmera da porta', embalagens: ['antiestatico', 'envelope'], dispositivo: 'sd' }, texto: 'Cartão retirado e lacrado. Ele será adquirido como qualquer disco: bloqueador, imagem e hash.' },
        ],
      },
      {
        id: 'fechadura', modelo: 'fechadura', pos: [5.85, 0.95, 5.93], rot: Math.PI,
        nome: 'Fechadura inteligente da porta',
        descricao: 'Fechadura com teclado, digital e app. A fechadura em si guarda pouco: o histórico completo fica na nuvem da fabricante. O caminho é a requisição judicial.',
        detalhes: ['Fabricante: Trancatech', 'Modelo: TT-900 Wi-Fi', 'Serial: TT9-00A1-77F3', 'Conta vinculada: e-mail da Marlene'],
        acoes: [
          { id: 'requisitar', rotulo: 'Registrar modelo e serial e sugerir requisição dos logs à fabricante', unica: true, flags: ['requisitou_fechadura'], integridade: 3, texto: 'Modelo, serial e conta anotados e fotografados. A autoridade pediu à fabricante, com ordem judicial, a exportação do histórico. O JSON chegou ao laboratório por ofício (com hash informado pela fabricante).' },
          { id: 'mexer', rotulo: 'Abrir o app no celular da Marlene e olhar o histórico', unica: true, credibilidade: -4, flags: ['mexeu_app_marlene'], texto: 'Você usou o celular da própria investigada para ver o app, sem autorização para isso. O que viu não serve como prova e a defesa vai chamar de "pesca probatória".' },
        ],
      },
      { id: 'assistente', modelo: 'assistente', pos: [3.1, 0.68, 0.35], nome: 'Assistente de voz "Lúmen"', descricao: 'Caixinha que escuta tudo e não entende metade. O histórico de comandos fica na nuvem. Pode ajudar a corroborar a madrugada.', acoes: [{ id: 'perguntar', rotulo: 'Perguntar: "Lúmen, quem entrou aqui ontem?"', unica: true, credibilidade: -1, texto: '"Desculpe, não entendi. Você quis dizer: tocar Quem Entrou, de Zé Pagodinho?" E ainda registrou sua voz no histórico da investigada.' }, { id: 'requisitar', rotulo: 'Sugerir requisição do histórico de voz ao provedor', unica: true, flags: ['requisitou_voz'], integridade: 1, texto: 'Anotado. Corrobora, não é essencial.' }] },
      { id: 'tv', modelo: 'tv', pos: [2.2, 0.68, 0.32], tela: ['#Bom dia, Marlene!', 'Continuar assistindo:', '"Golpes Perfeitos" ep. 4'], nome: 'Smart TV', descricao: 'Sugere continuar a série "Golpes Perfeitos", episódio 4: "O seguro sempre paga". Ironia não é prova.', acoes: [] },
      { id: 'aspirador', modelo: 'aspirador', pos: [3.8, 0, 4.0], nome: 'Aspirador robô', descricao: 'Mapeou a casa inteira. O mapa mostra a disposição dos móveis, mas ele não trabalha de madrugada (programado para 10h). Inútil para os quesitos, ótimo para o croqui.', acoes: [] },
      { id: 'geladeira', modelo: 'geladeira', pos: [0.45, 0, 3.4], rot: Math.PI / 2, nome: 'Geladeira inteligente', descricao: 'Tem tela, Wi-Fi e conta em rede social. Postou "Fiquei sozinha no fim de semana 🥲" no sábado. Não sabe de nada. Ou sabe e não fala.', acoes: [] },
      { id: 'lampada', modelo: 'lampada', pos: [1.0, 0.55, 3.6], nome: 'Abajur com lâmpada inteligente', descricao: 'Muda de cor com a música. Registra quando é ligada, no app. Às 2h17 do dia 19 alguém apagou a luz da sala por voz.', acoes: [] },
    ],
    pessoas: [
      { id: 'marlene', nome: 'Marlene', papel: 'proprietária e comunicante', modelo: 'marlene', pos: [6.1, 3.7], rot: -2.3, falas: ['Eu estava em Balneário, tenho até o recibo do hotel.', 'Levaram minhas joias de família. E o notebook. E a bicicleta ergométrica que eu nunca usei.', 'A senha da fechadura? Só eu e a diarista sabemos. Acho.'] },
      { id: 'valdir', nome: 'Seu Valdir', papel: 'síndico do condomínio', modelo: 'valdir', pos: [1.2, 4.6], rot: 0.6, falas: ['Eu ia resetar tudo, o técnico da TV a cabo disse que resolve qualquer coisa.', 'Na minha época, chave era chave. Agora a porta tem senha e a geladeira tem opinião.', 'O irmão dela, o Cleiton, vive aparecendo aqui de boné.'] },
      { id: 'gilson', nome: 'Seu Gilson', papel: 'segurança do condomínio', modelo: 'gilson', pos: [5.6, 4.6], rot: -2.2, falas: ['A portaria registrou um carro entrando 2h10 com um "parente da Dona Marlene".', 'O livro da portaria tá lá embaixo. Escrito à mão. Com café derramado.', 'A câmera da portaria grava por cima a cada 7 dias. Já foi.'] },
    ],
  },
  lab: (c) => {
    const sd: Dispositivo = { id: 'sd', dev: '/dev/sdc', rotulo: 'microSD 32 GB da câmera TT-CAM', tipo: 'disco', tamanho: '29.7G', semente: 7404, conteudo: cartaoSd() };
    const rec: Record<string, No> = {};
    if (c.flags.has('requisitou_fechadura')) rec['fechadura_trancatech_export.json'] = fechaduraJson();
    if (c.flags.has('requisitou_voz')) rec['lumen_historico_voz.jsonl'] = assistenteJson();
    if (c.flags.has('exportou_roteador')) rec['roteador_logs_dhcp.txt'] = roteadorLog();
    rec['LEIA-ME.txt'] = arq([
      'Material recebido por ofício e coletado ao vivo na cena:',
      c.flags.has('requisitou_fechadura') ? '  fechadura_trancatech_export.json  (fabricante; horários em UTC)' : '  (nenhuma exportação da fechadura: não foi requisitada)',
      c.flags.has('exportou_roteador') ? '  roteador_logs_dhcp.txt            (exportado na cena; horário do roteador em Brasília)' : '  (log do roteador perdido ou não exportado)',
      c.flags.has('requisitou_voz') ? '  lumen_historico_voz.jsonl         (provedor; JSON Lines, um evento por linha, UTC)' : '',
      c.flags.has('anotou_relogio') ? 'Registro de cena: câmera 10:47:12 x referência 10:40:00 (câmera +7 min 12 s).' : 'Sem registro do relógio da câmera na cena: procure outra referência.',
    ].filter(Boolean).join('\n') + '\n');
    return {
      dispositivos: [sd],
      recebidos: pasta(rec),
      boasVindas: [
        'Caso: furto (ou não) na casa de Marlene, madrugada de 19/10/2026.',
        `Material: microSD da câmera em /dev/sdc; arquivos recebidos em /casos/c04/recebidos.`,
        '',
        'Ferramentas úteis: jq para o JSON da fechadura, grep no log do roteador,',
        'exifeiro nos clipes .mp4 (metadados) e conv fuso para corrigir horários.',
      ],
    };
  },
  metodologia: [
    { texto: 'Os logs voláteis do roteador foram exportados ao vivo antes de qualquer desligamento, com registro fotográfico das telas.', certo: true },
    { texto: 'O horário da câmera foi comparado a um relógio de referência no local e a diferença foi aplicada aos clipes.', certo: true },
    { texto: 'O histórico da fechadura foi obtido da fabricante por requisição judicial, com hash informado pelo provedor.', certo: true },
    { texto: 'Os eventos de fechadura, câmera e roteador foram correlacionados numa linha do tempo única em horário de Brasília.', certo: true },
    { texto: 'Os dispositivos foram restaurados de fábrica para eliminar configurações do usuário antes da análise.', certo: false },
    { texto: 'O histórico da fechadura foi consultado no aplicativo do celular da proprietária.', certo: false },
  ],
  audiencia: [
    { quem: 'defesa', pergunta: 'A câmera diz 2h21. A perícia diz 2h14. A perícia mudou a hora da prova?', opcoes: [
      { texto: 'Não mudei nada no arquivo. Registrei na cena que a câmera estava 7 min 12 s adiantada em relação a um relógio de referência, e o próprio log da câmera confirma a diferença. Aplicada a correção, o clipe coincide com a fechadura, 2h14.', certa: true, reacao: 'A juíza: "duas fontes independentes batendo". A defesa folheia papéis sem achar nada.' },
      { texto: 'Arredondei para bater com a fechadura.', certa: false, reacao: '"Arredondei para bater". Frase de ouro para um recurso.' },
    ] },
    { quem: 'defesa', se: ['perdeu_log_roteador'], pergunta: 'O roteador poderia mostrar outros aparelhos na casa naquela noite. Onde está esse log?', opcoes: [
      { texto: 'Foi perdido quando o roteador foi desligado na coleta. O log ficava em memória volátil. Consta no laudo como limitação.', certa: true, reacao: 'Honesto. A defesa vai explorar a lacuna, mas não pode chamar de mentira.' },
      { texto: 'Não havia log nenhum.', certa: false, reacao: 'O manual do roteador, exibido pela defesa, diz que havia. Agora parece que você esconde algo.' },
    ] },
    { quem: 'defesa', pergunta: 'Minha cliente estava a 120 km. Como ela poderia ter participado?', opcoes: [
      { texto: 'O laudo não diz que ela estava na casa. Diz que a conta dela criou, no dia 17, uma credencial para "Visitante Cleiton" válida só naquela madrugada, e que essa credencial abriu a porta.', certa: true, reacao: 'O promotor sorri. Não precisa estar no lugar para entregar a chave.' },
      { texto: 'Ela pode ter voltado escondida.', certa: false, reacao: 'Especulação sem base. A defesa mostra o recibo do hotel e a juíza olha feio para você.' },
    ] },
    { quem: 'juiza', se: ['mexeu_app_marlene'], pergunta: 'A perícia acessou o aplicativo no celular da investigada?', opcoes: [
      { texto: 'Acessei no local, sem autorização específica. O laudo usa apenas a exportação oficial da fabricante, não o que vi no aplicativo.', certa: true, reacao: 'A juíza manda desconsiderar o acesso e mantém a exportação oficial. Escapou por pouco.' },
      { texto: 'Ela deixou, então pode.', certa: false, reacao: 'Investigado "deixar" sob pressão policial não é consentimento válido. Ponto para a defesa.' },
    ] },
  ],
  dicas: [
    'O que chegou\n`cat /casos/c04/recebidos/LEIA-ME.txt`. O que você não requisitou ou não exportou na cena não existe aqui.',
    'Fechadura\n`jq \'.usuarios\' fechadura_trancatech_export.json` e `jq -c \'.eventos[] | select(.ts >= "2026-10-19T04:00" and .ts <= "2026-10-19T07:00")\' ...`. Horários em UTC (Z).',
    'Câmera\nAdquira o microSD (bloqueador, imajador), monte e liste DCIM/2026/10. Os nomes estão no relógio da câmera. `exifeiro` mostra a descrição de cada clipe.',
    'Corrigir o relógio\nCâmera adiantada 7 min 12 s: subtraia. `conv fuso "2026-10-19 02:21:15" -0.12` (0,12 hora = 7 min 12 s).',
    'Roteador\n`grep -i -v -E "TV-Sala|Lumen|Aspirador|Lampada|Camera|TT900|Geladeira" roteador_logs_dhcp.txt` tira o ruído dos aparelhos da casa.',
  ],
  falhas: {
    perdeu_log_roteador: 'O roteador foi desligado sem exportar o log volátil.',
    mexeu_app_marlene: 'O aplicativo foi consultado no celular da investigada, sem autorização.',
    sem_foto_geral: 'A cena foi manipulada antes da fotografia geral.',
    mexeu_sem_foto: 'Evidência manipulada antes de ser fotografada.',
    sem_luvas: 'Coleta sem luvas.',
    custodia_quebrada: 'Recebimento no laboratório sem registro: cadeia de custódia rompida.',
    embalagem_camera: 'Cartão de memória acondicionado em embalagem inadequada.',
    nao_coletou_camera: 'O cartão da câmera não foi coletado.',
  },
};
