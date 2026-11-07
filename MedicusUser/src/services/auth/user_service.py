from datetime import datetime, timezone
from typing import Optional, Dict, Any
import json

from medicus_common.core.database import db_manager
from medicus_common.core.exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    DatabaseError,
)
from medicus_common.models.user import (
    User,
    UserProfile,
    UserSettings,
    UserRole,
    UserStatus,
)
from medicus_common.models.common import Gender
from medicus_common.utils.helpers import ensure_metadata_dict
from src.services.auth.auth_service import AuthService
from medicus_common.core.logging_config import logger


class UserService:
    """User management service."""

    def __init__(self):
        self.auth_service = AuthService()

    @staticmethod
    async def get_connected_user(user_id: int) -> Dict[str, Any]:
        """
        Get COMPLETE user data in single query from auth.users_view.
        Returns everything needed for the entire app session.
        
        Returns:
            dict with user, profile, settings, and metadata
        """
        try:
            query = """
                SELECT
                    -- User data
                    id, email, phone_number, role, account_status, signup_step,
                    is_email_verified, is_phone_verified, failed_login_attempts,
                    locked_until, last_login,
                    created_at, updated_at, deleted_at,
                    
                    -- Profile data
                    avatar_url, timezone, profile_language as language, 
                    notifications_enabled, profile_active, profile_metadata,
                    
                    -- Settings data  
                    context_type, context_name, voice_notifications, email_notifications, 
                    sms_notifications, push_notifications, data_retention_days, privacy_level,
                    share_data_with_providers, theme, default_view, items_per_page, auto_save,
                    preferred_contact_method, appointment_reminders, reminder_advance_hours,
                    fingerprint_enabled, auto_logout_minutes, settings_active, settings_default,
                    whatsapp_notifications, medication_reminders, health_insights, 
                    marketing_notifications, emergency_only, max_daily_notifications,
                    notification_bundling, backup_phone, settings_metadata
                    
                FROM auth.users_view 
                WHERE id = $1 AND deleted_at IS NULL
            """
            
            row = await db_manager.fetchrow(query, user_id)
            if not row:
                raise UserNotFoundError(f"User with ID {user_id} not found")
            
            # Build complete user object
            user_data = {
                # Core user fields
                'id': row['id'],
                'email': row['email'],
                'phone_number': row['phone_number'],
                'role': row['role'],
                'account_status': row['account_status'],
                'signup_step': row['signup_step'],
                'is_email_verified': row['is_email_verified'],
                'is_phone_verified': row['is_phone_verified'],
                'failed_login_attempts': row['failed_login_attempts'],
                'locked_until': row['locked_until'],
                'last_login': row['last_login'],
                'user_assistant': 'mediaid' if row.get('role') == 'patient' else 'medidoc',  # Set based on role
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'deleted_at': row['deleted_at'],
                
                # Profile fields
                'avatar_url': row['avatar_url'],
                'timezone': row['timezone'] or 'UTC',
                'language': row['language'] or 'en',
                'notifications_enabled': row['notifications_enabled'] if row['notifications_enabled'] is not None else True,
                'profile_active': row['profile_active'] if row['profile_active'] is not None else True,
                'profile_metadata': row['profile_metadata'] or {},
                
                # Settings fields
                'context_type': row['context_type'] or 'default',
                'context_name': row['context_name'] or 'default',
                'voice_notifications': row['voice_notifications'] if row['voice_notifications'] is not None else True,
                'email_notifications': row['email_notifications'] if row['email_notifications'] is not None else True,
                'sms_notifications': row['sms_notifications'] if row['sms_notifications'] is not None else False,
                'push_notifications': row['push_notifications'] if row['push_notifications'] is not None else True,
                'data_retention_days': row['data_retention_days'] or 90,
                'privacy_level': row['privacy_level'] or 'standard',
                'share_data_with_providers': row['share_data_with_providers'] if row['share_data_with_providers'] is not None else True,
                'theme': row['theme'] or 'light',
                'default_view': row['default_view'] or 'dashboard',
                'items_per_page': row['items_per_page'] or 20,
                'auto_save': row['auto_save'] if row['auto_save'] is not None else True,
                'preferred_contact_method': row['preferred_contact_method'] or 'email',
                'appointment_reminders': row['appointment_reminders'] if row['appointment_reminders'] is not None else True,
                'reminder_advance_hours': row['reminder_advance_hours'] or 24,
                'fingerprint_enabled': row['fingerprint_enabled'] if row['fingerprint_enabled'] is not None else False,
                'auto_logout_minutes': row['auto_logout_minutes'] or 60,
                'settings_active': row['settings_active'] if row['settings_active'] is not None else True,
                'settings_default': row['settings_default'] if row['settings_default'] is not None else True,
                'whatsapp_notifications': row['whatsapp_notifications'] if row['whatsapp_notifications'] is not None else True,
                'medication_reminders': row['medication_reminders'] if row['medication_reminders'] is not None else True,
                'health_insights': row['health_insights'] if row['health_insights'] is not None else True,
                'marketing_notifications': row['marketing_notifications'] if row['marketing_notifications'] is not None else False,
                'emergency_only': row['emergency_only'] if row['emergency_only'] is not None else False,
                'max_daily_notifications': row['max_daily_notifications'] or 10,
                'notification_bundling': row['notification_bundling'] if row['notification_bundling'] is not None else True,
                'backup_phone': row['backup_phone'],
                'settings_metadata': row['settings_metadata'] or {}
            }
            
            logger.info("Connected user data retrieved")
            return user_data
            
        except UserNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to get connected user for user {user_id}: {str(e)}")
            raise DatabaseError(f"Failed to get connected user: {e}")

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email for authentication and validation purposes only."""
        try:
            query = """
                SELECT id, email, password, phone_number, role, account_status, signup_step, is_email_verified,
                       is_phone_verified, failed_login_attempts, locked_until, last_login,
                       created_at, updated_at, deleted_at
                FROM auth.users WHERE email = $1 AND deleted_at IS NULL
            """

            row = await db_manager.fetchrow(query, email)
            if not row:
                return None

            # Build basic user dict
            user_data = {
                'id': row['id'],
                'email': row['email'],
                'password': row['password'],  # Include password for authentication
                'phone_number': row['phone_number'],
                'role': row['role'],
                'account_status': row['account_status'],
                'signup_step': row['signup_step'],
                'is_email_verified': row['is_email_verified'],
                'is_phone_verified': row['is_phone_verified'],
                'failed_login_attempts': row['failed_login_attempts'],
                'locked_until': row['locked_until'],
                'last_login': row['last_login'],
                'user_assistant': 'mediaid' if row.get('role') == 'patient' else 'medidoc',  # Set based on role
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'deleted_at': row['deleted_at']
            }

            user_data = ensure_metadata_dict(user_data)
            return User.model_validate(user_data)

        except Exception as e:
            logger.error(f"Failed to get user by email {email}: {str(e)}")
            return None

    @staticmethod
    async def get_user_by_phone(phone_number: str) -> Optional[User]:
        """Get user by phone for authentication and validation purposes only."""
        try:
            query = """
                SELECT id, email, password, phone_number, role, account_status, signup_step, is_email_verified,
                       is_phone_verified, failed_login_attempts, locked_until, last_login,
                       created_at, updated_at, deleted_at
                FROM auth.users WHERE phone_number = $1 AND deleted_at IS NULL
            """

            row = await db_manager.fetchrow(query, phone_number)
            if not row:
                return None

            # Build basic user dict
            user_data = {
                'id': row['id'],
                'email': row['email'],
                'password': row['password'], 
                'phone_number': row['phone_number'],
                'role': row['role'],
                'account_status': row['account_status'],
                'signup_step': row['signup_step'],
                'is_email_verified': row['is_email_verified'],
                'is_phone_verified': row['is_phone_verified'],
                'failed_login_attempts': row['failed_login_attempts'],
                'locked_until': row['locked_until'],
                'last_login': row['last_login'],
                'user_assistant': 'mediaid' if row.get('role') == 'patient' else 'medidoc',  # Set based on role
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'deleted_at': row['deleted_at']
            }

            user_data = ensure_metadata_dict(user_data)
            return User.model_validate(user_data)

        except Exception as e:
            logger.error(f"Failed to get user by phone {phone_number}: {str(e)}")
            return None

    @staticmethod
    async def get_user_by_id(user_id: int) -> Optional[User]:
        """Get user by ID for authentication and validation purposes only."""
        try:
            query = """
                SELECT id, email, phone_number, role, account_status, signup_step, is_email_verified,
                       is_phone_verified, failed_login_attempts, locked_until, last_login,
                       created_at, updated_at, deleted_at
                FROM auth.users_view WHERE id = $1 AND deleted_at IS NULL
            """

            row = await db_manager.fetchrow(query, user_id)
            if not row:
                return None

            user_data = {
                'id': row['id'],
                'email': row['email'],
                'password': '',
                'phone_number': row['phone_number'],
                'role': row['role'],
                'account_status': row['account_status'],
                'signup_step': row['signup_step'],
                'is_email_verified': row['is_email_verified'],
                'is_phone_verified': row['is_phone_verified'],
                'failed_login_attempts': row['failed_login_attempts'],
                'locked_until': row['locked_until'],
                'last_login': row['last_login'],
                'user_assistant': 'mediaid' if row.get('role') == 'patient' else 'medidoc',
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'deleted_at': row['deleted_at']
            }

            user_data = ensure_metadata_dict(user_data)
            return User.model_validate(user_data)

        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {str(e)}")
            return None

    async def create_user(self, user_data: dict) -> User:
        """Create a new user with profile and settings."""
        try:
            logger.info(f"🔧 UserService.create_user started for email: {user_data.get('email')}")
            
            # Check if user already exists by email or phone
            if user_data.get("email"):
                logger.info(f"   - Checking if email exists: {user_data['email']}")
                existing_user = await self.get_user_by_email(user_data["email"])
                if existing_user:
                    logger.warning(f"   - ❌ Email already exists!")
                    raise UserAlreadyExistsError(
                        f"User with email {user_data['email']} already exists"
                    )
                logger.info(f"   - ✅ Email is available")

            if user_data.get("phone_number"):
                logger.info(f"   - Checking if phone exists: {user_data['phone_number']}")
                existing_user = await self.get_user_by_phone(user_data["phone_number"])
                if existing_user:
                    logger.warning(f"   - ❌ Phone already exists!")
                    raise UserAlreadyExistsError(
                        f"User with phone {user_data['phone_number']} already exists"
                    )
                logger.info(f"   - ✅ Phone is available")

            # Hash password
            logger.info(f"   - Hashing password")
            user_data["password_hash"] = self.auth_service.hash_password(
                user_data.pop("password")
            )
            logger.info(f"   - ✅ Password hashed")
            
            user_data["created_at"] = datetime.now(timezone.utc)
            user_data["updated_at"] = datetime.now(timezone.utc)

            logger.info(f"   - Starting database transaction")
            async with db_manager.transaction():
                # Create user
                logger.info(f"   - Inserting user into auth.users table")
                try:
                    user_row = await db_manager.fetchrow(
                        """
                        INSERT INTO auth.users 
                        (email, password, role, account_status, phone_number, created_at, updated_at, signup_step, is_email_verified)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id, email, password, role, account_status, phone_number, 
                                 created_at, updated_at, metadata, signup_step, is_email_verified,
                                 deleted_at, failed_login_attempts, locked_until, last_login
                        """,
                        user_data["email"],
                        user_data["password_hash"],
                        user_data.get("role", UserRole.PATIENT).value,
                        UserStatus.ACTIVE.value,
                        user_data.get("phone_number"),
                        user_data["created_at"],
                        user_data["updated_at"],
                        1,
                        False,
                    )
                except DatabaseError as e:
                    # Handle unique constraint violations
                    error_msg = str(e).lower()
                    if "duplicate key" in error_msg or "unique constraint" in error_msg:
                        if "email" in error_msg:
                            logger.error(f"   - ❌ Email already exists (race condition)")
                            raise UserAlreadyExistsError(f"User with email {user_data['email']} already exists")
                        elif "phone" in error_msg:
                            logger.error(f"   - ❌ Phone already exists (race condition)")
                            raise UserAlreadyExistsError(f"User with phone {user_data.get('phone_number')} already exists")
                    raise

                if not user_row:
                    logger.error(f"   - ❌ User insert failed - no row returned")
                    raise DatabaseError("User creation failed: no row returned from database.")

                user_id = user_row["id"]
                logger.info(f"   - ✅ User created with ID: {user_id}")

                # Create default profile
                logger.info(f"   - Creating user profile")
                await db_manager.execute(
                    """
                    INSERT INTO auth.user_profiles 
                    (user_id, timezone, language, notifications_enabled, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    user_id, "UTC", "en", True, True,
                    datetime.now(timezone.utc), datetime.now(timezone.utc),
                )
                logger.info(f"   - ✅ User profile created")

                # Create default settings
                logger.info(f"   - Creating user settings")
                context_name = user_data.get("context_name", "default")
                await db_manager.execute(
                    """
                    INSERT INTO auth.user_settings 
                    (user_id, context_type, context_name, voice_notifications, email_notifications, sms_notifications,
                     push_notifications, data_retention_days, privacy_level, share_data_with_providers,
                     theme, default_view, items_per_page, auto_save, preferred_contact_method, 
                     appointment_reminders, reminder_advance_hours, is_active, is_default, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                    """,
                    user_id, "default", context_name,
                    True, True, False, True, 90, "standard", True,
                    "light", "dashboard", 20, True, "email",
                    True, 24, True, True,
                    datetime.now(timezone.utc), datetime.now(timezone.utc),
                )
                logger.info(f"   - ✅ User settings created")

                # AUTOMATIC PATIENT/DOCTOR RECORD CREATION - USE SERVICES
                user_role = user_data.get("role", UserRole.PATIENT)
                first_name = user_data.get("first_name", "")
                last_name = user_data.get("last_name", "")
                
                role_value = (
                    user_role.value if hasattr(user_role, "value") 
                    else str(user_role).lower()
                )
                
                # Convert gender string to Gender enum - default to PREFER_NOT_TO_SAY if not provided
                gender_enum = Gender.PREFER_NOT_TO_SAY  # Default value for NOT NULL constraint
                if user_data.get("gender"):
                    gender_str = str(user_data["gender"]).lower()
                    if gender_str == "male":
                        gender_enum = Gender.MALE
                    elif gender_str == "female":
                        gender_enum = Gender.FEMALE
                    elif gender_str in ["other", "undisclosed"]:
                        gender_enum = Gender.OTHER
                    elif gender_str in ["prefer_not_to_say", "prefer not to say"]:
                        gender_enum = Gender.PREFER_NOT_TO_SAY
                    else:
                        logger.warning(f"Unknown gender value '{user_data['gender']}', defaulting to PREFER_NOT_TO_SAY")
                        gender_enum = Gender.PREFER_NOT_TO_SAY
                
                logger.info(f"   - Creating role-specific records for role: {role_value}")

                # Import services
                from src.services.patient.patient_service import PatientService
                from src.services.doctor.doctor_service import DoctorService


                if role_value in ["patient", UserRole.PATIENT.value]:
                    # Create patient record using PatientService
                    logger.info(f"   - Creating patient record via PatientService")
                    patient_service = PatientService()
                    await patient_service.create_patient(
                        wa_number=f"patient_{user_id}",
                        first_name=first_name or "",
                        last_name=last_name or "",
                        user_id=user_id,
                        dob=user_data.get("dob"),
                        gender=gender_enum,
                        country_id=1,
                        language_id=1
                    )
                    logger.info(f"   - ✅ Patient record created")

                elif role_value in ["doctor", UserRole.DOCTOR.value]:
                    # Create patient record for doctor (doctors can be patients too)
                    logger.info(f"   - Creating patient record for doctor via PatientService")
                    patient_service = PatientService()
                    await patient_service.create_patient(
                        wa_number=f"patient_{user_id}",
                        first_name=first_name or "",
                        last_name=last_name or "",
                        user_id=user_id,
                        dob=user_data.get("dob"),
                        gender=gender_enum,
                        country_id=1,
                        language_id=1
                    )
                    logger.info(f"   - ✅ Patient record created for doctor")

                    # Create doctor record using DoctorService
                    logger.info(f"   - Creating doctor record via DoctorService")

                    doctor_service = DoctorService()
                    await doctor_service.create_doctor(
                        user_id=user_id,
                        first_name=first_name or "",
                        last_name=last_name or "",
                        wa_number=f"doctor_{user_id}",
                        country_id=1,
                        specialty_id=user_data.get("specialty_id") or 1,
                        medical_licence=user_data.get("medical_licence") or "N/A",
                        gender=gender_enum.value
                    )
                    logger.info(f"   - ✅ Doctor record created")

                # Prepare user dictionary
                logger.info(f"   - Building User model object")
                user_dict = dict(user_row)
                user_dict = ensure_metadata_dict(user_dict)
                user = User.model_validate(user_dict)
                logger.info(f"   - ✅ User model created")

                logger.info(f"✅ User creation completed successfully for user {user_id}")

                return user

        except UserAlreadyExistsError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to create user: {str(e)}", exc_info=True)
            raise DatabaseError(f"Failed to create user: {e}")

    async def update_user(self, user_id: int, update_data: dict) -> User:
        """Update user information.

        Note: Client is authenticated, we know user exists. No need to verify before update.
        UPDATE query will fail naturally if user doesn't exist (won't happen).
        """
        # Map our model field names to database column names
        field_mapping = {
            "phone": "phone_number",
        }

        # Build dynamic update query
        set_clauses = []
        values = []
        param_count = 1

        for field, value in update_data.items():
            db_column = field_mapping.get(field, field)
            # Verification flags are only ever set by the verification flow.
            if db_column in ("email", "phone_number"):
                set_clauses.append(f"{db_column} = ${param_count}")
                values.append(value.lower().strip() if db_column == "email" and value else value)
                param_count += 1
                # A changed address must be verified again.
                flag = "is_email_verified" if db_column == "email" else "is_phone_verified"
                set_clauses.append(f"{flag} = false")

        if not set_clauses:
            # If no fields to update, fetch and return current user
            query = """
                SELECT id, email, password, signup_step, is_email_verified, role, account_status,
                       metadata, created_at, updated_at, phone_number,
                       deleted_at, failed_login_attempts, locked_until, last_login
                FROM auth.users
                WHERE id = $1 AND deleted_at IS NULL
            """
            row = await db_manager.fetchrow(query, user_id)
            if not row:
                raise UserNotFoundError(f"User with ID {user_id} not found")
            user_dict = dict(row)
            user_dict['user_assistant'] = 'mediaid' if row.get('role') == 'patient' else 'medidoc'  # Set based on role
            user_dict = ensure_metadata_dict(user_dict)
            return User.model_validate(user_dict)

        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now(timezone.utc))
        values.append(user_id)

        query = f"""
            UPDATE auth.users 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count + 1}
            RETURNING id, email, password, signup_step, is_email_verified, role, account_status, 
                     metadata, created_at, updated_at, phone_number,
                     deleted_at, failed_login_attempts, locked_until, last_login
        """

        try:
            row = await db_manager.fetchrow(query, *values)
            user_dict = dict(row)
            user_dict['user_assistant'] = 'mediaid' if row.get('role') == 'patient' else 'medidoc'  # Set based on role
            user_dict = ensure_metadata_dict(user_dict)
            updated_user = User.model_validate(user_dict)

            return updated_user
        except Exception as e:
            logger.error(f"Failed to update user {user_id}: {str(e)}")
            raise DatabaseError(f"Failed to update user: {e}")


    async def delete_user(self, user_id: int) -> bool:
        """Soft delete user (set deleted_at timestamp)."""
        # Check user exists using get_connected_user
        try:
            await self.get_connected_user(user_id)
        except UserNotFoundError:
            raise UserNotFoundError(f"User with ID {user_id} not found")

        try:
            query = """
                UPDATE auth.users 
                SET deleted_at = $1, updated_at = $1
                WHERE id = $2
            """

            now = datetime.now(timezone.utc)
            await db_manager.execute(query, now, user_id)

            return True

        except Exception as e:
            logger.error(f"Failed to delete user {user_id}: {str(e)}")
            raise DatabaseError(f"Failed to delete user: {e}")

