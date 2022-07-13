import { Lixeira } from "../lixeira";

/**
 Ordena as lixeiras da mais cheia pra menos cheia
 */
export const desc = (a: Lixeira, b: Lixeira) => {
  if (a.ocupacaoAtual > b.ocupacaoAtual) return -1;
  if (a.ocupacaoAtual < b.ocupacaoAtual) return 1;
  return 0;
};
