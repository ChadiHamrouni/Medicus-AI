# =============================================================================
# medicus_common/services/doctors_service.py
"""Doctors service for lightweight doctor search and discovery."""

from typing import Dict, List, Any, Optional, Tuple
from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import DatabaseError
from medicus_common.core.logging_config import logger


class DoctorsService:
    """Service for doctor search and discovery with lightweight payloads."""

    @staticmethod
    async def get_doctors(
        country_id: Optional[int] = None,
        category_id: Optional[int] = None,
        specialty_id: Optional[int] = None,
        name: Optional[str] = None,
        in_out_network: bool = True,
        page: int = 1,
        page_size: int = 20,
        search_foreign_country: Optional[int] = None,
        exclude_doctor_id: Optional[int] = None  # NEW
    ) -> Dict[str, Any]:
        """
        Get doctors with lightweight payload for discovery/search.

        Args:
            country_id: Filter by country ID (user's country for local search)
            category_id: Filter by specialty super category ID
            specialty_id: Filter by specific specialty ID
            name: Search by doctor name (first_name or last_name)
            in_out_network: True=include both, False=out-of-network only
            page: Page number for pagination (1-based)
            page_size: Number of results per page
            search_foreign_country: Override country_id for international search

        Returns:
            dict: {
                "doctors": List of doctor cards with lightweight data,
                "total": Total count of matching doctors,
                "page": Current page number,
                "page_size": Results per page,
                "total_pages": Total number of pages,
                "in_network_count": Count of in-network doctors,
                "out_of_network_count": Count of out-of-network doctors
            }
        """
        try:
            # Build the base query (no COUNT needed - use page_size + 1 approach)
            base_query, params = DoctorsService._build_search_query(
                country_id=country_id,
                category_id=category_id,
                specialty_id=specialty_id,
                name=name,
                in_out_network=in_out_network,
                search_foreign_country=search_foreign_country,
                page=page,
                page_size=page_size,
                exclude_doctor_id=exclude_doctor_id
            )

            # Execute main query for results
            rows = await db_manager.fetch(base_query, *params)

            # Determine if there's a next page
            has_next = len(rows) > page_size
            rows_to_process = rows[:page_size]

            # Process results into lightweight doctor cards
            doctors = []
            in_network_count = 0
            out_of_network_count = 0

            for row in rows_to_process:
                doctor_card = DoctorsService._create_doctor_card(row)
                doctors.append(doctor_card)

                # Count network status
                if doctor_card['in_network']:
                    in_network_count += 1
                else:
                    out_of_network_count += 1

            return {
                "doctors": doctors,
                "total": len(doctors),
                "page": page,
                "page_size": page_size,
                "total_pages": 0,  # Unknown without COUNT, clients use has_next instead
                "has_next": has_next,
                "in_network_count": in_network_count,
                "out_of_network_count": out_of_network_count
            }

        except Exception as e:
            logger.error(f"Failed to get doctors: {str(e)}")
            raise DatabaseError(f"Failed to retrieve doctors: {e}")

    @staticmethod
    async def get_oon_doctors(
        country_id: Optional[int] = None,
        specialty_id: Optional[int] = None,
        category_id: Optional[int] = None,
        name: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Get out-of-network doctors from doctors_oon_view.

        Args:
            country_id: Filter by country ID
            specialty_id: Filter by specialty ID
            category_id: Filter by super category ID
            name: Search by doctor name (first_name, last_name, or full_name)
            page: Page number for pagination (1-based)
            page_size: Number of results per page

        Returns:
            dict: {
                "doctors": List of OON doctor cards,
                "total": Total count of matching doctors,
                "page": Current page number,
                "page_size": Results per page,
                "total_pages": Total number of pages
            }
        """
        try:
            # Build query for OON doctors
            base_query = """
                SELECT
                    id,
                    prefix,
                    first_name,
                    last_name,
                    full_name,
                    wa_number,
                    specialty_id,
                    specialty_name,
                    super_category_id,
                    country_id,
                    country_name,
                    language_id,
                    language_name,
                    contact,
                    address,
                    data_source,
                    status
                FROM public.doctors_oon_view
                WHERE status = 'ACTIVE'
            """

            conditions = []
            params = []

            # Country filtering
            if country_id is not None:
                params.append(country_id)
                conditions.append(f"country_id = ${len(params)}")

            # Super category filtering
            if category_id is not None:
                params.append(category_id)
                conditions.append(f"super_category_id = ${len(params)}")

            # Specialty filtering
            if specialty_id is not None:
                params.append(specialty_id)
                conditions.append(f"specialty_id = ${len(params)}")

            # Doctor name search (first_name, last_name, or full_name)
            if name and name.strip():
                search_term = f"%{name.strip()}%"
                params.append(search_term)
                first_name_param = len(params)
                params.append(search_term)
                last_name_param = len(params)
                params.append(search_term)
                full_name_param = len(params)
                conditions.append(
                    f"(first_name ILIKE ${first_name_param} OR last_name ILIKE ${last_name_param} OR full_name ILIKE ${full_name_param})"
                )

            # Apply conditions
            if conditions:
                base_query += " AND " + " AND ".join(conditions)

            # Add ordering and pagination
            base_query += " ORDER BY full_name ASC"

            # Pagination - fetch page_size + 1 to detect next page (no COUNT needed)
            offset = (page - 1) * page_size
            fetch_limit = page_size + 1
            base_query += f" LIMIT {fetch_limit} OFFSET {offset}"

            # Execute main query
            rows = await db_manager.fetch(base_query, *params)

            # Determine if there's a next page
            has_next = len(rows) > page_size
            rows_to_process = rows[:page_size]

            # Process results into OON doctor cards
            doctors = []
            for row in rows_to_process:
                doctor_card = DoctorsService._create_oon_doctor_card(row)
                doctors.append(doctor_card)

            return {
                "doctors": doctors,
                "total": len(doctors),
                "page": page,
                "page_size": page_size,
                "total_pages": 0,  # Unknown without COUNT, clients use has_next instead
                "has_next": has_next
            }

        except Exception as e:
            logger.error(f"Failed to get OON doctors: {str(e)}")
            raise DatabaseError(f"Failed to retrieve OON doctors: {e}")

    @staticmethod
    def _build_search_query(
        country_id: Optional[int] = None,
        category_id: Optional[int] = None,
        specialty_id: Optional[int] = None,
        name: Optional[str] = None,
        in_out_network: bool = True,
        search_foreign_country: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
        exclude_doctor_id: Optional[int] = None
    ) -> Tuple[str, List[Any]]:
        """
        Build SQL query for doctor search with lightweight payload.
        Uses page_size + 1 approach to detect next page (no COUNT needed).

        Returns:
            Tuple of (base_query, params)
        """
        # Lightweight fields for doctor cards from discovery view
        base_query = """
            SELECT
                id,
                first_name,
                last_name,
                prefix,
                gender,
                specialty_id,
                specialty_name,
                super_category_id,
                country_id,
                country_name,
                language_id,
                language_name,
                contact,
                address,
                avatar_url,
                status,
                in_network
            FROM public.doctors_discovery_view
            WHERE status = 'ACTIVE'
        """

        conditions = []
        params = []

        # Country filtering: prefer foreign search if specified
        if search_foreign_country is not None:
            params.append(search_foreign_country)
            conditions.append(f"country_id = ${len(params)}")
        elif country_id is not None:
            params.append(country_id)
            conditions.append(f"country_id = ${len(params)}")

        # Super category filtering
        if category_id is not None:
            params.append(category_id)
            conditions.append(f"super_category_id = ${len(params)}")

        # Specialty filtering
        if specialty_id is not None:
            params.append(specialty_id)
            conditions.append(f"specialty_id = ${len(params)}")

        # Doctor name search (first_name or last_name)
        if name and name.strip():
            search_term = f"%{name.strip()}%"
            params.append(search_term)
            first_name_param = len(params)
            params.append(search_term)
            last_name_param = len(params)
            conditions.append(f"(first_name ILIKE ${first_name_param} OR last_name ILIKE ${last_name_param})")

        # Network filtering with country constraint
        if not in_out_network:
          # Only out-of-network doctors
          conditions.append("in_network = FALSE")
          # CONSTRAINT 1: Out-of-network must be in same country
          if country_id is not None:
              params.append(country_id)
              conditions.append(f"country_id = ${len(params)}")
        elif in_out_network and country_id is not None:
          # CONSTRAINT 1: When showing both, out-of-network must be in same country
          # This ensures: (in_network = TRUE) OR (in_network = FALSE AND country_id = user's country)
          params.append(country_id)
          conditions.append(f"(in_network = TRUE OR country_id = ${len(params)})")

        # CONSTRAINT 2: Exclude current doctor from search results
        if exclude_doctor_id is not None:
          params.append(exclude_doctor_id)
          conditions.append(f"id != ${len(params)}")

        # Apply conditions
        if conditions:
            base_query += " AND " + " AND ".join(conditions)

        # Add ordering and pagination
        # Priority: In-network first, then by last_name, first_name
        base_query += " ORDER BY in_network DESC, last_name ASC, first_name ASC"

        # Pagination - fetch page_size + 1 to detect next page
        offset = (page - 1) * page_size
        fetch_limit = page_size + 1
        base_query += f" LIMIT {fetch_limit} OFFSET {offset}"

        return base_query, params

    @staticmethod
    def _create_doctor_card(row) -> Dict[str, Any]:
        """
        Create lightweight doctor card from database row.

        Args:
            row: Database row from doctors_view

        Returns:
            dict: Lightweight doctor card for UI display
        """
        # Construct full name
        first_name = row.get("first_name") or ""
        last_name = row.get("last_name") or ""
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = "Dr Unknown"

        # Parse contact info if available (check both 'contact' and 'contact_info' fields)
        contact_info = {}
        contact_field = row.get("contact") or row.get("contact_info")
        if contact_field:
            try:
                import json
                if isinstance(contact_field, str):
                    contact_info = json.loads(contact_field)
                elif isinstance(contact_field, dict):
                    contact_info = contact_field
                else:
                    # Unexpected type, log and use empty dict
                    logger.warning(f"Unexpected contact field type for doctor {row.get('id')}: {type(contact_field)}")
                    contact_info = {}
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse contact info for doctor {row.get('id')}: {e}, raw value: {contact_field}")
                contact_info = {}

        # Extra safety check to ensure contact_info is always a dict
        if not isinstance(contact_info, dict):
            logger.error(f"Contact info is not a dict for doctor {row.get('id')}, got {type(contact_info)}: {contact_info}")
            contact_info = {}

        # Parse address info if available
        address_info = {}
        if row.get("address"):
            try:
                import json
                if isinstance(row["address"], str):
                    address_info = json.loads(row["address"])
                elif isinstance(row["address"], dict):
                    address_info = row["address"]
                else:
                    # Unexpected type, log and use empty dict
                    logger.warning(f"Unexpected address field type for doctor {row.get('id')}: {type(row['address'])}")
                    address_info = {}
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse address info for doctor {row.get('id')}: {e}")
                address_info = {}

        # Extra safety check to ensure address_info is always a dict
        if not isinstance(address_info, dict):
            logger.error(f"Address info is not a dict for doctor {row.get('id')}, got {type(address_info)}: {address_info}")
            address_info = {}

        return {
            "id": row["id"],
            "user_id": row.get("user_id"),
            "name": full_name,
            "first_name": first_name,
            "last_name": last_name,
            "prefix": row.get("prefix"),
            "specialty_id": row.get("specialty_id"),
            "specialty_name": row.get("specialty_name"),
            "super_category_id": row.get("super_category_id"),
            "country_id": row.get("country_id"),
            "country_name": row.get("country_name"),
            "language_id": row.get("language_id"),
            "language_name": row.get("language_name"),
            "gender": row.get("gender"),
            "in_network": row.get("in_network", False),
            "avatar_url": row.get("avatar_url"),
            # Lightweight contact info for out-of-network doctors
            "email": contact_info.get("professional_email") or contact_info.get("email"),
            "phone": contact_info.get("professional_phone") or contact_info.get("phone"),
            # Simplified address for location display
            "city": address_info.get("city"),
            "state": address_info.get("state"),
            "country": address_info.get("country", row.get("country_name"))
        }

    @staticmethod
    def _create_oon_doctor_card(row) -> Dict[str, Any]:
        """
        Create OON doctor card from doctors_oon_view row.

        Args:
            row: Database row from doctors_oon_view

        Returns:
            dict: OON doctor card for UI display
        """
        # Use full_name from view or construct it
        full_name = row.get("full_name") or ""
        if not full_name:
            first_name = row.get("first_name") or ""
            last_name = row.get("last_name") or ""
            full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = "Dr Unknown"

        # Parse contact info if available
        contact_info = {}
        if row.get("contact"):
            try:
                import json
                if isinstance(row["contact"], str):
                    contact_info = json.loads(row["contact"])
                elif isinstance(row["contact"], dict):
                    contact_info = row["contact"]
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse OON contact info for doctor {row.get('id')}: {e}")
                contact_info = {}

        if not isinstance(contact_info, dict):
            contact_info = {}

        # Parse address info if available
        address_info = {}
        if row.get("address"):
            try:
                import json
                if isinstance(row["address"], str):
                    address_info = json.loads(row["address"])
                elif isinstance(row["address"], dict):
                    address_info = row["address"]
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse OON address info for doctor {row.get('id')}: {e}")
                address_info = {}

        if not isinstance(address_info, dict):
            address_info = {}

        return {
            "id": row["id"],
            "name": full_name,
            "first_name": row.get("first_name"),
            "last_name": row.get("last_name"),
            "prefix": row.get("prefix"),
            "specialty_id": row.get("specialty_id"),
            "specialty_name": row.get("specialty_name"),
            "super_category_id": row.get("super_category_id"),
            "country_id": row.get("country_id"),
            "country_name": row.get("country_name"),
            "language_id": row.get("language_id"),
            "language_name": row.get("language_name"),
            "wa_number": row.get("wa_number"),
            "in_network": False,  # Always false for OON doctors
            "avatar_url": None,  # OON doctors don't have avatar_url
            # Contact info
            "email": contact_info.get("professional_email") or contact_info.get("email"),
            "phone": contact_info.get("professional_phone") or contact_info.get("phone") or row.get("wa_number"),
            # Address info
            "city": address_info.get("city"),
            "state": address_info.get("state"),
            "country": address_info.get("country", row.get("country_name")),
            "data_source": row.get("data_source")
        }