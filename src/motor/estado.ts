// Estado da partida e do progresso, salvo no navegador.
import type { Caso, Embalagem, Quesito } from '../casos/tipos';
import { normalizarHora } from './tempo';

export type Fase = 'chamado' | 'cena' | 'custodia' | 'lab' | 'laudo' | 'audiencia' | 'fim';

export interface Resposta {
  valor: string;
  certo: boolean;
  tentativas: number;
  prejudicado?: boolean;
}

export interface Partida {
  caso: string;
  fase: Fase;
  integridade: number;
  credibilidade: number;
  flags: string[];
  fotos: string[];
  coletados: string[];
  lacres: Record<string, string>;
  embalagens: Record<string, Embalagem>;
  respostas: Record<string, Resposta>;
  metodos: number[];
  audiencia: { pergunta: number; certa: boolean }[];
  diario: string[];
  hashes: Record<string, string>;
  luvas: boolean;
  comandos: number;
  telas: Record<string, string[] | null>;
  historicoLab: string[];
  falou: Record<string, number>;
}

export interface Progresso {
  melhor: Record<string, { nota: number; titulo: string }>;
  partida: Partida | null;
  nome: string;
}

const CHAVE = 'hash-nao-bate.v1';

export function carregar(): Progresso {
  try {
    const t = localStorage.getItem(CHAVE);
    if (t) return JSON.parse(t) as Progresso;
  } catch {
    /* navegador sem armazenamento: segue sem salvar */
  }
  return { melhor: {}, partida: null, nome: '' };
}

export function salvar(p: Progresso) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* nada a fazer */
  }
}

export function novaPartida(c: Caso): Partida {
  return {
    caso: c.id,
    fase: 'chamado',
    integridade: 100,
    credibilidade: 100,
    flags: [],
    fotos: [],
    coletados: [],
    lacres: {},
    embalagens: {},
    respostas: {},
    metodos: [],
    audiencia: [],
    diario: [],
    hashes: {},
    luvas: false,
    comandos: 0,
    telas: {},
    historicoLab: [],
    falou: {},
  };
}

export function proximoLacre(p: Partida, numeroCaso: number): string {
  const n = 4100 + numeroCaso * 37 + Object.keys(p.lacres).length + 1;
  return `PCI-${String(numeroCaso).padStart(2, '0')}${String(n).padStart(5, '0')}`;
}

export const limpar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s"'`]+/g, ' ').trim();

/** Confere a resposta conforme o tipo do quesito. */
export function conferir(q: Quesito, valor: string): boolean {
  const v = valor.trim();
  if (!v) return false;
  switch (q.tipo) {
    case 'hora': {
      const n = normalizarHora(v);
      return !!n && q.respostas.some((r) => normalizarHora(r) === n);
    }
    case 'numero': {
      const n = v.replace(/[^\d,.-]/g, '').replace(',', '.');
      if (n === '' || isNaN(Number(n))) return false;
      return q.respostas.some((r) => Math.abs(Number(r) - Number(n)) <= (q.tolerancia ?? 1e-9));
    }
    case 'hash':
      return q.respostas.some((r) => r.toLowerCase() === v.toLowerCase().replace(/\s/g, ''));
    case 'lista': {
      const partes = new Set(limpar(v).split(/[,;]+|\se\s/).map((x) => x.trim()).filter(Boolean));
      const certas = q.respostas.map(limpar);
      return certas.length === partes.size && certas.every((c) => partes.has(c));
    }
    default: {
      const l = limpar(v);
      return q.respostas.some((r) => limpar(r) === l || (limpar(r).length >= 6 && l.includes(limpar(r))));
    }
  }
}

export interface Nota {
  nota: number;
  titulo: string;
  frase: string;
  anulada: boolean;
}

export function calcularNota(c: Caso, p: Partida): Nota {
  const qs = c.quesitos;
  const acertos = qs.filter((q) => p.respostas[q.id]?.certo).length;
  const prej = qs.filter((q) => p.respostas[q.id]?.prejudicado).length;
  const pctQ = qs.length ? (acertos + prej * 0.4) / qs.length : 1;
  const metCertos = c.metodologia.filter((m, i) => m.certo === p.metodos.includes(i)).length / Math.max(1, c.metodologia.length);
  const aud = p.audiencia.length ? p.audiencia.filter((a) => a.certa).length / p.audiencia.length : 1;
  const nota = Math.round(Math.max(0, Math.min(100, pctQ * 40 + (p.integridade / 100) * 30 + (p.credibilidade / 100) * 10 + metCertos * 10 + aud * 10)));
  const anulada = p.integridade < 40;
  if (anulada) return { nota: Math.min(nota, 25), titulo: 'Prova anulada', frase: 'A defesa saiu da audiência assobiando. A prova virou peso de papel e você virou exemplo em aula de cadeia de custódia (o exemplo do que não fazer).', anulada };
  if (nota >= 92) return { nota, titulo: 'Perícia de livro-texto', frase: 'Laudo citado em sentença, defesa sem argumento e o delegado te mandou um áudio de 4 minutos agradecendo. Você ouviu em 2x.', anulada };
  if (nota >= 78) return { nota, titulo: 'Laudo sólido', frase: 'Prova aceita. Teve um ou outro tropeço, mas nada que o juiz tenha percebido. A defesa percebeu. Ela sempre percebe.', anulada };
  if (nota >= 60) return { nota, titulo: 'Passou raspando', frase: 'A prova ficou de pé, apoiada numa muleta. O promotor te olhou com aquela cara de "a gente conversa depois".', anulada };
  return { nota, titulo: 'Laudo de padaria', frase: 'Tecnicamente é um documento. Juridicamente é um convite para recurso.', anulada };
}
