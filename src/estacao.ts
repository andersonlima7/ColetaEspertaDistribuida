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
  2.1 Se ele não está na região crítica nomeada na mensagem e também não que entrar na mesma, responde a mensagem com um OK.
  2.2 Se ele já está na região crítica, ele não responde a mensagem. Ao invés disso, ele enfileira a requisição.
  2.3 Se ele quer entrar na região crítica mas ainda não o fez, ele compara a marca temporal da mensagem recebida com a marca temporal da mensagem que ele enviou para todos. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK, caso contrário, ele enfileira a requisição.
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
  // Contador
  let relogio = [0, 0, 0];

  // Lixeiras reservadas
  let reservas: string[] = [];

  // Lixeiras que a estação quer reservar
  let lixeirasParaReserva: string[] = [];

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

  //
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

  // Realiza a reserva das lixeiras de uma rota.
  app.post("/reservarLixeira/:host", (req, res) => {
    // Sincronização do relogio local com externo
    let relogio_externo: number[] = req.body.relogio;
    const rota: string[] = req.body.rota;
    const portaEstacao: number = req.body.porta;
    console.log(relogio_externo);
    let lixeirasReservadas: string[] = [];

    // Verificação da disponibilidade da Lixeira
    //2.2 Se essa estação já está com as lixeiras.
    const rotaReservada = reservas.some((r) => rota.indexOf(r) >= 0); //True se a rota possui alguma lixeira reservada
    if (rotaReservada) {
      lixeirasReservadas = reservas.filter((element) => rota.includes(element));
      res.status(400).send(lixeirasReservadas);
    } else {
      const disputa = lixeirasParaReserva.some((r) => rota.indexOf(r) >= 0); // True se as duas estações querem alguma lixeira em comum.
      if (disputa) {
        //2.3 Se essa estação não está com as lixeiras ainda, mas pretende acessar.
        if (
          relogio[PORT - 4001] < relogio[portaEstacao - 4001] //Se esta estação tem prioridade, ela consegue a rota.
        ) {
          reservas.concat(rota);
          lixeirasReservadas = reservas.filter((element) =>
            rota.includes(element)
          );
          lixeirasParaReserva = [];
          res.status(400).send(lixeirasReservadas);
          // Condicao 2.3
        } else {
          //A estação que pediu a rota ganha a disputa.
          res.status(200).send([]); //Array vazio = nenhuma lixeira que ele quis foi reservada por outros.
        }
      } else {
        //2.1 - Esta estação NÃO quer as lixeiras da rota, então responde com OK!
        res.status(200).send([]);
      }
    }
    relogio[PORT - 4001] =
      Math.max(relogio[porta - 4001], relogio_externo[porta - 4001]) + 1; //Atualiza seu relógio lógico
  });

  // Caminhao solicita reserva de rota
  /*    
    1. Estação recebe a requisição do caminhão
    2. Realiza o pedido de reserva das lixeiras as estações
      2.1. Se a estacao nao possui caminhao em uma dada lixeira nem possui rota para requisitar a lixeira, entao devolve OK!
      2.2. Se o caminhao de uma dada estacao estiver com uma lixeira reservada entao responde que a lixeira já está reservada!
      2.3  Se a estacao nao possui um caminhao em uma dada lixeira mas possui uma rota que requisita uma dada lixeira entao ele compara a marca temporal da mensagem recebida com a marca temporal da mensagem que ele enviou para todos. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK, caso contrário, ele informa que ja foi ocupado.
  */
  app.get("/reservarRota/:rota/:id", async (req, res) => {
    const rota: string[] = JSON.parse(req.params.rota);

    lixeirasParaReserva.concat(rota); // Adiciona os IDs das lixeiras na lista de lixeiras que se quer reservar

    //Verifica com as outras estações a disponibilidade das lixeiras da rota.
    const lixeirasReservadas = await reservarLixeiraEstacao(
      lixeirasParaReserva
    );

    if (lixeirasReservadas.length > 0) {
      //Alguma estação já está com a lixeira reservada ou ganhou a disputa contra essa.
      lixeirasParaReserva = [];
      res.status(400).send(lixeirasReservadas); //Retorna as lixeiras reservadas.
    } else {
      // Caso nenhuma nenhuma lixera esteja reservada.
      reservas = reservas.concat(lixeirasParaReserva); // Agora as lixeiras estão reservadas.
      lixeirasParaReserva = []; // Não se quer reservar mais.
      res.sendStatus(200); // Ok caminhão, pode usar!
    }
  });

  //Esvaziar - Liberar lixeiras
  app.put("/Lixeiras/:id", (req, res) => {
    const id = req.params.id;
    for (let i = 0; i < lixeiras.length; i++) {
      //Esvazia no server
      let lixeira = lixeiras[i];
      if (lixeira.id === id) {
        lixeiras[i].quantidadeLixoAtual = 0;
        res.send(`Lixeira ${lixeiras[i].id} esvaziada`);
        console.log(`Lixeira ${lixeiras[i].id} esvaziada`);
      }
    }
    reservas = reservas.filter((e) => e !== id); // Elimina o ID da lista de ids reservados.
  });

  // Função que solicita a reserva de uma rota para as demais estações
  async function reservarLixeiraEstacao(rota: string[]) {
    const requisicoes: string[] = []; //Array dos requests que devem ser feitos.
    const outrasEstacoes: estacao[] = getAllEstacoesUnless(host); // Array com as outras estações.
    let respostas: string[] = []; // Respostas das outras estações

    for (let i = 0; i < outrasEstacoes.length; i++) {
      requisicoes.push(
        `http://localhost:${outrasEstacoes[i].porta}/reservarLixeira/${outrasEstacoes[i].nome}`
      );
    }

    const resposta = await axios
      .all(
        requisicoes.map((request) =>
          axios.post(request, { rota: rota, relogio: relogio, porta: PORT })
        )
      )
      .then(
        axios.spread((...response) => {
          for (let i = 0; i < response.length; i++) {
            respostas = respostas.concat(response[i].data);
            console.log(response[i].status);
            console.log(response[i].data);
          }
          return respostas;
        })
      );

    return resposta;
  }

  // Inicia o sevidor
  app.listen(PORT, () => {
    console.log(`Estação ${HOSTNAME} rodando com sucesso - Porta: ${PORT}`);
  });
};
