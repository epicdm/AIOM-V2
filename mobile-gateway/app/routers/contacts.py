"""
Contacts Sync Router for Mobile API Gateway.

Provides endpoints for syncing Odoo contacts to mobile devices.
Handles incremental updates, conflict resolution, and offline access.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..config import settings
from ..models.responses import MobileResponse
from ..models.sync import (
    ConflictResolution,
    SyncOperation,
    SyncStatus,
)
from ..models.user import UserProfile
from ..services.auth import require_auth
from ..services.database import execute_query, execute_one

router = APIRouter(prefix="/contacts", tags=["Contact Sync"])


# =============================================================================
# Models
# =============================================================================


class ContactAddress(BaseModel):
    """Contact address information."""

    street: Optional[str] = None
    street2: Optional[str] = None
    city: Optional[str] = None
    state_id: Optional[int] = Field(None, alias="stateId")
    state_name: Optional[str] = Field(None, alias="stateName")
    zip: Optional[str] = None
    country_id: Optional[int] = Field(None, alias="countryId")
    country_name: Optional[str] = Field(None, alias="countryName")

    class Config:
        populate_by_name = True


class SyncedContact(BaseModel):
    """Synced contact model."""

    id: str
    odoo_partner_id: int = Field(..., alias="odooPartnerId")
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    street: Optional[str] = None
    street2: Optional[str] = None
    city: Optional[str] = None
    state_id: Optional[int] = Field(None, alias="stateId")
    state_name: Optional[str] = Field(None, alias="stateName")
    zip: Optional[str] = None
    country_id: Optional[int] = Field(None, alias="countryId")
    country_name: Optional[str] = Field(None, alias="countryName")
    is_company: bool = Field(False, alias="isCompany")
    company_type: Optional[str] = Field(None, alias="companyType")
    parent_id: Optional[int] = Field(None, alias="parentId")
    parent_name: Optional[str] = Field(None, alias="parentName")
    job_title: Optional[str] = Field(None, alias="jobTitle")
    vat: Optional[str] = None
    ref: Optional[str] = None
    is_customer: bool = Field(False, alias="isCustomer")
    is_vendor: bool = Field(False, alias="isVendor")
    sync_status: str = Field("synced", alias="syncStatus")
    last_synced_at: datetime = Field(..., alias="lastSyncedAt")
    has_conflict: bool = Field(False, alias="hasConflict")
    is_favorite: bool = Field(False, alias="isFavorite")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class ContactSyncState(BaseModel):
    """Contact sync state model."""

    last_full_sync_at: Optional[datetime] = Field(None, alias="lastFullSyncAt")
    last_incremental_sync_at: Optional[datetime] = Field(
        None, alias="lastIncrementalSyncAt"
    )
    auto_sync_enabled: bool = Field(True, alias="autoSyncEnabled")
    sync_interval_minutes: int = Field(15, alias="syncIntervalMinutes")
    sync_on_wifi_only: bool = Field(False, alias="syncOnWifiOnly")
    sync_customers: bool = Field(True, alias="syncCustomers")
    sync_vendors: bool = Field(True, alias="syncVendors")
    sync_companies_only: bool = Field(False, alias="syncCompaniesOnly")
    total_contacts_synced: int = Field(0, alias="totalContactsSynced")
    pending_conflicts: int = Field(0, alias="pendingConflicts")
    pending_changes: int = Field(0, alias="pendingChanges")

    class Config:
        populate_by_name = True


class ContactChange(BaseModel):
    """A contact change for push/pull operations."""

    contact_id: str = Field(..., alias="contactId")
    odoo_partner_id: int = Field(..., alias="odooPartnerId")
    operation: SyncOperation
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime
    local_version: int = Field(..., alias="localVersion")

    class Config:
        populate_by_name = True
        use_enum_values = True


class ContactConflict(BaseModel):
    """Contact sync conflict information."""

    contact_id: str = Field(..., alias="contactId")
    odoo_partner_id: int = Field(..., alias="odooPartnerId")
    client_version: Dict[str, Any] = Field(..., alias="clientVersion")
    server_version: Dict[str, Any] = Field(..., alias="serverVersion")
    conflict_fields: List[str] = Field(..., alias="conflictFields")
    detected_at: datetime = Field(..., alias="detectedAt")

    class Config:
        populate_by_name = True


class ContactPushRequest(BaseModel):
    """Request to push contact changes."""

    changes: List[ContactChange]
    device_id: Optional[str] = Field(None, alias="deviceId")

    class Config:
        populate_by_name = True


class ContactPushResult(BaseModel):
    """Result of a single contact push operation."""

    contact_id: str = Field(..., alias="contactId")
    status: SyncStatus
    error: Optional[str] = None
    conflict: Optional[ContactConflict] = None
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )

    class Config:
        populate_by_name = True
        use_enum_values = True


class ContactPushResponse(BaseModel):
    """Response from pushing contact changes."""

    results: List[ContactPushResult]
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )
    success_count: int = Field(0, alias="successCount")
    failure_count: int = Field(0, alias="failureCount")
    conflict_count: int = Field(0, alias="conflictCount")

    class Config:
        populate_by_name = True


class ContactPullRequest(BaseModel):
    """Request to pull contact changes."""

    last_sync_timestamp: Optional[datetime] = Field(None, alias="lastSyncTimestamp")
    include_customers: bool = Field(True, alias="includeCustomers")
    include_vendors: bool = Field(True, alias="includeVendors")
    companies_only: bool = Field(False, alias="companiesOnly")
    limit: int = Field(100, ge=1, le=500)
    device_id: Optional[str] = Field(None, alias="deviceId")

    class Config:
        populate_by_name = True


class ContactPullResponse(BaseModel):
    """Response with contact changes."""

    contacts: List[SyncedContact]
    server_timestamp: datetime = Field(
        default_factory=datetime.utcnow, alias="serverTimestamp"
    )
    has_more: bool = Field(False, alias="hasMore")
    total_count: int = Field(0, alias="totalCount")

    class Config:
        populate_by_name = True


class ContactSyncSummary(BaseModel):
    """Summary of contact sync state."""

    sync_state: ContactSyncState = Field(..., alias="syncState")
    total_contacts: int = Field(0, alias="totalContacts")
    pending_changes: int = Field(0, alias="pendingChanges")
    conflicts: int = 0
    customers: int = 0
    vendors: int = 0
    last_sync: Optional[datetime] = Field(None, alias="lastSync")

    class Config:
        populate_by_name = True


# =============================================================================
# Endpoints
# =============================================================================


@router.get(
    "",
    response_model=MobileResponse[List[SyncedContact]],
    summary="Get Synced Contacts",
    description="Get all synced contacts for the current user.",
)
async def get_contacts(
    user: UserProfile = Depends(require_auth),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    is_customer: Optional[bool] = Query(None, alias="isCustomer"),
    is_vendor: Optional[bool] = Query(None, alias="isVendor"),
    has_conflict: Optional[bool] = Query(None, alias="hasConflict"),
    search: Optional[str] = Query(None),
) -> MobileResponse[List[SyncedContact]]:
    """
    Get synced contacts with optional filters.
    """
    # Build query conditions
    conditions = ["user_id = :user_id"]
    params: Dict[str, Any] = {"user_id": user.id, "limit": limit, "offset": offset}

    if status:
        conditions.append("sync_status = :status")
        params["status"] = status

    if is_customer is not None:
        conditions.append("is_customer = :is_customer")
        params["is_customer"] = is_customer

    if is_vendor is not None:
        conditions.append("is_vendor = :is_vendor")
        params["is_vendor"] = is_vendor

    if has_conflict is not None:
        conditions.append("has_conflict = :has_conflict")
        params["has_conflict"] = has_conflict

    if search:
        conditions.append(
            "(name ILIKE :search OR email ILIKE :search OR phone ILIKE :search)"
        )
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(conditions)

    query = f"""
        SELECT id, odoo_partner_id, name, email, phone, mobile, website,
               street, street2, city, state_id, state_name, zip,
               country_id, country_name, is_company, company_type,
               parent_id, parent_name, job_title, vat, ref,
               is_customer, is_vendor, sync_status, last_synced_at,
               has_conflict, is_favorite, created_at, updated_at
        FROM synced_contact
        WHERE {where_clause}
        ORDER BY name ASC
        LIMIT :limit OFFSET :offset
    """

    results = await execute_query(query, params)

    contacts = [
        SyncedContact(
            id=r["id"],
            odoo_partner_id=r["odoo_partner_id"],
            name=r["name"],
            email=r.get("email"),
            phone=r.get("phone"),
            mobile=r.get("mobile"),
            website=r.get("website"),
            street=r.get("street"),
            street2=r.get("street2"),
            city=r.get("city"),
            state_id=r.get("state_id"),
            state_name=r.get("state_name"),
            zip=r.get("zip"),
            country_id=r.get("country_id"),
            country_name=r.get("country_name"),
            is_company=r.get("is_company", False),
            company_type=r.get("company_type"),
            parent_id=r.get("parent_id"),
            parent_name=r.get("parent_name"),
            job_title=r.get("job_title"),
            vat=r.get("vat"),
            ref=r.get("ref"),
            is_customer=r.get("is_customer", False),
            is_vendor=r.get("is_vendor", False),
            sync_status=r.get("sync_status", "synced"),
            last_synced_at=r["last_synced_at"],
            has_conflict=r.get("has_conflict", False),
            is_favorite=r.get("is_favorite", False),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in results
    ]

    return MobileResponse(
        success=True,
        data=contacts,
    )


@router.get(
    "/{contact_id}",
    response_model=MobileResponse[SyncedContact],
    summary="Get Contact by ID",
    description="Get a specific synced contact by ID.",
)
async def get_contact(
    contact_id: str,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[SyncedContact]:
    """
    Get a single synced contact by ID.
    """
    result = await execute_one(
        """
        SELECT id, odoo_partner_id, name, email, phone, mobile, website,
               street, street2, city, state_id, state_name, zip,
               country_id, country_name, is_company, company_type,
               parent_id, parent_name, job_title, vat, ref,
               is_customer, is_vendor, sync_status, last_synced_at,
               has_conflict, is_favorite, created_at, updated_at
        FROM synced_contact
        WHERE id = :id AND user_id = :user_id
        """,
        {"id": contact_id, "user_id": user.id},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    contact = SyncedContact(
        id=result["id"],
        odoo_partner_id=result["odoo_partner_id"],
        name=result["name"],
        email=result.get("email"),
        phone=result.get("phone"),
        mobile=result.get("mobile"),
        website=result.get("website"),
        street=result.get("street"),
        street2=result.get("street2"),
        city=result.get("city"),
        state_id=result.get("state_id"),
        state_name=result.get("state_name"),
        zip=result.get("zip"),
        country_id=result.get("country_id"),
        country_name=result.get("country_name"),
        is_company=result.get("is_company", False),
        company_type=result.get("company_type"),
        parent_id=result.get("parent_id"),
        parent_name=result.get("parent_name"),
        job_title=result.get("job_title"),
        vat=result.get("vat"),
        ref=result.get("ref"),
        is_customer=result.get("is_customer", False),
        is_vendor=result.get("is_vendor", False),
        sync_status=result.get("sync_status", "synced"),
        last_synced_at=result["last_synced_at"],
        has_conflict=result.get("has_conflict", False),
        is_favorite=result.get("is_favorite", False),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )

    return MobileResponse(
        success=True,
        data=contact,
    )


@router.post(
    "/sync/push",
    response_model=ContactPushResponse,
    summary="Push Contact Changes",
    description="Push local contact changes to the server.",
)
async def push_contact_changes(
    request: ContactPushRequest,
    user: UserProfile = Depends(require_auth),
) -> ContactPushResponse:
    """
    Push a batch of local contact changes to the server.
    Handles conflict detection and resolution.
    """
    results: List[ContactPushResult] = []
    success_count = 0
    failure_count = 0
    conflict_count = 0

    for change in request.changes:
        try:
            result = await _process_contact_change(change, user.id)
            results.append(result)

            if result.status == SyncStatus.COMPLETED:
                success_count += 1
            elif result.status == SyncStatus.CONFLICT:
                conflict_count += 1
            else:
                failure_count += 1

        except Exception as e:
            results.append(
                ContactPushResult(
                    contact_id=change.contact_id,
                    status=SyncStatus.FAILED,
                    error=str(e),
                )
            )
            failure_count += 1

    return ContactPushResponse(
        results=results,
        server_timestamp=datetime.utcnow(),
        success_count=success_count,
        failure_count=failure_count,
        conflict_count=conflict_count,
    )


@router.post(
    "/sync/pull",
    response_model=ContactPullResponse,
    summary="Pull Contact Changes",
    description="Pull contact changes from the server.",
)
async def pull_contact_changes(
    request: ContactPullRequest,
    user: UserProfile = Depends(require_auth),
) -> ContactPullResponse:
    """
    Pull contacts that have been modified since the last sync.
    """
    # Build query conditions
    conditions = ["user_id = :user_id"]
    params: Dict[str, Any] = {"user_id": user.id, "limit": request.limit}

    if request.last_sync_timestamp:
        conditions.append("updated_at > :since")
        params["since"] = request.last_sync_timestamp

    if request.include_customers and not request.include_vendors:
        conditions.append("is_customer = true")
    elif request.include_vendors and not request.include_customers:
        conditions.append("is_vendor = true")

    if request.companies_only:
        conditions.append("is_company = true")

    where_clause = " AND ".join(conditions)

    # Get total count
    count_result = await execute_one(
        f"SELECT COUNT(*) as count FROM synced_contact WHERE {where_clause}",
        params,
    )
    total_count = count_result["count"] if count_result else 0

    # Get contacts
    query = f"""
        SELECT id, odoo_partner_id, name, email, phone, mobile, website,
               street, street2, city, state_id, state_name, zip,
               country_id, country_name, is_company, company_type,
               parent_id, parent_name, job_title, vat, ref,
               is_customer, is_vendor, sync_status, last_synced_at,
               has_conflict, is_favorite, created_at, updated_at
        FROM synced_contact
        WHERE {where_clause}
        ORDER BY updated_at ASC
        LIMIT :limit
    """

    results = await execute_query(query, params)

    contacts = [
        SyncedContact(
            id=r["id"],
            odoo_partner_id=r["odoo_partner_id"],
            name=r["name"],
            email=r.get("email"),
            phone=r.get("phone"),
            mobile=r.get("mobile"),
            website=r.get("website"),
            street=r.get("street"),
            street2=r.get("street2"),
            city=r.get("city"),
            state_id=r.get("state_id"),
            state_name=r.get("state_name"),
            zip=r.get("zip"),
            country_id=r.get("country_id"),
            country_name=r.get("country_name"),
            is_company=r.get("is_company", False),
            company_type=r.get("company_type"),
            parent_id=r.get("parent_id"),
            parent_name=r.get("parent_name"),
            job_title=r.get("job_title"),
            vat=r.get("vat"),
            ref=r.get("ref"),
            is_customer=r.get("is_customer", False),
            is_vendor=r.get("is_vendor", False),
            sync_status=r.get("sync_status", "synced"),
            last_synced_at=r["last_synced_at"],
            has_conflict=r.get("has_conflict", False),
            is_favorite=r.get("is_favorite", False),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in results
    ]

    return ContactPullResponse(
        contacts=contacts,
        server_timestamp=datetime.utcnow(),
        has_more=total_count > request.limit,
        total_count=total_count,
    )


@router.get(
    "/sync/state",
    response_model=MobileResponse[ContactSyncState],
    summary="Get Sync State",
    description="Get the current contact sync state for the user.",
)
async def get_sync_state(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[ContactSyncState]:
    """
    Get the current sync state for the user.
    """
    result = await execute_one(
        """
        SELECT last_full_sync_at, last_incremental_sync_at,
               auto_sync_enabled, sync_interval_minutes, sync_on_wifi_only,
               sync_customers, sync_vendors, sync_companies_only,
               total_contacts_synced, pending_conflicts, pending_changes
        FROM contact_sync_state
        WHERE id = :user_id
        """,
        {"user_id": user.id},
    )

    if not result:
        # Create default sync state
        await execute_one(
            """
            INSERT INTO contact_sync_state (id, created_at, updated_at)
            VALUES (:user_id, :now, :now)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
            """,
            {"user_id": user.id, "now": datetime.utcnow()},
        )

        result = {
            "last_full_sync_at": None,
            "last_incremental_sync_at": None,
            "auto_sync_enabled": True,
            "sync_interval_minutes": 15,
            "sync_on_wifi_only": False,
            "sync_customers": True,
            "sync_vendors": True,
            "sync_companies_only": False,
            "total_contacts_synced": 0,
            "pending_conflicts": 0,
            "pending_changes": 0,
        }

    sync_state = ContactSyncState(
        last_full_sync_at=result.get("last_full_sync_at"),
        last_incremental_sync_at=result.get("last_incremental_sync_at"),
        auto_sync_enabled=result.get("auto_sync_enabled", True),
        sync_interval_minutes=result.get("sync_interval_minutes", 15),
        sync_on_wifi_only=result.get("sync_on_wifi_only", False),
        sync_customers=result.get("sync_customers", True),
        sync_vendors=result.get("sync_vendors", True),
        sync_companies_only=result.get("sync_companies_only", False),
        total_contacts_synced=result.get("total_contacts_synced", 0),
        pending_conflicts=result.get("pending_conflicts", 0),
        pending_changes=result.get("pending_changes", 0),
    )

    return MobileResponse(
        success=True,
        data=sync_state,
    )


@router.get(
    "/sync/summary",
    response_model=MobileResponse[ContactSyncSummary],
    summary="Get Sync Summary",
    description="Get a summary of the contact sync state.",
)
async def get_sync_summary(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[ContactSyncSummary]:
    """
    Get a summary of the contact sync state including counts.
    """
    # Get sync state
    sync_state_result = await execute_one(
        """
        SELECT last_full_sync_at, last_incremental_sync_at,
               auto_sync_enabled, sync_interval_minutes, sync_on_wifi_only,
               sync_customers, sync_vendors, sync_companies_only,
               total_contacts_synced, pending_conflicts, pending_changes
        FROM contact_sync_state
        WHERE id = :user_id
        """,
        {"user_id": user.id},
    )

    # Get counts
    counts_result = await execute_one(
        """
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE has_conflict = true) as conflicts,
            COUNT(*) FILTER (WHERE is_customer = true) as customers,
            COUNT(*) FILTER (WHERE is_vendor = true) as vendors
        FROM synced_contact
        WHERE user_id = :user_id
        """,
        {"user_id": user.id},
    )

    sync_state = ContactSyncState(
        last_full_sync_at=sync_state_result.get("last_full_sync_at")
        if sync_state_result
        else None,
        last_incremental_sync_at=sync_state_result.get("last_incremental_sync_at")
        if sync_state_result
        else None,
        auto_sync_enabled=sync_state_result.get("auto_sync_enabled", True)
        if sync_state_result
        else True,
        sync_interval_minutes=sync_state_result.get("sync_interval_minutes", 15)
        if sync_state_result
        else 15,
        sync_on_wifi_only=sync_state_result.get("sync_on_wifi_only", False)
        if sync_state_result
        else False,
        sync_customers=sync_state_result.get("sync_customers", True)
        if sync_state_result
        else True,
        sync_vendors=sync_state_result.get("sync_vendors", True)
        if sync_state_result
        else True,
        sync_companies_only=sync_state_result.get("sync_companies_only", False)
        if sync_state_result
        else False,
        total_contacts_synced=sync_state_result.get("total_contacts_synced", 0)
        if sync_state_result
        else 0,
        pending_conflicts=sync_state_result.get("pending_conflicts", 0)
        if sync_state_result
        else 0,
        pending_changes=sync_state_result.get("pending_changes", 0)
        if sync_state_result
        else 0,
    )

    summary = ContactSyncSummary(
        sync_state=sync_state,
        total_contacts=counts_result.get("total", 0) if counts_result else 0,
        pending_changes=counts_result.get("pending", 0) if counts_result else 0,
        conflicts=counts_result.get("conflicts", 0) if counts_result else 0,
        customers=counts_result.get("customers", 0) if counts_result else 0,
        vendors=counts_result.get("vendors", 0) if counts_result else 0,
        last_sync=sync_state.last_incremental_sync_at or sync_state.last_full_sync_at,
    )

    return MobileResponse(
        success=True,
        data=summary,
    )


@router.get(
    "/sync/conflicts",
    response_model=MobileResponse[List[SyncedContact]],
    summary="Get Conflicts",
    description="Get all contacts with unresolved conflicts.",
)
async def get_conflicts(
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[List[SyncedContact]]:
    """
    Get all contacts with unresolved conflicts.
    """
    results = await execute_query(
        """
        SELECT id, odoo_partner_id, name, email, phone, mobile, website,
               street, street2, city, state_id, state_name, zip,
               country_id, country_name, is_company, company_type,
               parent_id, parent_name, job_title, vat, ref,
               is_customer, is_vendor, sync_status, last_synced_at,
               has_conflict, is_favorite, created_at, updated_at
        FROM synced_contact
        WHERE user_id = :user_id AND has_conflict = true
        ORDER BY updated_at DESC
        """,
        {"user_id": user.id},
    )

    contacts = [
        SyncedContact(
            id=r["id"],
            odoo_partner_id=r["odoo_partner_id"],
            name=r["name"],
            email=r.get("email"),
            phone=r.get("phone"),
            mobile=r.get("mobile"),
            website=r.get("website"),
            street=r.get("street"),
            street2=r.get("street2"),
            city=r.get("city"),
            state_id=r.get("state_id"),
            state_name=r.get("state_name"),
            zip=r.get("zip"),
            country_id=r.get("country_id"),
            country_name=r.get("country_name"),
            is_company=r.get("is_company", False),
            company_type=r.get("company_type"),
            parent_id=r.get("parent_id"),
            parent_name=r.get("parent_name"),
            job_title=r.get("job_title"),
            vat=r.get("vat"),
            ref=r.get("ref"),
            is_customer=r.get("is_customer", False),
            is_vendor=r.get("is_vendor", False),
            sync_status=r.get("sync_status", "synced"),
            last_synced_at=r["last_synced_at"],
            has_conflict=r.get("has_conflict", False),
            is_favorite=r.get("is_favorite", False),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in results
    ]

    return MobileResponse(
        success=True,
        data=contacts,
    )


@router.post(
    "/sync/resolve/{contact_id}",
    response_model=MobileResponse[SyncedContact],
    summary="Resolve Conflict",
    description="Resolve a contact sync conflict.",
)
async def resolve_conflict(
    contact_id: str,
    resolution: ConflictResolution,
    merged_data: Optional[Dict[str, Any]] = None,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[SyncedContact]:
    """
    Resolve a contact sync conflict.
    """
    # Get the contact
    contact = await execute_one(
        """
        SELECT id, conflict_data
        FROM synced_contact
        WHERE id = :id AND user_id = :user_id AND has_conflict = true
        """,
        {"id": contact_id, "user_id": user.id},
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found or no conflict exists",
        )

    # Apply resolution
    if resolution in [ConflictResolution.MERGE, ConflictResolution.MANUAL]:
        if not merged_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="merged_data required for merge/manual resolution",
            )

        # Update with merged data
        update_fields = []
        params: Dict[str, Any] = {
            "id": contact_id,
            "user_id": user.id,
            "updated_at": datetime.utcnow(),
        }

        for field in ["name", "email", "phone", "mobile", "website", "street", "city"]:
            if field in merged_data:
                update_fields.append(f"{field} = :{field}")
                params[field] = merged_data[field]

        update_fields.append("has_conflict = false")
        update_fields.append("conflict_data = NULL")
        update_fields.append("sync_status = 'pending'")
        update_fields.append("updated_at = :updated_at")

        await execute_one(
            f"""
            UPDATE synced_contact
            SET {", ".join(update_fields)}
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """,
            params,
        )

    elif resolution == ConflictResolution.CLIENT_WINS:
        # Keep local version, mark for push
        await execute_one(
            """
            UPDATE synced_contact
            SET has_conflict = false, conflict_data = NULL, sync_status = 'pending', updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """,
            {"id": contact_id, "user_id": user.id, "updated_at": datetime.utcnow()},
        )

    elif resolution == ConflictResolution.SERVER_WINS:
        # Use server version
        await execute_one(
            """
            UPDATE synced_contact
            SET has_conflict = false, conflict_data = NULL, pending_changes = NULL,
                sync_status = 'synced', updated_at = :updated_at
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """,
            {"id": contact_id, "user_id": user.id, "updated_at": datetime.utcnow()},
        )

    # Get updated contact
    result = await execute_one(
        """
        SELECT id, odoo_partner_id, name, email, phone, mobile, website,
               street, street2, city, state_id, state_name, zip,
               country_id, country_name, is_company, company_type,
               parent_id, parent_name, job_title, vat, ref,
               is_customer, is_vendor, sync_status, last_synced_at,
               has_conflict, is_favorite, created_at, updated_at
        FROM synced_contact
        WHERE id = :id AND user_id = :user_id
        """,
        {"id": contact_id, "user_id": user.id},
    )

    updated_contact = SyncedContact(
        id=result["id"],
        odoo_partner_id=result["odoo_partner_id"],
        name=result["name"],
        email=result.get("email"),
        phone=result.get("phone"),
        mobile=result.get("mobile"),
        website=result.get("website"),
        street=result.get("street"),
        street2=result.get("street2"),
        city=result.get("city"),
        state_id=result.get("state_id"),
        state_name=result.get("state_name"),
        zip=result.get("zip"),
        country_id=result.get("country_id"),
        country_name=result.get("country_name"),
        is_company=result.get("is_company", False),
        company_type=result.get("company_type"),
        parent_id=result.get("parent_id"),
        parent_name=result.get("parent_name"),
        job_title=result.get("job_title"),
        vat=result.get("vat"),
        ref=result.get("ref"),
        is_customer=result.get("is_customer", False),
        is_vendor=result.get("is_vendor", False),
        sync_status=result.get("sync_status", "synced"),
        last_synced_at=result["last_synced_at"],
        has_conflict=result.get("has_conflict", False),
        is_favorite=result.get("is_favorite", False),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )

    return MobileResponse(
        success=True,
        data=updated_contact,
    )


@router.post(
    "/{contact_id}/favorite",
    response_model=MobileResponse[SyncedContact],
    summary="Toggle Favorite",
    description="Toggle the favorite status of a contact.",
)
async def toggle_favorite(
    contact_id: str,
    user: UserProfile = Depends(require_auth),
) -> MobileResponse[SyncedContact]:
    """
    Toggle the favorite status of a contact.
    """
    result = await execute_one(
        """
        UPDATE synced_contact
        SET is_favorite = NOT is_favorite, updated_at = :updated_at
        WHERE id = :id AND user_id = :user_id
        RETURNING id, odoo_partner_id, name, email, phone, mobile, website,
                  street, street2, city, state_id, state_name, zip,
                  country_id, country_name, is_company, company_type,
                  parent_id, parent_name, job_title, vat, ref,
                  is_customer, is_vendor, sync_status, last_synced_at,
                  has_conflict, is_favorite, created_at, updated_at
        """,
        {"id": contact_id, "user_id": user.id, "updated_at": datetime.utcnow()},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    contact = SyncedContact(
        id=result["id"],
        odoo_partner_id=result["odoo_partner_id"],
        name=result["name"],
        email=result.get("email"),
        phone=result.get("phone"),
        mobile=result.get("mobile"),
        website=result.get("website"),
        street=result.get("street"),
        street2=result.get("street2"),
        city=result.get("city"),
        state_id=result.get("state_id"),
        state_name=result.get("state_name"),
        zip=result.get("zip"),
        country_id=result.get("country_id"),
        country_name=result.get("country_name"),
        is_company=result.get("is_company", False),
        company_type=result.get("company_type"),
        parent_id=result.get("parent_id"),
        parent_name=result.get("parent_name"),
        job_title=result.get("job_title"),
        vat=result.get("vat"),
        ref=result.get("ref"),
        is_customer=result.get("is_customer", False),
        is_vendor=result.get("is_vendor", False),
        sync_status=result.get("sync_status", "synced"),
        last_synced_at=result["last_synced_at"],
        has_conflict=result.get("has_conflict", False),
        is_favorite=result.get("is_favorite", False),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )

    return MobileResponse(
        success=True,
        data=contact,
    )


# =============================================================================
# Helper Functions
# =============================================================================


async def _process_contact_change(
    change: ContactChange, user_id: str
) -> ContactPushResult:
    """
    Process a single contact change.
    """
    if change.operation == SyncOperation.UPDATE:
        if not change.data:
            return ContactPushResult(
                contact_id=change.contact_id,
                status=SyncStatus.FAILED,
                error="No data provided for update",
            )

        # Check for conflicts
        existing = await execute_one(
            """
            SELECT server_version, local_version, has_conflict
            FROM synced_contact
            WHERE id = :id AND user_id = :user_id
            """,
            {"id": change.contact_id, "user_id": user_id},
        )

        if not existing:
            return ContactPushResult(
                contact_id=change.contact_id,
                status=SyncStatus.FAILED,
                error="Contact not found",
            )

        # Build update query
        update_fields = []
        params: Dict[str, Any] = {
            "id": change.contact_id,
            "user_id": user_id,
            "updated_at": datetime.utcnow(),
        }

        for field in ["name", "email", "phone", "mobile", "website", "street", "city"]:
            if field in change.data:
                update_fields.append(f"{field} = :{field}")
                params[field] = change.data[field]

        if update_fields:
            update_fields.append("updated_at = :updated_at")
            update_fields.append("server_version = server_version + 1")

            await execute_one(
                f"""
                UPDATE synced_contact
                SET {", ".join(update_fields)}
                WHERE id = :id AND user_id = :user_id
                RETURNING id
                """,
                params,
            )

        return ContactPushResult(
            contact_id=change.contact_id,
            status=SyncStatus.COMPLETED,
        )

    elif change.operation == SyncOperation.DELETE:
        result = await execute_one(
            """
            DELETE FROM synced_contact
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """,
            {"id": change.contact_id, "user_id": user_id},
        )

        return ContactPushResult(
            contact_id=change.contact_id,
            status=SyncStatus.COMPLETED if result else SyncStatus.FAILED,
            error=None if result else "Contact not found",
        )

    return ContactPushResult(
        contact_id=change.contact_id,
        status=SyncStatus.FAILED,
        error=f"Unsupported operation: {change.operation}",
    )
