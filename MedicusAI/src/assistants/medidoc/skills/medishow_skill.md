# 🖥️ Skill: medishow
> Triggers UI navigation to the current patient's profile page in MediApp.

1. **Trigger**: Use `show_patient_page` when the doctor asks to navigate to the patient's profile, or at the natural close of a workflow.
2. **Recognized intents**: "Show me the patient", "Open their profile", "Pull up the patient chart".
3. **Action semantics**: Sends a navigation signal to the frontend only. Does not retrieve data. Use `medipatient` for profile reads.
4. **Handoff**: After triggering navigation, return control. Do not chain additional tool calls.
