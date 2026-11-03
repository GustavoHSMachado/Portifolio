"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import {
  FOTO_TIPOS_ACEITOS,
  type ProjectImage,
  enviarFotoDoProjeto,
  excluirFotoDoProjeto,
  recusarFotos,
} from "@/lib/portfolio";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./FotosDoProjeto.module.css";

interface Props {
  projectId: number;
  capa: ProjectImage | null;
  onChanged: () => void;
}

/**
 * A imagem do cartão, separada da galeria.
 *
 * Capa e galeria respondem a perguntas diferentes — qual imagem representa o
 * projeto na vitrine, e quais telas contam como ele funciona. Enquanto a capa
 * era a primeira da galeria, escolher uma estragava a outra.
 *
 * Ela não ocupa vaga nas 8: é a nona foto, contada à parte no servidor.
 */
export function CapaDoProjeto({ projectId, capa, onChanged }: Props) {
  const toast = useToast();
  const campoArquivo = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(evento.target.files ?? []);
    setErro(null);

    if (escolhidos.length === 0) {
      setArquivo(null);

      return;
    }

    // Uma vaga só, e a mesma validação de formato e tamanho da galeria.
    const queixa = recusarFotos(escolhidos, 1);

    if (queixa !== null) {
      setErro(queixa);
      setArquivo(null);

      return;
    }

    setArquivo(escolhidos[0] ?? null);
  }

  async function enviar() {
    if (arquivo === null) {
      setErro("Escolha uma imagem.");

      return;
    }

    if (descricao.trim() === "") {
      setErro("Descreva a imagem — é o que o leitor de tela anuncia.");

      return;
    }

    setOcupado(true);
    setErro(null);

    try {
      await enviarFotoDoProjeto(projectId, arquivo, descricao.trim(), true);
      toast.success(capa === null ? "Capa definida." : "Capa trocada.");

      setArquivo(null);
      setDescricao("");

      if (campoArquivo.current !== null) {
        campoArquivo.current.value = "";
      }

      onChanged();
    } catch (falha) {
      setErro(
        falha instanceof ApiError
          ? (falha.fieldErrors.foto?.[0] ?? falha.fieldErrors.alt?.[0] ?? falha.message)
          : "Não foi possível enviar a capa.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    if (capa === null) return;

    setOcupado(true);

    try {
      await excluirFotoDoProjeto(projectId, capa.id);
      toast.success("Capa removida.");
      onChanged();
    } catch {
      toast.error("Não foi possível remover a capa.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={styles.bloco}>
      <h4 className={styles.titulo}>Capa</h4>
      <p className={styles.ajuda}>
        A imagem que aparece no cartão da vitrine. Não conta entre as 8 fotos da galeria — sem capa,
        o cartão usa a primeira tela.
      </p>

      {capa !== null ? (
        <ul className={styles.lista}>
          <li className={styles.item}>
            <Image
              src={capa.url}
              alt={capa.alt}
              width={160}
              height={100}
              className={styles.miniatura}
              unoptimized
            />
            <div className={styles.itemCampos}>
              <p className={styles.ajuda}>{capa.alt}</p>
              <div className={styles.itemAcoes}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void remover()}
                  disabled={ocupado}
                >
                  Remover capa
                </Button>
              </div>
            </div>
          </li>
        </ul>
      ) : (
        <p className={styles.vazio}>Nenhuma capa ainda.</p>
      )}

      <div className={styles.envio}>
        <label className={styles.campoArquivo}>
          <span className={styles.campoArquivoLabel}>
            {capa === null ? "Enviar capa" : "Trocar a capa"}
          </span>
          <input
            ref={campoArquivo}
            type="file"
            accept={FOTO_TIPOS_ACEITOS.join(",")}
            onChange={escolher}
            className={styles.arquivo}
          />
        </label>

        {capa !== null ? (
          <p className={styles.ajuda}>Enviar outra substitui a atual, que é apagada do disco.</p>
        ) : null}

        <Input
          label="Descrição da imagem"
          name="descricaoCapa"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          hint="O que se vê na tela, em poucas palavras."
        />

        {erro !== null ? (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        ) : null}

        <Button
          type="button"
          size="sm"
          loading={ocupado}
          disabled={arquivo === null}
          onClick={() => void enviar()}
        >
          {capa === null ? "Definir capa" : "Trocar capa"}
        </Button>
      </div>
    </section>
  );
}
