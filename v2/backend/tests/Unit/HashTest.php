<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\Hash;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class HashTest extends TestCase
{
    #[Test]
    public function gera_hash_diferente_do_texto_plano(): void
    {
        $hash = Hash::make('umaSenhaBoa123');

        self::assertNotSame('umaSenhaBoa123', $hash);
        self::assertGreaterThan(50, strlen($hash));
    }

    #[Test]
    public function o_mesmo_texto_gera_hashes_diferentes(): void
    {
        // Salt aleatório: dois cadastros com a mesma senha não são identificáveis no dump.
        self::assertNotSame(Hash::make('umaSenhaBoa123'), Hash::make('umaSenhaBoa123'));
    }

    #[Test]
    public function verifica_corretamente(): void
    {
        $hash = Hash::make('umaSenhaBoa123');

        self::assertTrue(Hash::verify('umaSenhaBoa123', $hash));
        self::assertFalse(Hash::verify('umaSenhaBoa124', $hash));
        self::assertFalse(Hash::verify('', $hash));
    }

    #[Test]
    public function burn_nao_lanca_excecao(): void
    {
        Hash::burn();

        self::assertTrue(true);
    }
}
