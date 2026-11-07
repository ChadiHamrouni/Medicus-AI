"""Patient search and retrieval operations."""

from typing import Optional, List, Dict, Any

from medicus_common.models.patient import PatientListResponse, PatientStatus
from medicus_common.core.exceptions import ValidationError, DatabaseError
from medicus_common.core.logging_config import logger


async def search_patients_impl(
    db_manager,
    row_to_patient_response_func,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    status: Optional[PatientStatus] = None,
    limit: int = 50,
    offset: int = 0
) -> PatientListResponse:
    """Search patients with filters.

    Provides flexible patient search with filtering and pagination.

    Args:
        db_manager: Database manager instance
        row_to_patient_response_func: Function to convert row to PatientResponse
        first_name: Optional first name filter
        last_name: Optional last name filter
        status: Optional status filter
        limit: Maximum number of results (default 50)
        offset: Number of results to skip (default 0)

    Returns:
        PatientListResponse with matching patients and metadata

    Raises:
        ValidationError: If parameters are invalid
        DatabaseError: If database operation fails
    """
    if limit <= 0 or limit > 100:
        raise ValidationError("Limit must be between 1 and 100")
    if offset < 0:
        raise ValidationError("Offset must be non-negative")

    try:
        # Build dynamic query with filters
        conditions = []
        params = []
        param_count = 0

        if first_name:
            param_count += 1
            conditions.append(f"pv.first_name ILIKE ${param_count}")
            params.append(f"%{first_name.strip()}%")

        if last_name:
            param_count += 1
            conditions.append(f"pv.last_name ILIKE ${param_count}")
            params.append(f"%{last_name.strip()}%")

        if status:
            param_count += 1
            conditions.append(f"pv.status = ${param_count}")
            params.append(status.value)

        # Build WHERE clause
        where_clause = ""
        if conditions:
            where_clause = f"WHERE {' AND '.join(conditions)}"

        # Add limit and offset parameters
        param_count += 1
        limit_param = f"${param_count}"
        params.append(limit)

        param_count += 1
        offset_param = f"${param_count}"
        params.append(offset)

        # Count query for total results
        count_query = f"""
            SELECT COUNT(*)
            FROM patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            {where_clause}
        """

        # Main query for results
        search_query = f"""
            SELECT pv.*, u.email, u.role, u.signup_step
            FROM patients_view pv
            LEFT JOIN auth.users_view u ON pv.user_id = u.id
            {where_clause}
            ORDER BY pv.created_at DESC
            LIMIT {limit_param} OFFSET {offset_param}
        """

        # Execute count query (without limit/offset params)
        count_params = params[:-2] if params else []
        total_count = await db_manager.fetchval(count_query, *count_params)

        # Execute search query
        rows = await db_manager.fetch(search_query, *params)

        # Convert rows to PatientResponse objects
        import asyncio
        patients = await asyncio.gather(*[row_to_patient_response_func(row) for row in rows])

        # Calculate pagination info
        page = (offset // limit) + 1 if limit > 0 else 1
        has_next = offset + limit < total_count
        has_prev = offset > 0

        result = PatientListResponse(
            patients=patients,
            total=total_count,
            page=page,
            limit=limit,
            has_next=has_next,
            has_prev=has_prev
        )

        return result

    except Exception as e:
        logger.error("Database error in patient search")
        raise DatabaseError(f"Failed to search patients: {str(e)}")


async def get_dropdown_options_impl(db_manager) -> List[Dict[str, Any]]:
    """Get patients formatted for dropdown selection.

    Args:
        db_manager: Database manager instance

    Returns:
        List of patient options for dropdown

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        placeholder = {"display": "Select Patient...", "user_id": None, "phone_number": None}

        query = """
            SELECT u.id as user_id,
                   u.email,
                   u.phone_number,
                   pv.first_name,
                   pv.last_name
            FROM   auth.users_view u
            LEFT   JOIN patients_view pv ON u.id = pv.user_id
            WHERE  u.role = 'patient'
               AND u.account_status = 'active'
            ORDER  BY pv.first_name, pv.last_name
        """

        rows = await db_manager.fetch(query)

        data = [
            {
                "email": row["email"],
                "phone_number": row["phone_number"],
                "display": f"{row['first_name'] or 'Patient'} {row['last_name'] or 'Unknown'} ({row['email'] or row['phone_number']})",
                "user_id": row["user_id"],
            }
            for row in rows
        ]

        result = [placeholder, *data]
        return result

    except Exception as e:
        logger.error("Failed to get patient dropdown options")
        raise DatabaseError(f"Failed to get patient dropdown options: {str(e)}")


async def get_patient_count_impl(db_manager) -> int:
    """Get total count of active patients.

    Args:
        db_manager: Database manager instance

    Returns:
        Count of active patients

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        count = await db_manager.fetchval(
            "SELECT COUNT(*) FROM public.patients_view WHERE status = $1",
            PatientStatus.ACTIVE.value
        )
        return count
    except Exception as e:
        logger.error(f"Error getting patient count: {e}")
        raise DatabaseError("Failed to get patient count")