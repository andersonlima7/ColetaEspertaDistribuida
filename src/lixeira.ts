import axios from "axios";

export interface Lixeira {
  id: string;
  longitude: number;
  latitude: number;
  quantidadeLixoAtual: number;
  quantidadeLixoMaxima: number;
  ocupacaoAtual: number; // dado em porcentagem (%)
  estacao: string;
}

let estacoes = ["E1", "E2", "E3"];

const lixeira: Lixeira = {
  id: Date.now().toString(36), //Gera um ID único
  longitude: 0.0,
  latitude: 0.0,
  quantidadeLixoAtual: 0.0,
  quantidadeLixoMaxima: 100.0,
  ocupacaoAtual: 0.0,
  estacao: estacoes[Math.floor(Math.random() * estacoes.length)],
};

axios.defaults.baseURL = `http://localhost:400${lixeira.estacao.charAt(1)}`;

console.log(axios.defaults.baseURL);
const iniciar = () => {
  axios.post(`/lixeiras`, lixeira).then(
    (response) => {
      console.log(response.statusText);
    },
    (error) => {
      console.log(error);
    }
  );
};

iniciar();

function enviarDados() {
  axios.put(`/Lixeiras/${lixeira.id}`, lixeira).then(
    (response) => {
      console.log("Status Code:", response.status);
      console.log("Lixo atual: " + lixeira.quantidadeLixoAtual);
    },
    (error) => {
      console.log(error);
    }
  );
}

function adicionarquantidadeLixoAtual(quantidade: number) {
  const novaQuantidadeLixo = lixeira.quantidadeLixoAtual + quantidade;
  lixeira.quantidadeLixoAtual = novaQuantidadeLixo;
  lixeira.ocupacaoAtual = Math.trunc(
    (lixeira.quantidadeLixoAtual / lixeira.quantidadeLixoMaxima) * 100
  );
  enviarDados();
}

/** Automatização - a cada 5s uma quantidade de quantidadeLixoAtual é adicionada*/

setInterval(() => {
  const quantidade = Math.trunc(Math.random() * (10 - 1));
  const novaQuantidadeLixo = lixeira.quantidadeLixoAtual + quantidade;
  if (novaQuantidadeLixo > lixeira.quantidadeLixoMaxima) {
    console.log("A quantidade ultrapassa a capacidade máxima da lixeira");
  } else {
    console.log(
      `Lixeira ${lixeira.id} adicionando ${quantidade} m³ de quantidadeLixoAtual...`
    );
    adicionarquantidadeLixoAtual(quantidade);
  }
}, 10 * 1000);
