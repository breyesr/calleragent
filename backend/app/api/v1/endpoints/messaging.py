from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.tasks.messaging import send as messaging_send

router = APIRouter(prefix="/messaging", tags=["messaging"])


class WhatsAppPayload(BaseModel):
    to: str = Field(..., min_length=3, max_length=64)
    text: str = Field(..., min_length=1, max_length=1000)


@router.post("/whatsapp/send", status_code=status.HTTP_202_ACCEPTED)
def enqueue_whatsapp_message(payload: WhatsAppPayload, current_user: User = Depends(get_current_user)) -> dict[str, str]:
    task = messaging_send.delay(current_user.id, payload.to, payload.text)
    return {"task_id": task.id, "status": "queued"}
