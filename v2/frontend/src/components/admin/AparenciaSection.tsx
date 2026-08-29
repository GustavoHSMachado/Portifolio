"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { contrasteDoDestaque, corValida, nivelWcag } from "@/lib/cores";
import { AJUSTES_PADRAO, type AjustesDoSite, revalidarHome, salvarAjustes } from "@/lib/portfolio";
import { useState } from "react";
import type { FormEvent } from "react";
import estilos from "./AparenciaSection.module.css";

/**
 * Aparência e textos da home.
 *
 * Uma cor só, e as outras quatro do tema saem dela. Pedir hover, active, fundo
 * sutil e anel de foco transferiria aritmética para quem edita, com boa chance
 * de sair incoerente.
 *
 * O contraste é medido enquanto a cor muda, antes de salvar. Cor bonita que
 * reprova em legibilidade é o erro mais fácil de cometer numa tela dessas e o
 * mais difícil de perceber depois — quem escolheu já sabe o que está escrito.
 * O aviso não bloqueia: o site é dele, e a medição informa em vez de proibir.
 */
export function AparenciaSection({
  ajustes,
  onSaved,
}: {
  ajustes: AjustesDoSite;
  onSaved: (novos: AjustesDoSite) => void;
}) {
  const toast = useToast();
  const [cor, setCor] = useState(ajustes.cor_destaque);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string[]>>({});

  const corOk = corValida(cor);
  const razao = corOk ? contrasteDoDestaque(cor) : 0;
  const nivel = nivelWcag(razao);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErros({});

    const form = new FormData(event.currentTarget);
    const texto = (chave: string) => String(form.get(chave) ?? "").trim();

    try {
      const resposta = await salvarAjustes({
        cor_destaque: cor,
        lema: texto("lema"),
        projetos_titulo: texto("projetos_titulo"),
        projetos_subtitulo: texto("projetos_subtitulo"),
        experiencia_titulo: texto("experiencia_titulo"),
        experiencia_subtitulo: texto("experiencia_subtitulo"),
        formacao_titulo: texto("formacao_titulo"),
        formacao_subtitulo: texto("formacao_subtitulo"),
        tecnologias_titulo: texto("tecnologias_titulo"),
        tecnologias_subtitulo: texto("tecnologias_subtitulo"),
        mensagem_titulo: texto("mensagem_titulo"),
        mensagem_subtitulo: texto("mensagem_subtitulo"),
        contato_titulo: texto("contato_titulo"),
      });

      onSaved(resposta.data.settings);
      setCor(resposta.data.settings.cor_destaque);

      // A home é renderizada no servidor e cacheada: sem avisar, a mudança só
      // apareceria no próximo ciclo, e quem acabou de salvar acharia que falhou.
      await revalidarHome();

      toast.success("Aparência salva. Já vale na home.");
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setErros(error.fieldErrors);

        return;
      }
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível salvar os ajustes.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={estilos.form}>
      <fieldset className={estilos.bloco}>
        <legend className={estilos.legenda}>Cor de destaque</legend>

        <p className={estilos.ajuda}>
          Vale para links, rótulos de seção, botões e ícones. As variações de hover, clique e fundo
          são calculadas a partir dela.
        </p>

        <div className={estilos.corLinha}>
          {/*
            Dois controles para o mesmo valor: o seletor nativo para escolher no
            olho e o campo de texto para colar um código que já se tem em mãos.
          */}
          <input
            type="color"
            className={estilos.corSeletor}
            value={corOk ? cor : AJUSTES_PADRAO.cor_destaque}
            onChange={(e) => setCor(e.target.value)}
            aria-label="Escolher a cor de destaque"
          />

          <Input
            label="Código da cor"
            name="cor_destaque_texto"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            error={erros.cor_destaque?.[0] ?? (corOk ? undefined : "Use o formato #rrggbb.")}
            spellCheck={false}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCor(AJUSTES_PADRAO.cor_destaque)}
          >
            Voltar ao padrão
          </Button>
        </div>

        {corOk ? <Medicao cor={cor} razao={razao} nivel={nivel} /> : null}
      </fieldset>

      <fieldset className={estilos.bloco}>
        <legend className={estilos.legenda}>Textos da home</legend>

        <p className={estilos.ajuda}>
          Deixe um campo em branco para voltar ao texto padrão. Subtítulo vazio some da página em
          vez de aparecer como linha em branco.
        </p>

        <Input
          label="Frase da faixa no rodapé"
          name="lema"
          defaultValue={ajustes.lema}
          error={erros.lema?.[0]}
        />

        <div className={estilos.grade}>
          <Input
            label="Projetos — título"
            name="projetos_titulo"
            defaultValue={ajustes.projetos_titulo}
            error={erros.projetos_titulo?.[0]}
          />
          <Input
            label="Projetos — subtítulo"
            name="projetos_subtitulo"
            defaultValue={ajustes.projetos_subtitulo}
            error={erros.projetos_subtitulo?.[0]}
          />
          <Input
            label="Experiência — título"
            name="experiencia_titulo"
            defaultValue={ajustes.experiencia_titulo}
            error={erros.experiencia_titulo?.[0]}
          />
          <Input
            label="Experiência — subtítulo"
            name="experiencia_subtitulo"
            defaultValue={ajustes.experiencia_subtitulo}
            error={erros.experiencia_subtitulo?.[0]}
          />
          <Input
            label="Formação — título"
            name="formacao_titulo"
            defaultValue={ajustes.formacao_titulo}
            error={erros.formacao_titulo?.[0]}
          />
          <Input
            label="Formação — subtítulo"
            name="formacao_subtitulo"
            defaultValue={ajustes.formacao_subtitulo}
            error={erros.formacao_subtitulo?.[0]}
          />
          <Input
            label="Tecnologias — título"
            name="tecnologias_titulo"
            defaultValue={ajustes.tecnologias_titulo}
            error={erros.tecnologias_titulo?.[0]}
          />
          <Input
            label="Tecnologias — subtítulo"
            name="tecnologias_subtitulo"
            defaultValue={ajustes.tecnologias_subtitulo}
            error={erros.tecnologias_subtitulo?.[0]}
          />
          <Input
            label="Mensagem — título"
            name="mensagem_titulo"
            defaultValue={ajustes.mensagem_titulo}
            error={erros.mensagem_titulo?.[0]}
          />
          <Input
            label="Mensagem — subtítulo"
            name="mensagem_subtitulo"
            defaultValue={ajustes.mensagem_subtitulo}
            error={erros.mensagem_subtitulo?.[0]}
          />
          <Input
            label="Contato — título"
            name="contato_titulo"
            defaultValue={ajustes.contato_titulo}
            error={erros.contato_titulo?.[0]}
          />
        </div>
      </fieldset>

      <Button type="submit" loading={salvando} disabled={!corOk}>
        Salvar aparência
      </Button>
    </form>
  );
}

/**
 * O contraste medido, com uma amostra ao lado.
 *
 * O número sozinho não diz nada a quem não conhece a WCAG, e a amostra sozinha
 * engana — texto pequeno sobre fundo escuro parece legível bem depois do ponto
 * em que deixa de ser para muita gente. Os dois juntos dão a resposta.
 */
function Medicao({
  cor,
  razao,
  nivel,
}: {
  cor: string;
  razao: number;
  nivel: "AAA" | "AA" | "reprovado";
}) {
  const classe =
    nivel === "reprovado"
      ? estilos.medicaoRuim
      : nivel === "AA"
        ? estilos.medicaoOk
        : estilos.medicaoBoa;

  return (
    <div className={classe}>
      <p className={estilos.amostra} style={{ color: cor }}>
        Assim fica um link no site
      </p>

      <p className={estilos.medicaoTexto}>
        Contraste de <strong>{razao.toFixed(1)}:1</strong>{" "}
        {nivel === "reprovado"
          ? "— abaixo dos 4,5:1 que a acessibilidade exige para texto. Quem tem baixa visão pode não conseguir ler os links."
          : nivel === "AA"
            ? "— passa no nível AA. Confortável para a maioria."
            : "— passa no nível AAA, o mais exigente."}
      </p>
    </div>
  );
}
