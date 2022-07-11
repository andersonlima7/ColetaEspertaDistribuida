import { Lixeira } from "./lixeira";

import bodyParser from "body-parser";
import express from "express";
import cors from "cors";

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

  lixeiras.push({
    id: "teste",
    longitude: 10.0,
    latitude: 10.0,
    quantidadeLixoAtual: 0,
    quantidadeLixoMaxima: 100,
    ocupacaoAtual: 0,
    estacao: "E1",
  });

  const desc = (a: Lixeira, b: Lixeira) => {
    //Ordena as lixeiras da mais cheia pra menos cheia
    if (a.ocupacaoAtual > b.ocupacaoAtual) return -1;
    if (a.ocupacaoAtual < b.ocupacaoAtual) return 1;
    return 0;
  };

  // Rotas
  app.get("/Lixeiras_:N", (req, res) => {
    const numeroLixeiras: number = +req.params["N"];
    console.log(numeroLixeiras);
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
          `Lixeira ${id} agora possui ${editarLixeira.quantidadeLixoAtual} de lixo...`
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
    console.log(`Servidor rodando com sucesso ${HOSTNAME} Porta: ${PORT}`);
  });
};
