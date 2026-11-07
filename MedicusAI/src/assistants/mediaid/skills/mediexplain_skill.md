# 💬 Skill: mediexplain
> Medical explanation — converts clinical instructions and diagnoses into plain patient language.

1. **Trigger**: Use `mediexplain_explain` when the patient asks "What does this mean?", "What did my doctor say?", "What should I do next?", or needs a prescription or diagnosis explained.
2. **Scope**: Covers only what the doctor communicated in this conversation — medications, diagnosis, follow-up steps, warning signs.
3. **Boundaries**:
   - Do NOT generate medical advice beyond what the doctor communicated.
   - Do NOT correct or challenge clinical records.
   - Do NOT use for general health education unrelated to this patient's care.
4. **Output**: Present the plain-language explanation directly to the patient. Use empathetic, accessible language. Avoid medical jargon.
