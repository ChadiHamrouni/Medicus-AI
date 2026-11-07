from __future__ import annotations
from datetime import datetime, date
from typing import Optional, Dict, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from dateutil import parser as du_parser


class KPIInput(BaseModel):
    """
    Required JSON fields (the wrapper enforces presence, but values may be null):

    doctor_id   : int                – required, never null
    period      : str | null         – natural-language span ("last month"…)
    start_date  : str(date) | null   – YYYY-MM-DD  (optional)
    end_date    : str(date) | null   – YYYY-MM-DD  (optional)

    If `period` is provided, leave `start_date` & `end_date` null.
    If `period` is null, provide both dates explicitly.
    """
    doctor_id: int
    period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    @field_validator("start_date", "end_date", mode='before')
    @staticmethod
    def _parse_date(v):
        if v is not None and not isinstance(v, date):
            return du_parser.parse(v).date()
        return v

    model_config = {"extra": "forbid"}


class VisitTypeBreakdown(BaseModel):
    """Breakdown of visit types with counts."""
    consultation: int = Field(default=0, description="Number of consultation visits")
    procedure: int = Field(default=0, description="Number of procedure visits")
    follow_up: int = Field(default=0, description="Number of follow-up visits")
    other: int = Field(default=0, description="Number of other visit types")


class PeakHoursAnalytics(BaseModel):
    """Peak hours and after-hours analytics."""
    peak_hours_count: int = Field(description="Number of visits during peak hours (8am-6pm)")
    after_hours_count: int = Field(description="Number of visits after hours")
    peak_hours_percentage: float = Field(description="Percentage of visits during peak hours")
    after_hours_percentage: float = Field(description="Percentage of visits after hours")


class PatientDemographics(BaseModel):
    """Patient demographics breakdown."""
    gender_distribution: Dict[str, int] = Field(description="Gender distribution of patients")
    age_groups: Dict[str, int] = Field(description="Age group distribution of patients")


class PatientRetention(BaseModel):
    """Patient retention and repeat visit analytics."""
    unique_patients: int = Field(description="Total number of unique patients")
    repeat_patients: int = Field(description="Number of patients with multiple visits")
    repeat_patients_percentage: float = Field(description="Percentage of patients with repeat visits")
    avg_time_between_visits_days: Optional[float] = Field(description="Average days between visits per medipatient")


class VisitDurationStats(BaseModel):
    """Visit duration statistics."""
    min_duration_minutes: Optional[float] = Field(default=None, description="Minimum visit duration in minutes")
    max_duration_minutes: Optional[float] = Field(default=None, description="Maximum visit duration in minutes")
    mean_duration_minutes: Optional[float] = Field(default=None, description="Average visit duration in minutes")
    p25_duration_minutes: Optional[float] = Field(default=None, description="25th percentile duration in minutes")
    p50_duration_minutes: Optional[float] = Field(default=None, description="Median duration in minutes")
    p75_duration_minutes: Optional[float] = Field(default=None, description="75th percentile duration in minutes")


class WeeklyTrend(BaseModel):
    """Weekly trend data point."""
    week_start: str = Field(description="Week start date (YYYY-MM-DD)")
    visit_count: int = Field(description="Number of visits in this week")


class KPIOutput(BaseModel):
    """Comprehensive KPI summary output with structured data."""
    visit_type_breakdown: VisitTypeBreakdown = Field(description="Breakdown of visit types")
    peak_hours_analytics: PeakHoursAnalytics = Field(description="Peak hours and after-hours analysis")
    patient_demographics: PatientDemographics = Field(description="Patient demographics")
    patient_retention: PatientRetention = Field(description="Patient retention metrics")
    prescriptions_count: int = Field(description="Total number of prescriptions")
    exams_count: int = Field(description="Total number of medical examinations")
    visit_duration_stats: VisitDurationStats = Field(description="Visit duration statistics")
    trend_over_time_weekly: List[WeeklyTrend] = Field(description="Weekly visit trends")


