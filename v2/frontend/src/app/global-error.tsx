"use client";

import { useEffect } from "react";

/**
 * Última fronteira de erro: pega o que quebra no próprio layout raiz.
 *
 * As fronteiras de rota (`error.tsx`) só existem abaixo do layout — se o erro
 * acontece nele, não há nada acima para segurar, e o visitante recebe a tela em
 * branco do navegador. Esta é a única fronteira que substitui o documento
 * inteiro, e por isso precisa trazer o próprio `<html>` e `<body>`.
 *
 * Sem este arquivo o Next sintetiza um padrão, que não tem ação de recuperação
 * nem texto em português. "Erro sem saída é beco" vale aqui como nas demais
 * telas — e aqui vale mais, porque é a tela que aparece quando tudo o mais
 * falhou.
 *
 * Estilo em linha, e não CSS Module, de propósito: se o que quebrou foi o
 * carregamento da folha de estilo, uma tela de erro que dependa dela quebra
 * junto — e some justamente quando é mais necessária. Pelo mesmo motivo as
 * cores estão escritas à mão em vez de virem dos tokens.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção isto vai para o Sentry via instrumentação do Next.
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0b0f",
          color: "#f4f4f6",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "420px", textAlign: "center" }} role="alert">
          <h1 style={{ fontSize: "1.5rem", lineHeight: 1.3, margin: "0 0 12px" }}>
            Algo deu errado
          </h1>
          <p style={{ color: "#a1a1aa", margin: "0 0 28px", lineHeight: 1.6 }}>
            Não conseguimos carregar a página. Isso costuma ser temporário.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              height: "44px",
              padding: "0 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#5aa9ff",
              color: "#0b0b0f",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>

          {/*
            O digest é o que liga esta tela ao log do servidor. Sem ele, quem
            relata o problema não tem como dizer qual foi — e a mensagem
            genérica acima, que existe para não vazar detalhe interno, deixaria
            o suporte sem nenhuma pista.
          */}
          {error.digest ? (
            <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "24px 0 0" }}>
              Código do erro: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
