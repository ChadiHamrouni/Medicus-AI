import json
import logging
import os
from threading import Lock
from typing import Any, Dict

logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Custom exception for configuration loading errors."""
    pass


class Config:
    _instance = None
    _lock = Lock()

    def __new__(cls, config_file: str = 'config.json') -> "Config":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(Config, cls).__new__(cls)
                cls._instance.configuration = cls._initialize_config(config_file)
        return cls._instance

    @staticmethod
    def _initialize_config(config_file: str) -> Dict[str, Any]:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, config_file)
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            return config
        except (OSError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load config from {config_path}: {e}")
            raise ConfigurationError(f"Failed to load configuration: {e}")

    def get(self, *keys: str, default: Any = None) -> Any:
        value = self.configuration
        for key in keys:
            if not isinstance(value, dict):
                return default
            if key not in value:
                return default
            value = value[key]
        return value


# Example usage:
if __name__ == "__main__":
    try:
        _config = Config('regions.json')
        model = _config.get('agent', 'llm_settings', 'model', default='gpt-3.5-turbo')
        print(f"Model: {model}")
    except ConfigurationError as _e:
        print(f"An error occurred: {_e}")
