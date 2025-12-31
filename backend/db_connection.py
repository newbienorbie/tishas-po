import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get PostgreSQL connection from Neon"""
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        # Use connection string
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    else:
        # Use individual variables
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT", 5432),
            cursor_factory=RealDictCursor
        )
    return conn