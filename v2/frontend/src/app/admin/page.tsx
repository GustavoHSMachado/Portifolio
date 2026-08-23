"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import {
  type AdminContent,
  type Collection,
  EDUCATION_LEVELS,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type Skill,
  deleteItem,
  fetchAdminContent,
  formatPeriod,
  saveItem,
  saveProfile,
} from "@/lib/portfolio";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import styles from "./page.module.css";

/**
 * Painel de conteúdo do portfólio.
 *
 * Existe para o conteúdo profissional ser editado sem deploy. O acesso é
 * verificado no servidor por RequireAdmin — o useRequireAuth aqui é
 * conveniência de navegação, e não o controle de acesso: esconder a tela no
 * front nunca protegeu endpoint nenhum.
 */
export default function AdminPage() {
  const { loading: checkingSession } = useRequireAuth({ adminOnly: true });
  const toast = useToast();

  const [content, setContent] = useState<AdminContent | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await fetchAdminContent();
      setContent(result.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        // O servidor já barrou. Nada a fazer além de informar.
        return;
      }
      toast.error("Não foi possível carregar o conteúdo.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (checkingSession) return;
    void reload();
  }, [checkingSession, reload]);

  if (checkingSession || loading) {
    return (
      <main id="conteudo" className={styles.page}>
        <div className={styles.container}>
          <LoadingRegion label="Carregando o painel de conteúdo">
            <Skeleton height="2.5rem" width="40%" />
            <div className={styles.skeletonStack}>
              <Skeleton height={160} radius="var(--radius-lg)" />
              <Skeleton height={200} radius="var(--radius-lg)" delay={80} />
            </div>
          </LoadingRegion>
        </div>
      </main>
    );
  }

  if (!content) {
    return (
      <main id="conteudo" className={styles.page}>
        <div className={styles.container}>
          <p className={styles.empty}>Conteúdo indisponível. Recarregue a página.</p>
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className={styles.page}>
      <motion.div
        className={styles.container}
        variants={staggerContainer(6)}
        initial="hidden"
        animate="visible"
      >
        <motion.header className={styles.header} variants={fadeInUp}>
          <div>
            <p className={styles.eyebrow}>Painel</p>
            <h1 className={styles.title}>Conteúdo do portfólio</h1>
            <p className={styles.subtitle}>
              O que você editar aqui aparece no site imediatamente, sem novo deploy.
            </p>
          </div>
          <Link href="/painel" className={styles.backLink}>
            Voltar ao painel
          </Link>
        </motion.header>

        <ProfileSection profile={content.profile} onSaved={reload} />

        <EducationSection items={content.education} onChanged={reload} />

        <ExperienceSection items={content.experiences} onChanged={reload} />

        <SkillSection items={content.skills} onChanged={reload} />

        <ProjectSection items={content.projects} onChanged={reload} />
      </motion.div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Apoio                                                               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section className={styles.section} variants={fadeInUp}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

/** Converte o 422 da API em erros por campo, e o resto em mensagem única. */
function useSubmit(onDone: () => Promise<void>) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit(action: () => Promise<unknown>, successMessage: string) {
    if (saving) return false;

    setSaving(true);
    setFieldErrors({});

    try {
      await action();
      await onDone();
      toast.success(successMessage);

      return true;
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setFieldErrors(error.fieldErrors);
      } else {
        toast.error(
          error instanceof ApiError ? error.message : "Não foi possível salvar. Tente novamente.",
        );
      }

      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, fieldErrors, submit };
}

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

function ProfileSection({
  profile,
  onSaved,
}: {
  profile: Profile | null;
  onSaved: () => Promise<void>;
}) {
  const { saving, fieldErrors, submit } = useSubmit(onSaved);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();

    await submit(
      () =>
        saveProfile({
          fullName: value("fullName"),
          shortName: value("shortName"),
          role: value("role"),
          headline: value("headline"),
          objective: value("objective") || null,
          summary: value("summary"),
          city: value("city") || null,
          state: value("state") || null,
          websiteUrl: value("websiteUrl") || null,
          githubUrl: value("githubUrl") || null,
          linkedinUrl: value("linkedinUrl") || null,
          whatsappUrl: value("whatsappUrl") || null,
          introVideoId: value("introVideoId") || null,
          introVideoCaption: value("introVideoCaption") || null,
        }),
      "Perfil atualizado.",
    );
  }

  return (
    <Section
      title="Perfil"
      description="Nome, posicionamento e canais de contato. Endereço e data de nascimento ficam fora do site por decisão de privacidade."
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid2}>
          <Input
            label="Nome completo"
            name="fullName"
            defaultValue={profile?.fullName ?? ""}
            error={fieldErrors.fullName?.[0]}
            required
          />
          <Input
            label="Nome curto"
            name="shortName"
            defaultValue={profile?.shortName ?? ""}
            error={fieldErrors.shortName?.[0]}
            required
          />
          <Input
            label="Cargo"
            name="role"
            defaultValue={profile?.role ?? ""}
            error={fieldErrors.role?.[0]}
            required
          />
          <Input
            label="Chamada"
            name="headline"
            defaultValue={profile?.headline ?? ""}
            error={fieldErrors.headline?.[0]}
            required
          />
        </div>

        <Input
          label="Objetivo"
          name="objective"
          defaultValue={profile?.objective ?? ""}
          error={fieldErrors.objective?.[0]}
        />

        <label className={styles.textareaField}>
          <span className={styles.textareaLabel}>Resumo profissional</span>
          <textarea
            name="summary"
            className={styles.textarea}
            rows={6}
            defaultValue={profile?.summary ?? ""}
            required
          />
        </label>

        <div className={styles.grid2}>
          <Input label="Cidade" name="city" defaultValue={profile?.city ?? ""} />
          <Input
            label="Estado"
            name="state"
            maxLength={2}
            defaultValue={profile?.state ?? ""}
            hint="Sigla, dois caracteres."
          />
          <Input
            label="Site"
            name="websiteUrl"
            type="url"
            defaultValue={profile?.websiteUrl ?? ""}
            error={fieldErrors.websiteUrl?.[0]}
          />
          <Input
            label="GitHub"
            name="githubUrl"
            type="url"
            defaultValue={profile?.githubUrl ?? ""}
            error={fieldErrors.githubUrl?.[0]}
          />
          <Input
            label="LinkedIn"
            name="linkedinUrl"
            type="url"
            defaultValue={profile?.linkedinUrl ?? ""}
            error={fieldErrors.linkedinUrl?.[0]}
          />
          <Input
            label="WhatsApp"
            name="whatsappUrl"
            type="url"
            defaultValue={profile?.whatsappUrl ?? ""}
            error={fieldErrors.whatsappUrl?.[0]}
            hint="Link wa.me — o número não aparece escrito na página."
          />
          <Input
            label="Vídeo de apresentação"
            name="introVideoId"
            defaultValue={profile?.introVideoId ?? ""}
            error={fieldErrors.introVideoId?.[0]}
            hint="Só o identificador do YouTube, não a URL inteira."
          />
          <Input
            label="Legenda do vídeo"
            name="introVideoCaption"
            defaultValue={profile?.introVideoCaption ?? ""}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" loading={saving}>
            {saving ? "Salvando" : "Salvar perfil"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Coleções                                                            */
/* ------------------------------------------------------------------ */

function DeleteButton({
  collection,
  id,
  label,
  onDeleted,
}: {
  collection: Collection;
  id: number;
  label: string;
  onDeleted: () => Promise<void>;
}) {
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);

      return;
    }

    setRemoving(true);

    try {
      await deleteItem(collection, id);
      await onDeleted();
      toast.success(`${label} removido.`);
    } catch {
      toast.error("Não foi possível remover.");
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <Button
      type="button"
      variant={confirming ? "danger" : "ghost"}
      size="sm"
      loading={removing}
      onClick={() => void handleDelete()}
    >
      {confirming ? "Confirmar exclusão" : "Remover"}
    </Button>
  );
}

function EducationSection({
  items,
  onChanged,
}: {
  items: Education[];
  onChanged: () => Promise<void>;
}) {
  const { saving, fieldErrors, submit } = useSubmit(onChanged);
  const [editing, setEditing] = useState<Education | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const ok = await submit(
      () =>
        saveItem("education", editing?.id ?? null, {
          course: String(form.get("course") ?? "").trim(),
          institution: String(form.get("institution") ?? "").trim(),
          level: String(form.get("level") ?? ""),
          status: String(form.get("status") ?? ""),
          completedAt: String(form.get("completedAt") ?? ""),
          position: Number(form.get("position") ?? 0),
        }),
      editing ? "Formação atualizada." : "Formação adicionada.",
    );

    if (ok) {
      setOpen(false);
      setEditing(null);
    }
  }

  return (
    <Section title="Formação" description="Cursos, do mais recente para o mais antigo.">
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemBody}>
              <strong className={styles.itemTitle}>{item.course}</strong>
              <span className={styles.itemMeta}>
                {item.institution} · {EDUCATION_LEVELS[item.level]} ·{" "}
                {item.status === "concluido" ? "concluído" : "em andamento"}
              </span>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(item);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              <DeleteButton
                collection="education"
                id={item.id}
                label="Curso"
                onDeleted={onChanged}
              />
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className={styles.empty}>Nenhuma formação cadastrada.</li> : null}
      </ul>

      {open ? (
        <form onSubmit={handleSubmit} className={styles.inlineForm}>
          <div className={styles.grid2}>
            <Input
              label="Curso"
              name="course"
              defaultValue={editing?.course ?? ""}
              error={fieldErrors.course?.[0]}
              required
            />
            <Input
              label="Instituição"
              name="institution"
              defaultValue={editing?.institution ?? ""}
              error={fieldErrors.institution?.[0]}
              required
            />
            <label className={styles.selectField}>
              <span className={styles.textareaLabel}>Nível</span>
              <select
                name="level"
                className={styles.select}
                defaultValue={editing?.level ?? "graduacao"}
              >
                {Object.entries(EDUCATION_LEVELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.selectField}>
              <span className={styles.textareaLabel}>Situação</span>
              <select
                name="status"
                className={styles.select}
                defaultValue={editing?.status ?? "concluido"}
              >
                <option value="concluido">Concluído</option>
                <option value="em_andamento">Em andamento</option>
              </select>
            </label>
            <Input
              label="Conclusão"
              name="completedAt"
              placeholder="AAAA-MM"
              defaultValue={editing?.completedAt ?? ""}
              hint="Mês e ano, como 2025-12."
            />
          </div>
          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? "Salvando" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Adicionar formação
        </Button>
      )}
    </Section>
  );
}

function ExperienceSection({
  items,
  onChanged,
}: {
  items: Experience[];
  onChanged: () => Promise<void>;
}) {
  const { saving, fieldErrors, submit } = useSubmit(onChanged);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const ok = await submit(
      () =>
        saveItem("experiences", editing?.id ?? null, {
          company: String(form.get("company") ?? "").trim(),
          role: String(form.get("role") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          startedAt: String(form.get("startedAt") ?? ""),
          endedAt: String(form.get("endedAt") ?? ""),
          position: Number(form.get("position") ?? 0),
        }),
      editing ? "Experiência atualizada." : "Experiência adicionada.",
    );

    if (ok) {
      setOpen(false);
      setEditing(null);
    }
  }

  return (
    <Section
      title="Experiência"
      description="Deixe a saída em branco no emprego atual — é assim que o site sabe que ele continua."
    >
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemBody}>
              <strong className={styles.itemTitle}>
                {item.role} · {item.company}
              </strong>
              <span className={styles.itemMeta}>{formatPeriod(item.startedAt, item.endedAt)}</span>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(item);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              <DeleteButton
                collection="experiences"
                id={item.id}
                label="Experiência"
                onDeleted={onChanged}
              />
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className={styles.empty}>Nenhuma experiência cadastrada.</li>
        ) : null}
      </ul>

      {open ? (
        <form onSubmit={handleSubmit} className={styles.inlineForm}>
          <div className={styles.grid2}>
            <Input
              label="Empresa"
              name="company"
              defaultValue={editing?.company ?? ""}
              error={fieldErrors.company?.[0]}
              required
            />
            <Input
              label="Cargo"
              name="role"
              defaultValue={editing?.role ?? ""}
              error={fieldErrors.role?.[0]}
              required
            />
            <Input
              label="Entrada"
              name="startedAt"
              placeholder="AAAA-MM"
              defaultValue={editing?.startedAt ?? ""}
              error={fieldErrors.startedAt?.[0]}
              required
            />
            <Input
              label="Saída"
              name="endedAt"
              placeholder="AAAA-MM"
              defaultValue={editing?.endedAt ?? ""}
              error={fieldErrors.endedAt?.[0]}
              hint="Em branco significa emprego atual."
            />
          </div>
          <label className={styles.textareaField}>
            <span className={styles.textareaLabel}>Atividades</span>
            <textarea
              name="description"
              className={styles.textarea}
              rows={5}
              defaultValue={editing?.description ?? ""}
              required
            />
          </label>
          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? "Salvando" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Adicionar experiência
        </Button>
      )}
    </Section>
  );
}

function SkillSection({ items, onChanged }: { items: Skill[]; onChanged: () => Promise<void> }) {
  const { saving, fieldErrors, submit } = useSubmit(onChanged);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const ok = await submit(
      () =>
        saveItem("skills", editing?.id ?? null, {
          name: String(form.get("name") ?? "").trim(),
          category: String(form.get("category") ?? "").trim(),
          evidence: String(form.get("evidence") ?? "").trim(),
          position: Number(form.get("position") ?? 0),
        }),
      editing ? "Habilidade atualizada." : "Habilidade adicionada.",
    );

    if (ok) {
      setOpen(false);
      setEditing(null);
    }
  }

  return (
    <Section
      title="Habilidades"
      description="A evidência é onde a habilidade deixa de ser autodeclarada: diga onde você usou, não em que nível se considera."
    >
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemBody}>
              <strong className={styles.itemTitle}>{item.name}</strong>
              <span className={styles.itemMeta}>
                {item.category}
                {item.evidence ? ` · ${item.evidence}` : " · sem evidência"}
              </span>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(item);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              <DeleteButton
                collection="skills"
                id={item.id}
                label="Habilidade"
                onDeleted={onChanged}
              />
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className={styles.empty}>Nenhuma habilidade cadastrada.</li>
        ) : null}
      </ul>

      {open ? (
        <form onSubmit={handleSubmit} className={styles.inlineForm}>
          <div className={styles.grid2}>
            <Input
              label="Nome"
              name="name"
              defaultValue={editing?.name ?? ""}
              error={fieldErrors.name?.[0]}
              required
            />
            <Input
              label="Categoria"
              name="category"
              defaultValue={editing?.category ?? ""}
              error={fieldErrors.category?.[0]}
              required
            />
          </div>
          <Input
            label="Evidência"
            name="evidence"
            defaultValue={editing?.evidence ?? ""}
            error={fieldErrors.evidence?.[0]}
            hint="Ex.: API REST autoral com autenticação JWT."
          />
          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? "Salvando" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Adicionar habilidade
        </Button>
      )}
    </Section>
  );
}

function ProjectSection({
  items,
  onChanged,
}: { items: Project[]; onChanged: () => Promise<void> }) {
  const { saving, fieldErrors, submit } = useSubmit(onChanged);
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const stack = String(form.get("stack") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const ok = await submit(
      () =>
        saveItem("projects", editing?.id ?? null, {
          slug: String(form.get("slug") ?? "").trim(),
          title: String(form.get("title") ?? "").trim(),
          summary: String(form.get("summary") ?? "").trim(),
          problem: String(form.get("problem") ?? "").trim(),
          decisions: String(form.get("decisions") ?? "").trim(),
          result: String(form.get("result") ?? "").trim(),
          stack,
          repositoryUrl: String(form.get("repositoryUrl") ?? "").trim(),
          demoUrl: String(form.get("demoUrl") ?? "").trim(),
          published: form.get("published") === "on",
          position: Number(form.get("position") ?? 0),
        }),
      editing ? "Projeto atualizado." : "Projeto adicionado.",
    );

    if (ok) {
      setOpen(false);
      setEditing(null);
    }
  }

  return (
    <Section
      title="Projetos"
      description="Problema, decisões e resultado — é o que separa portfólio de lista de repositórios. Rascunhos não aparecem no site."
    >
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemBody}>
              <strong className={styles.itemTitle}>
                {item.title}
                {item.published ? null : <span className={styles.draft}>rascunho</span>}
              </strong>
              <span className={styles.itemMeta}>{item.summary}</span>
            </div>
            <div className={styles.itemActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(item);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              <DeleteButton
                collection="projects"
                id={item.id}
                label="Projeto"
                onDeleted={onChanged}
              />
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className={styles.empty}>Nenhum projeto cadastrado.</li> : null}
      </ul>

      {open ? (
        <form onSubmit={handleSubmit} className={styles.inlineForm}>
          <div className={styles.grid2}>
            <Input
              label="Título"
              name="title"
              defaultValue={editing?.title ?? ""}
              error={fieldErrors.title?.[0]}
              required
            />
            <Input
              label="Identificador na URL"
              name="slug"
              defaultValue={editing?.slug ?? ""}
              error={fieldErrors.slug?.[0]}
              hint="Letras, números e hífen."
              required
            />
            <Input
              label="Repositório"
              name="repositoryUrl"
              type="url"
              defaultValue={editing?.repositoryUrl ?? ""}
              error={fieldErrors.repositoryUrl?.[0]}
            />
            <Input
              label="Demonstração"
              name="demoUrl"
              type="url"
              defaultValue={editing?.demoUrl ?? ""}
              error={fieldErrors.demoUrl?.[0]}
            />
          </div>

          <Input
            label="Resumo"
            name="summary"
            defaultValue={editing?.summary ?? ""}
            error={fieldErrors.summary?.[0]}
            required
          />
          <Input
            label="Tecnologias"
            name="stack"
            defaultValue={editing?.stack.join(", ") ?? ""}
            hint="Separadas por vírgula."
          />

          <label className={styles.textareaField}>
            <span className={styles.textareaLabel}>Problema</span>
            <textarea
              name="problem"
              className={styles.textarea}
              rows={4}
              defaultValue={editing?.problem ?? ""}
            />
          </label>
          <label className={styles.textareaField}>
            <span className={styles.textareaLabel}>Decisões técnicas</span>
            <textarea
              name="decisions"
              className={styles.textarea}
              rows={4}
              defaultValue={editing?.decisions ?? ""}
            />
          </label>
          <label className={styles.textareaField}>
            <span className={styles.textareaLabel}>Resultado</span>
            <textarea
              name="result"
              className={styles.textarea}
              rows={4}
              defaultValue={editing?.result ?? ""}
            />
          </label>

          <label className={styles.checkboxRow}>
            <input type="checkbox" name="published" defaultChecked={editing?.published ?? false} />
            <span>Publicar no site</span>
          </label>

          <div className={styles.actions}>
            <Button type="submit" loading={saving}>
              {saving ? "Salvando" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Adicionar projeto
        </Button>
      )}
    </Section>
  );
}
