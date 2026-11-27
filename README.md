# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** *(preencher com o link do vídeo)*

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| *(Andre Luiz Costa Martins)* | *(Andre2536)* | *(FullStack)* |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?
   > Garantimos que nenhuma poltrona seja vendida duas vezes marcando as poltronas como ocupadas (`evento.reservar(poltronas)`) de forma síncrona **antes** do `await` da operadora de pagamento. Como o JavaScript no Node.js executa o código síncrono de forma atômica até o próximo `await`, o segundo pedido concorrente pela mesma poltrona já a encontra reservada e recebe `PoltronaOcupadaErro` (HTTP 409) sem sequer ir para cobrança. O `await` perigoso seria justamente deixar o `await pagar(total)` antes de marcar as poltronas: enquanto o primeiro pedido aguardasse a operadora responder, outro pedido veria a poltrona livre e ambos cobrariam e venderiam o mesmo lugar. Além disso, usamos `comTempoLimite` (para não travar indefinidamente numa operadora lenta) e `evento.liberar(poltronas)` no `catch` (para devolver os lugares caso o pagamento falhe ou expire).

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?
   > O `Evento` esconde a lista de poltronas vendidas no campo privado `#vendidas`, expondo apenas a contagem de vagas restantes via `get disponivel()` e operações controladas (`reservar`, `liberar`, `info`). Isso protege a invariante de negócio: nenhum código externo consegue corromper diretamente o estado das poltronas ou burlar validações. O `reservar` é tudo ou nada (valida todas as poltronas antes de gravar qualquer uma) para evitar reservas parciais num pedido de grupo/família caso uma única poltrona seja inválida ou já esteja ocupada. Já a hierarquia de erros (`ErroDeNegocio` abstrata com `status` HTTP e subclasses específicas) permite que cada regra de domínio sinalize o erro pelo tipo e que o Express em `servidor.ts` trate todos uniformemente com um único `instanceof ErroDeNegocio`, sem acoplar a regra de negócio ao HTTP nem espalhar `if/else` de mensagens.

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?
   > Com funções puras e sem mutação em `preco.ts`, o cálculo de preços fica previsível, determinístico e desacoplado de estado externo ou I/O (sem efeitos colaterais). Além disso, fábricas de funções como `valorDoIngresso` e `aplicarTaxa` permitem compor e parametrizar regras facilmente (como passar `temDireitoAMeia` por argumento em `montarIngressos`). Para testar sem subir o servidor, basta importar as funções diretamente em um script de teste unitário (como faz `testes/projeto.ts`) e chamar `valorDoIngresso`, `aplicarTaxa`, `montarIngressos` e `calcularTotal` com entradas fixas — inclusive congeladas com `Object.freeze` — comparando os valores retornados com `assert`.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.
   > Se a parte de cálculo de preço (`preco.ts`) fosse feita no paradigma imperativo/procedural puro (com laços `for`, variáveis acumuladoras `let` e mutação de arrays com `.push()`), o resultado numérico seria o mesmo, mas o código ficaria mais verboso, mais acoplado à regra fixa de meia-entrada e mais propenso a bugs de mutação acidental nos objetos de entrada. A abordagem funcional com `map`, `reduce` e funções de alta ordem fica mais concisa, declarativa e fácil de reutilizar e testar isoladamente.

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?
   > No modelo single-thread com event loop do Node.js, não há paralelismo real no acesso à memória: entre o início de `reservar()` e o `await`, nenhum outro pedido interrompe a verificação e marcação em `#vendidas`. Se a venda rodasse em paralelo em múltiplos núcleos ou múltiplas instâncias/processos compartilhando o mesmo inventário, dois pedidos poderiam ler a mesma poltrona como livre exatamente ao mesmo tempo (condição de corrida / *race condition*). Nesse cenário, seria necessário sincronizar a seção crítica com primitivas de exclusão mútua (locks/mutexes em memória compartilhada) ou delegar a atomicidade da reserva para transações/constraints no banco de dados (ou um coordenador distribuído como Redis).

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 195 | 93 | 100 | 7 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram:
- Os 200 pedidos simultâneos (cada um com latência de 80 ms na operadora de pagamento) foram processados em apenas **195 ms** (~1027 pedidos/s), provando que os pedidos rodam de forma concorrente sem esperar o pagamento uns dos outros (sequencialmente levariam mais de 8000 ms só para as cobranças).
- Das 100 poltronas disputadas em pares (2 pedidos por poltrona), exatamente **100** segundos pedidos foram barrados imediatamente com HTTP `409` (`PoltronaOcupadaErro`), sem gerar cobrança duplicada.
- Dos 100 pedidos que foram para a operadora, **93** foram aprovados (`201`) e **7** falharam na operadora falsa (`502`, próximo da taxa configurada de 10%), deixando exatamente **7 poltronas disponíveis** ao final no evento 1 — confirmando que as poltronas das compras recusadas foram devidamente liberadas.
