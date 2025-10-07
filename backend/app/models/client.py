from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer
from .user import Base

class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(50), index=True)
