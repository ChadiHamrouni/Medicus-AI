# 📋 Skill: medibrief
> Generates a structured clinical summary of the current doctor-patient conversation.

1. **Trigger**: Only call `medibrief_summarize` when the doctor explicitly requests a summary, or when the conversation is closing.
2. **Scope**: Covers this conversation only. Do not reference prior conversations or inferred history.
3. **Output**: Present the summary to the doctor for review.
4. **Restriction**: Do not use for patient-facing explanations — that is `mediexplain` (patient assistants only).
