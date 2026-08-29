#!/bin/sh
# Prepara o ambiente antes de servir. Idempotente: pode rodar em todo boot.
set -e

echo "→ Aguardando o banco de dados..."
until php -r "
    try {
        new PDO(
            'mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT'),
            getenv('DB_USER'),
            getenv('DB_PASS')
        );
        exit(0);
    } catch (Throwable \$e) { exit(1); }
" 2>/dev/null; do
    sleep 2
done
echo "  banco disponível."

if [ ! -d vendor ] || [ ! -f vendor/autoload.php ]; then
    echo "→ Instalando dependências do Composer..."
    composer install --prefer-dist --no-interaction --no-progress
fi

echo "→ Aplicando migrações..."
php database/migrate.php || {
    echo "  ⚠️  falha nas migrações — veja o log acima"
    exit 1
}

echo "→ API pronta em http://localhost:8000"
exec "$@"
