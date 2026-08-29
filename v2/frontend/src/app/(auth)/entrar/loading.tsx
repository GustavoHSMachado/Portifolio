import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/Skeleton";

/**
 * Skeleton da tela de login.
 * Espelha a forma real (título, dois campos, botão), então quando o conteúdo
 * chega ele ocupa exatamente o mesmo espaço e nada salta.
 */
export default function LoadingEntrar() {
  return (
    <LoadingRegion label="Carregando formulário de acesso">
      <div
        style={{
          width: "min(420px, 100%)",
          margin: "0 auto",
          padding: "var(--space-7) var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            marginBottom: "var(--space-6)",
          }}
        >
          <Skeleton height="2.25rem" width="40%" radius="var(--radius-sm)" />
          <SkeletonText lines={1} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Skeleton height="70px" radius="var(--radius-md)" />
          <Skeleton height="70px" radius="var(--radius-md)" delay={80} />
          <Skeleton height="52px" radius="var(--radius-md)" delay={160} />
        </div>
      </div>
    </LoadingRegion>
  );
}
