"use client";

import { toast as toastVariants } from "@/lib/motion";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import styles from "./Toast.module.css";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Feedback de ação. Toda mutação bem-sucedida ou falha deve produzir um toast —
 * ação sem confirmação visível deixa o usuário na dúvida se algo aconteceu.
 *
 * Duração maior para erros: mensagem de falha costuma exigir leitura;
 * confirmação de sucesso é reconhecida num relance.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6500 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <section className={styles.viewport} aria-label="Notificações">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`${styles.toast} ${styles[item.kind]}`}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role={item.kind === "error" ? "alert" : "status"}
              aria-live={item.kind === "error" ? "assertive" : "polite"}
            >
              <span className={styles.message}>{item.message}</span>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(item.id)}
                aria-label="Fechar notificação"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  }

  return context;
}
