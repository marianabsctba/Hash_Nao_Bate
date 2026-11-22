// Controlador: capa, chamado, cena 3D, cadeia de custódia, laboratório, laudo, audiência e fim.
import { CASOS, casoPorId } from './casos';
import { MISSOES } from './casos/missoes';
import type { Acao, Caso, Embalagem, ItemCena, Pessoa } from './casos/tipos';
import { EMBALAGENS } from './casos/tipos';
import { calcularNota, carregar, conferir, novaPartida, proximoLacre, salvar } from './motor/estado';
import type { Partida, Progresso } from './motor/estado';
import { montarCtx } from './motor/lab';
import { executarLinha } from './motor/shell';
import type { Ctx } from './motor/shell';
import { iniciar3d, pausar3d, M } from './tres/motor3d';
import { J, iniciarControles, soltarMouse, travado } from './tres/jogador';
import { cenaPronta, humanos, montarCena, mira, mudarTela, preCarregarCena, removerItem } from './tres/cena3d';
import { SALA_AUDIENCIA } from './casos/audiencia3d';
import type { Alvo } from './tres/cena3d';
import { abrirInspecao } from './tres/inspecao';
import { criarTerminal, ansiHtml } from './ui/terminal';
import type { Terminal } from './ui/terminal';
import { AJUDAS } from './casos/ajudas';
import * as Som from './ui/som';
import * as Trilha from './ui/trilha';

let prog: Progresso = carregar();
let caso: Caso | null = null;
let P: Partida | null = null;

const app = document.getElementById('app')!;
const camada = document.createElement('div');
camada.className = 'camada3d';
const ui = document.createElement('div');
ui.className = 'ui';
app.append(camada, ui);

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
function botao(txt: string, fn: () => void, cls = 'btn'): HTMLButtonElement {
  const b = h('button', cls, txt);
  b.type = 'button';
  b.onclick = () => { Som.clique(); fn(); };
  return b;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function md(s: string) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}

let toastTimer = 0;
function toast(msg: string, tipo: 'ok' | 'ruim' | 'info' = 'info', ms = 4200) {
  let t = document.querySelector('.toast') as HTMLElement | null;
  if (!t) { t = h('div', 'toast'); document.body.append(t); }
  t.className = `toast ${tipo} visivel`;
  t.innerHTML = md(msg);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('visivel'), ms);
  if (tipo === 'ruim') Som.erro(); else if (tipo === 'ok') Som.ok();
}

function gravar() {
  prog.partida = P;
  salvar(prog);
}
function limparUi() {
  ui.innerHTML = '';
  ui.className = 'ui';
}
function flag(f: string) { return !!P?.flags.includes(f); }
function marcar(f: string) { if (P && !P.flags.includes(f)) P.flags.push(f); }
function pontuar(integ = 0, cred = 0) {
  if (!P) return;
  P.integridade = Math.max(0, Math.min(100, P.integridade + integ));
  P.credibilidade = Math.max(0, Math.min(100, P.credibilidade + cred));
}
function diario(txt: string) {
  if (!P) return;
  const min = 9 + Math.floor(P.diario.length * 1.7);
  P.diario.push(`${String(14 + Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}  ${txt}`);
}

// ====================== CAPA ======================
export function telaCapa() {
  pausar3d();
  soltarMouse();
  limparUi();
  ui.classList.add('capa');
  Trilha.tocar('capa');
  // abertura: sala escura, lanterna seguindo o mouse, fitas de isolamento cruzando a tela e o título carimbado
  const abertura = h('section', 'abertura');
  const hashes = Array.from({ length: 14 }, (_, i) => `<span style="--i:${i}">${sha256Falso(i)}</span>`).join('');
  abertura.innerHTML = `
    <div class="ab-hashes" aria-hidden="true">${hashes}</div>
    <div class="ab-vestigios" aria-hidden="true">
      <div class="marcador m1">1</div><div class="marcador m2">2</div><div class="marcador m3">3</div><div class="marcador m4">4</div>
      <svg class="vest v-cel" viewBox="0 0 60 110"><rect x="3" y="3" width="54" height="104" rx="9" fill="#151a22" stroke="#3a4352" stroke-width="2"/><rect x="8" y="12" width="44" height="84" rx="3" fill="#0b2a3a"/><path d="M14 30 L40 70 M20 72 L46 34" stroke="#4cc9f0" stroke-width="1" opacity=".5"/></svg>
      <svg class="vest v-pen" viewBox="0 0 30 70"><rect x="4" y="18" width="22" height="48" rx="4" fill="#1f6f3f"/><rect x="8" y="2" width="14" height="18" fill="#b9bec6"/></svg>
      <svg class="vest v-digital" viewBox="0 0 100 100"><g fill="none" stroke="#7b5cff" stroke-width="1.6">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="50" cy="55" rx="${8 + i * 4.5}" ry="${11 + i * 5.2}"/>`).join('')}</g></svg>
      <svg class="vest v-note" viewBox="0 0 160 100"><rect x="10" y="60" width="140" height="10" rx="3" fill="#2a2f38"/><rect x="22" y="6" width="116" height="58" rx="4" fill="#151a22" stroke="#3a4352" stroke-width="2"/><text x="80" y="40" fill="#f5c400" font-size="11" text-anchor="middle" font-family="monospace">SEUS ARQUIVOS FORAM</text><text x="80" y="53" fill="#f5c400" font-size="11" text-anchor="middle" font-family="monospace">CRIPTOGRAFADOS :)</text></svg>
    </div>
    <div class="fita f1"><div class="fita-txt">${'NÃO ULTRAPASSE · PERÍCIA CRIMINAL · '.repeat(12)}</div></div>
    <div class="fita f2"><div class="fita-txt">${'CENA DE CRIME DIGITAL · NÃO ULTRAPASSE · '.repeat(12)}</div></div>
    <div class="fita f3"><div class="fita-txt">${'ÁREA ISOLADA · PROIBIDA A ENTRADA · '.repeat(12)}</div></div>
    <div class="ab-titulo">
      <div class="ab-pre">INSTITUTO DE CRIMINALÍSTICA · SEÇÃO DE COMPUTAÇÃO FORENSE</div>
      <h1 class="logo"><span class="logo-hash">#</span>HASH NÃO BATE</h1>
      <div class="carimbo">EVIDÊNCIA</div>
      <p class="capa-sub">Perícia digital em primeira pessoa. Técnica de verdade, humor de plantão e um delegado que sempre quer "só dar uma olhadinha".</p>
    </div>
    <div class="lanterna" aria-hidden="true"></div>
    <div class="ab-flash" aria-hidden="true"></div>`;
  const lanterna = abertura.querySelector('.lanterna') as HTMLElement;
  abertura.addEventListener('pointermove', (e) => {
    const r = abertura.getBoundingClientRect();
    lanterna.style.setProperty('--x', `${e.clientX - r.left}px`);
    lanterna.style.setProperty('--y', `${e.clientY - r.top}px`);
  });
  const acoes = h('div', 'capa-acoes');
  if (prog.partida) {
    const c = casoPorId(prog.partida.caso);
    if (c) acoes.append(botao(`▶ Continuar: ${esc(c.titulo)}`, () => { caso = c; P = prog.partida; retomar(); }, 'btn primario'));
  }
  acoes.append(botao('Como jogar', comoJogar, 'btn'), botao('Créditos', creditos, 'btn fantasma'));
  const arquivo = h('section', 'arquivo');
  acoes.prepend(botao('Abrir os inquéritos ↓', () => arquivo.scrollIntoView({ behavior: 'smooth' }), prog.partida ? 'btn' : 'btn primario'));
  abertura.append(acoes);
  arquivo.innerHTML = `<h2 class="arq-tit"><span>ARQUIVO DE INQUÉRITOS</span><small>${CASOS.length} caso(s) aguardando laudo · prazo: ontem</small></h2>`;
  const grade = h('div', 'casos');
  CASOS.forEach((c, i) => {
    const m = prog.melhor[c.id];
    const card = h('button', 'pasta');
    card.type = 'button';
    card.style.setProperty('--giro', `${((i * 37) % 5) - 2}deg`);
    card.innerHTML = `
      <div class="pasta-aba">IP nº 2026.${String(311 + c.numero * 47).padStart(4, '0')}</div>
      <div class="pasta-corpo">
        <div class="caso-num">CASO ${String(c.numero).padStart(2, '0')} · ${'★'.repeat(c.dificuldade)}${'☆'.repeat(3 - c.dificuldade)}</div>
        <div class="caso-tit">${esc(c.titulo)}</div>
        <div class="caso-subt">${esc(c.subtitulo)}</div>
        <div class="caso-mod">${esc(c.modulo)}</div>
        ${m ? `<div class="pasta-carimbo ok">LAUDADO · ${m.nota}</div>` : '<div class="pasta-carimbo urgente">URGENTE</div>'}
      </div>
      <div class="clipe" aria-hidden="true"></div>`;
    card.onclick = () => { Som.clique(); iniciarCaso(c); };
    grade.append(card);
  });
  arquivo.append(grade);
  const rod = h('footer', 'rodape', `Nomes de ferramentas são paródia; pessoas, empresas e dados são fictícios. As técnicas são reais.<br><b class="powered">POWERED BY MARIANA BS</b>`);
  arquivo.append(rod);
  ui.append(abertura, arquivo);
}

function sha256Falso(i: number): string {
  let s = '';
  let x = (i + 1) * 2654435761;
  for (let k = 0; k < 64; k++) { x = (x * 1103515245 + 12345) >>> 0; s += '0123456789abcdef'[x % 16]; }
  return s;
}

function botaoSom(): HTMLButtonElement {
  const b = botao(Trilha.estaMudo() ? '🔇 Som' : '🔊 Som', () => { b.textContent = Trilha.alternarMudo() ? '🔇 Som' : '🔊 Som'; }, 'btn fantasma');
  return b;
}

function creditos() {
  modal('Créditos', `
  <p><b>Ideia, roteiro e direção:</b> Mariana BS.</p>
  <p><b>Pessoas 3D:</b> MakeHuman/MPFB (CC0), animações Universal Animation Library de Quaternius (CC0).</p>
  <p><b>Móveis, objetos e texturas:</b> <a href="https://polyhaven.com" target="_blank" rel="noopener">Poly Haven</a> (CC0).</p>
  <p><b>Trilha sonora</b> (OpenGameArt):</p>
  <ul>
  <li>Investigation Theme, de OneManSymphony (CC-BY 4.0)</li>
  <li>Investigating a crime at night, de snabisch (CC-BY 3.0)</li>
  <li>Coffee Black, de grimfrenzy (CC-BY 3.0)</li>
  <li>Future Noir, de Eric Matyas, soundimage.org (CC-BY 4.0)</li>
  <li>I know your secret, de Alexandr Zhelanov (CC-BY 3.0)</li>
  <li>Epic Trial, de Eldritch Grim (CC0)</li>
  <li>Continued Investigation, de Section31 (CC0)</li>
  <li>Detective Cucumber, de aroachifoundonmypillow (CC0)</li>
  </ul>
  <p><b>Motor 3D:</b> Three.js (MIT). Aparelhos eletrônicos modelados no próprio código.</p>`);
}

function comoJogar() {
  modal('Como jogar', `
  <p>Você é perita(o) criminal da Polícia Científica, recém-saída(o) do estágio probatório e já com 40 laudos atrasados. Cada caso tem seis fases:</p>
  <ol>
  <li><b>Chamado:</b> a autoridade manda os <b>quesitos</b>, as perguntas que o laudo precisa responder.</li>
  <li><b>Local:</b> em primeira pessoa. <kbd>WASD</kbd> anda, mouse olha, <kbd>E</kbd> interage, <kbd>F</kbd> fotografa, <kbd>G</kbd> calça luvas, <kbd>C</kbd> agacha. Fotografe o ambiente antes de tocar em qualquer coisa. Tem muito objeto inútil, como na vida real.</li>
  <li><b>Cadeia de custódia:</b> embalagem certa, lacre, registro e quem recebe (CPP, arts. 158-A a 158-F).</li>
  <li><b>Laboratório:</b> terminal Linux com ferramentas periciais. Bloqueador de escrita, hash, extração, conversão de datas, SQL, linha do tempo. <code>help</code> e <code>man</code> são seus amigos.</li>
  <li><b>Laudo:</b> respostas aos quesitos e metodologia.</li>
  <li><b>Audiência:</b> a defesa vai procurar cada furo da sua cadeia de custódia.</li>
  </ol>
  <p>Integridade da prova abaixo de 40 e a prova é anulada. O progresso fica salvo neste navegador.</p>`);
}

function modal(titulo: string, html: string, botoes: [string, () => void][] = [['Fechar', () => {}]]) {
  const fundo = h('div', 'modal-fundo');
  const caixa = h('div', 'modal painel');
  caixa.innerHTML = `<h2>${titulo}</h2><div class="modal-corpo">${html}</div>`;
  const rod = h('div', 'modal-botoes');
  for (const [t, fn] of botoes) rod.append(botao(t, () => { fundo.remove(); fn(); }, 'btn' + (rod.childElementCount === 0 ? ' primario' : '')));
  caixa.append(rod);
  fundo.append(caixa);
  document.body.append(fundo);
  soltarMouse();
}

function iniciarCaso(c: Caso) {
  const comeca = () => {
    caso = c;
    P = novaPartida(c);
    gravar();
    telaChamado();
  };
  if (prog.partida && prog.partida.caso !== c.id) {
    modal('Trocar de caso?', 'Você tem outro caso em andamento. Começar este descarta o anterior (o delegado nem vai perceber, ele também esqueceu).', [['Começar este', comeca], ['Cancelar', () => {}]]);
  } else if (prog.partida && prog.partida.caso === c.id) {
    modal('Caso em andamento', 'Quer continuar de onde parou ou recomeçar do zero?', [['Continuar', () => { caso = c; P = prog.partida; retomar(); }], ['Recomeçar', comeca]]);
  } else comeca();
}

function retomar() {
  if (!P || !caso) return telaCapa();
  const f = P.fase;
  if (f === 'chamado') telaChamado();
  else if (f === 'cena') telaCena();
  else if (f === 'custodia') telaCustodia();
  else if (f === 'lab') telaLab();
  else if (f === 'laudo') telaLaudo();
  else if (f === 'audiencia') telaAudiencia();
  else telaFim();
}

// ====================== CHAMADO ======================
function telaChamado() {
  if (!caso || !P) return;
  pausar3d();
  limparUi();
  ui.classList.add('chamado');
  Trilha.tocar('chamado');
  // enquanto se lê o chamado, a cena já vem baixando
  if (caso) preCarregarCena(caso.cena);
  const c = caso;
  const col = h('div', 'chamado-col');
  col.append(h('div', 'chamado-cab', `<span class="caso-num">Caso ${String(c.numero).padStart(2, '0')} · ${esc(c.modulo)}</span><h1>${esc(c.titulo)}</h1><p>${esc(c.resumo)}</p>`));
  const celular = h('div', 'zap');
  celular.append(h('div', 'zap-topo', `<b>${esc(c.chamado[0]?.de ?? 'Plantão')}</b><span>online</span>`));
  const msgs = h('div', 'zap-msgs');
  celular.append(msgs);
  col.append(celular);
  const oficio = h('div', 'oficio painel');
  oficio.innerHTML = `<div class="oficio-cab">REQUISIÇÃO DE EXAME PERICIAL</div>${(c.oficio ?? []).map((l) => `<p>${md(l)}</p>`).join('')}<h3>Quesitos</h3><ol>${c.quesitos.map((q) => `<li>${md(q.texto)}</li>`).join('')}</ol>`;
  const acoes = h('div', 'chamado-acoes');
  const ir = botao('Pegar a maleta e ir para o local', () => { P!.fase = 'cena'; gravar(); telaCena(); }, 'btn primario');
  ir.disabled = true;
  acoes.append(ir, botao('Voltar', telaCapa));
  ui.append(col, h('div', 'chamado-dir'));
  const dossie = h('div', 'dossie');
  dossie.innerHTML = htmlMissao(c, true);
  (ui.lastChild as HTMLElement).append(dossie, oficio, acoes);
  let i = 0;
  const prox = () => {
    if (i >= c.chamado.length) { ir.disabled = false; return; }
    const m = c.chamado[i++];
    const b = h('div', `zap-msg ${m.eu ? 'eu' : ''}`, `${m.eu ? '' : `<b>${esc(m.de)}</b>`}${md(m.texto)}<span class="zap-hora">${m.hora ?? ''}</span>`);
    msgs.append(b);
    msgs.scrollTop = msgs.scrollHeight;
    Som.zap();
    setTimeout(prox, Math.min(1800, 500 + m.texto.length * 12));
  };
  prox();
  msgs.onclick = () => { while (i < c.chamado.length) { const m = c.chamado[i++]; msgs.append(h('div', `zap-msg ${m.eu ? 'eu' : ''}`, `${m.eu ? '' : `<b>${esc(m.de)}</b>`}${md(m.texto)}<span class="zap-hora">${m.hora ?? ''}</span>`)); } ir.disabled = false; msgs.scrollTop = msgs.scrollHeight; };
}

// ====================== CENA ======================
let alvoAtual: Alvo | null = null;
let painelAberto = false;
let fecharInspecao: (() => void) | null = null;

function telaCena() {
  if (!caso || !P) return;
  limparUi();
  ui.classList.add('cena');
  Trilha.tocar('cena');
  const canvas = iniciar3d(camada);
  montarCena(caso.cena, P.telas, P.coletados);
  iniciarControles(canvas, camada);
  const tela = h('div', 'carregando', `<div class="fita fita-carga"><div class="fita-txt">${'ISOLANDO A ÁREA · NÃO ULTRAPASSE · '.repeat(10)}</div></div><p>Chegando ao local: ${esc(caso.cena.local)}</p>`);
  document.body.append(tela);
  void cenaPronta().then(() => { tela.classList.add('some'); setTimeout(() => tela.remove(), 500); });
  J.livre = true;
  painelAberto = false;
  const topo = h('div', 'hud-topo');
  const mira = h('div', 'mira');
  const rotulo = h('div', 'mira-rotulo');
  const dicas = h('div', 'hud-dicas', '<kbd>WASD</kbd> andar · <kbd>mouse</kbd> olhar · <kbd>E</kbd> interagir · <kbd>F</kbd> fotografar · <kbd>G</kbd> luvas · <kbd>C</kbd> agachar · <kbd>Q</kbd> missão e quesitos');
  const toqueBtns = h('div', 'toque-btns');
  toqueBtns.append(botao('E', interagir, 'btn redondo'), botao('📷', fotografar, 'btn redondo'), botao('🧤', luvas, 'btn redondo'));
  const clique = h('div', 'clique-inicio', 'Clique para olhar em volta');
  ui.append(topo, mira, rotulo, dicas, toqueBtns, clique);
  atualizarHud();
  if (!flag('viu_intro_cena')) {
    marcar('viu_intro_cena');
    const c = caso;
    setTimeout(() => modal(`Chegando: ${esc(c.cena.local)}`, `<div class="dossie dossie-modal">${htmlMissao(c, false)}</div>
      <p class="sub"><kbd>WASD</kbd> anda, mouse olha, <kbd>E</kbd> interage, <kbd>F</kbd> fotografa, <kbd>G</kbd> luvas, <kbd>Q</kbd> reabre esta missão. Saída: a maleta com a fita amarela.</p>`, [['Começar a perícia', () => {}]]), 600);
  }
  const laco = () => {
    if (!ui.classList.contains('cena')) return;
    clique.style.display = travado() || J.toque || painelAberto ? 'none' : '';
    if (!painelAberto) {
      alvoAtual = mira_();
      if (alvoAtual) {
        rotulo.textContent = nomeAlvo(alvoAtual);
        rotulo.style.opacity = '1';
      } else rotulo.style.opacity = '0';
    }
    requestAnimationFrame(laco);
  };
  laco();
}
const mira_ = () => mira();

function nomeAlvo(a: Alvo): string {
  if (!caso) return '';
  if (a.tipo === 'saida') return 'Maleta e fita: encerrar a cena';
  if (a.tipo === 'pessoa') { const p = caso.cena.pessoas.find((x) => x.id === a.id); return p ? `${p.nome} (${p.papel})` : ''; }
  const it = caso.cena.itens.find((x) => x.id === a.id);
  return it ? `${it.nome}${P?.fotos.includes(it.id) ? ' 📷' : ''}` : '';
}

function atualizarHud() {
  const topo = document.querySelector('.hud-topo');
  if (!topo || !P || !caso) return;
  const relevantes = caso.cena.itens.filter((i) => i.relevante);
  topo.innerHTML = `
    <span class="hud-caso">${esc(caso.titulo)}</span>
    <span class="hud-barra" title="Integridade da prova"><i style="width:${P.integridade}%"></i><b>Integridade ${P.integridade}</b></span>
    <span>📷 ${P.fotos.length}${P.fotos.includes('geral') ? '' : ' <em>(falta a geral)</em>'}</span>
    <span>${P.luvas ? '🧤 luvas' : '✋ sem luvas'}</span>
    <span>📦 ${P.coletados.length} coletado(s)</span>
    <span class="hud-obj">${relevantes.length ? '' : ''}</span>`;
}

addEventListener('keydown', (e) => {
  if (!ui.classList.contains('cena')) return;
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (painelAberto) { if (e.code === 'Escape') fecharPainel(); return; }
  if (e.code === 'KeyE') interagir();
  else if (e.code === 'KeyF') fotografar();
  else if (e.code === 'KeyG') luvas();
  else if (e.code === 'KeyQ') verQuesitos();
});
camada.addEventListener('click', () => { if (ui.classList.contains('cena') && J.toque && alvoAtual) interagir(); });

function verQuesitos() {
  if (!caso) return;
  modal('Sua missão', `<div class="dossie dossie-modal">${htmlMissao(caso, false)}</div><h3>Quesitos</h3><ol>${caso.quesitos.map((q) => `<li>${md(q.texto)}</li>`).join('')}</ol>`);
}

/** Dossiê do caso: o que aconteceu, o que fazer, passo a passo e armadilhas. */
function htmlMissao(c: Caso, completo: boolean): string {
  const m = MISSOES[c.id];
  if (!m) return '';
  return `<div class="dossie-cab"><span>DOSSIÊ DO CASO ${String(c.numero).padStart(2, '0')}</span></div>
  <p class="dossie-manchete">${md(m.manchete)}</p>
  ${completo ? `<h4>O que aconteceu</h4><p>${md(m.contexto)}</p>` : ''}
  <h4>Sua missão</h4><p class="dossie-objetivo">${md(m.objetivo)}</p>
  <h4>Passo a passo</h4><ol class="dossie-passos">${m.passos.map((x) => `<li>${md(x)}</li>`).join('')}</ol>
  <h4>Cuidado com</h4><ul class="dossie-atencao">${m.atencao.map((x) => `<li>${md(x)}</li>`).join('')}</ul>
  ${completo ? `<div class="dossie-tags"><b>Você vai aprender:</b> ${m.aprende.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}`;
}

function luvas() {
  if (!P) return;
  if (P.luvas) { toast('Já está de luvas. Nitrílica, tamanho M, sem talco. O talco é para os fortes.'); return; }
  P.luvas = true;
  diario('Calçou luvas nitrílicas.');
  toast('Luvas calçadas. Agora suas digitais ficam fora do laudo de papiloscopia (o colega agradece).', 'ok');
  atualizarHud();
  gravar();
}

function fotografar() {
  if (!P || !caso) return;
  Som.foto();
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 120);
  const a = alvoAtual;
  if (!a || a.tipo === 'saida') {
    if (!P.fotos.includes('geral')) {
      P.fotos.push('geral');
      diario('Fotografia geral do ambiente (fixação do local).');
      toast('Fotografia **geral** registrada. Fixação do local começou do jeito certo: geral, depois média, depois detalhe com escala.', 'ok');
    } else toast('Mais uma foto geral. O HD do laboratório agradece a generosidade.');
  } else if (a.tipo === 'pessoa') {
    toast('Você fotografou uma pessoa sem pedir. Ela fez sinal de joinha. Isso não entra no laudo.');
  } else {
    const it = caso.cena.itens.find((x) => x.id === a.id)!;
    if (!P.fotos.includes(it.id)) {
      P.fotos.push(it.id);
      diario(`Fotografou ${it.nome} (detalhe, com escala métrica).`);
      toast(`Foto de detalhe: **${it.nome}**${it.relevante ? '' : ''}. Com régua de escala, como manda o figurino.`, 'ok');
    } else toast(`${it.nome} já foi fotografado(a). Mas pode, pode tirar mais uma.`);
  }
  atualizarHud();
  gravar();
}

function interagir() {
  if (!alvoAtual || !caso || !P) return;
  const a = alvoAtual;
  if (a.tipo === 'saida') return encerrarCena();
  if (a.tipo === 'pessoa') return falar(caso.cena.pessoas.find((p) => p.id === a.id)!);
  const it = caso.cena.itens.find((x) => x.id === a.id);
  if (it) abrirPainelItem(it);
}

function falar(p: Pessoa) {
  if (!P) return;
  const reacao = p.reage?.find((r) => flag(r.flag) && !flag(`reagiu:${p.id}:${r.flag}`));
  let fala: string;
  if (reacao) { marcar(`reagiu:${p.id}:${reacao.flag}`); fala = reacao.fala; }
  else {
    const n = P.falou[p.id] ?? 0;
    fala = p.falas[n % p.falas.length];
    P.falou[p.id] = n + 1;
  }
  Som.fala();
  toast(`**${p.nome}:** ${fala}`, 'info', Math.max(4500, fala.length * 55));
  gravar();
}

function acoesDisponiveis(it: ItemCena): Acao[] {
  return it.acoes.filter((ac) => {
    if (ac.unica && flag(`acao:${it.id}:${ac.id}`)) return false;
    if (ac.requer && !ac.requer.every(flag)) return false;
    if (ac.bloqueiaSe && ac.bloqueiaSe.some(flag)) return false;
    return true;
  });
}

function abrirPainelItem(it: ItemCena) {
  if (!P) return;
  painelAberto = true;
  J.livre = false;
  soltarMouse();
  const painel = h('div', 'painel painel-item');
  const visor = h('div', 'visor');
  const info = h('div', 'item-info');
  info.innerHTML = `<h2>${esc(it.nome)}</h2><p>${md(it.descricao)}</p>${it.detalhes ? `<ul class="detalhes">${it.detalhes.map((d) => `<li>${md(d)}</li>`).join('')}</ul>` : ''}<p class="estado-foto">${P.fotos.includes(it.id) ? '📷 Já fotografado' : '⚠️ Ainda não fotografado'}</p>`;
  const lista = h('div', 'acoes');
  if (!P.fotos.includes(it.id)) lista.append(botao('📷 Fotografar (detalhe com escala)', () => { alvoAtual = { tipo: 'item', id: it.id }; fotografar(); fecharPainel(); abrirPainelItem(it); }, 'btn'));
  for (const ac of acoesDisponiveis(it)) lista.append(botao(ac.rotulo, () => { fecharPainel(); executarAcao(it, ac); }, 'btn' + (ac.coleta ? ' primario' : '')));
  lista.append(botao('Fechar (Esc)', fecharPainel, 'btn fantasma'));
  painel.append(visor, info, lista);
  ui.append(painel);
  fecharInspecao = abrirInspecao(visor, it.modelo, it.id in P.telas ? P.telas[it.id] : it.tela, it.cor, it.glb);
}

function fecharPainel() {
  document.querySelector('.painel-item')?.remove();
  fecharInspecao?.();
  fecharInspecao = null;
  painelAberto = false;
  J.livre = true;
}

function executarAcao(it: ItemCena, ac: Acao) {
  if (!P || !caso) return;
  const avisos: string[] = [];
  if (ac.toca) {
    if (!P.fotos.includes('geral') && !flag('sem_foto_geral')) {
      marcar('sem_foto_geral');
      pontuar(-6);
      avisos.push('Você mexeu na cena antes da fotografia geral. A fixação do local ficou capenga.');
    }
    if (!P.fotos.includes(it.id) && !flag(`sem_foto_${it.id}`)) {
      marcar(`sem_foto_${it.id}`);
      if (it.relevante) marcar('mexeu_sem_foto');
      pontuar(it.relevante ? -5 : -1);
      avisos.push(`${it.nome} foi mexido(a) sem foto de como estava.`);
    }
    if (!P.luvas && !flag('sem_luvas')) {
      marcar('sem_luvas');
      pontuar(-4);
      avisos.push('Sem luvas. Parabéns, agora suas digitais também são vestígio.');
    }
  }
  pontuar(ac.integridade ?? 0, ac.credibilidade ?? 0);
  for (const f of ac.flags ?? []) marcar(f);
  if (ac.unica) marcar(`acao:${it.id}:${ac.id}`);
  if (ac.tela !== undefined) { P.telas[it.id] = ac.tela.length ? ac.tela : null; mudarTela(it.id, ac.tela.length ? ac.tela : null); }
  if (ac.coleta) {
    P.coletados.push(it.id);
    P.lacres[it.id] = proximoLacre(P, caso.numero);
    removerItem(it.id);
    diario(`Coletou ${it.nome}: ${ac.coleta.rotulo}. Lacre ${P.lacres[it.id]}.`);
  } else diario(`${it.nome}: ${ac.rotulo}.`);
  const ruim = (ac.integridade ?? 0) < 0 || (ac.credibilidade ?? 0) < 0;
  const bom = (ac.integridade ?? 0) > 0 || ac.coleta;
  toast([ac.texto, ...avisos].join('\n\n'), ruim || avisos.length ? 'ruim' : bom ? 'ok' : 'info', 6500 + avisos.length * 1500);
  atualizarHud();
  gravar();
}

function encerrarCena() {
  if (!caso || !P) return;
  const faltando = caso.cena.itens.filter((i) => i.relevante && !P!.coletados.includes(i.id) && i.acoes.some((a) => a.coleta));
  const lista = P.coletados.map((id) => caso!.cena.itens.find((i) => i.id === id)!.nome);
  modal('Encerrar a cena?', `<p>Coletados (${lista.length}): ${lista.length ? lista.map(esc).join(', ') : '<i>nada</i>'}.</p><p>Depois de liberar o local, não dá para voltar: a família já vai ter limpado tudo, inclusive o que importava.</p>`, [
    ['Encerrar e lacrar', () => {
      for (const f of faltando) { marcar(`nao_coletou_${f.id}`); pontuar(-8); }
      if (!P!.fotos.includes('geral')) { marcar('sem_foto_geral'); pontuar(-6); }
      J.livre = false;
      P!.fase = 'custodia';
      gravar();
      telaCustodia();
    }],
    ['Continuar procurando', () => {}],
  ]);
}

// ====================== CUSTÓDIA ======================
const ETAPAS = ['Reconhecimento', 'Isolamento', 'Fixação', 'Coleta', 'Acondicionamento', 'Transporte', 'Recebimento', 'Processamento', 'Armazenamento', 'Descarte'];

function telaCustodia() {
  if (!caso || !P) return;
  pausar3d();
  soltarMouse();
  limparUi();
  ui.classList.add('custodia');
  Trilha.tocar('custodia');
  const c = caso;
  const p = P;
  const col = h('div', 'custodia-col painel');
  col.innerHTML = `<h1>Cadeia de custódia</h1><p class="sub">CPP, art. 158-A: o conjunto de procedimentos que mantém e documenta a história cronológica do vestígio, da cena até o descarte. Cada item recebe lacre numerado e registro de cada mão que o tocar.</p>`;
  const tabela = h('div', 'tabela-custodia');
  const selects: Record<string, HTMLSelectElement> = {};
  if (!p.coletados.length) tabela.innerHTML = '<p class="vazio">Você não coletou nada. A cadeia de custódia mais íntegra do mundo: vazia.</p>';
  for (const id of p.coletados) {
    const it = c.cena.itens.find((i) => i.id === id)!;
    const ac = it.acoes.find((a) => a.coleta)!;
    const linha = h('div', 'linha-custodia');
    const sel = h('select');
    sel.innerHTML = `<option value="">Escolha a embalagem...</option>` + Object.entries(EMBALAGENS).map(([k, v]) => `<option value="${k}" ${p.embalagens[id] === k ? 'selected' : ''}>${v}</option>`).join('');
    selects[id] = sel;
    linha.innerHTML = `<div class="lacre">${p.lacres[id]}</div><div class="desc"><b>${esc(it.nome)}</b><br><small>${esc(ac.coleta!.rotulo)}</small></div>`;
    linha.append(sel);
    tabela.append(linha);
  }
  col.append(tabela);
  const receb = h('div', 'campo');
  receb.innerHTML = `<label>Quem recebe no laboratório</label><select class="receb">
    <option value="">Escolha...</option>
    <option value="ok">Servidor(a) da Central de Custódia, que confere lacre e registra no sistema</option>
    <option value="estag">Deixar na mesa do estagiário com um bilhete "não mexe"</option>
    <option value="casa">Levar para casa e entregar amanhã cedo (é só uma noite)</option>
  </select>`;
  col.append(receb);
  let ordem: string[] = [];
  if (c.numero === 0) {
    const bloco = h('div', 'etapas');
    bloco.innerHTML = '<h3>Etapas do art. 158-B, em ordem</h3><p class="sub">Clique nas etapas na ordem certa. Errou, clique em "refazer".</p>';
    const escolhidas = h('div', 'etapas-escolhidas');
    const opcoesEl = h('div', 'etapas-opcoes');
    const desenhar = () => {
      escolhidas.innerHTML = ordem.map((e, i) => `<span class="chip">${i + 1}. ${e}</span>`).join('') || '<i>nenhuma ainda</i>';
      opcoesEl.innerHTML = '';
      for (const e of [...ETAPAS].sort((a, b) => a.length - b.length)) {
        if (ordem.includes(e)) continue;
        opcoesEl.append(botao(e, () => { ordem.push(e); desenhar(); }, 'btn chip-btn'));
      }
      opcoesEl.append(botao('refazer', () => { ordem = []; desenhar(); }, 'btn fantasma'));
    };
    desenhar();
    bloco.append(escolhidas, opcoesEl);
    col.append(bloco);
  }
  const dir = h('div', 'custodia-dir');
  const croqui = h('canvas', 'croqui') as HTMLCanvasElement;
  croqui.width = 520;
  croqui.height = 380;
  desenharCroqui(croqui);
  const diarioEl = h('div', 'diario painel', `<h3>Registro da cena</h3><pre>${esc(p.diario.join('\n') || '(nada registrado)')}</pre>`);
  dir.append(h('h3', '', 'Croqui do local'), croqui, diarioEl);
  const enviar = botao('Lacrar, assinar e transportar ao laboratório', () => {
    const recebVal = (receb.querySelector('select') as HTMLSelectElement).value;
    if (p.coletados.some((id) => !selects[id].value) || !recebVal) { toast('Preencha a embalagem de cada item e quem recebe. Formulário incompleto é o primeiro parágrafo do recurso da defesa.', 'ruim'); return; }
    if (c.numero === 0 && ordem.length < ETAPAS.length) { toast('Ordene as dez etapas do art. 158-B antes de seguir.', 'ruim'); return; }
    const erros: string[] = [];
    for (const id of p.coletados) {
      const it = c.cena.itens.find((i) => i.id === id)!;
      const ac = it.acoes.find((a) => a.coleta)!;
      const emb = selects[id].value as Embalagem;
      p.embalagens[id] = emb;
      if (!ac.coleta!.embalagens.includes(emb)) {
        marcar(`embalagem_${id}`);
        pontuar(-6);
        erros.push(`${it.nome}: ${EMBALAGENS[emb].toLowerCase()} não é adequado(a). ${dicaEmbalagem(ac.coleta!.embalagens)}`);
      }
    }
    if (recebVal !== 'ok') {
      marcar('custodia_quebrada');
      pontuar(-18);
      erros.push(recebVal === 'casa' ? 'Evidência dormiu na sua casa. Não existe registro de quem teve acesso. Cadeia de custódia: rompida.' : 'A evidência ficou sem registro de recebimento. Qualquer um pode ter mexido, e a defesa vai dizer que mexeram.');
    }
    if (c.numero === 0) {
      const certas = ordem.filter((e, i) => ETAPAS[i] === e).length;
      if (certas < ETAPAS.length) { pontuar(0, -5); erros.push(`Ordem das etapas: ${certas}/10 no lugar. A certa é: ${ETAPAS.join(' → ')}.`); }
    }
    P!.fase = 'lab';
    gravar();
    if (erros.length) modal('Custódia com ressalvas', `<ul>${erros.map((e) => `<li>${md(e)}</li>`).join('')}</ul><p>Segue para o laboratório, mas isso vai voltar na audiência.</p>`, [['Ir para o laboratório', telaLab]]);
    else { toast('Cadeia de custódia impecável. Lacres conferidos, registro feito, recebimento assinado.', 'ok'); telaLab(); }
  }, 'btn primario');
  col.append(enviar);
  ui.append(col, dir);
}

function dicaEmbalagem(ok: Embalagem[]): string {
  if (ok.includes('faraday')) return 'Aparelho com rádio vai em bolsa Faraday, para não receber comando remoto de apagar ou bloquear, e com energia, para não reiniciar.';
  if (ok.includes('antiestatico')) return 'Mídia eletrônica vai em saco antiestático: eletricidade estática queima componente e plástico comum gera estática.';
  if (ok.includes('envelope')) return 'Papel vai em envelope de papel: plástico retém umidade e estraga o documento.';
  return 'Use a embalagem adequada ao tamanho e ao tipo do vestígio.';
}

function desenharCroqui(cv: HTMLCanvasElement) {
  if (!caso || !P) return;
  const g = cv.getContext('2d')!;
  const c = caso.cena;
  const m = 30;
  const esc2 = Math.min((cv.width - m * 2) / c.largura, (cv.height - m * 2) / c.profundidade);
  const X = (x: number) => m + x * esc2;
  const Z = (z: number) => m + z * esc2;
  g.fillStyle = '#f8fafc';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#0f172a';
  g.lineWidth = 3;
  g.strokeRect(X(0), Z(0), c.largura * esc2, c.profundidade * esc2);
  g.lineWidth = 1;
  g.font = '10px system-ui';
  for (const mv of c.moveis) {
    if (['quadro', 'janela', 'cortina', 'porta', 'portao', 'tapete'].includes(mv.tipo) || mv.solido === false || mv.pos[1] > 0.5) continue;
    const [w, , d] = mv.tam ?? [mv.tipo === 'cadeira' ? 0.5 : 1, 0, mv.tipo === 'cadeira' ? 0.5 : 0.6];
    g.save();
    g.translate(X(mv.pos[0]), Z(mv.pos[2]));
    g.rotate(-(mv.rot ?? 0));
    g.strokeStyle = '#64748b';
    g.strokeRect((-w / 2) * esc2, (-d / 2) * esc2, w * esc2, d * esc2);
    g.restore();
  }
  let n = 1;
  const legenda: string[] = [];
  for (const it of c.itens) {
    const foto = P.fotos.includes(it.id);
    const col = P.coletados.includes(it.id);
    if (!foto && !col) continue;
    g.fillStyle = col ? '#db2777' : '#0ea5e9';
    g.beginPath();
    g.arc(X(it.pos[0]), Z(it.pos[2]), 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.fillText(String(n), X(it.pos[0]), Z(it.pos[2]) + 3.5);
    legenda.push(`${n}. ${it.nome}${col ? ` (${P.lacres[it.id]})` : ''}`);
    n++;
  }
  g.fillStyle = '#0f172a';
  g.textAlign = 'left';
  g.fillText(`${c.local} · ${c.largura} m × ${c.profundidade} m · N↑`, m, 16);
  g.fillStyle = '#334155';
  legenda.slice(0, 14).forEach((l, i) => g.fillText(l.slice(0, 40), cv.width - 210, 40 + i * 13));
}

// ====================== LABORATÓRIO ======================
let ctxLab: Ctx | null = null;
let termLab: Terminal | null = null;

/** Troca {FS} e {VEIC} pelo nome real da pasta de extração no storage. */
function resolverAjuda(cmd: string): string {
  const ev = ctxLab?.raiz.filhos.evidencias;
  const nomes = ev && ev.tipo === 'pasta' ? Object.keys(ev.filhos) : [];
  const fs = nomes.find((n) => n.endsWith('_fs')) ?? 'RODE_A_EXTRACAO_PRIMEIRO_fs';
  const veic = nomes.find((n) => n.endsWith('_veiculo')) ?? 'RODE_A_EXTRACAO_PRIMEIRO_veiculo';
  return cmd.split('{FS}').join(fs).split('{VEIC}').join(veic);
}
let reproduzindo = false;

function eventoLab(nome: string, d: Record<string, unknown> = {}) {
  if (!P || reproduzindo) return;
  if (nome === 'aquisicao') {
    if (!d.bloqueador && !flag('aquisicao_sem_bloqueador')) { marcar('aquisicao_sem_bloqueador'); pontuar(-20); toast('Aquisição sem bloqueador de escrita: o disco suspeito foi alterado. -20 de integridade.', 'ruim', 7000); Trilha.tocar('tensao'); }
    if (d.bloqueador) { P.hashes[String(d.lacre ?? d.dispositivo)] = String(d.sha256); marcar(`adquiriu_${d.dispositivo}`); }
  }
  if (nome === 'extracao') { P.hashes[`${d.dispositivo} (${d.tipo})`] = String(d.sha256 ?? 'n/a'); marcar(`extraiu_${d.dispositivo}`); }
  if (nome === 'bloqueador' && d.ligado) marcar('usou_bloqueador');
  if (nome === 'comando') P.comandos++;
  atualizarCustodiaLab();
}

function telaLab() {
  if (!caso || !P) return;
  pausar3d();
  soltarMouse();
  limparUi();
  ui.classList.add('lab');
  Trilha.tocar(P.flags.includes('aquisicao_sem_bloqueador') ? 'tensao' : 'lab');
  const c = caso;
  ctxLab = montarCtx(c, new Set(P.flags), P.lacres, P.coletados, eventoLab);
  // refaz o que já foi digitado, em silêncio, para recompor o estado depois de recarregar a página
  reproduzindo = true;
  for (const l of P.historicoLab) executarLinha(l, ctxLab);
  reproduzindo = false;
  const term = criarTerminal(ctxLab, (linha) => {
    if (!reproduzindo && linha.trim()) { P!.historicoLab.push(linha); gravar(); }
  });
  termLab = term;
  const esq = h('div', 'lab-esq');
  const cab = h('div', 'lab-cab', `<b>Laboratório de Informática Forense</b> · ${esc(c.titulo)} <span class="lab-int">Integridade ${P.integridade} · Credibilidade ${P.credibilidade}</span>`);
  esq.append(cab, term.el);
  const dir = h('div', 'lab-dir painel');
  const abas = h('div', 'abas');
  const corpo = h('div', 'aba-corpo');
  const nomes: [string, () => void][] = [
    ['Quesitos', () => abaQuesitos(corpo)],
    ['Missão', () => { corpo.dataset.atual = 'Missão'; corpo.innerHTML = `<div class="dossie dossie-modal">${htmlMissao(c, true)}</div>`; }],
    ['Dicas', () => abaDicas(corpo)],
    ['Custódia', () => abaCustodia(corpo)],
    ['Conversor', () => abaConversor(corpo)],
  ];
  for (const [n, fn] of nomes) abas.append(botao(n, () => { abas.querySelectorAll('.btn').forEach((b) => b.classList.remove('ativa')); (abas.querySelector(`[data-aba="${n}"]`) as HTMLElement).classList.add('ativa'); fn(); }, 'btn aba'));
  abas.querySelectorAll('.btn').forEach((b, i) => (b as HTMLElement).dataset.aba = nomes[i][0]);
  (abas.firstElementChild as HTMLElement).classList.add('ativa');
  dir.append(abas, corpo);
  ui.append(esq, dir);
  abaQuesitos(corpo);
  term.escrever(`\x1b[35m${'═'.repeat(60)}\x1b[0m\n\x1b[1mBem-vinda(o) à estação pci-${c.id}.\x1b[0m Leia o \x1b[33mcat LEIA-ME.txt\x1b[0m, depois \x1b[33mhelp\x1b[0m.\nComandos já digitados neste caso: ${P.historicoLab.length}.`);
  term.focar();
}

function atualizarCustodiaLab() {
  const el = document.querySelector('.lab-int');
  if (el && P) el.textContent = `Integridade ${P.integridade} · Credibilidade ${P.credibilidade}`;
  const corpo = document.querySelector('.aba-corpo[data-atual="Custódia"]') as HTMLElement | null;
  if (corpo) abaCustodia(corpo);
}

function abaQuesitos(corpo: HTMLElement) {
  if (!caso || !P) return;
  corpo.dataset.atual = 'Quesitos';
  corpo.innerHTML = '';
  const p = P;
  const c = caso;
  for (const q of c.quesitos) {
    const r = p.respostas[q.id];
    const bloco = h('div', `quesito ${r?.certo ? 'certo' : r?.prejudicado ? 'prejudicado' : r?.tentativas && r.tentativas >= 99 ? 'desistiu' : ''}`);
    bloco.innerHTML = `<div class="q-texto">${md(q.texto)}</div><div class="q-formato">Formato: ${esc(q.formato)}</div>`;
    const resolvido = r && (r.certo || r.prejudicado || r.tentativas >= 99);
    if (resolvido) {
      bloco.append(h('div', 'q-resp', `${r.prejudicado ? '<b>Prejudicado.</b> ' : r.certo ? '✅ ' : '❌ '}${esc(r.valor)}`));
      bloco.append(h('div', 'q-expl', md(q.explicacao)));
    } else {
      const inp = h('input', 'q-input') as HTMLInputElement;
      inp.placeholder = q.formato;
      inp.value = r?.valor ?? '';
      const linha = h('div', 'q-linha');
      const conf = botao('Conferir', () => {
        const v = inp.value.trim();
        if (!v) return;
        const ok = conferir(q, v);
        const atual = p.respostas[q.id] ?? { valor: v, certo: false, tentativas: 0 };
        atual.valor = v;
        atual.tentativas++;
        atual.certo = ok;
        p.respostas[q.id] = atual;
        if (ok) toast('Confere com o que os vestígios mostram. Anotado no laudo.', 'ok');
        else { pontuar(0, -3); toast(errou(atual.tentativas), 'ruim'); }
        gravar();
        abaQuesitos(corpo);
        atualizarCustodiaLab();
      }, 'btn primario');
      inp.onkeydown = (e) => { if (e.key === 'Enter') conf.click(); };
      linha.append(inp, conf);
      bloco.append(linha);
      // a estagiária: onde procurar e, se precisar, o comando pronto
      const aj = AJUDAS[c.id]?.[q.id];
      if (aj) {
        const caixa = h('div', 'ajuda');
        if (p.flags.includes(`ajuda1:${q.id}`)) caixa.append(h('div', 'ajuda-onde', `🧑‍🔬 <b>Estagiária:</b> ${md(aj.onde)}`));
        if (p.flags.includes(`ajuda2:${q.id}`) && aj.comandos.length) {
          const lista = h('div', 'ajuda-cmds');
          for (const cmd of aj.comandos) {
            const l = h('div', 'ajuda-cmd');
            l.append(h('code', '', esc(cmd)), botao('▶ Rodar', () => termLab?.rodar(resolverAjuda(cmd)), 'btn pequeno'));
            lista.append(l);
          }
          caixa.append(lista);
        }
        const bts = h('div', 'q-extras');
        if (!p.flags.includes(`ajuda1:${q.id}`)) bts.append(botao('🧑‍🔬 Onde eu procuro? (-1)', () => { marcar(`ajuda1:${q.id}`); pontuar(0, -1); gravar(); abaQuesitos(corpo); atualizarCustodiaLab(); }, 'btn pequeno'));
        else if (!p.flags.includes(`ajuda2:${q.id}`) && aj.comandos.length) bts.append(botao('💻 Me mostra o comando (-3)', () => { marcar(`ajuda2:${q.id}`); pontuar(0, -3); gravar(); abaQuesitos(corpo); atualizarCustodiaLab(); }, 'btn pequeno'));
        caixa.append(bts);
        bloco.append(caixa);
      }
      const extras = h('div', 'q-extras');
      extras.append(botao('Quesito prejudicado', () => {
        const prej = q.prejudicado?.(new Set(p.flags)) ?? false;
        if (prej) { p.respostas[q.id] = { valor: 'Prejudicado: o vestígio necessário não foi preservado ou não estava disponível.', certo: false, tentativas: 1, prejudicado: true }; toast('Registrado como prejudicado. Honesto, mas o promotor suspirou.', 'info'); }
        else { pontuar(0, -5); toast('Não está prejudicado: os dados estão aí, você é que ainda não achou.', 'ruim'); }
        gravar();
        abaQuesitos(corpo);
      }, 'btn fantasma pequeno'));
      if ((r?.tentativas ?? 0) >= 3) extras.append(botao('Desistir e ver a resposta', () => {
        p.respostas[q.id] = { valor: `${r!.valor} (resposta esperada: ${q.respostas[0]})`, certo: false, tentativas: 99 };
        pontuar(0, -6);
        gravar();
        abaQuesitos(corpo);
      }, 'btn fantasma pequeno'));
      bloco.append(extras);
    }
    corpo.append(bloco);
  }
  const todos = c.quesitos.every((q) => { const r = p.respostas[q.id]; return r && (r.certo || r.prejudicado || r.tentativas >= 99); });
  const laudo = botao(todos ? 'Redigir o laudo' : 'Redigir o laudo (responda todos os quesitos)', () => { p.fase = 'laudo'; gravar(); telaLaudo(); }, 'btn primario largo');
  laudo.disabled = !todos;
  corpo.append(laudo);
}
function errou(n: number) {
  const f = ['Não confere. Releia o quesito: ele pergunta exatamente isso?', 'Ainda não. Fuso horário? Formato? Unidade? A defesa vai perguntar as três coisas.', 'Errou de novo. Respira, toma um café do laboratório (o ruim) e confere a conversão.'];
  return f[Math.min(n - 1, f.length - 1)] + ' (-3 de credibilidade)';
}

function abaDicas(corpo: HTMLElement) {
  if (!caso) return;
  corpo.dataset.atual = 'Dicas';
  corpo.innerHTML = `<div class="dicas">${caso.dicas.map((d) => `<details><summary>${md(d.split('\n')[0])}</summary><div>${md(d.split('\n').slice(1).join('\n'))}</div></details>`).join('')}</div>
  <h3>Cola rápida</h3>
  <pre class="cola">bloqueador on        liga o bloqueador ANTES
lsblk                discos conectados
imajador adquirir /dev/sdb X.E01
imajador montar /evidencias/X.E01
celebrita listar / extrair id --fs
leappinho /evidencias/pasta
sqlite3 -header -column banco "SELECT ..."
conv unix|filetime|webkit|mac|le|rot13|dms
strings arq | grep -i texto
sort | uniq -c | sort -nr | head</pre>`;
}

function abaCustodia(corpo: HTMLElement) {
  if (!caso || !P) return;
  corpo.dataset.atual = 'Custódia';
  const p = P;
  const c = caso;
  corpo.innerHTML = `<h3>Itens lacrados</h3><table class="tab"><tr><th>Lacre</th><th>Item</th><th>Embalagem</th></tr>${p.coletados.map((id) => `<tr><td>${p.lacres[id]}</td><td>${esc(c.cena.itens.find((i) => i.id === id)!.nome)}</td><td>${p.embalagens[id] ? EMBALAGENS[p.embalagens[id]] : '-'}</td></tr>`).join('')}</table>
  <h3>Hashes registrados</h3>${Object.keys(p.hashes).length ? `<table class="tab">${Object.entries(p.hashes).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="hash">${esc(v)}</td></tr>`).join('')}</table>` : '<p class="sub">Nenhuma aquisição íntegra registrada ainda.</p>'}
  <h3>Ocorrências</h3><ul>${Object.entries(c.falhas).filter(([f]) => p.flags.includes(f)).map(([, t]) => `<li>${md(t)}</li>`).join('') || '<li>Nenhuma. Por enquanto.</li>'}</ul>`;
}

function abaConversor(corpo: HTMLElement) {
  corpo.dataset.atual = 'Conversor';
  corpo.innerHTML = `<p class="sub">O mesmo que o comando <code>conv</code>, com botão. Perito que se preza confere nos dois.</p>`;
  const sel = h('select');
  sel.innerHTML = ['unix', 'filetime', 'webkit', 'mac', 'le', 'hex', 'texto', 'b64', 'rot13', 'dms'].map((t) => `<option>${t}</option>`).join('');
  const inp = h('input', 'q-input') as HTMLInputElement;
  inp.placeholder = 'valor (ex.: 1773538867000)';
  const out = h('pre', 'conv-saida');
  const rodar = botao('Converter', () => {
    if (!ctxLab) return;
    const v = inp.value.replace(/"/g, '\\"');
    out.innerHTML = ansiHtml(executarLinha(`conv ${sel.value} "${v}"`, ctxLab));
  }, 'btn primario');
  inp.onkeydown = (e) => { if (e.key === 'Enter') rodar.click(); };
  corpo.append(sel, inp, rodar, out);
}

// ====================== LAUDO ======================
function telaLaudo() {
  if (!caso || !P) return;
  limparUi();
  ui.classList.add('laudo');
  Trilha.tocar('custodia');
  const c = caso;
  const p = P;
  const esq = h('div', 'painel laudo-form');
  esq.innerHTML = `<h1>Metodologia e limitações</h1><p class="sub">Marque o que de fato foi feito e deve constar no laudo. Marcar o que não fez é mentir em documento público (art. 342 do Código Penal, falsa perícia, para quem gosta de referência).</p>`;
  const lista = h('div', 'metodos');
  c.metodologia.forEach((m, i) => {
    const l = h('label', 'metodo');
    const cb = h('input') as HTMLInputElement;
    cb.type = 'checkbox';
    cb.checked = p.metodos.includes(i);
    cb.onchange = () => { p.metodos = cb.checked ? [...p.metodos, i] : p.metodos.filter((x) => x !== i); gravar(); previa(); };
    l.append(cb, document.createTextNode(' ' + m.texto));
    lista.append(l);
  });
  esq.append(lista, botao('Assinar digitalmente e protocolar', () => { p.fase = 'audiencia'; gravar(); telaAudiencia(); }, 'btn primario largo'), botao('Voltar ao laboratório', () => { p.fase = 'lab'; gravar(); telaLab(); }, 'btn fantasma'));
  const doc = h('div', 'documento');
  ui.append(esq, doc);
  const previa = () => {
    const nome = prog.nome || 'Perito(a) Criminal';
    const mat = p.coletados.map((id) => { const it = c.cena.itens.find((i) => i.id === id)!; return `<li>${esc(it.nome)}, lacre ${p.lacres[id]}${p.embalagens[id] ? `, acondicionado em ${EMBALAGENS[p.embalagens[id]].toLowerCase()}` : ''}.</li>`; }).join('');
    const hs = Object.entries(p.hashes).map(([k, v]) => `<li>${esc(k)}: SHA-256 <code>${esc(v)}</code></li>`).join('');
    const met = c.metodologia.filter((_, i) => p.metodos.includes(i)).map((m) => `<li>${esc(m.texto)}</li>`).join('');
    const resp = c.quesitos.map((q, i) => { const r = p.respostas[q.id]; return `<p><b>${i + 1}º quesito:</b> ${esc(q.texto)}<br><b>Resposta:</b> ${r?.prejudicado ? 'Prejudicado, pelas razões expostas nas limitações.' : esc(r?.valor ?? 'Sem resposta.')}</p>`; }).join('');
    doc.innerHTML = `<div class="doc-cab">POLÍCIA CIENTÍFICA · INSTITUTO DE CRIMINALÍSTICA<br>SEÇÃO DE COMPUTAÇÃO FORENSE</div>
    <h2>LAUDO PERICIAL Nº ${String(4100 + c.numero * 13)}/2026</h2>
    <h3>1. Preâmbulo</h3><p>Aos vinte e dois dias de novembro de 2026, ${esc(nome)}, perito(a) oficial, designado(a) para proceder ao exame descrito, responde aos quesitos formulados.</p>
    <h3>2. Histórico</h3><p>${esc(c.resumo)}</p>
    <h3>3. Material</h3><ul>${mat || '<li>Material recebido por ofício.</li>'}</ul>
    <h3>4. Exames e metodologia</h3><ul>${met || '<li><i>(nenhum procedimento marcado)</i></li>'}</ul>${hs ? `<p>Hashes de integridade:</p><ul>${hs}</ul>` : ''}
    <h3>5. Respostas aos quesitos</h3>${resp}
    <h3>6. Encerramento</h3><p>Nada mais havendo, encerra-se o presente laudo, assinado digitalmente.</p><p class="assin">${esc(nome)}<br>Perito(a) Criminal</p>`;
  };
  previa();
}

// ====================== AUDIÊNCIA ======================
function telaAudiencia() {
  if (!caso || !P) return;
  limparUi();
  ui.classList.add('audiencia');
  Trilha.tocar('audiencia');
  const c = caso;
  const p = P;
  const fs = new Set(p.flags);
  const perguntas = c.audiencia.map((q, i) => ({ q, i })).filter(({ q }) => (!q.se || q.se.some((f) => fs.has(f))) && (!q.seNao || !q.seNao.some((f) => fs.has(f))));
  let idx = p.audiencia.length;
  // sala de audiência em 3D, com o elenco: câmera parada no banco das testemunhas, virando para quem fala
  const canvas = iniciar3d(camada);
  montarCena(SALA_AUDIENCIA);
  iniciarControles(canvas, camada);
  J.livre = false;
  J.olho = 1.25;
  const POS: Record<string, [number, number]> = { juiza: [4, 0.75], defesa: [1.8, 4.2], promotoria: [6.2, 4.3] };
  const olhar = (quem: string) => {
    const [x, z] = POS[quem];
    J.yaw = Math.atan2(-(x - J.pos.x), -(z - J.pos.z));
    J.pitch = -0.02;
    const id = quem === 'juiza' ? 'celeste' : quem === 'defesa' ? 'lourival' : 'eurico';
    for (const [k, hm] of humanos) hm.tocar(k === id ? 'falando' : 'parado');
  };
  const fala = h('div', 'painel fala');
  ui.append(fala);
  const quem = { defesa: 'Dr. Lourival Brecha, advogado de defesa', juiza: 'Dra. Celeste Imparcial, juíza', promotoria: 'Dr. Eurico Denúncia, promotor' };
  const prox = () => {
    if (idx >= perguntas.length) {
      p.fase = 'fim';
      gravar();
      fala.innerHTML = '<h2>Sem mais perguntas.</h2><p>A juíza agradece. Você sai da sala com a camisa colada nas costas.</p>';
      fala.append(botao('Ver o resultado', telaFim, 'btn primario'));
      return;
    }
    const { q, i } = perguntas[idx];
    olhar(q.quem);
    fala.innerHTML = `<div class="quem ${q.quem}">${quem[q.quem]}</div><p class="pergunta">${md(q.pergunta)}</p>`;
    const ops = h('div', 'opcoes');
    for (const o of [...q.opcoes].sort(() => Math.random() - 0.5)) {
      ops.append(botao(md(o.texto), () => {
        p.audiencia.push({ pergunta: i, certa: o.certa });
        pontuar(0, o.certa ? 3 : -8);
        gravar();
        fala.innerHTML = `<div class="quem ${q.quem}">${quem[q.quem]}</div><p class="reacao ${o.certa ? 'boa' : 'ruim'}">${md(o.reacao)}</p>`;
        fala.append(botao('Continuar', () => { idx++; prox(); }, 'btn primario'));
        if (o.certa) Som.ok(); else Som.erro();
      }, 'btn opcao'));
    }
    fala.append(ops);
  };
  prox();
}

// ====================== FIM ======================
function telaFim() {
  if (!caso || !P) return;
  limparUi();
  pausar3d();
  ui.classList.add('fim');
  Trilha.tocar('fim');
  const c = caso;
  const p = P;
  const n = calcularNota(c, p);
  const ant = prog.melhor[c.id];
  if (!ant || n.nota > ant.nota) prog.melhor[c.id] = { nota: n.nota, titulo: n.titulo };
  const acertos = c.quesitos.filter((q) => p.respostas[q.id]?.certo).length;
  const falhas = Object.entries(c.falhas).filter(([f]) => p.flags.includes(f));
  const caixa = h('div', 'painel fim-caixa');
  caixa.innerHTML = `<div class="nota ${n.anulada ? 'anulada' : ''}">${n.nota}</div><h1>${esc(n.titulo)}</h1><p>${esc(n.frase)}</p>
  <div class="fim-numeros"><span>Quesitos: ${acertos}/${c.quesitos.length}</span><span>Integridade: ${p.integridade}</span><span>Credibilidade: ${p.credibilidade}</span><span>Comandos: ${p.comandos}</span></div>
  ${falhas.length ? `<h3>O que a defesa usou contra você</h3><ul>${falhas.map(([, t]) => `<li>${md(t)}</li>`).join('')}</ul>` : '<h3>Cadeia de custódia sem furo. A defesa foi almoçar mais cedo.</h3>'}
  <h3>Gabarito comentado</h3>${c.quesitos.map((q, i) => `<details><summary>${i + 1}. ${md(q.texto)}</summary><p><b>${esc(q.respostas[0])}</b></p><p>${md(q.explicacao)}</p></details>`).join('')}`;
  const acoes = h('div', 'fim-acoes');
  acoes.append(botao('Voltar aos casos', () => { prog.partida = null; P = null; salvar(prog); telaCapa(); }, 'btn primario'), botao('Jogar de novo', () => { prog.partida = null; salvar(prog); iniciarCaso(c); }));
  caixa.append(acoes);
  ui.append(caixa);
  prog.partida = null;
  salvar(prog);
}

export function iniciarJogo() {
  const som = botaoSom();
  som.classList.add('som-global');
  document.body.append(som);
  if (!prog.nome) {
    const fundo = h('div', 'modal-fundo');
    const caixa = h('div', 'modal painel');
    caixa.innerHTML = '<h2>Bem-vinda(o) ao plantão</h2><p>Como você quer assinar os laudos?</p>';
    const inp = h('input', 'q-input') as HTMLInputElement;
    inp.placeholder = 'Seu nome de perito(a)';
    inp.maxLength = 40;
    const ok = botao('Assumir o plantão', () => {
      prog.nome = inp.value.trim() || 'Perito(a) Plantonista';
      salvar(prog);
      fundo.remove();
    }, 'btn primario');
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok.click(); };
    caixa.append(inp, ok);
    fundo.append(caixa);
    document.body.append(fundo);
    setTimeout(() => inp.focus(), 50);
  }
  telaCapa();
}

// usado nos testes de ponta a ponta no navegador
(window as unknown as { __hnb: unknown }).__hnb = { get P() { return P; }, get ctx() { return ctxLab; }, M, J };
