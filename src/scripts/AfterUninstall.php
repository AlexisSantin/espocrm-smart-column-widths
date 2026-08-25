<?php

use Espo\Core\Container;
use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config\ConfigWriter;

/**
 * Called when the extension is uninstalled.
 */
class AfterUninstall
{
    public function run(Container $container): void
    {
        $factory = $container->getByClass(InjectableFactory::class);
        $configWriter = $factory->create(ConfigWriter::class);

        foreach ([
            'smartColumnWidthsEnabled',
            'smartColumnWidthsAdminEnabled',
            'smartColumnWidthsAllEntities',
            'smartColumnWidthsEntityList',
        ] as $name) {
            $configWriter->remove($name);
        }

        $configWriter->save();
    }
}

