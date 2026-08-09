import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED_AT, LEGAL_VERSIONS } from "@/lib/legal";
import styles from "../layout.module.css";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições de uso do portfólio de Gustavo Henrique Santos Machado.",
  robots: { index: true, follow: true },
};

export default function TermosDeUsoPage() {
  return (
    <>
      <h1>Termos de Uso</h1>

      <div className={styles.meta}>
        <span>
          <strong>Versão</strong> {LEGAL_VERSIONS.terms}
        </span>
        <span>
          <strong>Atualizado em</strong> {LEGAL_UPDATED_AT}
        </span>
      </div>

      <h2>1. O que é este serviço</h2>
      <p>
        Este site é o portfólio pessoal de Gustavo Henrique Santos Machado. Além do conteúdo
        público, oferece uma área autenticada onde você pode criar uma conta e gerenciar seus
        dados. O serviço é gratuito e mantido por pessoa física, sem finalidade comercial.
      </p>
      <p>
        Ao criar uma conta, você declara ter lido e aceito estes Termos e a{" "}
        <Link href="/legal/politica-de-privacidade">Política de Privacidade</Link>. Se não
        concordar com algum ponto, não crie a conta.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        Você precisa ter <strong>18 anos ou mais</strong>. O serviço não se destina a menores e
        não coletamos dados de crianças ou adolescentes de forma intencional. Você é responsável
        por fornecer informações verdadeiras e mantê-las atualizadas.
      </p>

      <h2>3. Sua conta</h2>

      <h3>3.1 Criação</h3>
      <p>
        Para criar uma conta você fornece nome, e-mail, telefone e senha. É necessário confirmar
        o e-mail — sem isso, a conta permanece inativa.
      </p>

      <h3>3.2 Segurança</h3>
      <p>
        Você é responsável por manter sua senha em sigilo e por toda atividade realizada na sua
        conta. Recomendamos:
      </p>
      <ul>
        <li>usar uma senha exclusiva deste site;</li>
        <li>preferir senhas longas — uma frase é mais segura e mais fácil de lembrar;</li>
        <li>não compartilhar suas credenciais.</li>
      </ul>
      <p>
        Se suspeitar de acesso não autorizado, troque a senha imediatamente — isso encerra todas
        as sessões ativas.
      </p>

      <h3>3.3 Bloqueio automático</h3>
      <p>
        Após 5 tentativas de login malsucedidas, a conta é bloqueada por 15 minutos. É uma
        proteção contra ataques automatizados, não uma punição.
      </p>

      <h3>3.4 Encerramento</h3>
      <p>
        Você pode pedir a exclusão da conta a qualquer momento. Processamos em até 30 dias.
        Podemos suspender contas que violem estes Termos, com aviso prévio sempre que possível.
      </p>

      <h2>4. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>tentar acessar contas, sistemas ou dados de terceiros sem autorização;</li>
        <li>explorar ou divulgar vulnerabilidades sem nos comunicar antes;</li>
        <li>automatizar acessos de forma a sobrecarregar o serviço;</li>
        <li>contornar limites de requisição, autenticação ou autorização;</li>
        <li>enviar conteúdo ilícito, ofensivo ou que viole direitos de terceiros;</li>
        <li>usar o serviço para distribuir malware, spam ou phishing;</li>
        <li>copiar, modificar ou redistribuir o código sem autorização;</li>
        <li>se passar por outra pessoa ou fornecer dados falsos.</li>
      </ul>

      <h3>4.1 Divulgação responsável de falhas</h3>
      <p>
        Se encontrar uma vulnerabilidade, entre em contato antes de divulgá-la publicamente.
        Respondemos em até 5 dias úteis e não tomaremos medidas legais contra quem reportar de
        boa-fé, sem explorar a falha além do necessário e sem acessar dados de terceiros.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        Textos, imagens, projetos e código-fonte pertencem a Gustavo Henrique Santos Machado,
        salvo indicação em contrário. O template visual da versão 1 é o Namari, de{" "}
        <a href="https://www.shapingrain.com" target="_blank" rel="noopener noreferrer">
          ShapingRain
        </a>
        , utilizado conforme a licença do autor.
      </p>
      <p>
        Os dados que você fornece continuam seus. Ao enviá-los, você nos concede autorização
        limitada para armazená-los e processá-los com o único propósito de operar o serviço.
      </p>

      <h2>6. Disponibilidade</h2>
      <p>
        O serviço é oferecido “como está”, sem garantia de disponibilidade ininterrupta. Sendo
        direto: isto é um portfólio pessoal, não um serviço com SLA. Em caso de descontinuação,
        avisaremos com pelo menos 30 dias de antecedência e daremos oportunidade de exportar
        seus dados.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>Na máxima extensão permitida pela lei brasileira, não nos responsabilizamos por:</p>
      <ul>
        <li>perda de dados decorrente de falha de terceiros, caso fortuito ou força maior;</li>
        <li>uso indevido da sua conta por descuido com as credenciais;</li>
        <li>danos indiretos, lucros cessantes ou perda de oportunidade;</li>
        <li>indisponibilidade temporária do serviço.</li>
      </ul>
      <p>
        <strong>Ressalva:</strong> nada nestes Termos exclui responsabilidade por dolo, culpa
        grave ou por direitos que a lei considera irrenunciáveis, especialmente os previstos no
        Código de Defesa do Consumidor.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos alterar estes Termos. Se a mudança for relevante, avisaremos por e-mail com pelo
        menos 15 dias de antecedência e pediremos novo aceite no próximo acesso. Se você não
        concordar, poderá encerrar sua conta sem qualquer ônus.
      </p>

      <h2>9. Lei aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil, ressalvado o
        direito do consumidor de demandar no foro de seu domicílio, nos termos do art. 101, I,
        do Código de Defesa do Consumidor.
      </p>
    </>
  );
}
