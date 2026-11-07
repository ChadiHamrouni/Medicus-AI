
from typing import Any, Dict, Union, Optional

# Assuming WEEKDAY_MAP is defined as:
WEEKDAY_MAP = {day: i for i, day in
               enumerate(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])}

def get_attr(obj: Union[Dict[str, Any], Any], key: str, default: Optional[Any] = None, required: bool = True) -> Any:
    """Dynamically fetch an attribute or dictionary key with optional validation."""
    value = obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)
    if required and value is None:
        raise ValueError(f"Missing required field: {key}")
    return value
