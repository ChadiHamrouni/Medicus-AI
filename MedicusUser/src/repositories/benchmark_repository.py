# src/repositories/benchmark_repository.py
"""Database repository for Medicus Benchmark operations."""

from datetime import date
from typing import List, Optional, Dict, Any
import json
import structlog

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import DatabaseError
from medicus_common.models.insights.medicus_benchmark import (
    MedicusBenchmarkResponse,
    BenchmarkHistoryResponse,
    BenchmarkComparison,
    BenchmarkInsights,
    categorize_score,
    get_score_range_description,
    calculate_trend
)

logger = structlog.get_logger()

class BenchmarkRepository:
    """Repository for benchmark database operations."""

    @staticmethod
    async def get_latest_benchmark(doctor_id: int) -> Optional[MedicusBenchmarkResponse]:
        """Get the latest benchmark for a doctor."""
        try:
            query = """
            SELECT * FROM insights.medicus_benchmark
            WHERE doctor_id = $1
            ORDER BY benchmark_date DESC
            LIMIT 1
            """
            
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, doctor_id)
                
                if not row:
                    return None
                
                return MedicusBenchmarkResponse(
                    id=row['id'],
                    doctor_id=row['doctor_id'],
                    benchmark_date=row['benchmark_date'],
                    overall_score=row['overall_score'],
                    clinical_effectiveness=row['clinical_effectiveness'],
                    patient_experience=row['patient_experience'],
                    practice_efficiency=row['practice_efficiency'],
                    specialty_id=row['specialty_id'],
                    country_id=row['country_id'],
                    peer_percentile=row['peer_percentile'],
                    peer_sample_size=row['peer_sample_size'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                
        except Exception as e:
            logger.error("Failed to get latest benchmark", doctor_id=doctor_id, error=str(e))
            raise DatabaseError(f"Failed to retrieve benchmark: {str(e)}")

    @staticmethod
    async def get_previous_benchmark(doctor_id: int, before_date: date) -> Optional[MedicusBenchmarkResponse]:
        """Get the previous benchmark before a given date."""
        try:
            query = """
            SELECT * FROM insights.medicus_benchmark
            WHERE doctor_id = $1 AND benchmark_date < $2
            ORDER BY benchmark_date DESC
            LIMIT 1
            """
            
            async with db_manager.get_connection() as conn:
                row = await conn.fetchrow(query, doctor_id, before_date)
                
                if not row:
                    return None
                
                return MedicusBenchmarkResponse(
                    id=row['id'],
                    doctor_id=row['doctor_id'],
                    benchmark_date=row['benchmark_date'],
                    overall_score=row['overall_score'],
                    clinical_effectiveness=row['clinical_effectiveness'],
                    patient_experience=row['patient_experience'],
                    practice_efficiency=row['practice_efficiency'],
                    specialty_id=row['specialty_id'],
                    country_id=row['country_id'],
                    peer_percentile=row['peer_percentile'],
                    peer_sample_size=row['peer_sample_size'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                
        except Exception as e:
            logger.error("Failed to get previous benchmark", doctor_id=doctor_id, error=str(e))
            raise DatabaseError(f"Failed to retrieve previous benchmark: {str(e)}")

    @staticmethod
    async def get_benchmark_history(
        doctor_id: int, 
        limit: int = 12, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> BenchmarkHistoryResponse:
        """Get benchmark history for a doctor."""
        try:
            # Build query with optional date filters
            conditions = ["doctor_id = $1"]
            params = [doctor_id]
            param_count = 1

            if start_date:
                param_count += 1
                conditions.append(f"benchmark_date >= ${param_count}")
                params.append(start_date)

            if end_date:
                param_count += 1
                conditions.append(f"benchmark_date <= ${param_count}")
                params.append(end_date)

            param_count += 1
            params.append(limit)

            query = f"""
            SELECT * FROM insights.medicus_benchmark
            WHERE {' AND '.join(conditions)}
            ORDER BY benchmark_date DESC
            LIMIT ${param_count}
            """
            
            # Count query for total
            count_query = f"""
            SELECT COUNT(*) as total FROM insights.medicus_benchmark
            WHERE {' AND '.join(conditions[:-1] if param_count > 2 else conditions)}
            """
            
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, *params)
                count_result = await conn.fetchrow(count_query, *params[:-1])
                
                benchmarks = []
                for row in rows:
                    benchmarks.append(MedicusBenchmarkResponse(
                        id=row['id'],
                        doctor_id=row['doctor_id'],
                        benchmark_date=row['benchmark_date'],
                        overall_score=row['overall_score'],
                        clinical_effectiveness=row['clinical_effectiveness'],
                        patient_experience=row['patient_experience'],
                        practice_efficiency=row['practice_efficiency'],
                        specialty_id=row['specialty_id'],
                        country_id=row['country_id'],
                        peer_percentile=row['peer_percentile'],
                        peer_sample_size=row['peer_sample_size'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    ))
                
                # Determine date range
                date_range = {"start": None, "end": None}
                if benchmarks:
                    dates = [b.benchmark_date for b in benchmarks]
                    date_range["start"] = min(dates)
                    date_range["end"] = max(dates)
                
                return BenchmarkHistoryResponse(
                    doctor_id=doctor_id,
                    benchmarks=benchmarks,
                    total_count=count_result['total'] if count_result else 0,
                    date_range=date_range
                )
                
        except Exception as e:
            logger.error("Failed to get benchmark history", doctor_id=doctor_id, error=str(e))
            raise DatabaseError(f"Failed to retrieve benchmark history: {str(e)}")

    @staticmethod
    async def store_benchmark(
        doctor_id: int,
        benchmark_date: date,
        overall_score: float,
        clinical_effectiveness: Dict[str, Any],
        patient_experience: Dict[str, Any],
        practice_efficiency: Dict[str, Any],
        peer_percentile: Optional[int] = None,
        peer_sample_size: Optional[int] = None
    ) -> int:
        """Store a new benchmark calculation."""
        try:
            query = """
            INSERT INTO insights.medicus_benchmark 
            (doctor_id, benchmark_date, overall_score, clinical_effectiveness, 
             patient_experience, practice_efficiency, specialty_id, country_id,
             peer_percentile, peer_sample_size, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 
                    (SELECT specialty_id FROM doctors WHERE id = $1),
                    (SELECT country_id FROM doctors WHERE id = $1),
                    $7, $8, NOW(), NOW())
            ON CONFLICT (doctor_id, benchmark_date) 
            DO UPDATE SET
                overall_score = EXCLUDED.overall_score,
                clinical_effectiveness = EXCLUDED.clinical_effectiveness,
                patient_experience = EXCLUDED.patient_experience,
                practice_efficiency = EXCLUDED.practice_efficiency,
                peer_percentile = EXCLUDED.peer_percentile,
                peer_sample_size = EXCLUDED.peer_sample_size,
                updated_at = NOW()
            RETURNING id
            """
            
            async with db_manager.get_connection() as conn:
                result = await conn.fetchrow(
                    query,
                    doctor_id,
                    benchmark_date,
                    overall_score,
                    json.dumps(clinical_effectiveness),
                    json.dumps(patient_experience),
                    json.dumps(practice_efficiency),
                    peer_percentile,
                    peer_sample_size
                )
                
                logger.info("Stored benchmark", doctor_id=doctor_id, benchmark_id=result['id'])
                return result['id']
                
        except Exception as e:
            logger.error("Failed to store benchmark", doctor_id=doctor_id, error=str(e))
            raise DatabaseError(f"Failed to store benchmark: {str(e)}")

    @staticmethod
    async def get_peer_scores(specialty_id: Optional[int] = None, months_back: int = 6) -> List[float]:
        """Get peer scores for percentile calculation."""
        try:
            if specialty_id:
                query = """
                SELECT overall_score 
                FROM insights.medicus_benchmark
                WHERE specialty_id = $1 
                AND benchmark_date >= CURRENT_DATE - INTERVAL '%s months'
                AND overall_score IS NOT NULL
                ORDER BY overall_score
                """
                params = [specialty_id]
            else:
                query = """
                SELECT overall_score 
                FROM insights.medicus_benchmark
                WHERE benchmark_date >= CURRENT_DATE - INTERVAL '%s months'
                AND overall_score IS NOT NULL
                ORDER BY overall_score
                """
                params = []
            
            # Format the interval string
            query = query % months_back
            
            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, *params)
                return [float(row['overall_score']) for row in rows]
                
        except Exception as e:
            logger.error("Failed to get peer scores", specialty_id=specialty_id, error=str(e))
            return []

    @staticmethod
    async def get_doctors_for_batch_calculation(
        doctor_ids: Optional[List[int]] = None,
        specialty_ids: Optional[List[int]] = None,
        limit: int = 100
    ) -> List[int]:
        """Get doctor IDs for batch benchmark calculation."""
        try:
            conditions = ["d.is_active = true"]
            params = []
            param_count = 0

            if doctor_ids:
                param_count += 1
                conditions.append(f"d.id = ANY(${param_count})")
                params.append(doctor_ids)

            if specialty_ids:
                param_count += 1
                conditions.append(f"d.specialty_id = ANY(${param_count})")
                params.append(specialty_ids)

            param_count += 1
            params.append(limit)

            query = f"""
            SELECT d.id 
            FROM doctors d
            WHERE {' AND '.join(conditions)}
            ORDER BY d.id
            LIMIT ${param_count}
            """

            async with db_manager.get_connection() as conn:
                rows = await conn.fetch(query, *params)
                return [row['id'] for row in rows]

        except Exception as e:
            logger.error("Failed to get doctors for batch calculation", error=str(e))
            raise DatabaseError(f"Failed to get doctors for batch calculation: {str(e)}")

    @staticmethod
    async def generate_comparison(
        current_benchmark: MedicusBenchmarkResponse,
        previous_benchmark: Optional[MedicusBenchmarkResponse]
    ) -> Optional[BenchmarkComparison]:
        """Generate comparison between current and previous benchmark."""
        if not previous_benchmark:
            return None

        score_change = current_benchmark.overall_score - previous_benchmark.overall_score
        percentage_change = (score_change / previous_benchmark.overall_score) * 100 if previous_benchmark.overall_score else 0
        
        trend = calculate_trend(current_benchmark.overall_score, previous_benchmark.overall_score)
        
        days_between = (current_benchmark.benchmark_date - previous_benchmark.benchmark_date).days

        return BenchmarkComparison(
            current_score=current_benchmark.overall_score,
            previous_score=previous_benchmark.overall_score,
            score_change=round(score_change, 1),
            percentage_change=round(percentage_change, 1),
            trend=trend,
            current_date=current_benchmark.benchmark_date,
            previous_date=previous_benchmark.benchmark_date,
            days_between=days_between
        )

    @staticmethod
    async def generate_insights(
        benchmark: MedicusBenchmarkResponse,
        comparison: Optional[BenchmarkComparison] = None
    ) -> BenchmarkInsights:
        """Generate insights based on benchmark data."""
        category = categorize_score(benchmark.overall_score)
        score_range = get_score_range_description(category)

        # Generate strengths and improvement areas based on scores
        key_strengths = []
        improvement_areas = []

        # Analyze clinical effectiveness
        if benchmark.clinical_effectiveness and isinstance(benchmark.clinical_effectiveness, dict):
            clinical_score = benchmark.clinical_effectiveness.get('score', 0)
            if clinical_score >= 85:
                key_strengths.append('Strong clinical effectiveness and patient outcomes')
            elif clinical_score < 70:
                improvement_areas.append('Focus on improving clinical effectiveness metrics')

        # Analyze patient experience
        if benchmark.patient_experience and isinstance(benchmark.patient_experience, dict):
            patient_score = benchmark.patient_experience.get('score', 0)
            if patient_score >= 85:
                key_strengths.append('Excellent patient satisfaction and experience')
            elif patient_score < 70:
                improvement_areas.append('Enhance patient experience and satisfaction')

        # Analyze practice efficiency
        if benchmark.practice_efficiency and isinstance(benchmark.practice_efficiency, dict):
            efficiency_score = benchmark.practice_efficiency.get('score', 0)
            if efficiency_score >= 85:
                key_strengths.append('Highly efficient practice operations')
            elif efficiency_score < 70:
                improvement_areas.append('Optimize practice efficiency and workflow')

        # Default values if nothing specific found
        if not key_strengths:
            key_strengths.append('Consistent quality of care delivery')

        if not improvement_areas and category != 'EXCELLENT':
            improvement_areas.append('Continue maintaining high professional standards')

        # Generate peer comparison text
        peer_comparison = None
        if benchmark.peer_percentile and benchmark.peer_sample_size:
            peer_comparison = f"Performing better than {benchmark.peer_percentile}% of {benchmark.peer_sample_size} peers in your specialty"

        return BenchmarkInsights(
            category=category,
            score_range=score_range,
            key_strengths=key_strengths,
            improvement_areas=improvement_areas,
            peer_comparison=peer_comparison,
            specialty_benchmark=720.0  # Could be calculated from actual data
        )
