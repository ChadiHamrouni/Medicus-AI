
import json
from pydantic import HttpUrl

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, HttpUrl):
            return str(obj)
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)