"use client";

import type { ProjectImage } from "@/lib/portfolio";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./GaleriaDeFotos.module.css";
import { Modal } from "./Modal";

interface Props {
  fotos: ProjectImage[];
  projeto: string;
  /** Índice da foto a abrir; null mantém a galeria fechada. */
  inicial: number | null;
  onClose: () => void;
}

/**
 * Galeria em tela cheia, montada sobre o Modal.
 *
 * O Modal já trava o scroll, prende o foco e devolve ao elemento que abriu —
 * reaproveitar evita reimplementar isso errado. O que esta camada acrescenta
 * é a navegação entre fotos e as miniaturas.
 */
export function GaleriaDeFotos({ fotos, projeto, inicial, onClose }: Props) {
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  // Abrir pela terceira miniatura precisa começar na terceira foto, e não na
  // primeira — por isso o índice vem de fora e é sincronizado aqui.
  useEffect(() => {
    if (inicial !== null) {
      setAtual(inicial);
      setAmpliada(false);
    }
  }, [inicial]);

  const total = fotos.length;

  const ir = useCallback(
    (passo: number) => {
      // O resto negativo em JS é negativo; somar o total antes resolve o
      // caso de voltar da primeira para a última.
      setAtual((indice) => (indice + passo + total) % total);
      // Trocar de foto com a anterior ampliada deixaria a próxima cortada num
      // canto qualquer, sem relação com o que ela mostra.
      setAmpliada(false);
    },
    [total],
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
      }
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [inicial, ir]);

  // Math.min segura o caso de a lista encolher (uma foto removida no painel)
  // enquanto a galeria está aberta no último índice.
  const foto = fotos[Math.min(atual, fotos.length - 1)];

  if (foto === undefined) {
    return null;
  }

  return (
    <Modal open={inicial !== null} onClose={onClose} title={`Telas de ${projeto}`}>
      <div className={styles.palco}>
        {total > 1 ? (
          <button
            type="button"
            className={`${styles.seta} ${styles.setaAnterior}`}
            onClick={() => ir(-1)}
            aria-label="Foto anterior"
          >
            ←
          </button>
        ) : null}

        {/*
          A foto é um botão: ampliar é ação, e quem navega por teclado precisa
          alcançá-la. O contêiner rola quando ampliada, então dá para arrastar
          a imagem grande com o dedo ou com a barra.
        */}
        <button
          type="button"
          className={`${styles.areaFoto} ${ampliada ? styles.areaFotoAmpliada : ""}`}
          onClick={() => setAmpliada((estava) => !estava)}
          aria-label={ampliada ? "Reduzir a foto" : "Ampliar a foto"}
          aria-pressed={ampliada}
        >
          <Image
            key={foto.id}
            src={foto.url}
            alt={foto.alt}
            width={1200}
            height={750}
            className={`${styles.foto} ${ampliada ? styles.fotoAmpliada : ""}`}
            sizes="(max-width: 48rem) 92vw, 60rem"
            priority
            unoptimized
          />
        </button>

        {total > 1 ? (
          <button
            type="button"
            className={`${styles.seta} ${styles.setaProxima}`}
            onClick={() => ir(1)}
            aria-label="Próxima foto"
          >
            →
          </button>
        ) : null}
      </div>

      <p className={styles.legenda}>
        {foto.alt}
        {total > 1 ? (
          <span className={styles.contador}>
            {atual + 1} de {total}
          </span>
        ) : null}
      </p>

      {total > 1 ? (
        <ul className={styles.miniaturas} aria-label="Escolher foto">
          {fotos.map((item, indice) => (
            <li key={item.id}>
              <button
                type="button"
                className={styles.miniatura}
                onClick={() => setAtual(indice)}
                aria-label={`Ver ${item.alt}`}
                aria-current={indice === atual}
              >
                <Image
                  src={item.url}
                  alt=""
                  width={96}
                  height={60}
                  className={styles.miniaturaFoto}
                  sizes="96px"
                  loading="lazy"
                  unoptimized
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
