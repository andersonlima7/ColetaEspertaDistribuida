import axios from "axios";
import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { estacao } from "../estacao";
import { Lixeira } from "../lixeira";
import { getAllEstacoes } from "../static/estacoes";

/**
 * Servidor para calcular as N Lixeiras de todas as estações, no caso ele requisita as
 * N lixeiras mais críticas de cada estação (também é um cliente), e as ordena, para os caminhões terem
 * acesso a elas sem a necessidade dessa ordenação acontecer em client-side.
 */

const estacoes: estacao[] = getAllEstacoes();
let lixeiras: Lixeira[];
const porta = 4000;
/**
 Ordena as lixeiras da mais cheia pra menos cheia
 */
export const desc = (a: Lixeira, b: Lixeira) => {
  if (a.ocupacaoAtual > b.ocupacaoAtual) return -1;
  if (a.ocupacaoAtual < b.ocupacaoAtual) return 1;
  return 0;
};

const requisitarNLixeiras = (quantidade: number) => {
  estacoes.forEach((estacao) => {
    axios.get(`http://localhost:${estacao.porta}/Lixeiras_${quantidade}`).then(
      (response) => {
        console.log(response.status);
        console.log(response.statusText);
        lixeiras = lixeiras.concat(response.data);
      },
      (error) => {
        console.log(error);
      }
    );
  });
  lixeiras.sort(desc);
  return lixeiras;
};

// App Express
const app = express();

// Endpoint raiz
app.get("/", (req, res) => {
  res.send(`Bem-vindo ao Servidor N Críticas`);
});

// Cors
app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Rotas
app.get("/Lixeiras:qtd/:estacao", (req, res) => {
  const numeroLixeiras: number = +req.params.qtd;
  console.log(numeroLixeiras);
  lixeiras.sort(desc);
  lixeiras = lixeiras.slice(0, numeroLixeiras);

  res.send(lixeiras);
});

// Inicia o sevidor
app.listen(porta, () => {
  console.log(`Servidor rodando com sucesso - Porta: 4000`);
});
