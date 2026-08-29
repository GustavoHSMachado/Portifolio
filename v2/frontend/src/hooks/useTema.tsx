"use client";

import { CHAVE_TEMA, COR_DA_BARRA, type Tema } from "@/lib/tema";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface EstadoDoTema {
  tema: Tema;
  alternar: () => void;
}

const TemaContext = createContext<EstadoDoTema | null>(null);

/**
 * Tema claro ou escuro, com a escolha guardada entre visitas.
 *
 * Três decisões que importam:
 *
 * 1. **O padrão é o do sistema.** Quem configurou o computador em claro já disse
 *    o que prefere; abrir no escuro seria ignorar isso e obrigar a corrigir.
 * 2. **A escolha explícita vence e persiste.** Uma vez que a pessoa clica no
 *    botão, é a decisão dela que vale, mesmo que o sistema diga outra coisa.
 * 3. **O estado inicial não é lido aqui.** Quem aplica o tema antes da primeira
 *    pintura é o script no layout — este provider apenas descobre o que já está
 *    valendo. Ler o localStorage durante o render causaria divergência entre o
 *    HTML do servidor e o do cliente, que é erro de hidratação.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>("escuro");

  // Descobre o que o script já aplicou, depois da montagem.
  useEffect(() => {
    const atual = document.documentElement.dataset.theme;

    setTema(atual === "light" ? "claro" : "escuro");
  }, []);

  /*
   * Acompanha a preferência do sistema enquanto ninguém escolheu nada. Depois
   * de uma escolha explícita, para de acompanhar: mudar o tema debaixo de quem
   * acabou de decidir seria desfazer a decisão.
   */
  useEffect(() => {
    if (localStorage.getItem(CHAVE_TEMA)) {
      return;
    }

    const consulta = window.matchMedia("(prefers-color-scheme: light)");

    const aoMudar = (evento: MediaQueryListEvent) => {
      const novo: Tema = evento.matches ? "claro" : "escuro";

      aplicar(novo);
      setTema(novo);
    };

    consulta.addEventListener("change", aoMudar);

    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  const alternar = useCallback(() => {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";

    aplicar(novo);
    localStorage.setItem(CHAVE_TEMA, novo);
    setTema(novo);
  }, [tema]);

  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>;
}

export function useTema(): EstadoDoTema {
  const contexto = useContext(TemaContext);

  if (!contexto) {
    throw new Error("useTema precisa estar dentro de <TemaProvider>.");
  }

  return contexto;
}

/**
 * Escreve o tema no elemento raiz e ajusta a cor da barra do navegador.
 *
 * O theme-color no metadata do Next é estático e não acompanha a troca; sem
 * atualizá-lo aqui, o topo do navegador no celular ficaria escuro com a página
 * clara.
 */
function aplicar(tema: Tema): void {
  const raiz = document.documentElement;

  if (tema === "claro") {
    raiz.dataset.theme = "light";
  } else {
    delete raiz.dataset.theme;
  }

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_DA_BARRA[tema]);
}
