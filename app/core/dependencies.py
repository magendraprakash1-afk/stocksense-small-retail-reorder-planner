from typing import Optional, List
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_token
from app.models.base import User, Shop, ShopMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Retrieve currently authenticated user from Bearer token."""
    raw_token = token
    if not raw_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            raw_token = parts[1]

    if not raw_token:
        # Fallback to dev/mock user if token not provided, or raise 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(raw_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject missing.",
        )

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated.",
        )
    return user


async def get_current_shop(
    x_shop_id: Optional[str] = Header(None, alias="X-Shop-Id"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Shop:
    """
    Tenant isolation dependency:
    Ensures every request is strictly bound to a valid Shop that the current user owns or is a member of.
    """
    if x_shop_id:
        # Validate shop access
        stmt = select(Shop).where(
            Shop.id == x_shop_id,
            (Shop.owner_id == current_user.id) | (Shop.members.any(ShopMember.user_id == current_user.id))
        )
        res = await db.execute(stmt)
        shop = res.scalar_one_or_none()
        if shop:
            return shop

    # Fallback to user's first owned shop or membership shop
    stmt = select(Shop).where(Shop.owner_id == current_user.id).order_by(Shop.created_at.asc())
    res = await db.execute(stmt)
    shop = res.scalars().first()
    if shop:
        return shop

    # Check memberships
    stmt = select(Shop).join(ShopMember, Shop.id == ShopMember.shop_id).where(ShopMember.user_id == current_user.id)
    res = await db.execute(stmt)
    shop = res.scalars().first()
    if shop:
        return shop

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No active shop found for this user. Please create a shop first.",
    )


def require_role(allowed_roles: List[str]):
    """Decorator/Dependency factory to enforce role-based access control."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker
