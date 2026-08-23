<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\HttpException;
use App\Support\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class ValidatorTest extends TestCase
{
    #[Test]
    public function aceita_payload_valido(): void
    {
        $data = Validator::make([
            'name'                  => 'Gustavo Henrique',
            'email'                 => 'gustavo@example.com',
            'phone'                 => '31986585208',
            'password'              => 'umaSenhaBoa123!',
            'password_confirmation' => 'umaSenhaBoa123!',
        ], [
            'name'     => 'required|min:3|max:120',
            'email'    => 'required|email',
            'phone'    => 'required|digits|between:10,13',
            'password' => 'required|password|confirmed',
        ])->validated();

        self::assertSame('gustavo@example.com', $data['email']);
        self::assertSame('Gustavo Henrique', $data['name']);
    }

    #[Test]
    public function campo_obrigatorio_ausente_gera_erro(): void
    {
        $validator = Validator::make([], ['email' => 'required|email']);

        self::assertTrue($validator->fails());
        self::assertSame(['Campo obrigatório.'], $validator->errors()['email']);
    }

    #[Test]
    public function validated_lanca_http_exception_422(): void
    {
        $this->expectException(HttpException::class);
        $this->expectExceptionCode(0);

        try {
            Validator::make(['email' => 'nao-e-email'], ['email' => 'required|email'])->validated();
        } catch (HttpException $e) {
            self::assertSame(422, $e->status());
            self::assertArrayHasKey('email', $e->errors());

            throw $e;
        }
    }

    #[Test]
    public function confirmacao_de_senha_precisa_bater(): void
    {
        $validator = Validator::make([
            'password'              => 'umaSenhaBoa123',
            'password_confirmation' => 'outraCoisa123',
        ], ['password' => 'required|password|confirmed']);

        self::assertTrue($validator->fails());
    }

    /** @return array<string, array{string, bool}> */
    public static function senhas(): array
    {
        return [
            // A política passou a exigir maiúscula, minúscula, número e símbolo
            // com no mínimo 7 caracteres — ver Validator::passwordError.
            'curta demais'         => ['Ab1!de', false],
            'só repetição'         => ['aaaaaaaaaaaa', false],
            'comum na blocklist'   => ['password123', false],
            'sem maiúscula'        => ['senha123!', false],
            'sem minúscula'        => ['SENHA123!', false],
            'sem número'           => ['SenhaBoa!', false],
            'sem símbolo'          => ['SenhaBoa123', false],
            'no limite dos sete'   => ['Ab1!def', true],
            'longa com tudo'       => ['uma Frase longa como senha 7!', true],
        ];
    }

    #[Test]
    #[DataProvider('senhas')]
    public function politica_de_senha(string $password, bool $shouldPass): void
    {
        $validator = Validator::make(['password' => $password], ['password' => 'required|password']);

        self::assertSame($shouldPass, !$validator->fails(), "Senha avaliada: {$password}");
    }

    #[Test]
    public function campo_opcional_vazio_nao_gera_erro(): void
    {
        $validator = Validator::make(['phone' => ''], ['phone' => 'digits|between:10,13']);

        self::assertFalse($validator->fails());
    }
}
