"""
Last line of defence: internal identifiers never reach the user.

Agents receive patient/doctor/conversation ids so they can call tools, and the
instructions forbid repeating them, but smaller models still write things like
"Follow-up with Patient ID #1". This rewrites such references before a reply is
stored or returned: entity references become the person's name (or a neutral
noun), and stray `*_id` fields / UUIDs are removed.
"""

import re
from typing import Optional

_NUM = r"#?\s*(?:[0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
_LABEL = r"(?:id|ID|Id|reference|ref|number|no\.?|#)"

# "(Patient ID #1)", "patient id: 1", "Patient reference #1", "Patient #1"
_PATIENT = re.compile(rf"\(?\b(?:the\s+)?patient\s*(?:{_LABEL}\s*[:#]?\s*)?{_NUM}\b\)?", re.IGNORECASE)
_DOCTOR = re.compile(rf"\(?\b(?:the\s+)?(?:doctor|clinician|physician)\s*(?:{_LABEL}\s*[:#]?\s*)?{_NUM}\b\)?", re.IGNORECASE)
# Other entity ids: "conversation ID 3f2…", "user id: 5", "ticket ID 12" is kept (users need ticket numbers)
_OTHER = re.compile(rf"\(?\b(?:conversation|convo|user|account|record|internal)\s*{_LABEL}\s*[:#]?\s*{_NUM}\b\)?", re.IGNORECASE)
# Raw field leaks: "patient_id: 1", "doctor_id=2", "convo_id: …"
_FIELD = re.compile(r"\(?\b[a-z]+_id\b\s*[:=]\s*[\"']?[\w-]+[\"']?\)?", re.IGNORECASE)
_UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE)


def scrub_identifiers(text: Optional[str], patient_name: Optional[str] = None,
                      doctor_name: Optional[str] = None) -> Optional[str]:
    if not text:
        return text
    def entity(name: str):
        # "(patient ID 1)" next to a name is redundant: drop it. Inline references
        # ("visit with Patient ID #1") become the person's name.
        return lambda m: "" if m.group(0).startswith("(") else name

    out = _PATIENT.sub(entity(patient_name or "the patient"), text)
    out = _DOCTOR.sub(entity(f"Dr. {doctor_name}" if doctor_name else "the doctor"), out)
    out = _OTHER.sub(lambda m: "" if m.group(0).startswith("(") else m.group(0).split()[0], out)
    out = re.sub(rf"\(\s*{_LABEL}\s*[:#]?\s*{_NUM}\s*\)", "", out, flags=re.IGNORECASE)  # bare "(ID: 1)"
    out = _FIELD.sub("", out)
    out = _UUID.sub("", out)
    # Tidy what removals leave behind.
    out = re.sub(r"\(\s*\)", "", out)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r" +([,.;:!?])", r"\1", out)
    return out.strip()
