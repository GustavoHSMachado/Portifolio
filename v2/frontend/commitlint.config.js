/**
 * Conventional Commits.
 * O tipo do commit alimenta o changelog e sinaliza a natureza da mudança —
 * os mesmos três eixos usados nas issues: correção, melhoria e nova função.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "fix", // Correção
        "feat", // Nova função
        "perf", // Melhoria de performance
        "refactor", // Melhoria interna sem mudar comportamento
        "docs",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
        "security", // Correção ou endurecimento de segurança
      ],
    ],
    "scope-enum": [
      2,
      "always",
      ["api", "web", "auth", "db", "ui", "motion", "ci", "docs", "deps", "infra"],
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [1, "always", 100],
  },
};
