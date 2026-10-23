from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.base import User, Shop, ShopMember
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ShopOut


class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, payload: UserRegister) -> Tuple[User, Shop, TokenResponse]:
        # Check if email exists
        res = await db.execute(select(User).where(User.email == payload.email.lower()))
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )

        # Create user
        user = User(
            name=payload.name,
            email=payload.email.lower(),
            password_hash=get_password_hash(payload.password),
            role="owner",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        # Create default shop
        shop = Shop(
            name=payload.shop_name or "My Retail Store",
            currency=payload.currency or "USD",
            timezone="UTC",
            owner_id=user.id,
        )
        db.add(shop)
        await db.flush()

        # Add owner membership
        membership = ShopMember(
            shop_id=shop.id,
            user_id=user.id,
            role="owner",
        )
        db.add(membership)
        await db.commit()
        await db.refresh(user)
        await db.refresh(shop)

        # Generate tokens
        access_token = create_access_token(subject=user.id, shop_id=shop.id, role=user.role)
        refresh_token = create_refresh_token(subject=user.id)

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserOut.model_validate(user),
            shop=ShopOut.model_validate(shop),
        )
        return user, shop, token_response

    @staticmethod
    async def authenticate_user(db: AsyncSession, payload: UserLogin) -> Tuple[User, Optional[Shop], TokenResponse]:
        res = await db.execute(select(User).where(User.email == payload.email.lower()))
        user = res.scalar_one_or_none()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        # Fetch first owned or member shop
        shop_res = await db.execute(select(Shop).where(Shop.owner_id == user.id))
        shop = shop_res.scalars().first()
        if not shop:
            member_res = await db.execute(
                select(Shop).join(ShopMember, Shop.id == ShopMember.shop_id).where(ShopMember.user_id == user.id)
            )
            shop = member_res.scalars().first()

        shop_id = shop.id if shop else None
        access_token = create_access_token(subject=user.id, shop_id=shop_id, role=user.role)
        refresh_token = create_refresh_token(subject=user.id)

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserOut.model_validate(user),
            shop=ShopOut.model_validate(shop) if shop else None,
        )
        return user, shop, token_response
