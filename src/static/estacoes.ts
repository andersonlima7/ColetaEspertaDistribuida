import { estacao } from "../estacao";

export const estacao1: estacao = {
  nome: "E1",
  porta: 4001,
};
export const estacao2: estacao = {
  nome: "E2",
  porta: 4002,
};
export const estacao3: estacao = {
  nome: "E3",
  porta: 4003,
};

export const getAllEstacoes = () => {
  let estacoes = [];
  estacoes.push(estacao1);
  estacoes.push(estacao2);
  estacoes.push(estacao3);
  return estacoes;
};

export const getAllPortas = () => {
  let portas = [];
  portas.push(estacao1.porta);
  portas.push(estacao2.porta);
  portas.push(estacao3.porta);
  return portas;
};
