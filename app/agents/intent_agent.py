from app.services.llm_service import call_llm

def classify_intent(query: str):
    prompt = f"""
    Classify the intent of the user query into one of:
    - account_issue
    - payment_issue
    - complaint
    - general_query
    - unknown

    Query: {query}

    Return only the category.
    """

    return call_llm(prompt).strip().lower()