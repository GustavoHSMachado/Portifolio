"use client";

import { pageTransition } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Continuidade entre rotas.
 *
 * `mode="wait"` garante que a tela antiga termine de sair antes da nova entrar —
 * cruzar as duas causa um flash de conteúdo duplicado e sensação de bagunça.
 *
 * O invólucro é um `div` neutro de propósito: cada rota declara o próprio
 * `<main id="conteudo">`. Um `main` aqui viraria o landmark de todas as telas e
 * engoliria o da home — duas marcas `main` no mesmo documento, e o atalho de
 * pular para o conteúdo aterrissando antes da capa, sem pular nada.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ minHeight: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
