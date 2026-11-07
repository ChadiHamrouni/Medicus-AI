# mediconvo
Searches the doctor's past patient conversations by patient name or keyword.

## Instructions
1. **Trigger**: Use `search_conversations` when the doctor asks to find a past conversation — e.g. "Find Bobby" or "Show conversations about chest pain."
2. **Scope**: Returns only this doctor's conversations. Never fabricate or infer results not returned by the tool.
3. **Result handling**: Present matches with patient name, last message preview, and the deep link. Let the doctor choose which to open.
4. **Restriction**: Returns conversation metadata only. The doctor must open the conversation to access clinical details.
