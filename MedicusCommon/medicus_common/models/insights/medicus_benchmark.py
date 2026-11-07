# medicus_common/models/medicus_benchmark.py
"""Medicus Benchmark API Models."""

from datetime import datetime, date
from typing import Optional, Dict, Any
import json

from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum

from medicus_common.models.base import BaseResponseModel


class BenchmarkTrend(str, Enum):
    """Benchmark score trend."""
    IMPROVING = 'IMPROVING'
    DECLINING = 'DECLINING' 
    STABLE = 'STABLE'
    NEW = 'NEW'


class BenchmarkCategory(str, Enum):
    """Benchmark score categories."""
    EXCELLENT = 'EXCELLENT'  # 850-900
    VERY_GOOD = 'VERY_GOOD'  # 750-849
    GOOD = 'GOOD'  # 650-749
    FAIR = 'FAIR'  # 550-649
    POOR = 'POOR'  # 300-549


class MedicusBenchmarkResponse(BaseResponseModel):
    """Medicus Benchmark response model."""
    id: int = Field(..., description="Benchmark ID")
    doctor_id: int = Field(..., description="Doctor ID")
    benchmark_date: date = Field(..., description="Benchmark date")
    overall_score: Optional[float] = Field(None, description="Overall benchmark score (0-900)")
    clinical_effectiveness: Optional[Dict[str, Any]] = Field(None, description="Clinical effectiveness metrics")
    patient_experience: Optional[Dict[str, Any]] = Field(None, description="Patient experience metrics")  
    practice_efficiency: Optional[Dict[str, Any]] = Field(None, description="Practice efficiency metrics")
    specialty_id: Optional[int] = Field(None, description="Specialty ID")
    country_id: Optional[int] = Field(None, description="Country ID")
    peer_percentile: Optional[int] = Field(None, description="Peer percentile ranking")
    peer_sample_size: Optional[int] = Field(None, description="Peer sample size")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

    @field_validator("clinical_effectiveness", "patient_experience", "practice_efficiency", mode="before")
    @classmethod
    def _decode_jsonb(cls, v):
        # asyncpg returns jsonb columns as text
        return json.loads(v) if isinstance(v, str) else v


class BenchmarkComparison(BaseModel):
    """Benchmark comparison between two periods."""
    current_score: Optional[float] = Field(None, description="Current overall score")
    previous_score: Optional[float] = Field(None, description="Previous overall score") 
    score_change: Optional[float] = Field(None, description="Score change (current - previous)")
    percentage_change: Optional[float] = Field(None, description="Percentage change")
    trend: BenchmarkTrend = Field(BenchmarkTrend.NEW, description="Score trend")
    current_date: Optional[date] = Field(None, description="Current benchmark date")
    previous_date: Optional[date] = Field(None, description="Previous benchmark date")
    days_between: Optional[int] = Field(None, description="Days between benchmarks")


class BenchmarkInsights(BaseModel):
    """Detailed benchmark insights."""
    category: BenchmarkCategory = Field(..., description="Score category")
    score_range: str = Field(..., description="Score range description")
    key_strengths: list[str] = Field(default_factory=list, description="Key areas of strength")
    improvement_areas: list[str] = Field(default_factory=list, description="Areas for improvement")
    peer_comparison: Optional[str] = Field(None, description="Peer comparison summary")
    specialty_benchmark: Optional[float] = Field(None, description="Specialty average score")


class MedicusBenchmarkDetailResponse(BaseResponseModel):
    """Detailed Medicus Benchmark response with comparisons."""
    current_benchmark: MedicusBenchmarkResponse = Field(..., description="Current benchmark data")
    comparison: Optional[BenchmarkComparison] = Field(None, description="Comparison with previous benchmark")
    insights: BenchmarkInsights = Field(..., description="Benchmark insights and analysis")
    score_history: list[Dict[str, Any]] = Field(default_factory=list, description="Historical score data for charts")


class BenchmarkHistoryRequest(BaseModel):
    """Request for benchmark history."""
    doctor_id: int = Field(..., description="Doctor ID")
    limit: int = Field(default=12, ge=1, le=50, description="Number of records to return")
    start_date: Optional[date] = Field(None, description="Start date filter")
    end_date: Optional[date] = Field(None, description="End date filter")


class BenchmarkHistoryResponse(BaseResponseModel):
    """Benchmark history response."""
    doctor_id: int = Field(..., description="Doctor ID")
    benchmarks: list[MedicusBenchmarkResponse] = Field(..., description="Historical benchmarks")
    total_count: int = Field(..., description="Total number of benchmarks")
    date_range: Dict[str, Optional[date]] = Field(..., description="Date range of data")


def categorize_score(score: Optional[float]) -> BenchmarkCategory:
    """Categorize a benchmark score."""
    if score is None:
        return BenchmarkCategory.POOR
    
    if score >= 850:
        return BenchmarkCategory.EXCELLENT
    elif score >= 750:
        return BenchmarkCategory.VERY_GOOD  
    elif score >= 650:
        return BenchmarkCategory.GOOD
    elif score >= 550:
        return BenchmarkCategory.FAIR
    else:
        return BenchmarkCategory.POOR


def get_score_range_description(category: BenchmarkCategory) -> str:
    """Get score range description for a category."""
    ranges = {
        BenchmarkCategory.EXCELLENT: "850-900 (Excellent)",
        BenchmarkCategory.VERY_GOOD: "750-849 (Very Good)",
        BenchmarkCategory.GOOD: "650-749 (Good)",
        BenchmarkCategory.FAIR: "550-649 (Fair)",
        BenchmarkCategory.POOR: "300-549 (Needs Improvement)"
    }
    return ranges.get(category, "Unknown")


def calculate_trend(current: Optional[float], previous: Optional[float]) -> BenchmarkTrend:
    """Calculate trend between two scores."""
    if previous is None:
        return BenchmarkTrend.NEW
    if current is None:
        return BenchmarkTrend.STABLE
    
    change = current - previous
    if abs(change) < 5:  # Less than 5 points change is considered stable
        return BenchmarkTrend.STABLE
    elif change > 0:
        return BenchmarkTrend.IMPROVING
    else:
        return BenchmarkTrend.DECLINING