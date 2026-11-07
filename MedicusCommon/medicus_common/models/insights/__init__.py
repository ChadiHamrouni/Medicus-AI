"""Insights and analytics models for the Medicus platform."""

from medicus_common.models.insights.kpi_insights import (
    KPIInput,
    KPIOutput,
    PatientDemographics,
    PatientRetention,
    PeakHoursAnalytics,
    VisitDurationStats,
    VisitTypeBreakdown,
    WeeklyTrend,
)
from medicus_common.models.insights.kpi_summary import (
    KPISummaryInput,
    KPISummaryOutput,
)
from medicus_common.models.insights.medical_insights import (
    DifferentialModel,
    InsightMetadata,
    MedicalInsight,
    SuggestedTestModel,
)
from medicus_common.models.insights.medicus_benchmark import (
    BenchmarkCategory,
    BenchmarkComparison,
    BenchmarkHistoryRequest,
    BenchmarkHistoryResponse,
    BenchmarkInsights,
    BenchmarkTrend,
    MedicusBenchmarkDetailResponse,
    MedicusBenchmarkResponse,
)

__all__ = [
    # kpi_insights
    "KPIInput",
    "KPIOutput",
    "PatientDemographics",
    "PatientRetention",
    "PeakHoursAnalytics",
    "VisitDurationStats",
    "VisitTypeBreakdown",
    "WeeklyTrend",
    # kpi_summary
    "KPISummaryInput",
    "KPISummaryOutput",
    # medical_insights
    "DifferentialModel",
    "InsightMetadata",
    "MedicalInsight",
    "SuggestedTestModel",
    # medicus_benchmark
    "BenchmarkCategory",
    "BenchmarkComparison",
    "BenchmarkHistoryRequest",
    "BenchmarkHistoryResponse",
    "BenchmarkInsights",
    "BenchmarkTrend",
    "MedicusBenchmarkDetailResponse",
    "MedicusBenchmarkResponse",
]