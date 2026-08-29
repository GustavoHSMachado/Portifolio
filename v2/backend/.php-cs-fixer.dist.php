<?php

declare(strict_types=1);

/**
 * Estilo de código do backend.
 *
 *   composer run lint      verifica sem alterar
 *   composer run lint:fix  aplica
 *
 * As regras abaixo descrevem o estilo que o código já usa. A intenção é
 * travar o padrão existente, não impor um novo: um formatador que reescreve
 * 52 arquivos na primeira execução gera um diff que ninguém revisa de fato.
 */

$finder = PhpCsFixer\Finder::create()
    ->in([__DIR__ . '/src', __DIR__ . '/tests', __DIR__ . '/database', __DIR__ . '/public'])
    ->name('*.php')
    ->ignoreDotFiles(true)
    ->ignoreVCS(true);

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setFinder($finder)
    ->setCacheFile(__DIR__ . '/.php-cs-fixer.cache')
    ->setRules([
        '@PSR12'                 => true,
        'declare_strict_types'   => true,
        'strict_param'           => true,
        'array_syntax'           => ['syntax' => 'short'],
        'ordered_imports'        => ['sort_algorithm' => 'alpha'],
        'no_unused_imports'      => true,
        'single_quote'           => true,
        // Só em arrays. Em argumentos seria mudança de estilo sem ganho, e
        // reescreveria dezenas de chamadas para nada.
        'trailing_comma_in_multiline' => ['elements' => ['arrays']],
        'no_superfluous_phpdoc_tags'  => ['allow_mixed' => true],
        'phpdoc_align'           => ['align' => 'left'],
        'blank_line_before_statement' => ['statements' => ['return', 'throw', 'try']],

        // O código alinha os '=>' dentro dos arrays. É legibilidade real em
        // mapas de configuração, onde a coluna da direita é o que se lê.
        'binary_operator_spaces' => [
            'default'   => 'single_space',
            'operators' => ['=>' => 'align_single_space_minimal'],
        ],

        // Concatenação sem espaço é o que está escrito hoje.
        'concat_space'           => ['spacing' => 'one'],
    ]);
