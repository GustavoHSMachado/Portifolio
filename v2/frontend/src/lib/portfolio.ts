import { api } from "@/lib/api";

/**
 * Conteúdo do portfólio.
 *
 * Os tipos espelham o que a API devolve. Nada de `any`: um campo renomeado no
 * backend precisa quebrar o build aqui, e não aparecer como "undefined" na
 * tela de quem estiver visitando.
 */

export type EducationLevel =
  | "tecnico"
  | "graduacao"
  | "pos_graduacao"
  | "mestrado"
  | "doutorado"
  | "curso";

export type EducationStatus = "concluido" | "em_andamento";

export interface Profile {
  fullName: string;
  shortName: string;
  role: string;
  headline: string;
  objective: string | null;
  summary: string;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  whatsappUrl: string | null;
  resumePath: string | null;
  introVideoId: string | null;
  introVideoCaption: string | null;
}

export interface Education {
  id: number;
  course: string;
  institution: string;
  level: EducationLevel;
  status: EducationStatus;
  /** AAAA-MM — o currículo tem precisão de mês. */
  completedAt: string | null;
}

export interface Experience {
  id: number;
  company: string;
  role: string;
  description: string;
  startedAt: string | null;
  endedAt: string | null;
  current: boolean;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  evidence: string | null;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  summary: string;
  problem: string | null;
  decisions: string | null;
  result: string | null;
  stack: string[];
  repositoryUrl: string | null;
  demoUrl: string | null;
  published: boolean;
  position: number;
}

export interface PortfolioContent {
  profile: Profile | null;
  education: Education[];
  experiences: Experience[];
  skills: Skill[];
  projects: Project[];
}

/** Conteúdo do painel: inclui rascunhos. Exige papel de admin. */
export function fetchAdminContent() {
  return api.get<PortfolioContent>("/api/v1/admin/content");
}

export type Collection = "education" | "experiences" | "skills" | "projects";

export function saveProfile(profile: Omit<Profile, "resumePath">) {
  return api.put<Profile>("/api/v1/admin/profile", profile);
}

/** Cria quando o id é nulo, atualiza quando existe. */
export function saveItem(collection: Collection, id: number | null, body: unknown) {
  return id === null
    ? api.post<{ id: number }>(`/api/v1/admin/${collection}`, body)
    : api.put<{ id: number }>(`/api/v1/admin/${collection}/${id}`, body);
}

export function deleteItem(collection: Collection, id: number) {
  return api.delete<null>(`/api/v1/admin/${collection}/${id}`);
}

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2025-03" vira "março de 2025". */
export function formatMonth(value: string | null): string {
  if (!value) return "";

  const [year, month] = value.split("-");
  const index = Number(month) - 1;

  return MESES[index] && year ? `${MESES[index]} de ${year}` : value;
}

/** Período legível, com "atual" quando não há data de saída. */
export function formatPeriod(startedAt: string | null, endedAt: string | null): string {
  const inicio = formatMonth(startedAt);

  return endedAt ? `${inicio} — ${formatMonth(endedAt)}` : `${inicio} — atual`;
}

export const EDUCATION_LEVELS: Record<EducationLevel, string> = {
  tecnico: "Técnico",
  graduacao: "Graduação",
  pos_graduacao: "Pós-graduação",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
  curso: "Curso",
};
