"use client";

import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  /** Desalinha o início do shimmer para a lista não pulsar em uníssono. */
  delay?: number;
}

/**
 * Bloco de carregamento.
 *
 * Por que skeleton em vez de spinner: o skeleton mostra a *forma* do que vem,
 * então quando o conteúdo chega ele ocupa o mesmo espaço e nada salta.
 * Spinner centralizado não informa nada sobre o layout e sempre gera reflow.
 *
 * O elemento é aria-hidden: leitores de tela recebem o aviso de carregamento
 * pela região live do container, não por dezenas de retângulos vazios.
 */
export function Skeleton({ width, height = "1em", radius, className, delay = 0 }: SkeletonProps) {
  const style: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: radius,
    animationDelay: delay ? `${delay}ms` : undefined,
  };

  return (
    <span
      className={[styles.skeleton, className ?? ""].filter(Boolean).join(" ")}
      style={style}
      // Mantém o loop vivo sob prefers-reduced-motion — ver tokens.css
      data-motion-loop=""
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton de texto com larguras irregulares.
 * Linhas todas do mesmo tamanho denunciam o placeholder; a última linha
 * mais curta imita o final natural de um parágrafo.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["100%", "96%", "88%", "92%", "70%"];

  return (
    <span className={[styles.textBlock, className ?? ""].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: lista decorativa de tamanho fixo, sem identidade própria e que nunca reordena — a posição é a única chave estável possível aqui.
          key={i}
          height="0.9em"
          width={i === lines - 1 ? "62%" : widths[i % widths.length]}
          delay={i * 80}
        />
      ))}
    </span>
  );
}

/** Placeholder de card que espelha a estrutura real: mídia, título, corpo. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={[styles.card, className ?? ""].filter(Boolean).join(" ")}>
      <Skeleton height={180} radius="var(--radius-md)" />
      <div className={styles.cardBody}>
        <Skeleton height="1.25em" width="65%" delay={60} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * Envelope acessível para qualquer região em carregamento.
 * Anuncia uma única vez, em vez de deixar o leitor de tela em silêncio.
 */
export function LoadingRegion({
  label = "Carregando conteúdo",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    // <output> já carrega role="status" e aria-live="polite" nativamente.
    <output className={styles.loadingRegion} aria-busy="true">
      <span className={styles.srOnly}>{label}</span>
      {children}
    </output>
  );
}
