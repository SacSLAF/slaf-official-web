#!/bin/sh
# Prepares the API on every `docker compose up`: dependencies, schema, seed data, then serves.
set -e
cd /var/www/api

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

php artisan migrate --force
# Idempotent: re-syncs roles/permissions and dev accounts; demo content is only added once.
php artisan db:seed --force

# PHP's built-in server directly rather than `artisan serve`: the latter only passes a few
# environment variables to its workers, so compose's DB_HOST etc. would be ignored.
# Several workers, because the web and admin servers call the API in parallel.
export PHP_CLI_SERVER_WORKERS=6
echo "API listening on http://localhost:8000"
cd public
exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
