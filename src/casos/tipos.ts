// Contrato de um caso: chamado, cena 3D, laboratório, quesitos e audiência.
import type { Dispositivo } from '../motor/shell';
import type { Pasta } from '../motor/vfs';

export type ModeloId =
  | 'notebook' | 'desktop' | 'monitor' | 'celular' | 'iphone' | 'tablet' | 'relogio' | 'pendrive' | 'hd' | 'sd'
  | 'roteador' | 'camera' | 'fechadura' | 'assistente' | 'tv' | 'servidor' | 'switch' | 'drone' | 'controle'
  | 'carro' | 'central' | 'impressora' | 'geladeira' | 'cafeteira' | 'console' | 'postit' | 'papel' | 'pizza'
  | 'caneca' | 'planta' | 'gato' | 'caixa' | 'nobreak' | 'lampada' | 'aspirador' | 'cabo' | 'chip' | 'livro' | 'cofre';

export type Embalagem = 'antiestatico' | 'faraday' | 'envelope' | 'plastico' | 'caixa';
export const EMBALAGENS: Record<Embalagem, string> = {
  antiestatico: 'Saco antiestático lacrado',
  faraday: 'Bolsa Faraday (com power bank)',
  envelope: 'Envelope de papel pardo lacrado',
  plastico: 'Saquinho plástico de pão (da padaria da esquina)',
  caixa: 'Caixa de papelão com plástico-bolha, lacrada',
};

export interface Coleta {
  rotulo: string;
  embalagens: Embalagem[]; // aceitas
  dispositivo?: string; // id do dispositivo no laboratório
}

export interface Acao {
  id: string;
  rotulo: string;
  texto: string;
  /** mexe fisicamente no item (precisa de foto antes e luva) */
  toca?: boolean;
  integridade?: number;
  credibilidade?: number;
  flags?: string[];
  coleta?: Coleta;
  /** some da lista depois de usada */
  unica?: boolean;
  /** só aparece se todas estas flags existirem */
  requer?: string[];
  /** some se alguma destas flags existir */
  bloqueiaSe?: string[];
  /** depois desta ação, o modelo muda de tela */
  tela?: string[];
}

export interface ItemCena {
  id: string;
  modelo: ModeloId;
  /** usa um modelo fotográfico GLB no lugar do desenhado em código */
  glb?: string;
  pos: [number, number, number];
  rot?: number;
  escala?: number;
  cor?: string;
  nome: string;
  descricao: string;
  detalhes?: string[];
  tela?: string[];
  relevante?: boolean;
  acoes: Acao[];
}

export type TipoMovel =
  | 'mesa' | 'escrivaninha' | 'cadeira' | 'estante' | 'sofa' | 'cama' | 'armario' | 'balcao' | 'rack' | 'porta'
  | 'janela' | 'tapete' | 'quadro' | 'bancada' | 'pia' | 'rackServidor' | 'arquivo' | 'cortina' | 'portao' | 'luminaria';
export interface Movel {
  /** 'glb' = modelo fotográfico do Poly Haven indicado em glb */
  tipo: TipoMovel | 'glb';
  /** arquivo em public/ambiente/moveis (sem .glb); 'arquivo#n' pega a n-ésima variação */
  glb?: string;
  escala?: number;
  pos: [number, number, number];
  rot?: number;
  tam?: [number, number, number];
  cor?: string;
  solido?: boolean;
}

export interface Pessoa {
  id: string;
  nome: string;
  papel: string;
  pos: [number, number];
  rot: number;
  roupa?: string;
  /** modelo de gente (MakeHuman): gilmar, ro, vandeco, thiaguinho, keyla, neide, leoncio, socorro, nildo, kevin, brenda, jefferson, pamela */
  modelo?: string;
  pele?: string;
  cabelo?: string;
  sentado?: boolean;
  falas: string[];
  /** fala especial disparada por flag */
  reage?: { flag: string; fala: string }[];
}

export interface Cena {
  local: string;
  largura: number;
  profundidade: number;
  altura?: number;
  piso: string;
  parede: string;
  luz: 'dia' | 'noite' | 'fluor' | 'garagem';
  /** texturas fotográficas (Poly Haven) de piso, parede e teto */
  pisoTex?: import('../tres/pbr').Superficie;
  pisoEscala?: number;
  pisoTinta?: boolean;
  paredeTex?: import('../tres/pbr').Superficie;
  tetoTex?: import('../tres/pbr').Superficie;
  inicio: [number, number, number];
  saida: [number, number];
  moveis: Movel[];
  itens: ItemCena[];
  pessoas: Pessoa[];
  /** obstáculos extras para colisão [x0,x1,z0,z1] */
  obstaculos?: [number, number, number, number][];
}

export interface Quesito {
  id: string;
  texto: string;
  formato: string;
  tipo: 'texto' | 'hora' | 'numero' | 'hash' | 'lista';
  /** para número: diferença aceita (ex.: 0.0005 em coordenada) */
  tolerancia?: number;
  respostas: string[];
  explicacao: string;
  /** devolve true quando a falha na cena tornou o quesito impossível de responder */
  prejudicado?: (flags: Set<string>) => boolean;
}

export interface OpcaoAudiencia {
  texto: string;
  certa: boolean;
  reacao: string;
}
export interface PerguntaAudiencia {
  quem: 'defesa' | 'juiza' | 'promotoria';
  se?: string[];
  seNao?: string[];
  pergunta: string;
  opcoes: OpcaoAudiencia[];
}

export interface Mensagem {
  de: string;
  texto: string;
  hora?: string;
  eu?: boolean;
}

export interface LabCtx {
  flags: Set<string>;
  lacres: Record<string, string>;
}
export interface LabDef {
  dispositivos: Dispositivo[];
  recebidos?: Pasta;
  boasVindas: string[];
}

export interface Metodo {
  texto: string;
  certo: boolean;
}

export interface Caso {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  modulo: string;
  dificuldade: 1 | 2 | 3;
  resumo: string;
  canal: 'zap' | 'oficio' | 'email';
  chamado: Mensagem[];
  oficio?: string[];
  quesitos: Quesito[];
  cena: Cena;
  lab: (c: LabCtx) => LabDef;
  metodologia: Metodo[];
  audiencia: PerguntaAudiencia[];
  dicas: string[];
  /** flags que significam erro grave de custódia/coleta, com a explicação que a defesa vai usar */
  falhas: Record<string, string>;
}
