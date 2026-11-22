# Hash Não Bate

Jogo de perícia digital em primeira pessoa, com técnica de verdade e humor de plantão.

Você é perita(o) criminal recém-saída(o) do estágio probatório. Em cada caso, a autoridade manda os quesitos, você vai até o local, fixa a cena, coleta o que importa no meio de muito ruído, fecha a cadeia de custódia, analisa tudo num terminal Linux no laboratório, escreve o laudo e depois encara a defesa na audiência.

**Jogue em:** https://marianabsctba.github.io/Hash_Nao_Bate/

## O que se aprende jogando

- Fixação do local (fotografia geral, média e de detalhe), luvas e ordem de volatilidade (RFC 3227)
- Cadeia de custódia do CPP (arts. 158-A a 158-F): embalagem, lacre, registro e recebimento
- Bloqueador de escrita, imagem forense (E01 e bruta), hash MD5, SHA-1 e SHA-256 e verificação
- Recuperação de apagados por assinatura (carving) e leitura de metadados EXIF
- Conversão de datas: Unix, FILETIME, WebKit, Mac Absolute Time, little-endian e fuso horário
- SQLite de aplicativos, registro do Windows, $MFT e timestomping, Prefetch, LNK, EVTX
- Memória RAM, pcap, logs de nuvem em JSON, Linux, IoT, celulares Android e iOS, veículo e drone
- Laudo (preâmbulo, histórico, material, exames, respostas aos quesitos) e audiência

## Ferramentas do laboratório

Os nomes são paródia e não têm relação com nenhum fabricante. As técnicas são reais.

| No jogo | Faz o papel de |
| --- | --- |
| Imajador FKT | aquisição e montagem de imagem forense |
| Trava-Bit T8 | bloqueador de escrita |
| Formiga | recuperação por assinatura (carving) |
| Celebrita UFOD | extração de celulares |
| LEAPPinho | índice de artefatos de celular |
| Volátil | análise de memória |
| Tubarão-de-Fio | análise de pcap |
| Prazo | supertimeline |
| RegRipador, MFTeco, PFeco, LNKeco, EVTXeco | artefatos do Windows |
| Exifeiro | metadados de foto e vídeo |
| DatCão, Berlinda iVê | drone e veículo |

Também valem `grep`, `sort`, `uniq`, `cut`, `awk`, `strings`, `xxd`, `file`, `sha256sum`, `base64`, `sqlite3`, `jq` e o conversor `conv`, com pipes e redirecionamento.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
```

TypeScript, Vite e Three.js. Os testes incluem um robô que resolve cada caso pelo terminal (`tests/solucoes.ts`) e confere se cada quesito pode ser respondido com o que as ferramentas mostram.

## Créditos

- Ideia, roteiro e direção: Mariana BS.
- Pessoas em 3D: MakeHuman/MPFB (CC0), com animações da Universal Animation Library, de [Quaternius](https://quaternius.com/) (CC0).
- Móveis, objetos e texturas: [Poly Haven](https://polyhaven.com/) (CC0), convertidos para GLB com Draco e WebP.
- Trilha sonora, do [OpenGameArt](https://opengameart.org/):
  - Investigation Theme, de OneManSymphony (CC-BY 4.0)
  - Investigating a crime at night, de snabisch (CC-BY 3.0)
  - Coffee Black, de grimfrenzy (CC-BY 3.0)
  - Future Noir, de Eric Matyas, soundimage.org (CC-BY 4.0)
  - I know your secret, de Alexandr Zhelanov (CC-BY 3.0)
  - Epic Trial, de Eldritch Grim (CC0)
  - Continued Investigation, de Section31 (CC0)
  - Detective Cucumber, de aroachifoundonmypillow (CC0)
- Motor 3D: [Three.js](https://threejs.org/) (MIT). Aparelhos eletrônicos modelados no próprio código.

Pessoas, empresas, telefones, chaves Pix, domínios e dados são fictícios. Domínios usam `.exemplo`.

Licença do código: MIT.
