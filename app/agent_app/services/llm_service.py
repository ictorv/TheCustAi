import os
from openai import OpenAI
from dotenv import load_dotenv

# app/agent_app/services/ -> up 3 levels -> app/ where .env lives
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

MODEL = "gpt-4o-mini"

def call_llm(messages: list, tools: list = None):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found. Check app/.env")

    client = OpenAI(api_key=api_key)
    kwargs = {"model": MODEL, "messages": messages, "temperature": 0.2}

    if tools:
        kwargs["tools"] = [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.inputSchema
                }
            }
            for t in tools
        ]
        kwargs["tool_choice"] = "auto"

    return client.chat.completions.create(**kwargs).choices[0]