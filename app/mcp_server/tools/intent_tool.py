from app.mcp_server.mcp_instance import mcp
from app.agent_app.services.llm_service import call_llm

@mcp.tool()
def classify_intent(query: str) -> str:
    """Classify user intent."""
    prompt = f"""Classify this query into one category:
                account_issue / payment_issue / complaint / general_query / unknown

                Query: {query}
                Return only the category."""
    return call_llm([{"role": "user", "content": prompt}]).message.content