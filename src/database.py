import os 

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base 
from dotenv import load_dotenv 

load_dotenv()

database_url = os.getenv("Database_URL")

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

