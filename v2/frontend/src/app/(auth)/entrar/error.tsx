"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Fronteira de erro da rota.
 * Erro sem saída é beco: sempre oferecemos uma ação de recuperação.
 */
export default function EntrarError({
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
    <div
      style={{
        width: "min(420px, 100%)",
        margin: "0 auto",
        padding: "var(--space-7) var(--space-4)",
        textAlign: "center",
      }}
      role="alert"
    >
      <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>
        Não conseguimos carregar esta tela
      </h1>
      <p style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-6)" }}>
        Isso costuma ser temporário. Tente novamente em alguns segundos.
      </p>
      <Button onClick={reset} size="lg">
        Tentar novamente
      </Button>
    </div>
  );
}
