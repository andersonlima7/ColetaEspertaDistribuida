import { Lixeira } from "./lixeira";

import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { desc } from "./functions/ordenar"; //Ordena as lixeiras
import axios from "axios";
import {
  lixeirasTestesE1,
  lixeirasTestesE2,
  lixeirasTestesE3,
} from "./static/lixeirasTeste";
import { getAllEstacoesUnless } from "./static/estacoes";

/**
Quando um processo quer entrar na região crítica, ele cria uma mensagem contendo o nome da região crítica, o número de seu processo e valor de seu contador. E então envia essa mensagem para todos os outros processos participantes do sistema. Para isso assume-se que o envio das mensagens é confiável.
Quando um processo recebe uma mensagem de requisição de entrada na região crítica, três ações podem ser tomadas de acordo com o estado da região crítica:
Se ele não está na região crítica nomeada na mensagem e também não que entrar na mesma, responde a mensagem com um OK.
Se ele já está na região crítica, ele não responde a mensagem. Ao invés disso, ele enfileira a requisição.
Se ele quer entrar na região crítica mas ainda não o fez, ele compara a marca temporal da mensagem recebida com a marca temporal da mensagem que ele enviou para todos. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK, caso contrário, ele enfileira a requisição.
Após enviar as requisições de entrada na região crítica para todos os outros processos, o processo espera as respostas dessas requisições. Uma vez que todas as permissões foram recebidas, o processo entra na região crítica.
Ao sair da região crítica o processo envia OK para todos os processos que estão na sua fila de requisições e apaga essa fila.

 */

export interface estacao {
  nome: string;
  porta: number;
}

export const estacao = (host: string, porta: number) => {
  // Porta do servidor
  const PORT = porta;
  // Host do servidor
  const HOSTNAME = `http://localhost/${host}`;
  // App Express
  const app = express();

  // Endpoint raiz
  app.get("/", (req, res) => {
    res.send(`Bem-vindo a estação ${host}`);
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

  let lixeiras: Lixeira[] = [];

  //APENAS para testes. Lembrar de remover depois.
  switch (host) {
    case "E1":
      lixeiras = lixeiras.concat(lixeirasTestesE1);
      break;
    case "E2":
      lixeiras = lixeiras.concat(lixeirasTestesE2);
      break;
    case "E3":
      lixeiras = lixeiras.concat(lixeirasTestesE3);
      break;
  }

  // Rotas
  app.get("/Lixeiras=:qtd", (req, res) => {
    const numeroLixeiras: number = +req.params.qtd; //Número de lixeiras que o caminhão solicitou ver.
    let lixeirasCriticas: Lixeira[] = [];

    const requisicoes: string[] = []; //Array dos requests que devem ser feitos.
    const outrasEstacoes: estacao[] = getAllEstacoesUnless(host); // Array com as outras estações.

    for (let i = 0; i < outrasEstacoes.length; i++) {
      requisicoes.push(
        `http://localhost:${outrasEstacoes[i].porta}/Lixeiras=${numeroLixeiras}/server`
      );
    }

    axios.all(requisicoes.map((request) => axios.get(request))).then(
      axios.spread((...response) => {
        for (let i = 0; i < response.length; i++) {
          lixeirasCriticas = lixeirasCriticas.concat(response[i].data); // Lixeiras críticas de outras estações.
          console.log(response[i].data);
        }
        lixeirasCriticas = lixeirasCriticas.concat(lixeiras); // Lixeiras dessa estação.
        lixeirasCriticas.sort(desc);
        lixeirasCriticas = lixeirasCriticas.slice(0, numeroLixeiras);
        console.log("Lixeiras", lixeirasCriticas);
        res.json(lixeirasCriticas);
      })
    );
  });

  app.get("/Lixeiras=:qtd/server", (req, res) => {
    const numeroLixeiras: number = +req.params.qtd;
    console.log(`Servidor solicitou`);
    lixeiras.sort(desc);
    lixeiras = lixeiras.slice(0, numeroLixeiras);
    res.send(lixeiras);
  });

  app.get("/Lixeiras/:id", (req, res) => {
    const id = req.params.id;
    console.log(id);
    lixeiras.forEach((lixeira: Lixeira) => {
      if (lixeira.id === id) {
        res.send(lixeira);
        return true;
      }
    });
    res.sendStatus(404);
  });

  app.post("/Lixeiras", (req, res) => {
    const novaLixeira: Lixeira = req.body;
    console.log(`Nova lixeira`);
    console.log(novaLixeira);
    lixeiras.push(novaLixeira);
    res.send("A Lixeira foi adicionada no banco de dados");
  });

  app.get("/Lixeiras", (req, res) => {
    res.json(lixeiras);
  });

  app.put("/Lixeiras/:id", (req, res) => {
    const id = req.params.id;
    const editarLixeira: Lixeira = req.body;
    for (let i = 0; i < lixeiras.length; i++) {
      let lixeira = lixeiras[i];
      if (lixeira.id === id) {
        lixeiras[i] = editarLixeira;
        res.send("Lixeira editada");
        console.log(
          `Lixeira ${id} agora possui ${editarLixeira.quantidadeLixoAtual}m³ de lixo...`
        );
      }
    }
  });

  app.delete("/Lixeiras/:id", (req, res) => {
    const id = req.params.id;
    let status = 404;

    lixeiras = lixeiras.filter((lixeira) => {
      if (lixeira.id !== id) {
        status = 200;
        return true;
      } else return false;
    });
    if (status === 200) {
      res.send("Lixeira deletada");
    } else {
      res.sendStatus(status);
    }
  });

  // Inicia o sevidor
  app.listen(PORT, () => {
    console.log(`Estação ${HOSTNAME} rodando com sucesso - Porta: ${PORT}`);
  });
};
