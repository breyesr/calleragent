from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.tasks.messaging import send


class WhatsappMessage(BaseModel):
    to: str
    text: str


router = APIRouter()


@router.post("/whatsapp/send", status_code=status.HTTP_202_ACCEPTED)
def enqueue_whatsapp_message(payload: WhatsappMessage, _: User = Depends(get_current_user)) -> dict[str, str]:
    task = send.delay(payload.model_dump())
    return {"task_id": task.id}
