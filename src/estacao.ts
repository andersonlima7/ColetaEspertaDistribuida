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

  // Lixeiras que devem ser esvaziadas
  let lixeirasParaEsvaziar: string[] = [];

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
  /*switch (host) {
    case "E1":
      lixeiras = lixeiras.concat(lixeirasTestesE1);
      break;
    case "E2":
      lixeiras = lixeiras.concat(lixeirasTestesE2);
      break;
    case "E3":
      lixeiras = lixeiras.concat(lixeirasTestesE3);
      break;
  }*/

  // Atualiza o relógio lógico sempre que um evento acontecer
  const atualizarRelogio = () => {
    relogio[PORT - 4001] += 1;
    console.log(`Relógio atualizado: ${relogio}`);
  };

  // Rotas
  app.get("/Lixeiras=:qtd", (req, res) => {
    atualizarRelogio();
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

  //
  app.get("/Lixeiras/:id", (req, res) => {
    atualizarRelogio();
    const id = req.params.id;
    console.log(id);
    lixeiras.forEach((lixeira: Lixeira) => {
      if (lixeira.id === id) {
        res.send(lixeira);
        return true;
      }
    });
    res.status(404);
  });

  app.get("/Lixeiras/:id/esvaziar", (req, res) => {
    const id = req.params.id;
    console.log(id);
    if (id in lixeirasParaEsvaziar) {
      lixeirasParaEsvaziar = lixeirasParaEsvaziar.filter((e) => e !== id);
      res.send(true);
    } else {
      res.send(false);
    }
  });

  app.post("/Lixeiras", (req, res) => {
    atualizarRelogio();
    const novaLixeira: Lixeira = req.body;
    console.log(`Nova lixeira`);
    console.log(novaLixeira);
    lixeiras.push(novaLixeira);
    res.send("A Lixeira foi adicionada no banco de dados");
  });

  app.get("/Lixeiras", (req, res) => {
    atualizarRelogio();
    res.json(lixeiras);
  });

  app.put("/Lixeiras/:id", (req, res) => {
    atualizarRelogio();
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
    atualizarRelogio();
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

  // Realiza a reserva das lixeiras de uma rota. Recebe uma rota a reservada.
  app.post("/reservarLixeira/:host", (req, res) => {      
    // Sincronização do relogio local com externo
    let relogio_externo: number[] = req.body.relogio;    
    const portaEstacao: number = req.body.porta;
    console.log(relogio_externo);    

    // Filtra a rota para ter apenas as lixeiras dessa estação
    const rota: string[] = [];
    const convert : string[] = req.body.rota;    
    req.body.rota.forEach(function(id_lixeira : string){
        lixeiras.forEach(function(lixeira){
            if(id_lixeira == lixeira.id)
              rota.push(lixeira.id);
        });
    });
             
    // Verificação da disponibilidade da Lixeira
    //2.2 Se essa estação já está com as lixeiras.
    const rotaReservada = reservas.some((r) => rota.indexOf(r) >= 0); //True se a rota possui alguma lixeira reservada
    
    if (rotaReservada || rota.length == 0) {
      //lixeirasReservadas = reservas.filter((element) => rota.includes(element));
      res.send([]);
    } else {            
      const disputa = lixeirasParaReserva.some((r) => rota.indexOf(r) >= 0); // True se as duas estações querem alguma lixeira em comum.
      if (disputa) {
        //2.3 Se essa estação não está com as lixeiras ainda, mas pretende acessar.
        if (
          relogio[PORT - 4001] < relogio[portaEstacao - 4001] //Se esta estação tem prioridade, ela consegue a rota.
          ) {
            reservas = reservas.concat(rota);          
            lixeirasParaReserva = lixeirasParaReserva.filter((element) => element in rota)
            res.send(rota);
          // Condicao 2.3
        } else {
          //A estação que pediu a rota ganha a disputa.          
          res.send([]); //Array vazio = nenhuma lixeira que ele quis foi reservada por outros.
        }
      } else {
        //2.1 - Esta estação NÃO quer as lixeiras da rota, então responde com OK!
        let respostaReserva: string[] = [];
        rota.forEach(function(lixeiraRota){
          if(!(lixeiraRota in reservas) && !(lixeiraRota in lixeirasParaReserva))
            respostaReserva.push(lixeiraRota)
        }) 
        console.log("respostaReserva" + respostaReserva)                   
        res.send(respostaReserva);              
      }
    }
    console.log(`Lixeiras reservadas ${reservas} + FINAL`);
    relogio[PORT - 4001] =
    Math.max(relogio[porta - 4001], relogio_externo[porta - 4001]) + 1; //Atualiza seu relógio lógico
  });

  // Caminhao solicita reserva de rota
  /*    
    1. Estação recebe a requisição do caminhão
    2. Realiza o pedido de reservar as lixeiras para as demais estações
      2.1. Se as demais estações não estão com essas lixeiras reservadas e não querem reservar elas, elas respondem com um OK (200).
      2.2. Se as demais estações estão com as lixeiras reservadas, elas respondem que não é possível reservar mais aquelas lixeiras (400). O caminhão deve refazer sua rota.
      2.3  Se as demais estações não estão com as lixeiras reservadas, mas também querem reservar, a estação que recebeu a mensagem compara a marca temporal recebida com a sua própria marca temporal. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK (200), caso contrário, essa estação ganha a disputa pela rota e avisa a estação enviando uma mensagem (400).
  */
  app.post("/reservarRota/:id", async (req, res) => {
    console.log(reservas);
    atualizarRelogio();    
    lixeirasParaReserva = lixeirasParaReserva.concat(req.body.rota) // Adiciona os IDs das lixeiras na lista de lixeiras que se quer reservar

    //Verifica com as outras estações a disponibilidade das lixeiras da rota.    
    let lixeirasReservadas = await reservarLixeiraEstacao(
      lixeirasParaReserva
    );

    // Filtra a rota para ter apenas as lixeiras dessa estação
    let rota: string[] = [];
    const convert : string[] = req.body.rota;    
    req.body.rota.forEach(function(id_lixeira : string){
        lixeiras.forEach(function(lixeira){
            if(id_lixeira == lixeira.id)
              rota.push(lixeira.id);
        });
    });
    
    const rotaReservada = reservas.some((r) => rota.indexOf(r) >= 0); 
    if(!rotaReservada){
      reservas = reservas.concat(rota);   
      lixeirasReservadas = lixeirasReservadas.concat(rota);
    } else{
      rota = [];
    }

    if (lixeirasReservadas.length  != lixeirasParaReserva.length) {
      //Alguma estação já está com a lixeira reservada ou ganhou a disputa contra essa.
      console.log("NAO PASSOU POIS O TAMANHO É DIFERENTE");
      lixeirasParaReserva = [];
      res.send([]); //Retorna as lixeiras reservadas
    } else {
      // Caso nenhuma nenhuma lixera esteja reservada.
      console.log("PASSOU POIS O TAMANHO É IGUAL");
      //reservas = reservas.concat(lixeirasParaReserva); // Agora as lixeiras estão reservadas.
      lixeirasParaReserva = []; // Não se quer reservar mais.
      res.send(lixeirasReservadas); // Ok caminhão, pode usar!
    }
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
            console.log('resposta do response data' + response[i].data);
          }
          console.log(`Respostas ${respostas}`);
          return respostas;
        })
      );

    return resposta;
  }

  //Esvaziar - Liberar lixeiras
  app.put("/Lixeiras/:id", (req, res) => {
    atualizarRelogio();
    const id = req.params.id;
    for (let i = 0; i < lixeiras.length; i++) {
      //Esvazia no server
      let lixeira = lixeiras[i];
      if (lixeira.id === id) {
        lixeiras[i].quantidadeLixoAtual = 0;
        lixeiras[i].ocupacaoAtual = 0;
        lixeirasParaEsvaziar.push(lixeiras[i].id);
        res.send(`Lixeira ${lixeiras[i].id} esvaziada`);
        console.log(`Lixeira ${lixeiras[i].id} esvaziada`);
      }
    }
    reservas = reservas.filter((e) => e !== id); // Elimina o ID da lista de ids reservados.
  });

  // Inicia o sevidor
  app.listen(PORT, () => {
    console.log(`Estação ${HOSTNAME} rodando com sucesso - Porta: ${PORT}`);
  });
};
