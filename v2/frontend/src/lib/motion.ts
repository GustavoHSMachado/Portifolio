/**
 * Vocabulário de movimento do produto.
 *
 * Regra que sustenta tudo aqui: movimento comunica causa e hierarquia.
 * Um elemento que entra vindo de baixo diz "eu sou novo nesta lista".
 * Um modal que cresce do centro diz "eu sou uma camada acima".
 * Se cada tela inventa a própria animação, o usuário para de aprender o padrão
 * e a interface passa a parecer amadora — que é exatamente o que queremos evitar.
 *
 * Nenhum componente deve escrever `transition={{ duration: 0.3 }}` solto.
 * Importa daqui.
 */

import type { Transition, Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Durações e curvas — espelham os tokens CSS                          */
/* ------------------------------------------------------------------ */

export const duration = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.34,
  slower: 0.48,
} as const;

export const ease = {
  /** Padrão para entrada: chega e freia. */
  out: [0.22, 1, 0.36, 1],
  /** Padrão para saída: acelera ao sair de cena. */
  in: [0.55, 0, 1, 0.45],
  inOut: [0.65, 0, 0.35, 1],
  /** Leve overshoot — use com parcimônia, só em elementos que "aparecem". */
  spring: [0.34, 1.56, 0.64, 1],
} as const;

export const transition = {
  fast: { duration: duration.fast, ease: ease.out },
  base: { duration: duration.base, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.out },
  exit: { duration: duration.fast, ease: ease.in },
  /**
   * Spring físico para arrastar/soltar e para o que precisa parecer tátil.
   * Preferimos spring a duração fixa quando o elemento responde ao usuário.
   */
  springy: { type: "spring", stiffness: 380, damping: 30, mass: 0.8 },
} satisfies Record<string, Transition>;

/* ------------------------------------------------------------------ */
/* Variantes reutilizáveis                                             */
/* ------------------------------------------------------------------ */

/**
 * Deslocamentos pequenos. 8–16px basta para sugerir direção.
 * Distâncias grandes fazem a interface parecer que está "voando", não respondendo.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: -8, transition: transition.exit },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.exit },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transition.base },
  exit: { opacity: 0, scale: 0.98, transition: transition.exit },
};

/** Modal: cresce do centro, sai encolhendo levemente. */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transition.springy },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: transition.exit },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

/** Gaveta lateral (menu mobile). */
export const drawer: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: transition.springy },
  exit: { x: "100%", transition: transition.exit },
};

/** Toast: entra pela direita, sai desmontando. */
export const toast: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: transition.springy },
  exit: { opacity: 0, x: 16, scale: 0.96, transition: transition.exit },
};

/* ------------------------------------------------------------------ */
/* Orquestração de listas                                              */
/* ------------------------------------------------------------------ */

/**
 * Stagger dá ao olho um caminho a seguir em vez de um "flash" de conteúdo.
 *
 * Cuidado deliberado: o atraso acumulado é limitado. Com 40 itens a 60ms cada,
 * o último apareceria 2,4s depois — inaceitável. Por isso o helper abaixo
 * reduz o passo conforme a lista cresce.
 */
/** Nenhuma lista deve levar mais que isto para terminar de entrar. */
const MAX_STAGGER_TOTAL = 0.6;

export function staggerContainer(itemCount = 6): Variants {
  // O passo diminui conforme a lista cresce e, acima de tudo, o total é limitado:
  // com 40 itens a 60ms cada, o último apareceria 2,4s depois — inaceitável.
  const preferredStep = itemCount > 12 ? 0.02 : itemCount > 6 ? 0.04 : 0.06;
  const step = itemCount > 1 ? Math.min(preferredStep, MAX_STAGGER_TOTAL / (itemCount - 1)) : 0;

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: step,
        delayChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: Math.min(0.015, step),
        staggerDirection: -1,
      },
    },
  };
}

export const staggerItem: Variants = fadeInUp;

/* ------------------------------------------------------------------ */
/* Transição entre páginas                                             */
/* ------------------------------------------------------------------ */

/**
 * Sutil de propósito. Transição de página chamativa é divertida uma vez e
 * irritante na décima. 8px e 220ms passam a sensação de continuidade sem
 * atrasar quem só quer chegar na informação.
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.in } },
};

/* ------------------------------------------------------------------ */
/* Interação                                                           */
/* ------------------------------------------------------------------ */

/**
 * Feedback tátil em elementos clicáveis.
 * O "press" é mais forte que o "hover" porque o toque precisa de confirmação
 * imediata — em mobile não existe hover.
 */
export const pressable = {
  whileHover: { scale: 1.02, transition: transition.fast },
  whileTap: { scale: 0.97, transition: { duration: duration.instant } },
} as const;

export const pressableSubtle = {
  whileHover: { y: -2, transition: transition.fast },
  whileTap: { y: 0, scale: 0.99, transition: { duration: duration.instant } },
} as const;

/** Chamar atenção para um erro sem ser agressivo. */
export const shake: Variants = {
  hidden: { x: 0 },
  visible: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4, ease: ease.out },
  },
};

/* ------------------------------------------------------------------ */
/* Viewport                                                            */
/* ------------------------------------------------------------------ */

/**
 * Configuração padrão para animar ao entrar na viewport.
 * `once: true` é intencional: reanimar no scroll de volta é distração pura.
 * A margem negativa dispara a animação um pouco antes do elemento aparecer,
 * evitando que ele "pule" já visível.
 */
export const viewportOnce = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -80px 0px",
} as const;
