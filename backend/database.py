from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import config

engine = create_engine(
    f"sqlite:///{config.DB_PATH}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ────────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String, unique=True, index=True, nullable=False)
    email      = Column(String, nullable=True)
    hashed_pw  = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VaultModel(Base):
    __tablename__ = "vault"
    id             = Column(Integer, primary_key=True, default=1)
    name           = Column(String, nullable=False, default="My Vault")
    setup_complete = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DocumentModel(Base):
    __tablename__ = "documents"
    id         = Column(String, primary_key=True)   # UUID
    name       = Column(String, nullable=False)
    size       = Column(Integer, nullable=False)
    type       = Column(String, nullable=False)
    status     = Column(String, default="processing")  # processing | ready | error
    page_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MessageModel(Base):
    __tablename__ = "messages"
    id         = Column(String, primary_key=True)   # UUID
    role       = Column(String, nullable=False)      # user | assistant
    content    = Column(Text, nullable=False)
    sources    = Column(Text, nullable=True)         # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
