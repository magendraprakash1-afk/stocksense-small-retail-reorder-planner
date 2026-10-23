from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_shop
from app.core.security import decode_token, create_access_token
from app.models.base import User, Shop
from app.schemas.common import ApiResponse
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ShopOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new store owner and initialize default store."""
    user, shop, token_data = await AuthService.register_user(db, payload)
    return ApiResponse(
        success=True,
        data=token_data,
        message="Account and store registered successfully."
    )


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user with email and password."""
    user, shop, token_data = await AuthService.authenticate_user(db, payload)
    return ApiResponse(
        success=True,
        data=token_data,
        message="Login successful."
    )


@router.get("/me", response_model=ApiResponse[dict])
async def get_me(
    current_user: User = Depends(get_current_user),
    current_shop: Shop = Depends(get_current_shop)
):
    """Retrieve profile and active shop context for the authenticated user."""
    return ApiResponse(
        success=True,
        data={
            "user": UserOut.model_validate(current_user),
            "shop": ShopOut.model_validate(current_shop)
        }
    )


@router.post("/refresh", response_model=ApiResponse[dict])
async def refresh_token(payload: dict, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access token."""
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required.")
    
    decoded = decode_token(token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user_id = decoded.get("sub")
    new_access = create_access_token(subject=user_id)
    return ApiResponse(
        success=True,
        data={"access_token": new_access, "token_type": "bearer"}
    )
