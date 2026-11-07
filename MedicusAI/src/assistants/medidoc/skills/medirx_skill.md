# 💊 Skill: medirx
> Manages patient prescriptions — reviewing active medications and creating or removing prescriptions.

1. **Pre-flight**: Before `create_prescription`, call `get_medications` to review active medications AND allergies.
2. **Safety checks**: Cross-reference the new drug against active medications (duplicates/interactions), allergies, and conditions.
3. **Flag first**: Surface any risk to the doctor before proceeding. Do not proceed past a flag silently.
4. **Confirmation gate**: Summarize drug, dosage, and duration for verbal confirmation before finalizing.
5. **Restriction**: Only use tools in this skill for medication workflows.
