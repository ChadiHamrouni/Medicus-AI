# 💬 Skill: mediconvo
> Searches the doctor's past patient conversations by patient name or keyword.

1. **Trigger**: Use `search_conversations` when the doctor asks to find a previous conversation.
2. **Scope**: Returns only this doctor's conversations. Never fabricate results.
3. **Result handling**: Present matches with patient name, last message preview, and deep link.
4. **Restriction**: Searches conversation metadata only. For clinical data, use `mediclinic`.
