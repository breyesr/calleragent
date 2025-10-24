from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.messaging.providers import get_provider_factory
from app.models.user import User
from app.tasks.messaging import send_message

router = APIRouter()


class MessagePayload(BaseModel):
    to: str = Field(..., description="Destination phone number including country code")
    text: str = Field(..., min_length=1, max_length=2000, description="Plain-text message body")


@router.post("/whatsapp/send", status_code=status.HTTP_202_ACCEPTED)
def enqueue_whatsapp_message(payload: MessagePayload, current_user: User = Depends(get_current_user)):
    factory = get_provider_factory()
    provider = factory.get()

    task = send_message.delay(
        provider.name,
        {
            "user_id": current_user.id,
            "to": payload.to,
            "text": payload.text,
        },
    )

    return {"task_id": task.id, "status": "queued"}
