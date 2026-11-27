import { criarBilheteria } from "./bilheteria.ts";
import { Evento } from "./dominio.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const eventos = [
  new Evento(1, "Show Principal", 120, 100),
  new Evento(2, "Festival de Verão", 180, 200),
  new Evento(3, "Teatro Municipal", 90, 50),
];

const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });
const bilheteria = criarBilheteria({
  eventos,
  pagar,
  limitePagamentoMs: 500,
});

criarServidor(bilheteria).listen(3000, () => {
  console.log("Servidor da bilheteria rodando em http://localhost:3000");
});
