<!--
  Padrão obrigatório de PR do projeto Portifolio.
  PR que não preencher estas seções será devolvido na revisão.
  Contexto completo em: CONTEXTO-DO-PROJETO.md
-->

## Issue relacionada

<!-- Use "Closes #N" para fechar automaticamente no merge, ou "Refs #N" se for parcial. -->

Closes #

**Tipo:** <!-- Correção | Melhoria | Nova função -->

---

## O que mudou

<!--
  Descreva a mudança em termos de comportamento observável, não de arquivos tocados.
  Ruim:  "Alterado AuthService.php e 3 arquivos"
  Bom:   "Login agora bloqueia a conta por 15 min após 5 tentativas falhas"
-->

-

### Decisões técnicas

<!-- Alternativas consideradas e por que esta foi escolhida. Se não houve escolha relevante, escreva "N/A". -->

-

---

## Como foi validado

<!-- Evidência concreta. "Testei localmente" não é validação. -->

- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração adicionados/atualizados
- [ ] Teste E2E cobrindo o fluxo
- [ ] Verificado manualmente em: <!-- navegador/dispositivo -->
- [ ] Verificado com `prefers-reduced-motion: reduce`
- [ ] Verificado navegação por teclado e leitor de tela
- [ ] Verificado em viewport mobile (≤ 640px)

**Comandos executados:**

```bash

```

**Resultado:**

<!-- Cole a saída relevante, um screenshot ou um GIF do fluxo. -->

---

## Riscos e limitações

<!-- O que pode quebrar. O que ficou de fora. O que não foi testado. Seja honesto — isto é o que o revisor mais precisa saber. -->

-

### Impacto

- [ ] Requer migração de banco
- [ ] Requer nova variável de ambiente <!-- se sim, .env.example foi atualizado? -->
- [ ] Quebra compatibilidade da API
- [ ] Afeta autenticação, autorização ou dados sensíveis
- [ ] Afeta performance de forma mensurável

### Plano de rollback

<!-- Como reverter se der errado em produção. -->

---

## Próximos passos

<!-- O que fica para uma próxima issue. Crie a issue e referencie aqui. -->

-

---

## Checklist do autor

- [ ] O código segue os padrões descritos em `CONTEXTO-DO-PROJETO.md`
- [ ] Nenhum segredo, token ou credencial foi commitado
- [ ] `.env.example` atualizado se novas variáveis foram criadas
- [ ] Documentação atualizada junto com a mudança
- [ ] Não reconstruí um componente que já existia em `src/components/ui`
- [ ] Estados de loading, vazio e erro foram tratados na interface
- [ ] CI verde
