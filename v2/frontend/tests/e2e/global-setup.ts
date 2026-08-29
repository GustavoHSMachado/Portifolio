import net from "node:net";

/**
 * Faz o localhost do container espelhar o do host.
 *
 * O problema: a aplicação é servida com NEXT_PUBLIC_API_URL apontando para
 * http://localhost:8001, que é o endereço correto para quem navega da máquina.
 * Dentro do container do Playwright, porém, "localhost" é o próprio container:
 * a página carrega, mas nenhuma chamada à API chega ao destino — e o sintoma é
 * um formulário que simplesmente não responde.
 *
 * Três saídas foram consideradas:
 *
 * 1. Apontar os testes para os nomes internos (web:3000, api:8000). Quebra o
 *    CORS, porque a origem passa a ser http://web:3000, e obrigaria a afrouxar
 *    a allowlist da API só por causa do teste.
 * 2. Mudar NEXT_PUBLIC_API_URL para um nome resolvível dos dois lados. Faria o
 *    teste ditar a configuração de desenvolvimento.
 * 3. Encaminhar as portas dentro do container, que é o que está aqui.
 *
 * A terceira mantém a aplicação intocada: o navegador do teste enxerga
 * exatamente os mesmos endereços que um navegador na máquina, inclusive a
 * origem que o CORS espera.
 */

interface Encaminhamento {
  porta: number;
  destinoHost: string;
  destinoPorta: number;
}

const ENCAMINHAMENTOS: Encaminhamento[] = [
  { porta: 3000, destinoHost: "web", destinoPorta: 3000 },
  { porta: 8001, destinoHost: "api", destinoPorta: 8000 },
];

const servidores: net.Server[] = [];

/**
 * Encerra o outro lado com FIN, e não com RST.
 *
 * `destroy()` manda RST, que para o navegador é "a conexão morreu no meio".
 * Com keep-alive isso acontece por motivo nenhum: o servidor de desenvolvimento
 * fecha conexões ociosas sozinho, e o proxy transformava esse fechamento
 * rotineiro em erro de rede. Conexão encerrada com FIN é fechamento combinado,
 * e um pedido em voo numa conexão reaproveitada é refeito em outra.
 *
 * Registro honesto: a instabilidade que motivou esta função tinha outra causa —
 * o teste preenchia o formulário antes da hidratação. Isto aqui continua sendo
 * o comportamento correto para um proxy TCP, mas não foi o que resolveu aquilo.
 */
function encerrarSuavemente(socket: net.Socket): void {
  if (!socket.destroyed) {
    socket.end();
  }
}

/**
 * Erro de socket aqui é rotina, não defeito: ECONNRESET e EPIPE aparecem
 * sempre que um dos lados desiste primeiro. O que não pode acontecer é a
 * exceção subir e derrubar o processo de teste inteiro.
 */
function descartar(socket: net.Socket): void {
  socket.destroy();
}

function encaminhar({ porta, destinoHost, destinoPorta }: Encaminhamento): Promise<void> {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer((entrada) => {
      const saida = net.connect(destinoPorta, destinoHost);

      // Sem o atraso de Nagle: são requisições pequenas, e esperar por mais
      // dados para juntar num pacote só adiciona latência a cada chamada.
      entrada.setNoDelay(true);
      saida.setNoDelay(true);

      entrada.pipe(saida);
      saida.pipe(entrada);

      entrada.on("end", () => encerrarSuavemente(saida));
      saida.on("end", () => encerrarSuavemente(entrada));

      entrada.on("error", () => descartar(saida));
      saida.on("error", () => descartar(entrada));
    });

    servidor.once("error", reject);
    servidor.listen(porta, "127.0.0.1", () => {
      servidores.push(servidor);
      resolve();
    });
  });
}

/**
 * Rotas que os cenários visitam. Todas, e não só as de autenticação: uma rota
 * fria compilando ao lado disputa a mesma thread das que estão sendo testadas.
 */
const ROTAS = [
  "/",
  "/entrar",
  "/criar-conta",
  "/recuperar-senha",
  "/confirmar-email",
  "/painel",
  "/projetos",
  "/curriculo",
  "/legal/termos-de-uso",
  "/legal/politica-de-privacidade",
];

/**
 * Compila as rotas antes de a suíte começar.
 *
 * Fora do CI os testes rodam contra o servidor de desenvolvimento, que compila
 * cada rota na primeira visita — medido aqui, de 2 a 7 segundos por rota, numa
 * thread só. Com dois workers e cinco projetos, essa compilação cai no meio de
 * um cenário e estoura o limite de 20s do expect, sempre nos navegadores mais
 * lentos: eram quatro falhas em WebKit, todas por tempo e nenhuma por defeito.
 *
 * Uma visita antecipada por rota resolve, porque a segunda já vem do cache.
 * Falha de rede aqui é ignorada de propósito: aquecer é otimização, e não uma
 * pré-condição do teste.
 */
async function aquecer(): Promise<void> {
  await Promise.all(
    ROTAS.map((rota) =>
      fetch(`http://localhost:3000${rota}`).catch(() => {
        /* rota fria continua fria; o cenário paga o custo, como pagava antes */
      }),
    ),
  );
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  // Fora do container não há o que encaminhar: as portas já são as do host.
  if (process.env.E2E_FORWARD !== "1") {
    return async () => {};
  }

  for (const encaminhamento of ENCAMINHAMENTOS) {
    await encaminhar(encaminhamento);
  }

  await aquecer();

  return async () => {
    await Promise.all(
      servidores.map((servidor) => new Promise<void>((resolve) => servidor.close(() => resolve()))),
    );
  };
}
