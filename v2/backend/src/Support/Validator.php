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
            'digits' => preg_match('/^\d+$/', $value) !== 1
                ? 'Deve conter apenas números.' : null,
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
     * Política de senha alinhada ao NIST SP 800-63B: comprimento acima de tudo,
     * sem exigir símbolos obrigatórios (que empurram o usuário para padrões previsíveis).
     */
    private function passwordError(string $value): ?string
    {
        if (mb_strlen($value) < 10) {
            return 'A senha deve ter no mínimo 10 caracteres.';
        }
        if (mb_strlen($value) > 128) {
            return 'A senha deve ter no máximo 128 caracteres.';
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
