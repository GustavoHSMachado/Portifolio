# Fonte

`open-sans-latin.woff2` — Open Sans variável (peso 400–700), subconjunto latino,
baixado do Google Fonts (`fonts.gstatic.com`, v44) e versionado aqui de
propósito.

**Por que versionar em vez de usar `next/font/google`:** o helper do Google baixa
a fonte durante o build. Um timeout de rede na hora do build — que aconteceu
neste projeto — derruba a compilação ou publica a página com a fonte de sistema,
sem aviso. Com o arquivo no repositório, o build é reprodutível e funciona
offline.

**Só o subconjunto latino:** cobre U+0000–00FF, que é todo o português (ã, ç, õ,
ê). Cirílico, grego e hebraico ficaram de fora porque não há uma linha do site
que os use. A seta ↗ (U+2197) não está no subconjunto e é desenhada pela fonte do
sistema — ela é decorativa e `aria-hidden`.

A licença é a SIL Open Font License 1.1, que permite redistribuição.
