from app.database.mock_db import USER_DB

def fetch_user_data(user_id: str):
    return USER_DB.get(user_id, {})