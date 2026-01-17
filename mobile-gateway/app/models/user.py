"""
User models for Mobile API Gateway.

These models provide mobile-optimized views of user data.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MinimalUser(BaseModel):
    """
    Minimal user representation for list views and references.

    Reduces payload size by including only essential fields.
    """

    id: str
    name: str
    image: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """
    Full user profile for detailed views.
    """

    id: str
    name: str
    email: str
    image: Optional[str] = None
    email_verified: bool = Field(False, alias="emailVerified")
    is_admin: bool = Field(False, alias="isAdmin")
    plan: str = "free"
    subscription_status: Optional[str] = Field(None, alias="subscriptionStatus")
    bio: Optional[str] = None
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class UserProfileUpdate(BaseModel):
    """
    Request model for updating user profile.
    """

    name: Optional[str] = None
    image: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        populate_by_name = True


class UserSubscription(BaseModel):
    """User subscription information."""

    plan: str = "free"
    status: Optional[str] = None
    expires_at: Optional[datetime] = Field(None, alias="expiresAt")
    stripe_customer_id: Optional[str] = Field(None, alias="stripeCustomerId")

    class Config:
        from_attributes = True
        populate_by_name = True


class AuthToken(BaseModel):
    """Authentication token response."""

    access_token: str = Field(..., alias="accessToken")
    token_type: str = Field("Bearer", alias="tokenType")
    expires_in: int = Field(..., alias="expiresIn")
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    user: MinimalUser

    class Config:
        populate_by_name = True


class DeviceInfo(BaseModel):
    """Mobile device information for analytics and push notifications."""

    device_id: str = Field(..., alias="deviceId")
    platform: str  # "ios", "android", "web"
    os_version: Optional[str] = Field(None, alias="osVersion")
    app_version: Optional[str] = Field(None, alias="appVersion")
    push_token: Optional[str] = Field(None, alias="pushToken")
    timezone: Optional[str] = None
    locale: Optional[str] = None

    class Config:
        populate_by_name = True
