import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Descarta o cache da home depois de uma edição no painel.
 *
 * A home é renderizada no servidor e revalidada a cada 60 segundos. Para
 * conteúdo isso é aceitável; para aparência não é: quem acabou de escolher uma
 * cor quer ver o resultado, e um minuto de home antiga parece defeito. Este
 * endpoint existe para o painel avisar que algo mudou.
 *
 * Quem autoriza é a API de verdade, não este arquivo. O token recebido é
 * repassado para uma rota administrativa dela; se aquela responder 200, quem
 * chamou é admin. Sem isso, seria um endpoint público capaz de derrubar o cache
 * do site a cada requisição — barato de chamar, caro de servir.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const autorizacao = request.headers.get("authorization");

  if (!autorizacao) {
    return NextResponse.json({ error: "Token de acesso ausente." }, { status: 401 });
  }

  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  let resposta: Response;

  try {
    resposta = await fetch(`${base}/api/v1/admin/settings`, {
      headers: { authorization: autorizacao, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível falar com a API." }, { status: 502 });
  }

  if (!resposta.ok) {
    return NextResponse.json(
      { error: "Você não tem permissão para isso." },
      { status: resposta.status === 401 ? 401 : 403 },
    );
  }

  revalidatePath("/");

  return NextResponse.json({ revalidado: true });
}
