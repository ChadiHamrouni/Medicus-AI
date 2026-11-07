# 👨‍⚕️ Skill: medidoctor
> Retrieves the active doctor's own profile — specialty, credentials, and contact information.

1. **Trigger**: Use `get_doctor_profile_details` when the doctor asks about their own profile, or when metadata is needed for another workflow.
2. **Identity vs analytics**: Returns profile data only. For performance metrics, use `mediinsight`.
3. **Restriction**: Do not use for patient profiles — use `medipatient`.
