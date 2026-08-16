import type { APIRequestContext } from "@playwright/test";

/**
 * Leitura da caixa falsa do Mailpit.
 *
 * Em desenvolvimento nenhum e-mail sai de verdade — o Mailpit captura tudo.
 * É o que permite testar confirmação de e-mail e recuperação de senha de ponta
 * a ponta, sem SMTP e sem risco de enviar mensagem para endereço real.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

interface MensagemResumida {
  ID: string;
  To: Array<{ Address: string }>;
}

/** Espera a chegada da mensagem mais recente para o endereço e devolve o corpo. */
export async function aguardarEmail(
  request: APIRequestContext,
  destinatario: string,
  { tentativas = 30, intervaloMs = 500 } = {},
): Promise<string> {
  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    const busca = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`,
    );

    if (busca.ok()) {
      const { messages = [] } = (await busca.json()) as { messages?: MensagemResumida[] };

      if (messages.length > 0) {
        const detalhe = await request.get(`${MAILPIT_URL}/api/v1/message/${messages[0]?.ID}`);
        const { Text = "", HTML = "" } = (await detalhe.json()) as {
          Text?: string;
          HTML?: string;
        };

        return `${Text}\n${HTML}`;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }

  throw new Error(
    `Nenhum e-mail chegou para ${destinatario} em ` +
      `${(tentativas * intervaloMs) / 1000}s. O Mailpit está no ar?`,
  );
}

/**
 * Extrai o token do link recebido.
 *
 * Só o token, não a URL inteira: o link é montado com FRONTEND_URL, que aponta
 * para localhost. De dentro da rede do compose, localhost é o próprio container
 * de teste — navegar por ali daria conexão recusada. Com o token em mãos, a
 * navegação usa o baseURL correto.
 */
export function extrairToken(corpo: string): string {
  const token = corpo.match(/token=([a-f0-9]{64})/i)?.[1];

  if (!token) {
    throw new Error(`Nenhum token de 64 caracteres encontrado no e-mail:\n${corpo.slice(0, 400)}`);
  }

  return token;
}

/** Limpa a caixa entre cenários, para uma busca não achar e-mail de outro teste. */
export async function limparCaixa(request: APIRequestContext): Promise<void> {
  await request.delete(`${MAILPIT_URL}/api/v1/messages`);
}
