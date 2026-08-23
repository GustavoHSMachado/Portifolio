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
  /**
   * Quantos projetos existem, sem dizer quais.
   *
   * O endpoint público deixou de devolver os projetos em 23/08/2026: eles
   * exigem sessão. O número é o que a home usa para convidar quem chega.
   */
  projectCount: number;
}

/**
 * Conteúdo público, buscado durante a renderização no servidor.
 *
 * Não passa pelo cliente de API: aquele cuida de token e renovação de sessão,
 * que não existem aqui. Roda dentro da rede do compose, onde o endereço da API
 * é o nome do serviço — localhost seria o próprio container do web.
 *
 * O resultado é revalidado a cada minuto. Conteúdo salvo no painel aparece no
 * site em até 60 segundos, e em troca a página é servida pronta: o texto está
 * no HTML, o que importa tanto para buscadores quanto para o tempo até a
 * primeira pintura.
 */
export async function fetchContent(): Promise<PortfolioContent> {
  const base =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const response = await fetch(`${base}/api/v1/content`, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`A API respondeu ${response.status} ao buscar o conteúdo.`);
  }

  const body = (await response.json()) as { data: PortfolioContent };

  return body.data;
}

const EMPTY_CONTENT: PortfolioContent = {
  profile: null,
  education: [],
  experiences: [],
  skills: [],
  projectCount: 0,
};

/**
 * Mesma busca, mas que não derruba a renderização.
 *
 * A home é gerada no build e revalidada a cada 60 segundos. Com fetchContent
 * puro, uma API fora do ar no momento do build aborta a geração da página e,
 * por consequência, a imagem de produção inteira — foi o que aconteceu ao
 * construir a imagem, onde a API sequer existe. Aqui a falha vira conteúdo
 * vazio: a página sai no ar, e a primeira revalidação bem-sucedida a preenche.
 *
 * Em contrapartida, uma API fora do ar publica uma home vazia por até um ciclo
 * de revalidação. É o troco por não deixar o site inteiro fora do ar junto.
 */
export async function fetchContentSafe(): Promise<PortfolioContent> {
  try {
    return await fetchContent();
  } catch (error) {
    console.error("Conteúdo indisponível ao renderizar; seguindo com a home vazia.", error);
    return EMPTY_CONTENT;
  }
}

/** Conteúdo do painel: inclui rascunhos. Exige papel de admin. */
/**
 * O painel administrativo enxerga os projetos, inclusive os não publicados —
 * é onde eles são editados. Daí um tipo próprio: o conteúdo público perdeu a
 * lista quando os projetos passaram a exigir sessão.
 */
export interface AdminContent extends Omit<PortfolioContent, "projectCount"> {
  projects: Project[];
}

export function fetchAdminContent() {
  return api.get<AdminContent>("/api/v1/admin/content");
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

/**
 * Projetos completos, para quem tem sessão.
 *
 * Roda no cliente, e não na renderização do servidor: o token de acesso vive na
 * memória do navegador — nunca em cookie legível nem em armazenamento local —,
 * e o servidor que monta a página não tem como alcançá-lo.
 */
export async function fetchProjects(): Promise<Project[]> {
  const result = await api.get<{ projects: Project[] }>("/api/v1/projects");

  return result.data.projects;
}

/* ------------------------------------------------------------------ */
/* Acompanhamento — só para o administrador                            */
/* ------------------------------------------------------------------ */

export interface ContaCadastrada {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  lastLoginAt: string | null;
  locked: boolean;
  createdAt: string;
  deleted: boolean;
}

export interface EventoAuditoria {
  id: number;
  event: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ResumoEvento {
  event: string;
  total: number;
  ultimo: string;
}

export function fetchUsuarios() {
  return api.get<{ users: ContaCadastrada[] }>("/api/v1/admin/users");
}

/** Impede a conta de entrar. Não apaga nada e é reversível por liberarConta. */
export function bloquearConta(id: number) {
  return api.post<{ id: number }>(`/api/v1/admin/users/${id}/lock`);
}

export function liberarConta(id: number) {
  return api.post<{ id: number }>(`/api/v1/admin/users/${id}/unlock`);
}

/** Anonimiza os dados pessoais e mantém a linha, para o histórico não ficar órfão. */
export function excluirConta(id: number) {
  return api.delete<{ id: number }>(`/api/v1/admin/users/${id}`);
}

export function fetchAuditoria(evento?: string) {
  const query = evento ? `?event=${encodeURIComponent(evento)}` : "";

  return api.get<{ events: EventoAuditoria[]; summary: ResumoEvento[] }>(
    `/api/v1/admin/audit${query}`,
  );
}
