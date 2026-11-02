"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import {
  FOTOS_POR_PROJETO,
  FOTO_TIPOS_ACEITOS,
  type ProjectImage,
  enviarFotoDoProjeto,
  excluirFotoDoProjeto,
  recusarFotos,
  salvarFotoDoProjeto,
} from "@/lib/portfolio";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./FotosDoProjeto.module.css";

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

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);

  const vagas = FOTOS_POR_PROJETO - fotos.length;

  function escolher(event: ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(event.target.files ?? []);
    setErro(null);

    if (escolhidos.length === 0) {
      setArquivos([]);

      return;
    }

    const queixa = recusarFotos(escolhidos, vagas);

    if (queixa !== null) {
      setErro(queixa);
      setArquivos([]);

      return;
    }

    setArquivos(escolhidos);
  }

  async function enviar() {
    if (arquivos.length === 0) {
      setErro("Escolha ao menos uma imagem.");

      return;
    }

    if (descricao.trim() === "") {
      setErro("Descreva a imagem — é o que o leitor de tela anuncia.");

      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      // Uma requisição por foto: a API recebe um arquivo por vez, e em série
      // para não disputar o limite de 8 com ela mesma — duas chamadas
      // simultâneas poderiam passar pela contagem antes de qualquer gravação.
      for (const [indice, item] of arquivos.entries()) {
        setProgresso(arquivos.length > 1 ? `Enviando ${indice + 1} de ${arquivos.length}…` : null);
        await enviarFotoDoProjeto(projectId, item, descricao.trim());
      }

      toast.success(
        arquivos.length > 1 ? `${arquivos.length} fotos adicionadas.` : "Foto adicionada.",
      );

      setArquivos([]);
      setDescricao("");
      setProgresso(null);

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

      // Num lote, a falha pode vir depois de algumas terem entrado. Recarregar
      // mesmo no erro é o que mostra na lista o que de fato foi gravado, em
      // vez de deixar a tela mentindo que nada aconteceu.
      onChanged();
    } finally {
      setEnviando(false);
      setProgresso(null);
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
        entram na galeria. Até {FOTOS_POR_PROJETO} fotos, de até 2 MB cada — dá para escolher várias
        de uma vez.
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

              {/*
                <div>, e não <form>: este bloco é desenhado dentro do
                formulário do projeto, e formulário aninhado não existe em
                HTML. O React mantém o aninhamento no DOM, e o submit do
                interno acabava recarregando a página com os campos na URL em
                vez de enviar a foto.
              */}
              <div className={styles.itemCampos}>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={ocupada === foto.id}
                    onClick={(event) => {
                      const bloco = event.currentTarget.closest(`.${styles.itemCampos}`);
                      const alt = bloco?.querySelector<HTMLInputElement>('input[name="alt"]');
                      const posicao =
                        bloco?.querySelector<HTMLInputElement>('input[name="position"]');
                      void salvar(foto, alt?.value ?? "", Number(posicao?.value ?? indice));
                    }}
                  >
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
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.vazio}>Nenhuma foto ainda.</p>
      )}

      {vagas > 0 ? (
        <div className={styles.envio}>
          <label className={styles.campoArquivo}>
            <span className={styles.campoArquivoLabel}>
              {vagas === FOTOS_POR_PROJETO ? "Novas fotos" : `Novas fotos (cabem mais ${vagas})`}
            </span>
            <input
              ref={campoArquivo}
              type="file"
              multiple
              accept={FOTO_TIPOS_ACEITOS.join(",")}
              onChange={escolher}
              className={styles.arquivo}
            />
          </label>

          {arquivos.length > 1 ? (
            <p className={styles.ajuda}>
              {arquivos.length} imagens escolhidas. Elas entram na ordem em que aparecem acima.
            </p>
          ) : null}

          <Input
            label="Descrição da imagem"
            name="descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            hint={
              arquivos.length > 1
                ? "Vale para todas as imagens deste envio. Ajuste uma a uma na lista depois."
                : "O que se vê na tela, em poucas palavras."
            }
          />

          {erro !== null ? (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          ) : null}

          {/* <output> já anuncia: role="status" e aria-live="polite" são implícitos. */}
          {progresso !== null ? <output className={styles.ajuda}>{progresso}</output> : null}

          <Button
            type="button"
            size="sm"
            loading={enviando}
            disabled={arquivos.length === 0}
            onClick={() => void enviar()}
          >
            {enviando
              ? "Enviando"
              : arquivos.length > 1
                ? `Enviar ${arquivos.length} fotos`
                : "Enviar foto"}
          </Button>
        </div>
      ) : (
        <p className={styles.vazio}>
          Limite de {FOTOS_POR_PROJETO} fotos alcançado. Remova uma para enviar outra.
        </p>
      )}
    </section>
  );
}
