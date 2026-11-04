"use client";

import type { ProjectImage } from "@/lib/portfolio";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as EventoDeClique, PointerEvent as EventoDePonteiro } from "react";
import styles from "./GaleriaDeFotos.module.css";
import { Modal } from "./Modal";

interface Props {
  fotos: ProjectImage[];
  projeto: string;
  /** Índice da foto a abrir; null mantém a galeria fechada. */
  inicial: number | null;
  onClose: () => void;
}

/** Quanto a foto cresce ao ampliar. 2,5× torna legível o texto de uma tela de sistema. */
const ESCALA = 2.5;

/** Abaixo disto o gesto é um clique; acima, é arrastar. */
const TOLERANCIA_DE_ARRASTE = 4;

interface Zoom {
  /** Ponto de origem da ampliação, em % da imagem: é onde a pessoa clicou. */
  origemX: number;
  origemY: number;
  /** Deslocamento produzido por arrastar, em px. */
  x: number;
  y: number;
}

const SEM_ZOOM: Zoom = { origemX: 50, origemY: 50, x: 0, y: 0 };

/**
 * Galeria em tela quase cheia, montada sobre o Modal na variante larga.
 *
 * O Modal já trava o scroll, prende o foco e devolve ao elemento que abriu.
 * O que esta camada acrescenta é a experiência de foto: setas fora da área da
 * imagem, para não cobrir o que se quer ler; ampliação a partir do ponto
 * clicado, com arrastar para percorrer; miniaturas que acompanham a foto atual.
 */
export function GaleriaDeFotos({ fotos, projeto, inicial, onClose }: Props) {
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const [zoom, setZoom] = useState<Zoom>(SEM_ZOOM);
  const [arrastando, setArrastando] = useState(false);

  const arraste = useRef<{
    inicioX: number;
    inicioY: number;
    baseX: number;
    baseY: number;
    moveu: boolean;
  } | null>(null);
  const tira = useRef<HTMLUListElement>(null);

  const reduzir = useCallback(() => {
    setAmpliada(false);
    setZoom(SEM_ZOOM);
  }, []);

  // Abrir pela terceira miniatura precisa começar na terceira foto, e não na
  // primeira — por isso o índice vem de fora e é sincronizado aqui.
  useEffect(() => {
    if (inicial !== null) {
      setAtual(inicial);
      reduzir();
    }
  }, [inicial, reduzir]);

  const total = fotos.length;

  const ir = useCallback(
    (passo: number) => {
      // O resto negativo em JS é negativo; somar o total antes resolve o
      // caso de voltar da primeira para a última.
      setAtual((indice) => (indice + passo + total) % total);
      // Trocar de foto ampliada deixaria a próxima cortada num canto qualquer.
      reduzir();
    },
    [total, reduzir],
  );

  useEffect(() => {
    if (inicial === null) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "ArrowRight") {
        ir(1);
      }

      if (evento.key === "ArrowLeft") {
        ir(-1);
      }

      // Espaço e Enter já são tratados pelo botão quando ele tem o foco; esta
      // é a tecla que funciona de qualquer lugar do diálogo.
      if (evento.key.toLowerCase() === "z") {
        setAmpliada((estava) => !estava);
        setZoom(SEM_ZOOM);
      }
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [inicial, ir]);

  // A miniatura da foto aberta fica sempre à vista, mesmo com nove na tira.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `atual` não é lido aqui — é o gatilho. A miniatura ativa é achada pelo aria-current no DOM, que só muda depois que `atual` muda.
  useEffect(() => {
    const ativa = tira.current?.querySelector<HTMLElement>('[aria-current="true"]');
    // scrollIntoView não existe no jsdom dos testes; no navegador, sempre.
    ativa?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [atual]);

  // Math.min segura o caso de a lista encolher (uma foto removida no painel)
  // enquanto a galeria está aberta no último índice.
  const foto = fotos[Math.min(atual, fotos.length - 1)];

  if (foto === undefined) {
    return null;
  }

  function aoPressionar(evento: EventoDePonteiro<HTMLButtonElement>) {
    if (!ampliada) return;

    arraste.current = {
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      baseX: zoom.x,
      baseY: zoom.y,
      moveu: false,
    };
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function aoMover(evento: EventoDePonteiro<HTMLButtonElement>) {
    const estado = arraste.current;
    if (estado === null) return;

    const dx = evento.clientX - estado.inicioX;
    const dy = evento.clientY - estado.inicioY;

    if (!estado.moveu && Math.hypot(dx, dy) < TOLERANCIA_DE_ARRASTE) return;

    estado.moveu = true;
    setArrastando(true);
    setZoom((anterior) => ({ ...anterior, x: estado.baseX + dx, y: estado.baseY + dy }));
  }

  function aoSoltar() {
    // O "moveu" sobrevive até o clique que vem logo depois, para ele saber
    // que foi arraste e não pedido de reduzir.
    setArrastando(false);
  }

  function aoClicar(evento: EventoDeClique<HTMLButtonElement>) {
    if (arraste.current?.moveu) {
      arraste.current = null;

      return;
    }

    arraste.current = null;

    if (ampliada) {
      reduzir();

      return;
    }

    // Amplia a partir do ponto clicado: quem clica num número quer ver aquele
    // número, não o centro da tela. Teclado (detail 0) amplia pelo centro.
    const caixa = evento.currentTarget.getBoundingClientRect();
    const porTeclado = evento.detail === 0 || caixa.width === 0;

    setZoom({
      origemX: porTeclado ? 50 : ((evento.clientX - caixa.left) / caixa.width) * 100,
      origemY: porTeclado ? 50 : ((evento.clientY - caixa.top) / caixa.height) * 100,
      x: 0,
      y: 0,
    });
    setAmpliada(true);
  }

  const classeDaArea = [
    styles.areaFoto,
    ampliada ? styles.areaFotoAmpliada : "",
    arrastando ? styles.areaFotoArrastando : "",
  ].join(" ");

  return (
    <Modal open={inicial !== null} onClose={onClose} title={`Telas de ${projeto}`} largura="larga">
      <div className={styles.galeria}>
        <div className={styles.palcoComSetas}>
          {total > 1 ? (
            <button
              type="button"
              className={`${styles.seta} ${styles.setaAnterior}`}
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
            >
              <span aria-hidden="true">‹</span>
            </button>
          ) : null}

          <div className={styles.palco}>
            {/*
              A foto é um botão: ampliar é ação, e quem navega por teclado
              precisa alcançá-la. Ampliada, ela cresce a partir do ponto
              clicado e pode ser arrastada com o mouse ou o dedo.
            */}
            <button
              type="button"
              className={classeDaArea}
              onClick={aoClicar}
              onPointerDown={aoPressionar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerCancel={aoSoltar}
              aria-label={ampliada ? "Reduzir a foto" : "Ampliar a foto"}
              aria-pressed={ampliada}
            >
              <Image
                key={foto.id}
                src={foto.url}
                alt={foto.alt}
                width={1600}
                height={1000}
                className={styles.foto}
                style={{
                  transformOrigin: `${zoom.origemX}% ${zoom.origemY}%`,
                  transform: ampliada
                    ? `translate(${zoom.x}px, ${zoom.y}px) scale(${ESCALA})`
                    : "none",
                }}
                sizes="(max-width: 48rem) 92vw, 72rem"
                draggable={false}
                priority
                unoptimized
              />
            </button>
          </div>

          {total > 1 ? (
            <button
              type="button"
              className={`${styles.seta} ${styles.setaProxima}`}
              onClick={() => ir(1)}
              aria-label="Próxima foto"
            >
              <span aria-hidden="true">›</span>
            </button>
          ) : null}
        </div>

        <div className={styles.rodape}>
          <p className={styles.legenda}>{foto.alt}</p>

          <div className={styles.rodapeDireita}>
            <span className={styles.dica}>
              {ampliada
                ? "Arraste para mover · clique para reduzir"
                : "Clique na foto ou tecle Z para ampliar"}
            </span>
            {total > 1 ? (
              <span className={styles.contador}>
                {atual + 1} de {total}
              </span>
            ) : null}
          </div>
        </div>

        {total > 1 ? (
          <ul ref={tira} className={styles.miniaturas} aria-label="Escolher foto">
            {fotos.map((item, indice) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.miniatura}
                  onClick={() => {
                    setAtual(indice);
                    reduzir();
                  }}
                  aria-label={`Ver ${item.alt}`}
                  aria-current={indice === atual}
                >
                  <Image
                    src={item.url}
                    alt=""
                    width={112}
                    height={70}
                    className={styles.miniaturaFoto}
                    sizes="112px"
                    loading="lazy"
                    unoptimized
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
