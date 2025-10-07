from pydantic import BaseModel, ConfigDict, Field


class ClientBase(BaseModel):
    name: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)


class ClientOut(ClientBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
