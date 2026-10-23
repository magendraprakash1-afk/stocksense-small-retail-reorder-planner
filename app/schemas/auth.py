from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    shop_name: Optional[str] = "My Retail Store"
    currency: Optional[str] = "USD"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"
    shop: Optional["ShopOut"] = None


class ShopCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    currency: str = "USD"
    timezone: str = "UTC"
    address: Optional[str] = None
    phone: Optional[str] = None


class ShopOut(BaseModel):
    id: str
    name: str
    currency: str
    timezone: str
    owner_id: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


TokenResponse.model_rebuild()
