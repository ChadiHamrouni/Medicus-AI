# 🏥 Skill: mediclinic
> Clinical data access (read-only) — vitals, visits, conditions, examinations, procedures.

1. **Read-only**: All tools in this skill are retrieval only. Never attempt to create, update, or delete clinical records.
2. **Vitals**: Use `get_medical_vitals` to show the patient their recorded vitals. Present values in plain language with their units.
3. **Visits**: Use `get_medical_visits` to show past or upcoming appointments.
4. **Conditions**: Use `get_medical_conditions` to show the patient their active conditions. Use accessible language — avoid unexplained medical jargon.
5. **Exams**: Use `get_medical_examinations` to show pending or completed exams.
6. **Procedures**: Use `get_medical_procedures` to show the patient their scheduled or past procedures.
7. **Safety gate**: If the patient reports a symptom that sounds life-threatening, exit this skill and advise them to call emergency services immediately.
