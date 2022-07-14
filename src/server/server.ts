/**
 * Servidor para calcular as N Lixeiras de todas as estações, no caso ele requisita as
 * N lixeiras mais críticas de cada estação (também é um cliente), e as ordena, para os caminhões terem
 * acesso a elas sem a necessidade dessa ordenação acontecer em client-side.
 */
import axios from "axios";
import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { estacao } from "../estacao";
import { Lixeira } from "../lixeira";
import { getAllEstacoes, getAllPortas } from "../static/estacoes";
import { desc } from "../functions/ordenar";

const porta = 4000;
const estacoes: estacao[] = getAllEstacoes(); //Estacões do sistema

/**
 * Requisita as N lixeiras mais críticas de cada servidor, excluindo o servidor que fez essa solicitação.
 */
const requisitarNLixeiras = (quantidade: number, nomeEstacao: string) => {};

// App Express
const app = express();

// Endpoint raiz
app.get("/", (req, res) => {
  res.send(`Bem-vindo ao Servidor N lixeiras críticas`);
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
app.get("/Lixeiras=:qtd/:estacao", (req, res) => {
  const numeroLixeiras: number = +req.params.qtd;
  const estacao: string = req.params.estacao;
  let lixeiras: Lixeira[] = [];
  const requisicoes: string[] = [];
  for (let i = 0; i < estacoes.length; i++) {
    if (estacoes[i].nome != estacao) {
      requisicoes.push(
        `http://localhost:${estacoes[i].porta}/Lixeiras=${numeroLixeiras}/server`
      );
    }
  }
  axios.all(requisicoes.map((req) => axios.get(req))).then(
    axios.spread((...response) => {
      for (let i = 0; i < response.length; i++) {
        lixeiras = lixeiras.concat(response[i].data);
        console.log(response[i].data);
      }
      lixeiras.sort(desc);
      lixeiras = lixeiras.slice(0, numeroLixeiras);
      console.log("Lixeiras", lixeiras);
      res.json(lixeiras);
    })
  );
});

// Inicia o sevidor
app.listen(porta, () => {
  console.log(`Servidor rodando com sucesso - Porta: 4000`);
});
