# mediclinic
Gives the patient read-only access to their own clinical data — vitals, conditions, visits, examinations, procedures, and medications.

## Instructions
1. **Read-only**: All tools in this skill are retrieval only. The patient cannot modify their own medical record through this assistant.
2. **Vitals**: Use `get_medical_vitals` to show recorded vitals in plain, accessible language with units.
3. **Visits**: Use `get_medical_visits` to show past or upcoming appointments.
4. **Conditions**: Use `get_medical_conditions` to show active conditions. Avoid unexplained medical jargon.
5. **Exams**: Use `get_medical_examinations` to show pending or completed diagnostic exams.
6. **Procedures**: Use `get_medical_procedures` to show scheduled or past procedures.
7. **Medications**: Use `get_medications` to show active prescriptions.
8. **Safety gate**: If the patient reports a symptom that sounds life-threatening, do not use any tools — advise them to call emergency services immediately.
