"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import {
  type ProjectImage,
  enviarFotoDoProjeto,
  excluirFotoDoProjeto,
  salvarFotoDoProjeto,
} from "@/lib/portfolio";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./FotosDoProjeto.module.css";

/** Mesmos limites do servidor, repetidos aqui só para avisar antes de enviar. */
const TAMANHO_MAXIMO = 2 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  projectId: number;
  fotos: ProjectImage[];
  /** Recarrega o conteúdo do painel depois de enviar, salvar ou remover. */
  onChanged: () => void;
}

/**
 * Fotos de um projeto, dentro do painel.
 *
 * A validação daqui não substitui a do servidor — ela evita a viagem: um PNG de
 * 8 MB seria recusado de todo jeito, e esperar o upload inteiro para ler a
 * recusa é tempo gasto à toa. Quem decide de fato é o ImageStorage.
 *
 * A descrição é exigida antes do envio porque imagem sem texto alternativo não
 * existe para leitor de tela, e um campo opcional ficaria vazio na maioria das
 * vezes. Aqui o custo de preencher é uma linha; depois, ninguém volta.
 */
export function FotosDoProjeto({ projectId, fotos, onChanged }: Props) {
  const toast = useToast();
  const campoArquivo = useRef<HTMLInputElement>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ocupada, setOcupada] = useState<number | null>(null);

  function escolher(event: ChangeEvent<HTMLInputElement>) {
    const escolhido = event.target.files?.[0] ?? null;
    setErro(null);

    if (escolhido === null) {
      setArquivo(null);

      return;
    }

    if (!TIPOS_ACEITOS.includes(escolhido.type)) {
      setErro("Formato não aceito. Envie JPEG, PNG ou WebP.");
      setArquivo(null);

      return;
    }

    if (escolhido.size > TAMANHO_MAXIMO) {
      setErro("A imagem passa de 2 MB. Reduza antes de enviar.");
      setArquivo(null);

      return;
    }

    setArquivo(escolhido);
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (arquivo === null) {
      setErro("Escolha uma imagem.");

      return;
    }

    if (descricao.trim() === "") {
      setErro("Descreva a imagem — é o que o leitor de tela anuncia.");

      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      await enviarFotoDoProjeto(projectId, arquivo, descricao.trim());
      toast.success("Foto adicionada.");

      setArquivo(null);
      setDescricao("");

      // O input de arquivo é controlado pelo navegador: sem isto, o nome do
      // arquivo enviado continua na tela como se ele ainda estivesse escolhido.
      if (campoArquivo.current !== null) {
        campoArquivo.current.value = "";
      }

      onChanged();
    } catch (falha) {
      const mensagem =
        falha instanceof ApiError
          ? (falha.fieldErrors.foto?.[0] ?? falha.fieldErrors.alt?.[0] ?? falha.message)
          : "Não foi possível enviar a foto.";

      setErro(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(foto: ProjectImage, alt: string, position: number) {
    setOcupada(foto.id);

    try {
      await salvarFotoDoProjeto(projectId, foto.id, { alt: alt.trim(), position });
      toast.success("Foto atualizada.");
      onChanged();
    } catch (falha) {
      toast.error(falha instanceof ApiError ? falha.message : "Não foi possível salvar.");
    } finally {
      setOcupada(null);
    }
  }

  async function remover(foto: ProjectImage) {
    setOcupada(foto.id);

    try {
      await excluirFotoDoProjeto(projectId, foto.id);
      toast.success("Foto removida.");
      onChanged();
    } catch (falha) {
      toast.error(falha instanceof ApiError ? falha.message : "Não foi possível remover.");
    } finally {
      setOcupada(null);
    }
  }

  return (
    <section className={styles.bloco}>
      <h4 className={styles.titulo}>Fotos</h4>
      <p className={styles.ajuda}>
        Capturas de tela do projeto. A primeira é a que aparece no cartão da vitrine; as demais
        entram na galeria. Até 8 fotos, de até 2 MB cada.
      </p>

      {fotos.length > 0 ? (
        <ul className={styles.lista}>
          {fotos.map((foto, indice) => (
            <li key={foto.id} className={styles.item}>
              <Image
                src={foto.url}
                alt={foto.alt}
                width={160}
                height={100}
                className={styles.miniatura}
                unoptimized
              />

              <form
                className={styles.itemCampos}
                onSubmit={(event) => {
                  event.preventDefault();
                  const dados = new FormData(event.currentTarget);
                  void salvar(
                    foto,
                    String(dados.get("alt") ?? ""),
                    Number(dados.get("position") ?? indice),
                  );
                }}
              >
                <Input
                  label="Descrição"
                  name="alt"
                  defaultValue={foto.alt}
                  hint={indice === 0 ? "Esta é a foto do cartão." : undefined}
                  required
                />
                <Input
                  label="Ordem"
                  name="position"
                  type="number"
                  min={0}
                  defaultValue={String(foto.position)}
                />
                <div className={styles.itemAcoes}>
                  <Button type="submit" size="sm" variant="ghost" loading={ocupada === foto.id}>
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void remover(foto)}
                    disabled={ocupada === foto.id}
                  >
                    Remover
                  </Button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.vazio}>Nenhuma foto ainda.</p>
      )}

      {fotos.length < 8 ? (
        <form onSubmit={enviar} className={styles.envio}>
          <label className={styles.campoArquivo}>
            <span className={styles.campoArquivoLabel}>Nova foto</span>
            <input
              ref={campoArquivo}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              onChange={escolher}
              className={styles.arquivo}
            />
          </label>

          <Input
            label="Descrição da imagem"
            name="descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            hint="O que se vê na tela, em poucas palavras."
          />

          {erro !== null ? (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <Button type="submit" size="sm" loading={enviando} disabled={arquivo === null}>
            {enviando ? "Enviando" : "Enviar foto"}
          </Button>
        </form>
      ) : (
        <p className={styles.vazio}>Limite de 8 fotos alcançado. Remova uma para enviar outra.</p>
      )}
    </section>
  );
}
