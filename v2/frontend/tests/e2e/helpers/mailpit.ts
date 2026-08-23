import { type APIRequestContext, type Page, expect } from "@playwright/test";

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

/**
 * Espera a chegada da mensagem mais recente para o endereço e devolve o corpo.
 *
 * A janela é de 30s, e não de 15s como antes: com o SMTP real configurado, o
 * e-mail de domínio reservado não vai direto ao Mailpit — ele é desviado para
 * lá pelo MailService, o que custa uma conexão a mais por mensagem. Sob os dois
 * workers da suíte isso passou dos 15s e derrubou um cenário que estava certo.
 */
export async function aguardarEmail(
  request: APIRequestContext,
  destinatario: string,
  { tentativas = 60, intervaloMs = 500 } = {},
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

/**
 * Apaga o que já chegou para este destinatário, e só para ele.
 *
 * Existe porque vários cenários esperam um segundo e-mail para o mesmo
 * endereço — o código de acesso depois do link de confirmação — e a busca
 * devolveria o anterior.
 *
 * Antes isto limpava a caixa inteira, e essa era a causa de uma falha
 * intermitente que parecia lentidão: com dois workers, um cenário apagava a
 * mensagem que o outro ainda estava esperando. O endereço de cada teste já é
 * único (timestamp + aleatório), então limpar por destinatário resolve o
 * problema real sem tocar no que não é seu.
 */
export async function limparCaixa(request: APIRequestContext, destinatario: string): Promise<void> {
  const busca = await request.get(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`,
  );

  if (!busca.ok()) {
    return;
  }

  const { messages = [] } = (await busca.json()) as { messages?: MensagemResumida[] };

  if (messages.length === 0) {
    return;
  }

  await request.delete(`${MAILPIT_URL}/api/v1/messages`, {
    data: { IDs: messages.map((m) => m.ID) },
  });
}

/**
 * Extrai o código de 7 dígitos do e-mail de segundo fator.
 *
 * O código vai dentro do bloco destacado do e-mail, cercado por dígitos que
 * podem aparecer em outros pontos da mensagem — o TTL em minutos, por exemplo.
 * A âncora é o letter-spacing do bloco, que só existe ali.
 */
export function extrairCodigo(corpo: string): string {
  const codigo = corpo.match(/letter-spacing:10px[^>]*>(\d{7})</)?.[1];

  if (!codigo) {
    throw new Error(`Nenhum código de 7 dígitos encontrado no e-mail:\n${corpo.slice(0, 400)}`);
  }

  return codigo;
}

/**
 * Faz o login completo, com os dois passos.
 *
 * Desde 22/08/2026 senha correta não abre sessão: ela dispara um código por
 * e-mail que precisa ser confirmado na tela. Todo teste que precisa de uma
 * sessão passa por aqui.
 */
export async function entrar(
  page: Page,
  request: APIRequestContext,
  email: string,
  senha: string,
): Promise<void> {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Confirme que é você" })).toBeVisible();

  const codigo = extrairCodigo(await aguardarEmail(request, email));

  await page.getByLabel("Código").fill(codigo);
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
}
