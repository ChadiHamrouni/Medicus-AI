# 👤 Skill: medipatient
> Retrieves the current patient's profile — demographics, contact information, and identity details.

1. **Trigger**: Use `get_patient_profile_details` at session start to confirm identity, or when demographic info is needed.
2. **Routing**: If the session transitions to clinical data, hand off to `mediclinic`.
3. **Restriction**: Returns identity data only. For clinical history, use `mediclinic`. For engagement patterns, use `mediinsight`.
