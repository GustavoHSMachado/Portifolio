import { type APIRequestContext, type Locator, type Page, expect } from "@playwright/test";

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
 * A janela é de 30s: com o SMTP real configurado, o e-mail de domínio reservado
 * não vai direto ao Mailpit — ele é desviado para lá pelo MailService, o que
 * custa uma conexão a mais por mensagem.
 *
 * `assunto` diz qual das mensagens daquele endereço interessa, e existe porque
 * vários cenários esperam a segunda: o código de acesso depois do link de
 * confirmação. Antes, isso era resolvido apagando a caixa entre um e outro — e
 * era essa limpeza que, com dois workers, fazia um cenário apagar o e-mail que
 * o outro ainda esperava. Filtrar não toca em nada que seja de outro teste.
 */
export async function aguardarEmail(
  request: APIRequestContext,
  destinatario: string,
  {
    assunto,
    tentativas = 60,
    intervaloMs = 500,
  }: { assunto?: string; tentativas?: number; intervaloMs?: number } = {},
): Promise<string> {
  const consulta = assunto ? `to:${destinatario} subject:"${assunto}"` : `to:${destinatario}`;

  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    const busca = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(consulta)}`,
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
    `Nenhum e-mail${assunto ? ` com assunto "${assunto}"` : ""} chegou para ` +
      `${destinatario} em ${(tentativas * intervaloMs) / 1000}s. O Mailpit está no ar?`,
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
 * Preenche um formulário e o envia, repetindo tudo se a tela não responder.
 *
 * A página chega pronta ao navegador, mas os campos só passam a valer depois da
 * hidratação. Preencher antes disso não dá erro visível: o texto entra, a
 * montagem do React o apaga, e o formulário é enviado vazio — a API respondia
 * 422 e a tela seguinte nunca aparecia. Durante uma rodada da suíte foram 37
 * dessas.
 *
 * Conferir o valor logo depois de digitar não resolve, porque a limpeza pode
 * vir depois da conferência. O que resolve é tratar preencher-conferir-enviar
 * como uma coisa só: se qualquer parte não sobreviveu, o ciclo inteiro recomeça
 * a partir do preenchimento.
 *
 * Reenviar é seguro nos formulários que passam por aqui: cadastro com e-mail
 * único, login que apenas gera outro código, recuperação que reemite o mesmo
 * tipo de mensagem. E o ambiente local afrouxa o limite de tentativas de
 * autenticação — ver docker-compose.yml.
 */
export async function preencherEEnviar(
  campos: Array<[Locator, string]>,
  botao: Locator,
  alvo: Locator,
  { timeout = 45_000 } = {},
): Promise<void> {
  for (const [campo] of campos) {
    await expect(campo).toBeVisible();
  }

  await expect(async () => {
    for (const [campo, valor] of campos) {
      await campo.fill(valor);
    }

    // Confere depois de preencher tudo: a montagem limpa o formulário inteiro,
    // e não um campo de cada vez.
    for (const [campo, valor] of campos) {
      await expect(campo).toHaveValue(valor, { timeout: 500 });
    }

    await botao.click();
    await expect(alvo).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout });
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

  await preencherEEnviar(
    [
      [page.getByLabel("E-mail"), email],
      [page.getByLabel("Senha", { exact: true }), senha],
    ],
    page.getByRole("button", { name: "Entrar" }),
    page.getByRole("heading", { name: "Confirme que é você" }),
  );

  const codigo = extrairCodigo(
    await aguardarEmail(request, email, { assunto: "Seu código de acesso" }),
  );

  await page.getByLabel("Código").fill(codigo);
  await page.getByRole("button", { name: "Confirmar e entrar" }).click();
}
