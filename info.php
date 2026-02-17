<?php

require_once __DIR__ . '/../vendor/autoload.php';

$mongoUri = getenv('MONGO_URI');

try {
    $client = new MongoDB\Client($mongoUri);
    return $client;
} catch (Exception $e) {
    die("MongoDB Connection failed: " . $e->getMessage());
}

