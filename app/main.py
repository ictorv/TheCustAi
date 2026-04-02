from fastapi import FastAPI
from app.models.schemas import QueryRequest, QueryResponse

from app.agents.intent_agent import classify_intent
from app.agents.retrieval_agent import fetch_user_data
from app.agents.response_agent import generate_response
from app.agents.decision_agent import decide_action
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(title="Agent-Based Customer Support System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/handle_incident", response_model=QueryResponse)
def handle_incident(request: QueryRequest):
    
    # Step 1: Classify Category (Intent)
    category = classify_intent(request.query)

    # Step 2: Fetch User / CI Data
    user_data = fetch_user_data(request.user_id)

    # Step 3: Generate AI response preview (for checking confidence)
    response_preview = generate_response(request.query, category, user_data)

    # Step 4: Decide Assignment, Priority, State
    assignment_group, priority, state = decide_action(category, request.query, response_preview)

    # Step 5: Generate Final Response
    final_response = generate_response(request.query, category, user_data, priority)

    # Step 6: If escalated, clearly indicate admin involvement
    if state == "Escalated" and category == "unknown":
        final_response += "\nThis query could not be automatically resolved and has been escalated to a human admin."

    return QueryResponse(
        intent=category,
        response=f"{final_response}\nAssigned to: {assignment_group}",
        status=state
    )