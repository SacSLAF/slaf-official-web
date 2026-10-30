<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Tests refresh the database. Refuse to run against anything but in-memory
     * SQLite, so a stray environment variable (e.g. inside the dev container)
     * can never wipe a real database.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        $connection = $app['config']->get('database.default');
        $database = $app['config']->get("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException("Refusing to run tests against [{$connection}:{$database}]; tests must use in-memory SQLite.");
        }

        return $app;
    }

    /**
     * Tests issue requests as several users in a row; Sanctum's guard would
     * otherwise keep the first resolved user for the whole test.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app['auth']->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
