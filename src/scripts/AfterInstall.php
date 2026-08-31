<?php

use Espo\Core\Container;
use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config;
use Espo\Core\Utils\Config\ConfigWriter;

/**
 * Called when the extension is installed. Here you can write config parameter or create default records.
 */
class AfterInstall
{
    public function run(Container $container): void
    {
        $factory = $container->getByClass(InjectableFactory::class);
        $configWriter = $factory->create(ConfigWriter::class);
        $config = $container->getByClass(Config::class);
        $defaultMap = [
            'betterColumnsEnabled' => true,
            'betterColumnsAdminEnabled' => false,
            'betterColumnsAllEntities' => true,
            'betterColumnsEntityList' => [],
        ];
        $hasChanges = false;

        foreach ($defaultMap as $name => $value) {
            if ($config->get($name) !== null) {
                continue;
            }

            $configWriter->set($name, $value);
            $hasChanges = true;
        }

        if ($hasChanges) {
            $configWriter->save();
        }
    }
}

