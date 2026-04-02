from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.mcp_server.mcp_instance import mcp

from app.mcp_server.tools import intent_tool      # noqa
from app.mcp_server.tools import decision_tool    # noqa
from app.mcp_server.tools import response_tool    # noqa
from app.mcp_server.tools import retrieval_tool   # noqa

if __name__ == "__main__":
    mcp.run()