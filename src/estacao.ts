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
  const reservas : Lixeira[] = [];

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

  axios.defaults.baseURL = "http://localhost:4000"; //Url do servidor que calcula as N mais críticas

  // Rotas
  app.get("/Lixeiras=:qtd", (req, res) => {
    const numeroLixeiras: number = +req.params.qtd; //Número de lixeiras que o caminhão solicitou ver.
    let lixeirasCriticas: Lixeira[] = [];
    console.log(`Caminhão solicitou`);
    axios.get(`/Lixeiras=${numeroLixeiras}/${host}`).then(
      //Requisita as lixeiras críticas das outras estações
      (response) => {
        console.log(response.status);
        console.log(response.statusText);

        lixeirasCriticas = lixeirasCriticas
          .concat(response.data) // Lixeiras críticas de outras estações.
          .concat(lixeiras); // Lixeiras dessa estação.
        lixeirasCriticas.sort(desc);
        lixeirasCriticas = lixeirasCriticas.slice(0, numeroLixeiras);

        // console.log(lixeirasCriticas);
        res.json(lixeirasCriticas);
      },
      (error) => {
        console.log(error);
      }
    );
  });

  // Solicitacao de uma outra estacao das N lixeiras mais criticas
  app.get("/Lixeiras=:qtd/server", (req, res) => {
    const numeroLixeiras: number = +req.params.qtd;
    console.log(`Servidor solicitou`);
    lixeiras.sort(desc);
    lixeiras = lixeiras.slice(0, numeroLixeiras);
    res.send(lixeiras);
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

  // Realiza a reserva de uma Lixeira
  app.get("/reservarLixeira/:host/:porta/:id_lixeira/:id_caminhao/:relogio", (req, res) => {
    // Sincronização do relogio local com externo
    let relogio_externo: number[] = JSON.parse(req.params.relogio);
    console.log(relogio_externo);

    const id = req.params.id_lixeira;
    
    // Verificação da disponibilidade da Lixeira        
    lixeiras.forEach(function (lixeira : Lixeira){
      if(lixeira.id == req.params.id_lixeira){
        if(reservas.includes(lixeira)){ // Condicao 2.2
          res.send(400);
        } else{          
            if(lixeira.idCaminhao == ""){ // Condicao 2.1
              lixeira.idCaminhao = req.params.id_caminhao;              
              res.send(200);
            } else {
              if(relogio[porta-4001] < relogio[parseInt(req.params.porta)-4001]){ // Condicao 2.3
                lixeira.idCaminhao = req.params.id_caminhao;
                res.send(200);
              }              
            }                     
        }
      }
    });        
    
    relogio[porta-4001] = Math.max(relogio[porta-4001], relogio_externo[porta-4001]) + 1;    
  });

  // Caminhao solicita reserva de rota
  /*    
    1. Estação recebe a requisição do caminhão
    2. Realiza o pedido de reserva das lixeiras as estações
      2.1. Se a estacao nao possui caminhao em uma dada lixeira nem possui rota para requisitar a lixeira, entao devolve OK!
      2.2. Se o caminhao de uma dada estacao estiver com uma lixeira reservada entao responde que a lixeira já está reservada!
      2.3  Se a estacao nao possui um caminhao em uma dada lixeira mas possui uma rota que requisita uma dada lixeira entao ele compara a marca temporal da mensagem recebida com a marca temporal da mensagem que ele enviou para todos. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK, caso contrário, ele informa que ja foi ocupado.
  */
  app.get("/reservarRota/:rota/:id", (req, res) => {
      const rota: Lixeira[] = JSON.parse(req.params.rota);
      let resposta = 400;
      rota.forEach(function (lixeira : Lixeira) { // Percorre todas as lixeiras da rota solicitada
        if(reservas.includes(lixeira)){ // Condicao 2.2
            res.send(400); // "Lixeira " + lixeira + "já está reservada, refaça a rota!"
        } else{
          if(lixeira.estacao == host){  // quando a lixeira for desta estação
              for(let i = 0; i < lixeiras.length; i++){
                if(lixeira.id == lixeiras[i].id){ // Condicao 2.1
                  lixeiras[i].idCaminhao = req.params.id;
                  lixeira.idCaminhao = req.params.id;
                }
              }
          } else{ // quando a lixeira nao for dessa estacao              
              relogio[porta-4001] = relogio[porta-4001] + 1;
              resposta = reservarLixeiraEstacao(lixeira.id, req.params.id);
              if(resposta == 200){ // Se a lixeira tiver sido reservada
                lixeira.idCaminhao = req.params.id; // Altera o id do caminhao para atestar reserv/zona critica acessada
              } else{
                lixeira.idCaminhao = "";
              }

            }
          }            
      });
      let confirmacao = true;
      rota.forEach(function (lixeira: Lixeira){
        if(lixeira.idCaminhao == ""){
          confirmacao = false;
          return res.send(400);
        }
      });
      if(confirmacao)
        res.send(200);
  });

  // Função que solicita a reserva de uma dada lixeira na estação
  function reservarLixeiraEstacao(id_lixeira: string, id_caminhao: string){    

    const solicitarReserva = async() => {
      const resposta = axios.get(`/reservarLixeira/${host}/${porta}/${id_lixeira}/${id_caminhao}/${JSON.stringify(relogio)}`).then((res) =>{
          return res.data;
      });      
    }
    return 400;
  }


  // Inicia o sevidor
  app.listen(PORT, () => {
    console.log(`Estação ${HOSTNAME} rodando com sucesso - Porta: ${PORT}`);
  });
};
