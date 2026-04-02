from app.mcp_server.mcp_instance import mcp
from app.mcp_server.database.mock_db import USER_DB

@mcp.tool()
def fetch_user_data(user_id: str) -> dict:
    """Retrieve user information."""
    return USER_DB.get(user_id, {})