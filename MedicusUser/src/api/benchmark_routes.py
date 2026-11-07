# src/api/benchmark_routes.py
"""Medicus Benchmark API routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import List, Optional
import structlog

from medicus_common.core.exceptions import ValidationError, MedicusUserException
from medicus_common.models.user import UserRole
from medicus_common.models.insights.medicus_benchmark import (
    MedicusBenchmarkDetailResponse,
    BenchmarkHistoryRequest,
    BenchmarkHistoryResponse,
)

from src.helpers.access import admin_only, doctor_self
from src.services.benchmark_service import benchmark_service

logger = structlog.get_logger()
router = APIRouter(prefix="/benchmark", tags=["medicus-benchmark"])


@router.get("/doctor/{doctor_id}/latest", response_model=MedicusBenchmarkDetailResponse)
async def get_doctor_benchmark(
    doctor_id: int,
    current_user = Depends(doctor_self)
):
    """Get the latest benchmark data for a doctor."""
    try:

        logger.info("Fetching doctor benchmark", doctor_id=doctor_id, user_id=current_user.id)
        
        result = await benchmark_service.get_doctor_benchmark_detail(doctor_id)
        
        logger.info("Successfully retrieved doctor benchmark", 
                   doctor_id=doctor_id, 
                   score=result.current_benchmark.overall_score)
        
        return result

    except ValidationError as e:
        logger.warning("Validation error getting doctor benchmark", 
                      doctor_id=doctor_id, 
                      error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except MedicusUserException as e:
        logger.error("Service error getting doctor benchmark", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve benchmark data"
        )
    except Exception as e:
        logger.error("Unexpected error getting doctor benchmark", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.get("/doctor/{doctor_id}/summary")
async def get_doctor_benchmark_summary(
    doctor_id: int,
    current_user = Depends(doctor_self)
):
    """Get benchmark summary for profile display."""
    try:

        logger.info("Fetching doctor benchmark summary", doctor_id=doctor_id, user_id=current_user.id)
        
        result = await benchmark_service.get_doctor_benchmark_summary(doctor_id)
        
        logger.info("Successfully retrieved doctor benchmark summary", 
                   doctor_id=doctor_id, 
                   score=result.get("overall_score"))
        
        return result

    except Exception as e:
        logger.error("Error getting doctor benchmark summary", 
                    doctor_id=doctor_id, 
                    error=str(e))
        # Return fallback data for profile display
        return {
            "overall_score": None,
            "category": "Not Available",
            "trend": "NEW",
            "peer_percentile": None,
        }


@router.get("/doctor/{doctor_id}/history", response_model=BenchmarkHistoryResponse)
async def get_doctor_benchmark_history(
    doctor_id: int,
    limit: int = Query(default=12, ge=1, le=50, description="Number of benchmarks to return"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user = Depends(doctor_self)
):
    """Get benchmark history for a doctor."""
    try:

        logger.info("Fetching doctor benchmark history",
                    doctor_id=doctor_id,
                    limit=limit,
                    start_date=start_date,
                    end_date=end_date,
                    user_id=current_user.id)

        # Convert string dates to date objects if provided
        from datetime import datetime
        
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            try:
                parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD."
                )
        
        if end_date:
            try:
                parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD."
                )

        request = BenchmarkHistoryRequest(
            doctor_id=doctor_id,
            limit=limit,
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
        
        result = await benchmark_service.get_doctor_benchmark_history(doctor_id, request)
        
        logger.info("Successfully retrieved doctor benchmark history", 
                   doctor_id=doctor_id, 
                   count=len(result.benchmarks))
        
        return result

    except ValidationError as e:
        logger.warning("Validation error getting doctor benchmark history", 
                      doctor_id=doctor_id, 
                      error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except MedicusUserException as e:
        logger.error("Service error getting doctor benchmark history", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve benchmark history"
        )
    except Exception as e:
        logger.error("Unexpected error getting doctor benchmark history", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.post("/doctor/{doctor_id}/calculate")
async def calculate_doctor_benchmark(
    doctor_id: int,
    background_tasks: BackgroundTasks,
    current_user = Depends(doctor_self),
    force_recalculate: bool = Query(False, description="Force recalculation even if recent benchmark exists")
):
    """Calculate or recalculate benchmark for a doctor."""
    try:

        logger.info("Starting benchmark calculation",
                    doctor_id=doctor_id,
                    force_recalculate=force_recalculate,
                    user_id=current_user.id)

        # For immediate calculation, run synchronously
        if force_recalculate or current_user.role == UserRole.ADMIN:
            result = await benchmark_service.calculate_benchmark(doctor_id, force_recalculate)
            
            logger.info("Benchmark calculation completed", 
                       doctor_id=doctor_id, 
                       score=result.current_benchmark.overall_score)
            
            return {
                "message": "Benchmark calculated successfully",
                "doctor_id": doctor_id,
                "overall_score": result.current_benchmark.overall_score,
                "calculation_date": result.current_benchmark.benchmark_date
            }
        else:
            # For regular users, run in background
            background_tasks.add_task(
                benchmark_service.calculate_benchmark, 
                doctor_id, 
                force_recalculate
            )
            
            return {
                "message": "Benchmark calculation started in background",
                "doctor_id": doctor_id,
                "status": "processing"
            }

    except ValidationError as e:
        logger.warning("Validation error calculating doctor benchmark", 
                      doctor_id=doctor_id, 
                      error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except MedicusUserException as e:
        logger.error("Service error calculating doctor benchmark", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate benchmark"
        )
    except Exception as e:
        logger.error("Unexpected error calculating doctor benchmark", 
                    doctor_id=doctor_id, 
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.post("/batch-calculate")
async def batch_calculate_benchmarks(
    background_tasks: BackgroundTasks,
    doctor_ids: Optional[List[int]] = Query(None, description="Specific doctor IDs to calculate"),
    specialty_ids: Optional[List[int]] = Query(None, description="Specialty IDs to calculate"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of doctors to process"),
    current_user = Depends(admin_only)
):
    """Batch calculate benchmarks for multiple doctors (Admin only)."""
    try:

        logger.info("Starting batch benchmark calculation",
                    doctor_ids=doctor_ids,
                    specialty_ids=specialty_ids,
                    limit=limit,
                    user_id=current_user.id)

        # Run batch calculation in background
        background_tasks.add_task(
            benchmark_service.batch_calculate_benchmarks,
            doctor_ids,
            specialty_ids,
            limit
        )
        
        return {
            "message": "Batch benchmark calculation started",
            "status": "processing",
            "estimated_doctors": min(limit, 1000),  # Rough estimate
            "parameters": {
                "doctor_ids": doctor_ids,
                "specialty_ids": specialty_ids,
                "limit": limit
            }
        }

    except ValidationError as e:
        logger.warning("Validation error in batch calculation", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Unexpected error in batch calculation", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.get("/health")
async def benchmark_health_check():
    """Health check endpoint for benchmark service."""
    try:
        # Simple health check - just verify service is responsive
        logger.info("Benchmark service health check")
        
        return {
            "status": "healthy",
            "service": "medicus-benchmark",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable"
        )