"use client";

import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Revela conteúdo ao entrar na viewport.
 * Anima uma vez só — reanimar a cada scroll de volta é distração, não polimento.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "article";
}) {
  const Component = motion[as];

  return (
    <Component
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}

/**
 * Lista com entrada escalonada.
 * O passo diminui conforme a lista cresce — ver staggerContainer em lib/motion.
 */
export function RevealList({
  children,
  itemCount,
  className,
}: {
  children: ReactNode;
  itemCount: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(itemCount)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeInUp}>
      {children}
    </motion.div>
  );
}
