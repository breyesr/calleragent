from fastapi import APIRouter
router = APIRouter()

@router.get("")
def list_appointments():
    return {"items": []}

@router.post("")
def create_appointment():
    return {"id": 1}
