"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./ContactForm.module.css";

/**
 * Campo de sugestões e dúvidas.
 *
 * O envio é público — não exige conta — porque exigir cadastro para fazer uma
 * pergunta afasta justamente quem tem uma. Quem protege do robô é o rate limit
 * por IP na API, o tamanho mínimo da mensagem e o campo-armadilha abaixo.
 */
export function ContactForm() {
  const toast = useToast();

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;

    const form = new FormData(event.currentTarget);

    setEnviando(true);
    setErro(null);
    setErros({});

    try {
      await api.post(
        "/api/v1/messages",
        {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          subject: String(form.get("subject") ?? ""),
          body: String(form.get("body") ?? ""),
          website: String(form.get("website") ?? ""),
        },
        { skipAuth: true },
      );

      setEnviado(true);
      toast.success("Mensagem enviada. Obrigado pelo contato!");
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setErros(error.fieldErrors);
        return;
      }

      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className={styles.sucesso}>
        <p className={styles.sucessoTitulo}>Mensagem recebida.</p>
        <p className={styles.sucessoTexto}>
          Obrigado por escrever. Respondo no e-mail que você informou.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.linha}>
        <Input
          label="Seu nome"
          name="name"
          autoComplete="name"
          required
          disabled={enviando}
          error={erros.name?.[0]}
        />

        <Input
          label="Seu e-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          required
          disabled={enviando}
          error={erros.email?.[0]}
        />
      </div>

      <Input
        label="Assunto"
        name="subject"
        hint="Opcional."
        disabled={enviando}
        error={erros.subject?.[0]}
      />

      <div className={styles.campo}>
        <label className={styles.rotulo} htmlFor="mensagem">
          Sugestão ou dúvida
        </label>
        <textarea
          id="mensagem"
          name="body"
          className={styles.textarea}
          rows={5}
          required
          disabled={enviando}
          aria-describedby={erros.body?.[0] ? "mensagem-erro" : undefined}
        />
        {erros.body?.[0] ? (
          <p id="mensagem-erro" className={styles.erroCampo} role="alert">
            {erros.body[0]}
          </p>
        ) : null}
      </div>

      {/*
        Campo-armadilha: fica fora da tela e escondido do leitor de tela, então
        ninguém o vê nem tabula até ele. Robô que preenche todos os campos que
        encontra cai aqui, e a API descarta o envio sem avisar o motivo — dizer
        "você parece um robô" ensinaria o que ajustar na próxima tentativa.
      */}
      <div className={styles.armadilha} aria-hidden="true">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {erro ? (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <Button type="submit" loading={enviando}>
        {enviando ? "Enviando" : "Enviar mensagem"}
      </Button>
    </form>
  );
}
