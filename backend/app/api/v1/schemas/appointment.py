from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AppointmentBase(BaseModel):
    client_id: int = Field(..., gt=0)
    starts_at: datetime
    ends_at: datetime
    notes: str | None = Field(default=None, max_length=5000)


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    client_id: int | None = Field(default=None, gt=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=5000)


class AppointmentOut(AppointmentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
