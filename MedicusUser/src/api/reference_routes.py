# =============================================================================
# src/api/reference_routes.py
"""Reference data API routes for common lookup data."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from medicus_common.services.common_services import CommonServices

from src.api.auth_routes.auth_login import get_current_user

router = APIRouter(prefix="/reference", tags=["reference-data"])


# =============================================================================
# Reference Data Endpoints
# =============================================================================

@router.get("/specialty-super-categories")
async def get_specialty_super_categories(current_user=Depends(get_current_user)):
    """
    Get list of specialty super categories from actual database specialties.
    Returns the actual specialties that exist in the database as categories.
    """
    try:
        super_categories = await CommonServices.get_super_categories()

        response = {
            "super_categories": super_categories,
            "count": len(super_categories)
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialty super categories"
        )


@router.get("/specialties")
async def get_specialties_endpoint(
    super_category_id: Optional[int] = Query(None, description="Filter specialties by super category"),
):
    """Get all available medical specialties, optionally filtered by super category."""
    try:
        specialties = await CommonServices.get_specialties(super_category_id=super_category_id)
        response = {
            "specialties": specialties,
            "count": len(specialties)
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialties"
        )


@router.get("/languages")
async def get_languages_endpoint(current_user=Depends(get_current_user)):
    """Get all available languages."""
    try:
        languages = await CommonServices.get_languages()

        response = {
            "languages": languages,
            "count": len(languages)
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve languages"
        )


@router.get("/countries")
async def get_countries_endpoint(current_user=Depends(get_current_user)):
    """Get all available countries."""
    try:
        countries = await CommonServices.get_countries()

        response = {
            "countries": countries,
            "count": len(countries)
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve countries"
        )