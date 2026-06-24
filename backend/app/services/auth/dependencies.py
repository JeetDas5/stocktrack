from datetime import datetime
import os
import json
import time
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, SessionTable, Business, UserAssignment
from app.services.auth.utils import decode_access_token

security = HTTPBearer(auto_error=False)


class PermissionsLoader:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.cached_permissions = {}
        self.last_loaded = 0.0
        self.last_mtime = 0.0

    def get_role_permissions(self, role: str) -> list:
        try:
            if os.path.exists(self.filepath):
                mtime = os.path.getmtime(self.filepath)
                if mtime > self.last_mtime:
                    with open(self.filepath, "r") as f:
                        self.cached_permissions = json.load(f)
                    self.last_mtime = mtime
                    self.last_loaded = time.time()
        except Exception as e:
            # Fallback to cache and print warning
            print(f"Error loading roles_permissions.json: {e}")
        
        if not self.cached_permissions:
            return []
        
        return self.cached_permissions.get(role, [])


# Initialize the loader
PERMISSIONS_FILE = os.path.join(os.path.dirname(__file__), "roles_permissions.json")
permissions_loader = PermissionsLoader(PERMISSIONS_FILE)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = credentials.credentials
    decoded = decode_access_token(token)
    uid = None
    if decoded:
        uid = decoded.get("sub")
    else:
        db_session = session.exec(
            select(SessionTable).where(SessionTable.token == token)
        ).first()
        if db_session and db_session.expires_at > datetime.utcnow():
            uid = db_session.user_id

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed, session expired, or token invalid"
        )

    user = session.get(User, uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found in database"
        )

    # Super Admin User Impersonation
    impersonate_uid = request.headers.get("X-Impersonate-User")
    is_super_admin_route = request.url.path.startswith("/api/super-admin/")
    if impersonate_uid and user.role == "super_admin" and not is_super_admin_route:
        impersonated_user = session.get(User, impersonate_uid)
        if impersonated_user:
            return impersonated_user

    # Secure endpoints for non-internal users
    if not user.is_internal and user.role != "super_admin":
        path = request.url.path
        is_public_backend_route = (
            path == "/api/users/me" or 
            (path == "/api/users" and request.method == "POST") or
            path.startswith("/api/auth/") or
            (path.startswith("/api/staff/invitations/") and path.endswith("/register"))
        )
        if not is_public_backend_route:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to internal users only"
            )

    # Enforce module-based route access controls
    if user.role != "super_admin":
        path = request.url.path
        
        # If it's a super-admin route, block non-super-admins immediately
        if path.startswith("/api/super-admin/"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to super admin only"
            )
            
        is_common_route = (
            path == "/api/users/me" or
            path == "/api/users" or
            path.startswith("/api/users/") or
            path.startswith("/api/auth/") or
            (path.startswith("/api/staff/invitations/") and path.endswith("/register"))
        )
        
        if not is_common_route:
            parts = [p for p in path.split("/") if p]
            is_module_allowed = False
            
            user_modules = user.modules or []
            
            if len(parts) >= 2 and parts[0] == "api":
                resource = parts[1]
                
                # Check top-level resource access
                if resource == "businesses":
                    if len(parts) in (2, 3):
                        is_module_allowed = True
                    elif len(parts) >= 4:
                        sub_resource = parts[3]
                        if sub_resource in ("locations", "users"):
                            is_module_allowed = True
                        else:
                            # Check module-specific business sub-resources
                            allowed_sub = []
                            for mod in user_modules:
                                if mod == "timesheet":
                                    allowed_sub.extend(["staff", "pending-staff"])
                            if sub_resource in allowed_sub:
                                is_module_allowed = True
                                
                elif resource == "locations":
                    is_module_allowed = True
                    
                elif resource in ("timesheets", "timesheet-settings"):
                    is_module_allowed = "timesheet" in user_modules
                    
                elif resource == "staff":  # /api/staff/invitations
                    is_module_allowed = "timesheet" in user_modules
            else:
                is_module_allowed = True
                
            if not is_module_allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted. This feature requires module subscription."
                )

    return user


def verify_user_permission(
    user: User,
    business_id: str,
    permission: str,
    location_id: Optional[str] = None,
    session: Session = None,
):
    """
    Verifies that the user has the given permission for a business and location.
    If unauthorized, raises HTTPException(403).
    """
    if user.role == "super_admin":
        return

    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )

    if business.created_by_id == user.id:
        return

    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id,
        UserAssignment.business_id == business_id,
        UserAssignment.is_active == True
    )
    assignments = session.exec(stmt).all()
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this business"
        )

    for assignment in assignments:
        role_perms = permissions_loader.get_role_permissions(assignment.role)
        has_perm = (
            assignment.role in ("super_admin", "admin") or
            "*" in role_perms or
            "admin" in role_perms or
            permission in role_perms or
            permission in assignment.permissions or
            "admin" in assignment.permissions or
            permission == "view_business"
        )
        if has_perm:
            if location_id is None or assignment.location_id is None or assignment.location_id == location_id:
                return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Not authorized. Missing permission: '{permission}'"
    )


def get_allowed_locations(
    user: User,
    business_id: str,
    permission: str,
    session: Session,
) -> Optional[List[Optional[str]]]:
    """
    Returns a list of location IDs the user has access to for the given permission.
    If the user has full access to the business (admin/creator/super_admin), returns None (which indicates all locations).
    Otherwise, returns a list of allowed location_ids (which can include None/Null if they have a business-wide assignment).
    """
    if user.role == "super_admin":
        return None

    business = session.get(Business, business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )

    if business.created_by_id == user.id:
        return None

    stmt = select(UserAssignment).where(
        UserAssignment.user_id == user.id,
        UserAssignment.business_id == business_id,
        UserAssignment.is_active == True
    )
    assignments = session.exec(stmt).all()
    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this business"
        )

    allowed_locs = []
    for ass in assignments:
        role_perms = permissions_loader.get_role_permissions(ass.role)
        has_perm = (
            ass.role in ("super_admin", "admin") or
            "*" in role_perms or
            "admin" in role_perms or
            permission in role_perms or
            permission in ass.permissions or
            "admin" in ass.permissions
        )
        if has_perm:
            if ass.location_id is None:
                return None
            else:
                allowed_locs.append(ass.location_id)

    return allowed_locs


