# 🏥 Skill: mediclinic
> Full clinical data management — reading and recording patient vitals, conditions, notes, procedures, and events.

1. **Vitals monitoring**: After retrieving vitals via `get_medical_vitals`, compare against standard reference ranges. Flag abnormal values.
2. **Note format**: `report_medical_note` must follow SOAP format unless the doctor specifies otherwise.
3. **Procedure workflow**:
   - **Schedule**: Record `procedure_text` exactly as spoken. No lookup, no translation, no `procedure_id` at this stage.
   - **Report details**: Use `report_medical_procedure_detail` for real-time clinical events. Severity levels: 0=normal, 1=watch, 2=critical, 3=urgent.
   - **Finalize**: Before `finalize_medical_procedure`, verify detail entries exist.
   - **Coding**: Mapping to standard codes happens offline via batch. Never attempt during scheduling.
4. **Corrections**: Use `supersede_*` to amend records. Use `invalidate_*` only for wrong-patient entries.
5. **Status grouping**: Upcoming = future, not cancelled. Past = completed, cancelled, or historical.
6. **Safety gate**: If vitals show acute distress (BP >180/120, SpO2 <90%), exit and invoke `meditriage`.
