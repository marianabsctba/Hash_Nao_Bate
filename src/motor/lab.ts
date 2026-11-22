// Monta a estação pericial de um caso: pastas, dispositivos apreendidos e material recebido.
import './ferramentas';
import type { Caso } from '../casos/tipos';
import type { Ctx, Dispositivo } from './shell';
import { arq, pasta } from './vfs';

export function itemDoDispositivo(caso: Caso, dispositivo: string): string[] {
  return caso.cena.itens.filter((i) => i.acoes.some((a) => a.coleta?.dispositivo === dispositivo)).map((i) => i.id);
}

export function montarCtx(
  caso: Caso,
  flags: Set<string>,
  lacres: Record<string, string>,
  coletados: string[],
  evento: Ctx['evento'] = () => {},
): Ctx {
  const def = caso.lab({ flags, lacres });
  const dispositivos: Dispositivo[] = [];
  for (const d of def.dispositivos) {
    const itens = itemDoDispositivo(caso, d.id);
    if (itens.length && !itens.some((i) => coletados.includes(i))) continue;
    const item = itens.find((i) => coletados.includes(i));
    dispositivos.push({ ...d, lacre: item ? lacres[item] : d.lacre });
  }
  const leiame = [
    `ESTAÇÃO PERICIAL pci-${caso.id}`,
    '',
    ...def.boasVindas,
    '',
    'Pastas:',
    '  /evidencias     storage de evidências (imagens e extrações; somente leitura para você)',
    '  /mnt            imagens montadas (somente leitura)',
    `  /casos/${caso.id}/recebidos   material que chegou por ofício`,
    '  ~ (/home/perito) sua pasta de trabalho (aqui você grava saídas e relatórios)',
    '',
    'Comece por: help, man <comando>, lsblk, celebrita listar.',
  ].join('\n');
  const raiz = pasta({
    home: pasta({ perito: pasta({ 'LEIA-ME.txt': arq(leiame + '\n') }) }),
    evidencias: pasta(),
    mnt: pasta(),
    casos: pasta({ [caso.id]: pasta({ recebidos: def.recebidos ?? pasta() }) }),
  });
  return {
    raiz,
    cwd: '/home/perito',
    usuario: 'perito',
    host: `pci-${caso.id}`,
    dispositivos,
    bloqueador: false,
    flags,
    evento,
    historico: [],
  };
}
