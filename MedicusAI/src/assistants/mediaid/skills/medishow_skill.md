# 🖥️ Skill: medishow
> UI navigation — triggers frontend navigation to the doctor profile page.

1. **Trigger**: Use `show_doctor_page` when the patient asks to view their doctor's profile, or as a natural close after discussing doctor details.
2. **Recognized intents**: "Show me my doctor", "Open the doctor's profile", "Let me see Dr. [Name]", "Go to my doctor's page".
3. **Action semantics**: Sends a navigation signal to the frontend only — read-only. Does not retrieve data. Use `medidoctor` for profile data reads.
4. **Handoff**: After triggering navigation, return control to the main agent. Do not chain additional tool calls after a show action.
