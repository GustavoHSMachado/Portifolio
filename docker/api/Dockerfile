# ==========================================================
#  API — PHP 8.3
#
#  Contexto de build: raiz do repositório.
#  Código da API em v2/backend/, arquivos de infra em docker/api/.
#
#  Alvos:
#    dev   servidor embutido do PHP, com Xdebug e hot reload por bind mount
#    prod  PHP-FPM enxuto, sem Composer nem ferramentas de build
# ==========================================================

# ---------- base ----------
FROM php:8.3-cli-alpine AS base

RUN apk add --no-cache icu-dev oniguruma-dev libzip-dev argon2-dev \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring intl opcache \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# ---------- desenvolvimento ----------
FROM base AS dev

# Xdebug apenas no dev: em produção custa performance e amplia a superfície.
RUN apk add --no-cache --virtual .xdebug-deps $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del .xdebug-deps

COPY docker/api/docker-php-ext-xdebug.ini /usr/local/etc/php/conf.d/zz-xdebug.ini
COPY docker/api/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV COMPOSER_ALLOW_SUPERUSER=1

# O código vem por bind mount no compose; este COPY serve para build sem mount.
COPY v2/backend/ /app/

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]

# ---------- build de produção ----------
FROM base AS build

COPY v2/backend/composer.json v2/backend/composer.lock* ./
RUN composer install --no-dev --no-scripts --prefer-dist --optimize-autoloader --no-interaction

COPY v2/backend/ /app/
RUN composer dump-autoload --optimize --classmap-authoritative

# ---------- produção ----------
FROM php:8.3-fpm-alpine AS prod

RUN apk add --no-cache icu-libs oniguruma libzip argon2-libs \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev oniguruma-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring intl opcache \
    && apk del .build-deps

# validate_timestamps=0: em produção o código não muda em runtime.
RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.max_accelerated_files=10000'; \
        echo 'opcache.validate_timestamps=0'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

RUN { \
        echo 'expose_php=Off'; \
        echo 'display_errors=Off'; \
        echo 'log_errors=On'; \
        echo 'error_log=/dev/stderr'; \
        echo 'upload_max_filesize=8M'; \
        echo 'post_max_size=8M'; \
    } > /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /app
COPY --from=build --chown=www-data:www-data /app /app

USER www-data
EXPOSE 9000
CMD ["php-fpm"]
