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

export const caminhao = (estacao: estacao) => {
  let relogioLogico = 0; //Será enviado para a estação e a estação envia para as outras.
  axios.defaults.baseURL = `http://localhost:${estacao.porta}`;

  const verLixeiras = (quantidade: number) => {
    let lixeiras: Lixeira;
    const response = axios.get(`/lixeiras=${quantidade}`).then(
      (response) => {
        console.log(response.status);
        console.log(response.statusText);
        lixeiras = response.data;
        console.log(lixeiras);
        return lixeiras;
      },
      (error) => {
        console.log(error);
      }
    );
    return response;
  };
  verLixeiras(2);
};
