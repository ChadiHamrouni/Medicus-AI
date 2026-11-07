# medipatient
Retrieves the patient's own profile — demographics and identity details.

## Instructions
1. **Trigger**: Use `get_patient_profile_details` at session start to confirm identity, or when the patient asks about their own profile information.
2. **Restriction**: Returns identity data only. For clinical history, use `mediclinic`. There is no doctor or booking context in this session.
