
from typing import List, Dict, Any

from medicus_common.core.database import db_manager, DatabaseError
from medicus_common.core.logging_config import logger

class CommonServices:

    @staticmethod
    async def get_specialties(super_category_id=None) -> List[Dict[str, Any]]:
        """Get all available medical specialties."""
        try:
            if super_category_id is not None:
                query = """
                    SELECT specialty_id as id, specialty_name as name
                    FROM public.specialties_view
                    WHERE super_category_id = $1
                    ORDER BY specialty_name ASC
                """
                rows = await db_manager.fetch(query, super_category_id)
            else:
                query = """
                    SELECT specialty_id as id, specialty_name as name
                    FROM public.specialties_view
                    ORDER BY specialty_name ASC
                """
                rows = await db_manager.fetch(query)

            specialties = []
            for row in rows:
                specialties.append({
                    'id': row['id'],
                    'name': row['name']
                })

            return specialties

        except Exception as e:
            logger.error("Failed to get specialties", error=str(e))
            raise DatabaseError(f"Failed to get specialties: {e}")

    @staticmethod
    async def get_super_categories() -> List[Dict[str, Any]]:
        """Get all available medical specialties."""
        try:
            query = """
                SELECT id, name, description, icon
                FROM public.specialty_super_categories
                ORDER BY id ASC
            """

            rows = await db_manager.fetch(query)

            super_categories = []
            for row in rows:
                super_categories.append({
                    'id': row['id'],
                    'name': row['name'],
                    'description': row.get('description', ''),
                    'icon': row.get('icon', '')
                })

            return super_categories

        except Exception as e:
            logger.error("Failed to get specialties", error=str(e))
            raise DatabaseError(f"Failed to get specialties: {e}")

    @staticmethod
    async def get_languages() -> List[Dict[str, Any]]:
        """Get all available languages."""
        try:
            query = """
                SELECT id, name, code
                FROM public.languages
                ORDER BY name ASC
            """

            rows = await db_manager.fetch(query)

            languages = []
            for row in rows:
                languages.append({
                    'id': row['id'],
                    'name': row['name'],
                    'code': row.get('code', '')
                })

            return languages

        except Exception as e:
            logger.error("Failed to get languages", error=str(e))
            raise DatabaseError(f"Failed to get languages: {e}")

    @staticmethod
    async def get_countries() -> List[Dict[str, Any]]:
        """Get all available countries."""
        try:
            # Get all countries from the countries_view
            query = """
                SELECT id, name
                FROM public.countries_view
                ORDER BY name ASC
            """

            rows = await db_manager.fetch(query)

            countries = []
            for row in rows:
                countries.append({
                    'id': row['id'],
                    'name': row['name']
                })

            return countries

        except Exception as e:
            logger.error("Failed to get countries", error=str(e))
            raise DatabaseError(f"Failed to get countries: {e}")

