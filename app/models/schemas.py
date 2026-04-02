from pydantic import BaseModel

class QueryRequest(BaseModel):
    user_id: str
    query: str

class QueryResponse(BaseModel):
    intent: str
    response: str
    status: str