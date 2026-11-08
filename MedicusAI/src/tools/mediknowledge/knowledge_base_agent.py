
import asyncio
from agents import Agent, trace, Runner
from agents.model_settings import ModelSettings
from src.tools.mediknowledge.knowledge import search_doctor_knowledge as hybrid_search

INSTRUCTIONS = """
You are an expert in retrieving information from a knowledge base. You are given a question or a query and you need to find the answer or the information from the knowledge base. You should consider the following factors:
"""

# Tools to be implemented
knowledge_base_agent = Agent(
    name="Knowledge Base Agent",
    instructions=INSTRUCTIONS,
    tools=[],
    model_settings=ModelSettings(tool_choice="required")
)

# Test
async def main():
    agent = Agent(
        name="Knowledge Base Agent",
        instructions="You are a helpful agent.",
        tools=[hybrid_search],
    )

    with trace("Knowledge Base example"):
        result = await Runner.run(
            agent,
            "Testing Question",
        )
        print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())