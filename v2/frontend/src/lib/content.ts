/**
 * Conteúdo editorial sobre o próprio site.
 *
 * Perfil, formação, experiência, habilidades e projetos saíram daqui e passaram
 * a vir da API, para serem editáveis pelo painel sem novo deploy. Sobrou o que
 * é texto autoral sobre as escolhas do site, que não muda com frequência e não
 * precisa de tela de administração.
 *
 * Também saiu daqui a data de nascimento e o cálculo de idade. Idade em
 * portfólio é fator de viés na triagem e não conta nada sobre competência.
 */

export const siteNotes = [
  {
    title: "Sobre o design",
    body:
      "O HTML e o CSS da primeira versão deste site não eram meus: vieram de um template " +
      "gratuito, revisado por um amigo formado em Marketing e Design Gráfico. Esta segunda " +
      "versão foi construída do zero, preservando apenas a tipografia e a cor de destaque.",
  },
  {
    title: "Sobre as escolhas",
    body:
      "Navegação simples, elementos dispostos de forma previsível e informação clara são o " +
      "que fazem diferença para quem chega aqui pela primeira vez.",
  },
  {
    title: "Sobre responsividade",
    body:
      "O layout se adapta a qualquer tamanho de tela, do celular ao monitor grande, sem " +
      "esconder conteúdo em nenhum deles.",
  },
] as const;
