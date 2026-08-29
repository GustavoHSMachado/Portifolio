<?php

declare(strict_types=1);

namespace App\Support;

use App\Core\HttpException;

/**
 * Validação declarativa de entrada. Server-side sempre — o front valida
 * apenas para dar feedback rápido, nunca como garantia (agente 03).
 *
 * Uso: Validator::make($data, ['email' => 'required|email|max:190'])->validated();
 */
final class Validator
{
    /** @var array<string,string[]> */
    private array $errors = [];

    /** @var array<string,mixed> */
    private array $valid = [];

    /**
     * @param array<string,mixed> $data
     * @param array<string,string> $rules
     */
    private function __construct(
        private readonly array $data,
        private readonly array $rules,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, string> $rules campo => regras separadas por '|'
     */
    public static function make(array $data, array $rules): self
    {
        $validator = new self($data, $rules);
        $validator->run();

        return $validator;
    }

    private function run(): void
    {
        foreach ($this->rules as $field => $ruleString) {
            $value = $this->data[$field] ?? null;
            $value = is_string($value) ? trim($value) : $value;
            $rules = explode('|', $ruleString);

            $isRequired = in_array('required', $rules, true);
            $isEmpty = $value === null || $value === '';

            if ($isRequired && $isEmpty) {
                $this->errors[$field][] = 'Campo obrigatório.';
                continue;
            }

            if ($isEmpty) {
                continue; // opcional e vazio: não valida o resto
            }

            foreach ($rules as $rule) {
                $this->apply($field, (string) $value, $rule);
            }

            if (!isset($this->errors[$field])) {
                $this->valid[$field] = $value;
            }
        }
    }

    private function apply(string $field, string $value, string $rule): void
    {
        [$name, $param] = array_pad(explode(':', $rule, 2), 2, null);

        $error = match ($name) {
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) === false
                ? 'E-mail inválido.' : null,
            'min' => mb_strlen($value) < (int) $param
                ? sprintf('Deve ter no mínimo %d caracteres.', (int) $param) : null,
            'max' => mb_strlen($value) > (int) $param
                ? sprintf('Deve ter no máximo %d caracteres.', (int) $param) : null,
            // digits sozinho: só números. digits:7: exatamente sete deles.
            'digits'     => $this->digitsError($value, $param),
            'between'    => $this->betweenError($value, (string) $param),
            'alpha_dash' => preg_match('/^[A-Za-z0-9._-]+$/', $value) !== 1
                ? 'Use apenas letras, números, ponto, hífen ou underscore.' : null,
            'password' => $this->passwordError($value),
            'url'      => filter_var($value, FILTER_VALIDATE_URL) === false
                ? 'URL inválida.' : null,
            'hex' => preg_match('/^[a-f0-9]+$/i', $value) !== 1
                ? 'Formato de token inválido.' : null,
            'confirmed' => ($this->data[$field . '_confirmation'] ?? null) !== $value
                ? 'A confirmação não confere.' : null,
            default => null,
        };

        if ($error !== null) {
            $this->errors[$field][] = $error;
        }
    }

    private function betweenError(string $value, string $param): ?string
    {
        [$min, $max] = array_pad(explode(',', $param), 2, '0');
        $len = mb_strlen($value);

        return ($len < (int) $min || $len > (int) $max)
            ? sprintf('Deve ter entre %d e %d caracteres.', (int) $min, (int) $max)
            : null;
    }

    /**
     * Política de senha: mínimo de 7 caracteres com maiúscula, minúscula, número
     * e símbolo. Decisão do dono do produto, tomada em 22/08/2026.
     *
     * Vale registrar o que ela troca. O NIST SP 800-63B recomenda o contrário —
     * comprimento acima de tudo, sem exigir classes de caractere — porque a
     * obrigação empurra as pessoas para padrões previsíveis: a maiúscula vai
     * para a primeira letra, o número e o símbolo para o fim, e "Senha123!"
     * satisfaz a regra sendo péssima. Um mínimo de 7 também é curto: o espaço
     * de busca fica menor que o dos 10 caracteres exigidos antes.
     *
     * O que compensa isso aqui é o segundo fator. Desde a mesma data, senha
     * correta sozinha não entra: é preciso o código enviado por e-mail. Quem
     * adivinhar a senha ainda precisa da caixa de entrada.
     */
    private function digitsError(string $value, ?string $param): ?string
    {
        if (preg_match('/^\d+$/', $value) !== 1) {
            return 'Deve conter apenas números.';
        }

        $exigidos = (int) $param;

        if ($exigidos > 0 && mb_strlen($value) !== $exigidos) {
            return sprintf('Deve ter exatamente %d dígitos.', $exigidos);
        }

        return null;
    }

    private function passwordError(string $value): ?string
    {
        if (mb_strlen($value) < 7) {
            return 'A senha deve ter no mínimo 7 caracteres.';
        }
        if (mb_strlen($value) > 128) {
            return 'A senha deve ter no máximo 128 caracteres.';
        }
        if (preg_match('/[A-ZÀ-Þ]/u', $value) !== 1) {
            return 'A senha deve conter pelo menos uma letra maiúscula.';
        }
        if (preg_match('/[a-zà-þ]/u', $value) !== 1) {
            return 'A senha deve conter pelo menos uma letra minúscula.';
        }
        if (preg_match('/\d/', $value) !== 1) {
            return 'A senha deve conter pelo menos um número.';
        }
        if (preg_match('/[^\p{L}\p{N}]/u', $value) !== 1) {
            return 'A senha deve conter pelo menos um caractere especial.';
        }
        if (preg_match('/^(.)\1+$/', $value) === 1) {
            return 'A senha não pode ser um único caractere repetido.';
        }

        $blocked = ['12345678910', 'senha123456', 'password123', 'qwertyuiop', 'portifolio1'];
        if (in_array(mb_strtolower($value), $blocked, true)) {
            return 'Esta senha é muito comum. Escolha outra.';
        }

        return null;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /** @return array<string,string[]> */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * @return array<string,mixed>
     * @throws HttpException 422 com o mapa de erros por campo
     */
    public function validated(): array
    {
        if ($this->fails()) {
            throw HttpException::validation($this->errors);
        }

        return $this->valid;
    }
}
