<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Ajustes da home que o painel edita: a cor de destaque e os textos das seções.
 *
 * A lista de chaves aceitas vive aqui, e não no banco. Uma tabela chave-valor
 * aceita qualquer chave por natureza, e sem essa allowlist o endpoint viraria
 * escrita arbitrária: quem alcançasse o painel poderia encher a tabela de linhas
 * que nada leem, ou sobrescrever uma chave futura antes de ela existir.
 *
 * Os padrões também moram aqui. Sem linha no banco, a home usa exatamente o que
 * está escrito abaixo — o mesmo texto que estava fixo no componente antes, e o
 * azul medido em 8:1 sobre o fundo. Salvar é que passa a valer por cima, e
 * limpar o campo volta ao padrão em vez de deixar a seção sem título.
 */
final class SiteSettings
{
    public const COR_DESTAQUE = 'cor_destaque';

    /**
     * Chave => valor padrão.
     *
     * @var array<string, string>
     */
    public const PADROES = [
        self::COR_DESTAQUE      => '#5aa9ff',
        'lema'                  => 'Que Eu Seja Melhor Que Ontem, Mas Não Tão Bom Quanto Amanhã!',
        'projetos_titulo'       => 'Projetos',
        'projetos_subtitulo'    => 'O problema, as decisões e o resultado — não apenas o link.',
        'experiencia_titulo'    => 'Experiência',
        'experiencia_subtitulo' => '',
        'formacao_titulo'       => 'Formação',
        'formacao_subtitulo'    => '',
        'tecnologias_titulo'    => 'Tecnologias',
        'tecnologias_subtitulo' => 'Com o que trabalho no dia a dia.',
        'mensagem_titulo'       => 'Sugestões, dúvidas ou orçamentos',
        'mensagem_subtitulo'    => 'Tem uma pergunta sobre o meu trabalho, uma sugestão para este site, uma vaga em mente ou um projeto para orçar? Escreva aqui — respondo no e-mail que você informar.',
        'contato_titulo'        => 'Onde me encontrar',
    ];

    /** Textos livres: o limite acompanha a coluna, que tem 400. */
    public const TAMANHO_MAXIMO = 400;

    public function __construct(private readonly Connection $db)
    {
    }

    /**
     * Todos os ajustes, com o padrão preenchendo o que não foi salvo.
     *
     * Sempre devolve o conjunto completo. A home não precisa saber quais chaves
     * existem no banco — pede a que quer e recebe algo utilizável.
     *
     * @return array<string, string>
     */
    public function all(): array
    {
        $salvos = [];

        foreach ($this->db->all('SELECT setting_key, setting_value FROM site_settings') as $linha) {
            $salvos[(string) $linha['setting_key']] = (string) $linha['setting_value'];
        }

        $resultado = [];

        foreach (self::PADROES as $chave => $padrao) {
            $valor = $salvos[$chave] ?? '';
            $resultado[$chave] = $valor === '' ? $padrao : $valor;
        }

        return $resultado;
    }

    /**
     * Grava o que veio, ignorando chave que não esteja na allowlist.
     *
     * Valor vazio apaga a linha em vez de gravar string vazia: é o que faz o
     * campo em branco significar "volte ao padrão" e não "seção sem título".
     *
     * @param array<string, string> $valores
     * @return list<string> as chaves efetivamente tocadas
     */
    public function save(array $valores): array
    {
        $tocadas = [];

        foreach ($valores as $chave => $valor) {
            if (!array_key_exists($chave, self::PADROES)) {
                continue;
            }

            $valor = trim($valor);

            if ($valor === '' || $valor === self::PADROES[$chave]) {
                $this->db->run('DELETE FROM site_settings WHERE setting_key = ?', [$chave]);
            } else {
                $this->db->run(
                    'INSERT INTO site_settings (setting_key, setting_value)
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
                    [$chave, $valor]
                );
            }

            $tocadas[] = $chave;
        }

        return $tocadas;
    }

    /**
     * Aceita apenas #rrggbb.
     *
     * A cor é o único valor daqui que termina dentro de uma folha de estilo, e
     * portanto o único que o navegador executa em vez de só exibir. Uma string
     * livre ali abriria injeção de CSS — fechar a chave de uma declaração e
     * abrir outra regra é o bastante para reposicionar elementos sobre a tela e
     * montar um clique falso. Formato curto (#abc), nome de cor e funções como
     * rgb() ficam de fora não por serem perigosos, mas porque uma única forma
     * aceita é uma regra que não precisa ser reexaminada depois.
     */
    public static function corValida(string $valor): bool
    {
        return preg_match('/^#[0-9a-fA-F]{6}$/', $valor) === 1;
    }
}
