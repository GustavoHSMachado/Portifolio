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
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ minHeight: "100%" }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
