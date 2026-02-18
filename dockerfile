FROM php:8.3-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libzip-dev \
    nginx \
    && docker-php-ext-install zip

# Install MongoDB extension
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

# Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD service nginx start && php-fpm

