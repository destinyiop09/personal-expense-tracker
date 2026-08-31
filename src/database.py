import os 

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base 
from dotenv import load_dotenv 

load_dotenv()

database_url = os.getenv("Database_URL")

engine = create_engine(database_url)


local_session = sessionmaker(
   bind=engine
)

base = declarative_base()

# test the connection 
with engine.connect() as connection:
    print("Database connection successful!")