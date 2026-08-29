"use client";

import { useTema } from "@/hooks/useTema";
import estilos from "./BotaoDeTema.module.css";

/**
 * Alterna entre claro e escuro.
 *
 * O rótulo diz para onde o clique leva, e não onde a pessoa está: "Modo claro"
 * quando o site está escuro. Botão que anuncia o estado atual é ambíguo — quem
 * lê não sabe se está vendo um rótulo ou uma promessa.
 *
 * O ícone acompanha pelo mesmo raciocínio: sol quando o clique vai clarear.
 * Ele é decorativo (aria-hidden) porque o texto ao lado já diz tudo; anunciar
 * "sol" antes de "Modo claro" seria repetição para quem usa leitor de tela.
 */
export function BotaoDeTema({
  className,
  flutuante = false,
}: {
  className?: string;
  /** Fixo no canto, para o layout raiz oferecê-lo em qualquer tela. */
  flutuante?: boolean;
}) {
  const { tema, alternar } = useTema();
  const vaiParaClaro = tema === "escuro";
  const rotulo = vaiParaClaro ? "Modo claro" : "Modo escuro";

  return (
    <button
      type="button"
      className={className ?? (flutuante ? estilos.flutuante : estilos.botao)}
      onClick={alternar}
      title={vaiParaClaro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      // O rótulo some visualmente em tela estreita, mas o nome acessível não
      // pode sumir junto: sem ele o botão vira um ícone sem significado.
      aria-label={rotulo}
    >
      <span className={estilos.icone} aria-hidden="true">
        {vaiParaClaro ? <Sol /> : <Lua />}
      </span>
      <span className={estilos.rotulo}>{rotulo}</span>
    </button>
  );
}

/* Traço em currentColor: os ícones acompanham a cor do texto do botão. */
function Sol() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Lua() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
