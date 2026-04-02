from app.services.llm_service import call_llm

def generate_response(query, category, user_data, priority="Medium"):
    query_lower = query.lower()

    # show user details if requested
    if any(word in query_lower for word in ["my balance", "account details", "my info", "show me"]):
        details = f"""
                User Name: {user_data.get('name')}
                Balance: ₹{user_data.get('balance')}
                Account Status: {user_data.get('account_status')}
                Last Transaction: {user_data.get('last_transaction')}
                """
        response = f"Here are your CI/User details:\n{details}"
    
    else:
        # otherwise generate Ai response
        prompt = f"""
                You are a ServiceNow support agent.

                Incident Description: {query}
                Category: {category}
                User Info: {user_data}
                Priority: {priority}

                Generate a helpful resolution note for this incident.
                """
        response = call_llm(prompt)

    
    if priority == "High":
        response = f"⚠️ Urgent: {response}"

    return response