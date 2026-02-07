from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./caseforces.db"

Base = declarative_base()

class Friend(Base):
    __tablename__ = "friends"
    id = Column(Integer, primary_key=True, index=True)
    my_handle = Column(String)
    friend_handle = Column(String)
    __table_args__ = (UniqueConstraint('my_handle', 'friend_handle', name='_my_friend_uc'),)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_handle = Column(String)
    contest_id = Column(Integer)
    problem_index = Column(String)
    problem_name = Column(String)
    is_subscription = Column(Integer, default=0) # 1 if contest reminder

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String)
    receiver = Column(String)
    content = Column(String)
    timestamp = Column(Integer)

class Blog(Base):
    __tablename__ = "blogs"
    id = Column(Integer, primary_key=True, index=True)
    author_handle = Column(String)
    title = Column(String)
    content = Column(String)
    timestamp = Column(Integer)

class UserSetting(Base):
    __tablename__ = "settings"
    user_handle = Column(String, primary_key=True)
    theme = Column(String, default="dark-theme")
    primary_handle = Column(String)
    favorite_tags = Column(String, default="") # Comma-separated
    goal_rating = Column(Integer, default=0)

class ProblemTask(Base):
    __tablename__ = "problem_tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_handle = Column(String, index=True)
    problem_id = Column(String) # contestId + index
    problem_name = Column(String)
    task_type = Column(String) # 'bookmark' or 'todo'
    timestamp = Column(Integer)

class ProblemNote(Base):
    __tablename__ = "problem_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_handle = Column(String, index=True)
    problem_id = Column(String)
    content = Column(String)
    timestamp = Column(Integer)

class CodeTemplate(Base):
    __tablename__ = "code_templates"
    id = Column(Integer, primary_key=True, index=True)
    user_handle = Column(String, index=True)
    name = Column(String)
    language = Column(String)
    code = Column(String)

class ContestSubscription(Base):
    __tablename__ = "contest_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_handle = Column(String, index=True)
    contest_id = Column(Integer)
    contest_name = Column(String)
    start_time = Column(Integer)
    notified = Column(Integer, default=0) # Using 0/1 for SQLlite boolean

# Database setup logic (simplified for this turn)
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
