from fastapi import APIRouter
router = APIRouter()

# Placeholder endpoints for MVP wiring
@router.get("")
def list_clients():
    return {"items": []}

@router.post("")
def create_client():
    return {"id": 1}
