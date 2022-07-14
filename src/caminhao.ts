import axios from "axios";
import { estacao } from "./estacao";
import { Lixeira } from "./lixeira";

/**
 * 
Regras
Os relógios de Lamport obedecem as seguintes regras:

1. Um processo incrementa seu contador antes de cada evento daquele processo;
2. Quando um processo envia uma mensagem, esse inclui o valor de seu contador junto da mensagem;
3. No recebimento de uma mensagem, o processo atualiza seu contador para o valor maior entre o próprio valor e o valor do contador recebido na mensagem;


 */

export const caminhao = (estacao: estacao, id: string) => {
  let relogioLogico = 0; //Será enviado para a estação e a estação envia para as outras.

  const numLixeiras = 10; //N lixeiras que o caminhão consulta.
  const numLixeirasRota = 5; // Nº de lixeiras que o caminhão irá querer reservar pra sua rota.
  let lixeiras: Lixeira[] = [];

  axios.defaults.baseURL = `http://localhost:${estacao.porta}`;

  const verLixeiras = async (quantidade: number) => {
    lixeiras = await axios.get(`/lixeiras=${quantidade}`).then((res) => {
      return res.data;
    });
    console.log(lixeiras);

    return lixeiras;
  };

  const escolherRota = async () => {
    const idsLixeiras: string[] = [];
    let lixeirasRota = await verLixeiras(numLixeiras); //Consulta 10 lixeiras mais críticas
    lixeirasRota = lixeirasRota
      .sort(() => Math.random() - Math.random())
      .slice(0, numLixeirasRota); // Escolhe 5 das 10.

    for (let i = 0; i < lixeirasRota.length; i++) {
      let lixeiraSelecionada = lixeirasRota[i];
      console.log(
        `Caminhão ${id} escolheu a lixeira ${lixeiraSelecionada.id} para sua rota.`
      );
      idsLixeiras.push(lixeiraSelecionada.id);
    }
    console.log("Rota escolhida", idsLixeiras);
    return idsLixeiras;
  };

  // Metodo responsavel por enviar requisicao de Lixeira para a estacao
  const enviarRota = async () => {
    const rota = await escolherRota();
    // Envia a rota de lixeiras para serem reservadas
    const resposta = await axios
      .post(`/reservarRota/${id}`, { rota: rota })
      .then((res) => {
        return res.data;
      });
    if (resposta.length > 0) {
      console.log(
        `Não foi possível reservar a rota. \n Lixeiras já ocupadas: `,
        resposta
      );
    } else {
      console.log(`Rota reservada com sucesso!`);
    }
  };

  enviarRota();
  /**
   * Metodo responsavel por coletar o lixo das lixeiras da rota
   * E informar liberação do espaço crítico
   * @param rota M
   */
  function coletarLixeirasRota(rota: Lixeira[]) {}
};
