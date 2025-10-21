from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.tasks.messaging import whatsapp_send

router = APIRouter()


class WhatsAppSendRequest(BaseModel):
    to: str = Field(..., min_length=1, max_length=128)
    text: str = Field(..., min_length=1, max_length=1000)

    @field_validator("to")
    @classmethod
    def to_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Recipient must be provided")
        return trimmed

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message text must be provided")
        if len(trimmed) > 1000:
            raise ValueError("Message text must be 1000 characters or fewer")
        return trimmed


@router.post(
    "/whatsapp/send",
    status_code=status.HTTP_202_ACCEPTED,
)
def send_whatsapp_message(
    payload: WhatsAppSendRequest,
    current_user: User = Depends(get_current_user),
):
    task = whatsapp_send.delay(current_user.id, payload.to, payload.text)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"task_id": task.id, "status": "queued"},
    )
