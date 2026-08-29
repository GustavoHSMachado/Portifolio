import { LEGAL_UPDATED_AT, LEGAL_VERSIONS } from "@/lib/legal";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "../layout.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a LGPD.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/legal/politica-de-privacidade" },
};

export default function PoliticaDePrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>

      <div className={styles.meta}>
        <span>
          <strong>Versão</strong> {LEGAL_VERSIONS.privacy}
        </span>
        <span>
          <strong>Atualizado em</strong> {LEGAL_UPDATED_AT}
        </span>
      </div>

      <h2>1. Quem somos</h2>
      <p>
        Este site é um portfólio pessoal mantido por Gustavo Henrique Santos Machado, pessoa física.
        Tratamos dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD).
      </p>

      <h2>2. Quais dados coletamos</h2>
      <p>
        Coletamos apenas o necessário para operar a área autenticada. Não há coleta oculta, não
        vendemos dados e não há publicidade comportamental.
      </p>

      <h3>2.1 Dados que você fornece</h3>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">Dados fornecidos pelo usuário e suas finalidades</caption>
          <thead>
            <tr>
              <th scope="col">Dado</th>
              <th scope="col">Quando</th>
              <th scope="col">Por quê</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nome completo</td>
              <td>No cadastro</td>
              <td>Identificar você na interface</td>
            </tr>
            <tr>
              <td>E-mail</td>
              <td>No cadastro</td>
              <td>Identificar a conta, autenticar e enviar mensagens transacionais</td>
            </tr>
            <tr>
              <td>Telefone</td>
              <td>No cadastro</td>
              <td>Contato, quando aplicável</td>
            </tr>
            <tr>
              <td>Senha</td>
              <td>No cadastro e na troca</td>
              <td>Autenticação</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        <strong>Sobre a senha:</strong> ela nunca é armazenada como você a digitou. Guardamos apenas
        um hash criptográfico irreversível (Argon2id). Nem nós conseguimos descobrir sua senha — por
        isso a recuperação cria uma nova, em vez de reenviar a antiga.
      </p>

      <h3>2.2 Dados coletados automaticamente</h3>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">
            Dados coletados automaticamente e prazos de retenção
          </caption>
          <thead>
            <tr>
              <th scope="col">Dado</th>
              <th scope="col">Por quê</th>
              <th scope="col">Retenção</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Endereço IP</td>
              <td>Limitar tentativas de acesso e detectar abuso</td>
              <td>12 meses</td>
            </tr>
            <tr>
              <td>Navegador e sistema</td>
              <td>Identificar sessões e detectar acesso suspeito</td>
              <td>Enquanto a sessão existir</td>
            </tr>
            <tr>
              <td>Data e hora de eventos da conta</td>
              <td>Trilha de auditoria de segurança</td>
              <td>12 meses</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>2.3 O que não coletamos</h3>
      <ul>
        <li>
          Dados sensíveis: origem racial ou étnica, convicção religiosa, opinião política, filiação
          sindical, saúde, vida sexual, dados genéticos ou biométricos.
        </li>
        <li>Dados de menores de 18 anos — o serviço não se destina a eles.</li>
        <li>Geolocalização precisa.</li>
        <li>Dados de pagamento — o serviço é gratuito.</li>
      </ul>

      <h2>3. Cookies</h2>
      <p>
        Usamos apenas cookies estritamente necessários. Não há cookies de análise, publicidade ou
        rastreamento de terceiros — por isso não exibimos banner de consentimento.
      </p>
      <p>
        O cookie <code>portifolio_refresh</code> mantém você conectado por até 30 dias. Ele é
        HttpOnly (inacessível a JavaScript), Secure (só trafega em HTTPS) e SameSite=Strict (não é
        enviado em requisições vindas de outros sites). Essas três características reduzem o risco
        de roubo de sessão.
      </p>

      <h2>4. Bases legais</h2>
      <div className={styles.tableWrap}>
        <table>
          <caption className="sr-only">
            Finalidades de tratamento e respectivas bases legais
          </caption>
          <thead>
            <tr>
              <th scope="col">Finalidade</th>
              <th scope="col">Base legal (LGPD art. 7º)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Criar e manter sua conta</td>
              <td>Execução de contrato (inciso V)</td>
            </tr>
            <tr>
              <td>Autenticar acessos</td>
              <td>Execução de contrato (inciso V)</td>
            </tr>
            <tr>
              <td>Enviar e-mails transacionais</td>
              <td>Execução de contrato (inciso V)</td>
            </tr>
            <tr>
              <td>Registrar IP e tentativas de acesso</td>
              <td>Legítimo interesse em segurança (inciso IX)</td>
            </tr>
            <tr>
              <td>Registrar o aceite dos documentos</td>
              <td>Cumprimento de obrigação legal (inciso II)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Sobre o legítimo interesse:</strong> registrar IP e tentativas de login serve para
        impedir ataques de força bruta contra a sua conta. O benefício de segurança supera o impacto
        do registro, que é mínimo, temporário e não usado para perfilamento.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Não vendemos, alugamos nem cedemos seus dados. O compartilhamento se limita aos operadores
        necessários para o serviço funcionar: provedor de hospedagem, provedor de e-mail e, quando
        ativado, o serviço de monitoramento de erros — este último recebe apenas dados técnicos da
        falha, sem dados pessoais.
      </p>
      <p>
        Podemos divulgar dados quando houver ordem judicial ou requisição de autoridade competente,
        nos limites da lei.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta: enquanto a conta existir.</li>
        <li>Após pedido de exclusão: removidos em até 30 dias.</li>
        <li>Logs de segurança e IP: 12 meses.</li>
        <li>Registro de aceite dos Termos: 5 anos após o encerramento da conta.</li>
        <li>Tokens de confirmação e redefinição: expiram em 60 e 30 minutos.</li>
      </ul>
      <p>
        O registro de aceite é mantido após a exclusão porque é a prova de que houve consentimento —
        apagá-lo eliminaria justamente a evidência que a lei exige.
      </p>

      <h2>7. Seus direitos</h2>
      <p>A LGPD (art. 18) garante a você:</p>
      <ul>
        <li>confirmação e acesso aos seus dados;</li>
        <li>correção de dados incompletos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>portabilidade em formato estruturado;</li>
        <li>eliminação dos dados tratados com base em consentimento;</li>
        <li>informação sobre compartilhamento;</li>
        <li>revogação do consentimento a qualquer momento;</li>
        <li>oposição a tratamento baseado em legítimo interesse.</li>
      </ul>
      <p>
        Respondemos em até 15 dias. Podemos pedir informações que confirmem sua identidade — é uma
        proteção para que ninguém acesse seus dados se passando por você.
      </p>
      <p>
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados:{" "}
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
          gov.br/anpd
        </a>
        .
      </p>

      <h2>8. Como protegemos seus dados</h2>
      <ul>
        <li>Senhas em hash Argon2id, jamais em texto legível.</li>
        <li>Todo o tráfego em HTTPS.</li>
        <li>Tokens de sessão curtos, rotativos, com detecção de reuso.</li>
        <li>Tokens de e-mail de uso único, com expiração, armazenados apenas como hash.</li>
        <li>Limite de tentativas de login e bloqueio temporário da conta.</li>
        <li>Consultas ao banco parametrizadas, contra injeção de SQL.</li>
        <li>Logs com remoção automática de senhas e tokens.</li>
        <li>Análise de segurança automatizada a cada alteração de código.</li>
      </ul>
      <p>
        <strong>Sendo transparente:</strong> nenhuma medida elimina o risco por completo. Em caso de
        incidente que possa gerar risco relevante a você, comunicaremos você e a ANPD, conforme o
        art. 48 da LGPD.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Se alterarmos esta política de forma relevante, avisaremos por e-mail e pediremos novo
        aceite no próximo acesso. A versão e a data no topo indicam sempre o texto vigente.
      </p>

      <h2>10. Contato</h2>
      <p>
        Para exercer seus direitos ou tirar dúvidas, entre em contato pelos canais indicados na
        página inicial. Veja também os <Link href="/legal/termos-de-uso">Termos de Uso</Link>.
      </p>
    </>
  );
}
