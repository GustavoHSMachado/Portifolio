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

function encaminhar({ porta, destinoHost, destinoPorta }: Encaminhamento): Promise<void> {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer((entrada) => {
      const saida = net.connect(destinoPorta, destinoHost);

      entrada.pipe(saida);
      saida.pipe(entrada);

      // Uma conexão que cai não pode derrubar o processo de teste inteiro.
      entrada.on("error", () => saida.destroy());
      saida.on("error", () => entrada.destroy());
    });

    servidor.once("error", reject);
    servidor.listen(porta, "127.0.0.1", () => {
      servidores.push(servidor);
      resolve();
    });
  });
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  // Fora do container não há o que encaminhar: as portas já são as do host.
  if (process.env.E2E_FORWARD !== "1") {
    return async () => {};
  }

  for (const encaminhamento of ENCAMINHAMENTOS) {
    await encaminhar(encaminhamento);
  }

  return async () => {
    await Promise.all(
      servidores.map((servidor) => new Promise<void>((resolve) => servidor.close(() => resolve()))),
    );
  };
}
