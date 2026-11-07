from typing import AsyncIterator

from src.handlers.helpers.common.handler_helper import _normalize_history
from agents import Runner
from agents.exceptions import InputGuardrailTripwireTriggered
from medicus_common.core.logging_config import logger
from src.utils.estimate_token import _estimate_tokens, _estimate_tools_tokens, _estimate_messages_tokens

GUARDRAIL_REFUSAL = (
    "I'm unable to process that request. "
    "Please keep our conversation focused on medical topics and avoid attempts to modify my behavior."
)

async def run_text(
    text_input: str,
    agent,
    history: list | None = None,
    context: dict | None = None,
):
    """Run the OpenAI Agent with existing history."""
    try:
        normalized_history = _normalize_history(history or [])
        final_input = normalized_history + [
            {"role": "user", "content": text_input}
        ]

        # ============================================
        # LOG CONTEXT SIZE FOR DEBUGGING
        # ============================================
        logger.info("=" * 80)
        logger.info("📊 CONTEXT SIZE ESTIMATE (tokens ≈ chars/4)")
        logger.info("=" * 80)
        
        # System prompt / instructions
        instructions = getattr(agent, 'instructions', '') or ''
        instructions_tokens = _estimate_tokens(instructions)
        logger.info(f"   📝 System Instructions: {len(instructions):,} chars ≈ {instructions_tokens:,} tokens")
        
        # Tools
        tools = getattr(agent, 'tools', []) or []
        tools_tokens = _estimate_tools_tokens(tools)
        logger.info(f"   🔧 Tools ({len(tools)} tools): ≈ {tools_tokens:,} tokens")
        
        # History messages
        history_tokens = _estimate_messages_tokens(normalized_history)
        logger.info(f"   📜 History ({len(normalized_history)} messages): ≈ {history_tokens:,} tokens")
        
        # Current user input
        input_tokens = _estimate_tokens(text_input)
        logger.info(f"   💬 Current Input: {len(text_input):,} chars ≈ {input_tokens:,} tokens")
        
        # Total
        total_tokens = instructions_tokens + tools_tokens + history_tokens + input_tokens
        logger.info("-" * 80)
        logger.info(f"   📈 TOTAL ESTIMATED: ≈ {total_tokens:,} tokens")
        logger.info("=" * 80)

        result = await Runner.run(
            starting_agent=agent,
            input=final_input,
            context=context,
        )
        # logger.debug(f"Agent run completed with final output: {getattr(result, 'final_output', None)}")
        # logger.debug(f"Agent run details: {result}")
        return result

    except InputGuardrailTripwireTriggered as e:
        logger.warning(f"run_text guardrail triggered: {e}")
        return GUARDRAIL_REFUSAL

    except Exception as e:
        logger.error(f"run_text error: {e}")
        import traceback
        traceback.print_exc()
        return None

