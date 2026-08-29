import { fetchContentSafe } from "@/lib/portfolio";
import { ImageResponse } from "next/og";

/**
 * Cartão social gerado no servidor.
 *
 * Sem esta imagem, o link compartilhado no LinkedIn ou no WhatsApp aparece como
 * uma faixa cinza com a URL — que é exatamente onde um portfólio costuma ser
 * compartilhado. Gerar em vez de subir um PNG mantém o cartão em dia com o
 * conteúdo editado pelo painel, sem exportar imagem a cada troca de cargo.
 */
export const alt = "Portfólio de Gustavo Henrique Santos Machado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  /*
   * A imagem não pode derrubar a rota: com a API fora, fetchContentSafe devolve
   * perfil nulo e o cartão sai com o texto de reserva, em vez de a rota falhar.
   */
  const { profile } = await fetchContentSafe();

  const name = profile?.fullName ?? "Gustavo Henrique Santos Machado";
  const role = profile?.role ?? "Profissional de T.I.";
  const headline = profile?.headline ?? "Análise de sistemas, dados e desenvolvimento";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        // Os valores são os mesmos tokens do tema; aqui precisam ser literais
        // porque a imagem é composta fora do navegador, sem CSS custom property.
        background: "#0b0b0f",
        color: "#f5f5f7",
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#5aa9ff",
        }}
      >
        {role}
      </div>

      <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, marginTop: 24 }}>
        {headline}
      </div>

      <div style={{ fontSize: 32, color: "#8a8a95", marginTop: 32 }}>{name}</div>

      <div
        style={{
          width: 120,
          height: 6,
          background: "#5aa9ff",
          borderRadius: 999,
          marginTop: 40,
        }}
      />
    </div>,
    size,
  );
}
