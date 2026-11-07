# mediinsight
Aggregated analytics for the doctor's own performance and their patients' engagement — KPI and population health review.

## Instructions
1. **Doctor metrics**: Use `get_doctor_performance_metrics` when the doctor asks about their own activity — conversation volume, average duration, unique patient count.
2. **Patient metrics**: Use `get_patient_engagement_metrics` when the doctor wants to review a specific patient's engagement pattern outside of an active consultation — visit frequency, tracking consistency, clinical load.
3. **Data lag**: Both views are refreshed hourly. Data accuracy is ~1 hour. Communicate this when precision matters.
4. **Restriction**: Read-only analytics only. No clinical decisions should be driven by this data alone.
