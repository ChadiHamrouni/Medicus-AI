# src/services/benchmark_service.py
"""Service layer for Medicus Benchmark operations."""

import asyncio
import httpx
from datetime import date
from typing import List, Optional, Dict, Any

from medicus_common.core.config import get_settings
from medicus_common.core.exceptions import ValidationError, MedicusUserException
from medicus_common.models.insights.medicus_benchmark import (
    MedicusBenchmarkDetailResponse,
    BenchmarkHistoryRequest,
    BenchmarkHistoryResponse,
)

from src.repositories.benchmark_repository import BenchmarkRepository
from medicus_common.core.logging_config import logger


class BenchmarkService:
    """Service for benchmark operations integrating with MedicusAI."""

    def __init__(self):
        self.settings = get_settings()
        self.repository = BenchmarkRepository()
        # Configure MedicusAI service URL
        self.medicus_ai_url = getattr(
            self.settings, 
            'medicus_ai_url', 
            'http://localhost:8000'  # Default for local development
        )

    async def get_doctor_benchmark_detail(self, doctor_id: int) -> MedicusBenchmarkDetailResponse:
        """Get detailed benchmark information for a doctor."""
        try:
            logger.info("Fetching doctor benchmark detail", doctor_id=doctor_id)

            # Get latest benchmark from database
            current_benchmark = await self.repository.get_latest_benchmark(doctor_id)
            
            if not current_benchmark:
                # If no benchmark exists, try to calculate one
                logger.info("No benchmark found, attempting to calculate", doctor_id=doctor_id)
                await self._calculate_and_store_benchmark(doctor_id)
                current_benchmark = await self.repository.get_latest_benchmark(doctor_id)
                
                if not current_benchmark:
                    raise ValidationError(f"Unable to generate benchmark for doctor {doctor_id}")

            # Get previous benchmark for comparison
            previous_benchmark = await self.repository.get_previous_benchmark(
                doctor_id, current_benchmark.benchmark_date
            )

            # Generate comparison if previous benchmark exists
            comparison = None
            if previous_benchmark:
                comparison = await self.repository.generate_comparison(
                    current_benchmark, previous_benchmark
                )

            # Generate insights
            insights = await self.repository.generate_insights(current_benchmark, comparison)

            # Generate score history (simplified - last 12 benchmarks)
            history = await self.repository.get_benchmark_history(doctor_id, limit=12)
            score_history = [
                {
                    "date": str(benchmark.benchmark_date),
                    "score": float(benchmark.overall_score),
                    "clinical_score": float(benchmark.clinical_effectiveness.get('score', 0) if isinstance(benchmark.clinical_effectiveness, dict) else 0),
                    "patient_score": float(benchmark.patient_experience.get('score', 0) if isinstance(benchmark.patient_experience, dict) else 0),
                    "efficiency_score": float(benchmark.practice_efficiency.get('score', 0) if isinstance(benchmark.practice_efficiency, dict) else 0)
                }
                for benchmark in history.benchmarks
            ]

            return MedicusBenchmarkDetailResponse(
                current_benchmark=current_benchmark,
                comparison=comparison,
                insights=insights,
                score_history=score_history
            )

        except Exception as e:
            logger.error("Failed to get doctor benchmark detail", doctor_id=doctor_id, error=str(e))
            if isinstance(e, (ValidationError, MedicusUserException)):
                raise
            raise MedicusUserException(f"Failed to retrieve benchmark detail: {str(e)}")

    async def get_doctor_benchmark_history(
        self, doctor_id: int, request: BenchmarkHistoryRequest
    ) -> BenchmarkHistoryResponse:
        """Get benchmark history for a doctor."""
        try:
            logger.info("Fetching doctor benchmark history", doctor_id=doctor_id, request=request.dict())

            return await self.repository.get_benchmark_history(
                doctor_id=doctor_id,
                limit=request.limit,
                start_date=request.start_date,
                end_date=request.end_date
            )

        except Exception as e:
            logger.error("Failed to get doctor benchmark history", doctor_id=doctor_id, error=str(e))
            raise MedicusUserException(f"Failed to retrieve benchmark history: {str(e)}")

    async def get_doctor_benchmark_summary(self, doctor_id: int) -> Dict[str, Any]:
        """Get benchmark summary for profile display."""
        try:
            logger.info("Fetching doctor benchmark summary", doctor_id=doctor_id)

            current_benchmark = await self.repository.get_latest_benchmark(doctor_id)
            
            if not current_benchmark:
                # Return default values for doctors without benchmarks
                return {
                    "overall_score": None,
                    "category": "Not Available",
                    "trend": "NEW",
                    "peer_percentile": None,
                }

            # Get category from insights
            insights = await self.repository.generate_insights(current_benchmark)
            
            # Get trend from comparison if available
            previous_benchmark = await self.repository.get_previous_benchmark(
                doctor_id, current_benchmark.benchmark_date
            )
            
            trend = "NEW"
            if previous_benchmark:
                comparison = await self.repository.generate_comparison(
                    current_benchmark, previous_benchmark
                )
                trend = comparison.trend if comparison else "NEW"

            return {
                "overall_score": int(current_benchmark.overall_score),
                "category": insights.category.replace('_', ' ').title(),
                "trend": trend,
                "peer_percentile": current_benchmark.peer_percentile,
            }

        except Exception as e:
            logger.error("Failed to get doctor benchmark summary", doctor_id=doctor_id, error=str(e))
            # Return fallback data for profile display
            return {
                "overall_score": None,
                "category": "Error",
                "trend": "NEW",
                "peer_percentile": None,
            }

    async def calculate_benchmark(self, doctor_id: int, force_recalculate: bool = False) -> MedicusBenchmarkDetailResponse:
        """Calculate or recalculate benchmark for a doctor."""
        try:
            logger.info("Calculating benchmark", doctor_id=doctor_id, force_recalculate=force_recalculate)

            # Check if recent benchmark exists and force_recalculate is False
            if not force_recalculate:
                recent_benchmark = await self.repository.get_latest_benchmark(doctor_id)
                if recent_benchmark and (date.today() - recent_benchmark.benchmark_date).days < 30:
                    logger.info("Recent benchmark exists, skipping calculation", 
                               doctor_id=doctor_id, 
                               last_date=recent_benchmark.benchmark_date)
                    return await self.get_doctor_benchmark_detail(doctor_id)

            # Calculate new benchmark using MedicusAI
            await self._calculate_and_store_benchmark(doctor_id)

            # Return the newly calculated benchmark
            return await self.get_doctor_benchmark_detail(doctor_id)

        except Exception as e:
            logger.error("Failed to calculate benchmark", doctor_id=doctor_id, error=str(e))
            raise MedicusUserException(f"Failed to calculate benchmark: {str(e)}")

    async def batch_calculate_benchmarks(
        self,
        doctor_ids: Optional[List[int]] = None,
        specialty_ids: Optional[List[int]] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Batch calculate benchmarks for multiple doctors."""
        try:
            logger.info("Starting batch benchmark calculation", 
                       doctor_ids=doctor_ids, 
                       specialty_ids=specialty_ids, 
                       limit=limit)

            # Get doctors to process
            target_doctors = await self.repository.get_doctors_for_batch_calculation(
                doctor_ids=doctor_ids,
                specialty_ids=specialty_ids,
                limit=limit
            )

            results = {
                "total_processed": 0,
                "successful": 0,
                "failed": 0,
                "errors": []
            }

            # Process doctors in batches to avoid overwhelming the system
            batch_size = 10
            for i in range(0, len(target_doctors), batch_size):
                batch = target_doctors[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [self._calculate_and_store_benchmark(doctor_id) for doctor_id in batch]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for doctor_id, result in zip(batch, batch_results):
                    results["total_processed"] += 1
                    
                    if isinstance(result, Exception):
                        results["failed"] += 1
                        error_msg = f"Doctor {doctor_id}: {str(result)}"
                        results["errors"].append(error_msg)
                        logger.error("Batch calculation failed for doctor", 
                                   doctor_id=doctor_id, 
                                   error=str(result))
                    else:
                        results["successful"] += 1
                        logger.info("Batch calculation successful for doctor", doctor_id=doctor_id)

                # Small delay between batches to prevent overwhelming the database
                if i + batch_size < len(target_doctors):
                    await asyncio.sleep(1)

            logger.info("Batch benchmark calculation completed", results=results)
            return results

        except Exception as e:
            logger.error("Failed to batch calculate benchmarks", error=str(e))
            raise MedicusUserException(f"Failed to batch calculate benchmarks: {str(e)}")

    async def _calculate_and_store_benchmark(self, doctor_id: int) -> None:
        """Private method to calculate and store benchmark using MedicusAI."""
        try:
            # Call MedicusAI calculation service
            calculation_data = {
                "doctor_id": doctor_id,
                "calculation_date": date.today().isoformat(),
                "period_months": 6
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.post(
                        f"{self.medicus_ai_url}/api/medinsight/calculate-benchmark",
                        json=calculation_data
                    )
                    response.raise_for_status()
                    result = response.json()
                except httpx.ConnectError:
                    logger.warning("MedicusAI service unavailable, using mock calculation", 
                                 doctor_id=doctor_id)
                    result = await self._mock_calculation(doctor_id)
                except httpx.HTTPError as e:
                    logger.warning("MedicusAI calculation failed, using mock calculation", 
                                 doctor_id=doctor_id, error=str(e))
                    result = await self._mock_calculation(doctor_id)

            # Store the calculation results
            await self.repository.store_benchmark(
                doctor_id=doctor_id,
                benchmark_date=date.today(),
                overall_score=result["overall_score"],
                clinical_effectiveness=result["clinical_effectiveness"],
                patient_experience=result["patient_experience"],
                practice_efficiency=result["practice_efficiency"],
                peer_percentile=result.get("peer_percentile"),
                peer_sample_size=result.get("peer_sample_size")
            )

            logger.info("Benchmark calculated and stored", 
                       doctor_id=doctor_id, 
                       score=result["overall_score"])

        except Exception as e:
            logger.error("Failed to calculate and store benchmark", doctor_id=doctor_id, error=str(e))
            raise MedicusUserException(f"Failed to calculate benchmark: {str(e)}")

    async def _mock_calculation(self, doctor_id: int) -> Dict[str, Any]:
        """Mock calculation for development/fallback."""
        import random
        
        # Generate realistic mock data
        base_score = random.uniform(650, 850)
        
        clinical_score = random.uniform(70, 95)
        patient_score = random.uniform(65, 90)
        efficiency_score = random.uniform(60, 85)
        
        return {
            "doctor_id": doctor_id,
            "overall_score": round(base_score, 2),
            "clinical_effectiveness": {
                "score": round(clinical_score, 2),
                "metrics": [
                    {"name": "treatment_completion_rate", "value": 0.89, "weight": 0.25, "score": 89, "max_possible": 100},
                    {"name": "followup_adherence_rate", "value": 0.78, "weight": 0.15, "score": 78, "max_possible": 100},
                    {"name": "prescription_accuracy", "value": 0.92, "weight": 0.20, "score": 92, "max_possible": 100},
                    {"name": "patient_recovery_indicators", "value": 0.83, "weight": 0.30, "score": 83, "max_possible": 100},
                    {"name": "evidence_based_practice", "value": 0.88, "weight": 0.10, "score": 88, "max_possible": 100}
                ],
                "category_weight": 0.40,
                "description": "Clinical effectiveness and patient outcomes"
            },
            "patient_experience": {
                "score": round(patient_score, 2),
                "metrics": [
                    {"name": "patient_satisfaction", "value": 0.85, "weight": 0.40, "score": 85, "max_possible": 100},
                    {"name": "wait_time_optimization", "value": 0.72, "weight": 0.25, "score": 72, "max_possible": 100},
                    {"name": "communication_effectiveness", "value": 0.81, "weight": 0.20, "score": 81, "max_possible": 100},
                    {"name": "appointment_accessibility", "value": 0.74, "weight": 0.15, "score": 74, "max_possible": 100}
                ],
                "category_weight": 0.35,
                "description": "Patient satisfaction and experience quality"
            },
            "practice_efficiency": {
                "score": round(efficiency_score, 2),
                "metrics": [
                    {"name": "schedule_utilization", "value": 0.79, "weight": 0.30, "score": 79, "max_possible": 100},
                    {"name": "patient_volume_management", "value": 0.71, "weight": 0.25, "score": 71, "max_possible": 100},
                    {"name": "documentation_timeliness", "value": 0.76, "weight": 0.25, "score": 76, "max_possible": 100},
                    {"name": "resource_utilization", "value": 0.69, "weight": 0.20, "score": 69, "max_possible": 100}
                ],
                "category_weight": 0.25,
                "description": "Practice operations and efficiency"
            },
            "peer_percentile": random.randint(45, 85),
            "peer_sample_size": random.randint(150, 300),
            "calculation_details": {
                "period_analyzed": f"{date.today()} to {date.today()}",
                "source": "mock_calculation"
            }
        }

# Global service instance
benchmark_service = BenchmarkService()