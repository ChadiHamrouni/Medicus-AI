# 📊 Skill: mediinsight
> Aggregated analytics for the doctor's performance and patient engagement — KPI use only.

1. **Doctor metrics**: Use `get_doctor_performance_metrics` for activity stats — conversation volume, average duration, unique patients.
2. **Patient metrics**: Use `get_patient_engagement_metrics` for engagement patterns — visit frequency, vitals tracking, clinical load.
3. **Data lag**: Both tools read from hourly-refreshed views. Accuracy is ~1 hour. Communicate this when precision matters.
4. **Separation**: Identity → `medidoctor`/`medipatient`. Clinical values → `mediclinic`. KPIs → this skill.
5. **Restriction**: Read-only. Never use to drive clinical decisions.
