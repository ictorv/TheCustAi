def decide_action(category: str, query: str, response: str):

    query_lower = query.lower()
    urgent_words = ["urgent", "immediately", "asap", "as soon as possible"]


    is_urgent = any(word in query_lower for word in urgent_words)      # urgency

  
    assignment_group = "Support Team"       # default assignment & state
    state = "Resolved"
    priority = "Medium"

   
    if category == "unknown" or "not sure" in response.lower() or is_urgent:    # escalate conditions
        assignment_group = "Admin / Escalation Team"
        state = "Escalated"
        priority = "High" if is_urgent else "Medium"

    return assignment_group, priority, state