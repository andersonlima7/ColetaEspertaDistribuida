import axios from "axios";
import { estacao } from "./estacao";

/**
 * 
Quando um processo quer entrar na região crítica, ele cria uma mensagem contendo o nome da região crítica, o número de seu processo e valor de seu contador. E então envia essa mensagem para todos os outros processos participantes do sistema. Para isso assume-se que o envio das mensagens é confiável.
Quando um processo recebe uma mensagem de requisição de entrada na região crítica, três ações podem ser tomadas de acordo com o estado da região crítica:
Se ele não está na região crítica nomeada na mensagem e também não que entrar na mesma, responde a mensagem com um OK.
Se ele já está na região crítica, ele não responde a mensagem. Ao invés disso, ele enfileira a requisição.
Se ele quer entrar na região crítica mas ainda não o fez, ele compara a marca temporal da mensagem recebida com a marca temporal da mensagem que ele enviou para todos. Se a mensagem recebida tiver a menor marca temporal, o processo responde com um OK, caso contrário, ele enfileira a requisição.
Após enviar as requisições de entrada na região crítica para todos os outros processos, o processo espera as respostas dessas requisições. Uma vez que todas as permissões foram recebidas, o processo entra na região crítica.
Ao sair da região crítica o processo envia OK para todos os processos que estão na sua fila de requisições e apaga essa fila.
 */

export const caminhao = (estacao: estacao) => {
  let relogioLogico = 0; //Será enviado para a estação e a estação envia para as outras.
  axios.defaults.baseURL = `http://localhost:${estacao.porta}`;

  const verLixeiras = () => {
    axios.get(`/lixeiras`).then(
      (response) => {
        console.log(response.status);
        console.log(response.statusText);
        console.log(response.data);
      },
      (error) => {
        console.log(error);
      }
    );
  };

  verLixeiras();
};
