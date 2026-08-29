-- A evidência da habilidade ganha espaço: 255 para 400 caracteres.
--
-- O limite anterior era arbitrário e começou a apertar o conteúdo real. A
-- evidência é o que separa uma habilidade declarada de uma demonstrada — "onde
-- eu usei isso" costuma precisar de duas ou três frases, e cortar a terceira
-- por causa do schema é deixar o schema decidir o texto.
--
-- 400 continua sendo um teto: o campo é uma frase de apoio no card, não um
-- parágrafo. Acima disso o card deixa de ser escaneável.

ALTER TABLE skills MODIFY COLUMN evidence VARCHAR(400) NULL;

-- ROLLBACK: ALTER TABLE skills MODIFY COLUMN evidence VARCHAR(255) NULL;
