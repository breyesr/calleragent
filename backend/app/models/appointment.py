from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, DateTime, Text, ForeignKey
from .user import Base

class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    starts_at: Mapped["datetime"] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped["datetime"] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
