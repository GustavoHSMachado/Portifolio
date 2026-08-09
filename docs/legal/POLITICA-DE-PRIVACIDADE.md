> ## ⚠️ MINUTA — NÃO PUBLICAR SEM REVISÃO JURÍDICA
>
> Este é um rascunho técnico redigido a partir do que o sistema efetivamente
> coleta e faz com os dados. **Não é aconselhamento jurídico.** Antes de ir ao
> ar, precisa de revisão e aprovação de advogado, que deve conferir:
>
> - se as bases legais escolhidas são as adequadas ao caso concreto;
> - os prazos de retenção à luz de obrigações legais aplicáveis;
> - a necessidade (ou não) de nomear encarregado de dados formalmente;
> - a redação dos direitos do titular e dos canais de exercício.
>
> Campos marcados com `[PREENCHER]` dependem de decisão sua.

---

# Política de Privacidade

**Versão:** 1.0.0
**Vigente desde:** `[PREENCHER — data de publicação]`
**Última atualização:** 09/08/2026

---

## 1. Quem somos

Este site é um portfólio pessoal mantido por **Gustavo Henrique Santos Machado**,
pessoa física, doravante "nós".

**Contato para assuntos de privacidade:** `[PREENCHER — e-mail dedicado]`

Tratamos dados pessoais em conformidade com a **Lei nº 13.709/2018 (LGPD)**.

---

## 2. Quais dados coletamos

Coletamos apenas o necessário para operar a área autenticada. Não há coleta
oculta, não vendemos dados e não há publicidade comportamental.

### 2.1 Dados que você fornece

| Dado | Quando | Por quê |
|---|---|---|
| Nome completo | No cadastro | Identificar você na interface |
| E-mail | No cadastro | Identificar a conta, autenticar e enviar mensagens transacionais |
| Telefone | No cadastro | Contato, quando aplicável |
| Senha | No cadastro e na troca | Autenticação |

**Sobre a senha:** ela **nunca** é armazenada como você a digitou. Guardamos
apenas um *hash* criptográfico irreversível (Argon2id). Nem nós conseguimos
descobrir sua senha — por isso a recuperação cria uma nova, em vez de reenviar
a antiga.

### 2.2 Dados coletados automaticamente

| Dado | Por quê | Retenção |
|---|---|---|
| Endereço IP | Segurança: limitar tentativas de acesso e detectar abuso | 12 meses |
| Navegador e sistema (user agent) | Identificar sessões e detectar acesso suspeito | Enquanto a sessão existir |
| Data e hora de acesso e de eventos da conta | Trilha de auditoria de segurança | 12 meses |

### 2.3 O que NÃO coletamos

- Dados pessoais sensíveis (origem racial ou étnica, convicção religiosa,
  opinião política, filiação sindical, dados de saúde, vida sexual, dados
  genéticos ou biométricos).
- Dados de crianças e adolescentes. **O serviço não se destina a menores de 18
  anos.** Se identificarmos um cadastro de menor, a conta será excluída.
- Dados de geolocalização precisa.
- Dados de pagamento — o serviço é gratuito e não processa pagamentos.

---

## 3. Cookies

Usamos **apenas cookies estritamente necessários**. Não há cookies de análise,
publicidade ou rastreamento de terceiros — por isso não exibimos banner de
consentimento de cookies.

| Cookie | Finalidade | Duração |
|---|---|---|
| `portifolio_refresh` | Manter você conectado entre visitas | 30 dias |

Esse cookie é `HttpOnly` (inacessível a JavaScript), `Secure` (só trafega em
HTTPS) e `SameSite=Strict` (não é enviado em requisições vindas de outros
sites). Essas três características existem para reduzir o risco de roubo de
sessão.

---

## 4. Bases legais do tratamento

| Finalidade | Base legal (LGPD art. 7º) |
|---|---|
| Criar e manter sua conta | Execução de contrato (inciso V) |
| Autenticar acessos | Execução de contrato (inciso V) |
| Enviar e-mails transacionais (confirmação, redefinição de senha, aviso de alteração) | Execução de contrato (inciso V) |
| Registrar IP e tentativas de acesso | Legítimo interesse em segurança (inciso IX) |
| Registrar o aceite desta política e dos Termos | Cumprimento de obrigação legal (inciso II) |

**Sobre o legítimo interesse:** registrar IP e tentativas de login serve para
impedir ataques de força bruta contra a sua conta. Avaliamos que o benefício de
segurança para você supera o impacto do registro, que é mínimo, temporário e não
usado para qualquer forma de perfilamento.

---

## 5. Com quem compartilhamos

Não vendemos, alugamos nem cedemos seus dados. O compartilhamento se limita aos
operadores necessários para o serviço funcionar:

| Operador | O que recebe | Para quê |
|---|---|---|
| `[PREENCHER — provedor de hospedagem]` | Todos os dados armazenados | Hospedar aplicação e banco |
| `[PREENCHER — provedor de e-mail]` | Seu e-mail e o conteúdo da mensagem | Entregar e-mails transacionais |
| Sentry *(se ativado)* | Dados técnicos do erro, sem dados pessoais | Diagnóstico de falhas |

Podemos divulgar dados quando houver **ordem judicial** ou **requisição de
autoridade competente**, nos limites da lei.

`[PREENCHER: se algum operador estiver fora do Brasil, é necessário descrever a
transferência internacional e a salvaguarda adotada — LGPD art. 33.]`

---

## 6. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Dados da conta | Enquanto a conta existir |
| Após pedido de exclusão | Removidos em até 30 dias |
| Logs de segurança e IP | 12 meses |
| Registro de aceite dos Termos | 5 anos após o encerramento da conta |
| Tokens de confirmação e redefinição | Expiram em 60 e 30 minutos; purgados em 7 dias |

O registro de aceite é mantido após a exclusão porque é a prova de que houve
consentimento — apagá-lo eliminaria justamente a evidência que a lei exige.

---

## 7. Seus direitos

A LGPD (art. 18) garante a você:

- **Confirmação e acesso** — saber se tratamos seus dados e obter cópia.
- **Correção** — corrigir dados incompletos ou desatualizados.
- **Anonimização, bloqueio ou eliminação** — de dados desnecessários ou tratados em desconformidade.
- **Portabilidade** — receber seus dados em formato estruturado.
- **Eliminação** — excluir os dados tratados com base em consentimento.
- **Informação sobre compartilhamento** — saber com quem compartilhamos.
- **Revogação do consentimento** — a qualquer momento.
- **Oposição** — a tratamento feito com base em legítimo interesse.

**Como exercer:** escreva para `[PREENCHER — e-mail]`. Respondemos em até **15
dias**. Podemos pedir informações que confirmem sua identidade — é uma proteção
para que ninguém acesse seus dados se passando por você.

Você também pode reclamar à **Autoridade Nacional de Proteção de Dados (ANPD)**:
https://www.gov.br/anpd

---

## 8. Como protegemos seus dados

- Senhas em hash Argon2id, jamais em texto legível.
- Todo o tráfego em HTTPS.
- Tokens de sessão de curta duração, rotativos, com detecção de reuso.
- Tokens de e-mail de uso único, com expiração, armazenados apenas como hash.
- Limite de tentativas de login e bloqueio temporário da conta.
- Consultas ao banco parametrizadas, contra injeção de SQL.
- Logs com remoção automática de senhas e tokens.
- Análise de segurança automatizada a cada alteração de código.

**Sendo transparente:** nenhuma medida elimina o risco por completo. Em caso de
incidente que possa gerar risco relevante a você, comunicaremos você e a ANPD,
conforme o art. 48 da LGPD.

---

## 9. Alterações nesta política

Se alterarmos esta política de forma relevante, avisaremos por e-mail e pediremos
novo aceite no próximo acesso. A versão e a data no topo indicam sempre o texto
vigente. Versões anteriores ficam disponíveis mediante solicitação.

---

## 10. Contato

**Responsável pelo tratamento:** Gustavo Henrique Santos Machado
**E-mail:** `[PREENCHER]`

---

*Última revisão técnica: 09/08/2026. Revisão jurídica: pendente.*
