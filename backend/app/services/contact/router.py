from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, SQLModel

from app.database import get_session
from app.models import ContactMessage

router = APIRouter(tags=["Contact"])


class ContactMessageCreate(SQLModel):
    name: str
    business: Optional[str] = None
    email: str
    phone: Optional[str] = None
    businessType: Optional[str] = None
    message: Optional[str] = None
    intent: str = "contact"


@router.post("/api/contact")
def create_contact_message(
    data: ContactMessageCreate,
    session: Session = Depends(get_session)
):
    message = ContactMessage(
        name=data.name,
        business=data.business,
        email=data.email,
        phone=data.phone,
        business_type=data.businessType,
        message=data.message,
        intent=data.intent
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return {"status": "success", "message": "Message stored successfully", "id": message.id}
