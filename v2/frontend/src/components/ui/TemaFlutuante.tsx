"use client";

import { BotaoDeTema } from "@/components/ui/BotaoDeTema";
import { usePathname } from "next/navigation";

/**
 * O botão de tema para as telas que não têm um lugar próprio para ele.
 *
 * A home o mostra na barra superior, junto do acesso, que é onde ele estava
 * desde o começo e onde quem usa o site já aprendeu a procurar. As demais telas
 * têm cabeçalhos próprios, com links que variam de uma para outra — encaixar
 * mais um botão em cada uma significaria mexer em todas e manter seis lugares
 * em vez de um.
 *
 * Daí a divisão: a home usa o seu, e este cobre o resto. Renderizar os dois
 * na home deixaria o mesmo controle repetido na mesma tela.
 */
export function TemaFlutuante() {
  const rota = usePathname();

  if (rota === "/") {
    return null;
  }

  return <BotaoDeTema flutuante />;
}
