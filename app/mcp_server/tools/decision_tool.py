from app.mcp_server.mcp_instance import mcp
from app.agent_app.services.llm_service import call_llm

@mcp.tool()
def decide_action(query: str, intent: str) -> str:
    """Decide if issue should be escalated."""
    prompt = f"Query: {query}\nIntent: {intent}\n\nDecide: Resolved or Escalated. Return one word."
    return call_llm([{"role": "user", "content": prompt}]).message.content