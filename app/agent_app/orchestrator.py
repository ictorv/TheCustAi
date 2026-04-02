from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp import ClientSession
from app.agent_app.services.llm_service import call_llm
import os, sys, json


async def run_agent(user_id: str, query: str):

    server = StdioServerParameters(
        command=sys.executable,
        args=["-m", "app.mcp_server.server"],
        env={**os.environ}
    )

    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:

            await session.initialize()

            tools_result = await session.list_tools()
            tools = tools_result.tools

            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a customer support agent. "
                        "You MUST call ALL four tools in this EXACT order:\n\n"
                        "1. classify_intent(query=<the user query>)\n"
                        "2. fetch_user_data(user_id=<the user id>)\n"
                        "3. decide_action(query=<the user query>, intent=<result from step 1>)\n"
                        "4. generate_response(query=<the user query>, intent=<result from step 1>, "
                        "user_data=<result from step 2>, decision=<result from step 3>)\n\n"
                        "You MUST pass ALL arguments to each tool. "
                        "Do NOT skip any step. Do NOT call generate_response without user_data."
                    )
                },
                {
                    "role": "user",
                    "content": f"User ID: {user_id}\nQuery: {query}"
                }
            ]

            tool_outputs = {}
            max_steps = 12
            steps = 0

            while steps < max_steps:
                steps += 1
                choice = call_llm(messages, tools)

                if choice.finish_reason == "stop":
                    return {
                        "intent":   tool_outputs.get("classify_intent", "unknown"),
                        "decision": tool_outputs.get("decide_action",   "unknown"),
                        "response": tool_outputs.get("generate_response") or choice.message.content or ""
                    }

                if choice.finish_reason == "tool_calls":
                    tool_calls = choice.message.tool_calls

                    messages.append({
                        "role": "assistant",
                        "content": choice.message.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            }
                            for tc in tool_calls
                        ]
                    })

                    for tc in tool_calls:
                        try:
                            result = await session.call_tool(
                                tc.function.name,
                                json.loads(tc.function.arguments)
                            )
                            result_text = result.content[0].text if result.content else ""
                        except Exception as e:
                            result_text = f"Error executing tool {tc.function.name}: {e}"

                        tool_outputs[tc.function.name] = result_text

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result_text
                        })

            return {
                "intent":   tool_outputs.get("classify_intent", "unknown"),
                "decision": tool_outputs.get("decide_action",   "unknown"),
                "response": tool_outputs.get("generate_response", "Agent could not complete the request.")
            }