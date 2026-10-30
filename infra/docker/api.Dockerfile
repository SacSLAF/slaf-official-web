# Laravel API (php-fpm). Also used for the queue worker and scheduler containers.
FROM composer:2.8 AS vendor
WORKDIR /app
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

FROM php:8.3-fpm-alpine

RUN apk add --no-cache icu-libs libzip libpng libjpeg-turbo libwebp freetype \
 && apk add --no-cache --virtual .build $PHPIZE_DEPS icu-dev libzip-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql intl zip gd opcache pcntl \
 && pecl install redis && docker-php-ext-enable redis \
 && apk del .build

COPY infra/docker/php.ini /usr/local/etc/php/conf.d/zz-slaf.ini

WORKDIR /var/www/api
COPY --from=vendor /app/vendor ./vendor
COPY apps/api ./
COPY --from=vendor /usr/bin/composer /usr/bin/composer
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
 && rm /usr/bin/composer \
 && chown -R www-data:www-data storage bootstrap/cache

USER www-data
CMD ["php-fpm"]
