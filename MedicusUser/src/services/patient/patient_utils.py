"""Utility functions for patient service."""

from typing import Optional
from medicus_common.models.common import Gender


def map_gender_to_db(gender: Optional[Gender]) -> Optional[str]:
    """Map Gender enum to database gender_type enum values."""
    if gender is None:
        return None

    mapping = {
        Gender.MALE: "MALE",
        Gender.FEMALE: "FEMALE",
        Gender.OTHER: "UNDISCLOSED",
        Gender.PREFER_NOT_TO_SAY: "UNDISCLOSED"
    }
    return mapping.get(gender, "UNDISCLOSED")


def map_db_to_gender(db_value: Optional[str]) -> Optional[Gender]:
    """Map database gender_type enum value to Gender enum."""
    if db_value is None:
        return None

    mapping = {
        "MALE": Gender.MALE,
        "FEMALE": Gender.FEMALE,
        "UNDISCLOSED": Gender.OTHER,
    }
    return mapping.get(db_value.upper(), Gender.OTHER)


def transform_legacy_emergency_contact(ec_data) -> list:
    """Transform legacy emergency contact format to new list format."""
    if isinstance(ec_data, list):
        result = []
        for contact in ec_data:
            if isinstance(contact, dict):
                if "phone" in contact and "phone_number" not in contact:
                    contact = {**contact, "phone_number": contact.pop("phone")}
                result.append(contact)
        return result

    if isinstance(ec_data, dict):
        if "name" in ec_data and ("phone" in ec_data or "phone_number" in ec_data) and "relationship" in ec_data:
            if "phone" in ec_data and "phone_number" not in ec_data:
                ec_data = {**ec_data, "phone_number": ec_data.pop("phone")}
            return [ec_data]

        contacts = []

        if "primary_contact" in ec_data and ec_data["primary_contact"]:
            primary = ec_data["primary_contact"]
            if isinstance(primary, dict) and primary.get("name") and (
                    primary.get("phone") or primary.get("phone_number")):
                contact = {
                    "name": primary.get("name", ""),
                    "phone_number": primary.get("phone_number", primary.get("phone", "")),
                    "relationship": primary.get("relationship", "Emergency Contact"),
                    "email": primary.get("email"),
                    "is_primary": True,
                    "address": primary.get("address"),
                    "country_code": primary.get("country_code")
                }
                contact = {k: v for k, v in contact.items() if v is not None}
                contacts.append(contact)

        if "secondary_contact" in ec_data and ec_data["secondary_contact"]:
            secondary = ec_data["secondary_contact"]
            if isinstance(secondary, dict) and secondary.get("name") and (
                    secondary.get("phone") or secondary.get("phone_number")):
                contact = {
                    "name": secondary.get("name", ""),
                    "phone_number": secondary.get("phone_number", secondary.get("phone", "")),
                    "relationship": secondary.get("relationship", "Emergency Contact"),
                    "email": secondary.get("email"),
                    "is_primary": False,
                    "address": secondary.get("address"),
                    "country_code": secondary.get("country_code")
                }
                contact = {k: v for k, v in contact.items() if v is not None}
                contacts.append(contact)

        return contacts if contacts else []

    return []