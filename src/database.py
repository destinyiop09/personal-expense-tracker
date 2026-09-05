import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("Database_URL")

if not database_url:
    raise RuntimeError("Database_URL environment variable is not set")

# Make SQLAlchemy use psycopg 3
if database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )

engine = create_engine(database_url, pool_pre_ping=True)

local_session = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = local_session()
    try:
        yield db
    finally:
        db.close()

Base = declarative_base()