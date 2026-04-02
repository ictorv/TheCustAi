from app.mcp_server.mcp_instance import mcp
from app.agent_app.services.llm_service import call_llm

@mcp.tool()
def generate_response(query: str, intent: str, user_data: dict, decision: str) -> str:
    """Generate final support response."""
    prompt = f"""User Query: {query}
                Intent: {intent}
                User Data: {user_data}
                Decision: {decision}

                Generate a helpful customer support response."""
    return call_llm([{"role": "user", "content": prompt}]).message.content