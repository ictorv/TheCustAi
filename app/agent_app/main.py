from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.agent_app.orchestrator import run_agent
from app.agent_app.models.schemas import QueryRequest

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/handle_incident")
async def handle_incident(req: QueryRequest):
    result = await run_agent(user_id=req.user_id, query=req.query)
    return {"response": result}