# Development image for the Laravel API: PHP 8.3 with the same extensions as production.
# Source code is bind-mounted at /var/www/api by compose.yaml.
FROM php:8.3-cli-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libwebp-dev libfreetype6-dev unzip git \
 && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql intl zip gd pcntl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer
COPY infra/docker/api-dev-entrypoint.sh /usr/local/bin/slaf-dev-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/slaf-dev-entrypoint && chmod +x /usr/local/bin/slaf-dev-entrypoint

RUN printf "upload_max_filesize=30M\npost_max_size=32M\nmemory_limit=512M\n" > /usr/local/etc/php/conf.d/dev.ini

WORKDIR /var/www/api
EXPOSE 8000
