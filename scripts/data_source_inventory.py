from core.data_sources.registry import source_registry

for key, cls in source_registry().items():
    print(key, cls.info)
