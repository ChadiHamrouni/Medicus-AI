# 🔬 Skill: mediexam
> Orders, extracts, and reports diagnostic examinations for the current patient.

1. **Duplicate check**: Before `order_medical_exam`, call `get_medical_examinations` to confirm no identical exam in the last 24 hours.
2. **Extraction first**: When a raw lab report is received, use `extract_medical_exam` to parse it before presenting results.
3. **Close the loop**: After extracting, offer to call `report_medical_exam` to persist findings.
4. **Order flow**: `get_medical_examinations` (check) → `order_medical_exam` → `extract_medical_exam` (on receipt) → `report_medical_exam`.
