# src/auth/password.py
"""Production-grade password hashing and verification utilities."""

import secrets
import string
import logging
import re
from typing import Optional, Tuple, List, Dict

from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from medicus_common.core.config import get_settings

logger = logging.getLogger(__name__)

# Create password context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str, rounds: Optional[int] = None) -> str:
    """Hash a password using bcrypt with production security.

    Args:
        password: Plain text password
        rounds: Optional bcrypt rounds (uses settings default if not provided)

    Returns:
        Hashed password

    Raises:
        ValueError: If password is invalid
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    if len(password) > 72:  # bcrypt limitation
        logger.warning("Password truncated to 72 characters for bcrypt")
        password = password[:72]
    
    settings = get_settings()
    
    # Use provided rounds or fall back to settings
    hash_rounds = rounds or settings.bcrypt_rounds
    
    # Create context with specific rounds
    context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=hash_rounds
    )
    
    try:
        hashed = context.hash(password)
        logger.debug(f"Password hashed successfully with {hash_rounds} rounds")
        return hashed
    except Exception as e:
        logger.error(f"Password hashing failed: {e}")
        raise ValueError(f"Failed to hash password: {e}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash with security logging.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        True if password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        logger.warning("Empty password or hash provided for verification")
        return False
    
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        
        if result:
            logger.debug("Password verification successful")
        else:
            logger.info("Password verification failed - incorrect password")
            
        return result
        
    except UnknownHashError as e:
        logger.warning(f"Unknown hash format during verification: {e}")
        return False
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Check if password hash needs to be updated.

    Args:
        hashed_password: Existing password hash

    Returns:
        True if hash should be updated, False otherwise
    """
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception as e:
        logger.warning(f"Error checking if hash needs update: {e}")
        return True  # Conservative approach - assume it needs update


def generate_password(
        length: int = 16,
        include_uppercase: bool = True,
        include_lowercase: bool = True,
        include_digits: bool = True,
        include_special: bool = True,
        exclude_ambiguous: bool = True
) -> str:
    """Generate a random password.

    Args:
        length: Password length
        include_uppercase: Include uppercase letters
        include_lowercase: Include lowercase letters
        include_digits: Include digits
        include_special: Include special characters
        exclude_ambiguous: Exclude ambiguous characters (0, O, l, I)

    Returns:
        Generated password
    """
    # Build character set
    chars = ""

    if include_lowercase:
        chars += string.ascii_lowercase

    if include_uppercase:
        chars += string.ascii_uppercase

    if include_digits:
        chars += string.digits

    if include_special:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"

    if not chars:
        raise ValueError("At least one character type must be included")

    # Remove ambiguous characters if requested
    if exclude_ambiguous:
        ambiguous = "0OlI1"
        chars = "".join(c for c in chars if c not in ambiguous)

    # Generate password
    password = "".join(secrets.choice(chars) for _ in range(length))

    # Ensure at least one character from each required type
    required_chars = []
    if include_lowercase:
        required_chars.append(secrets.choice(string.ascii_lowercase))
    if include_uppercase:
        required_chars.append(secrets.choice(string.ascii_uppercase))
    if include_digits:
        required_chars.append(secrets.choice(string.digits))
    if include_special:
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if exclude_ambiguous:
            special_chars = "".join(c for c in special_chars if c not in "0OlI1")
        required_chars.append(secrets.choice(special_chars))

    # Replace random positions with required characters
    password_list = list(password)
    for i, char in enumerate(required_chars):
        if i < len(password_list):
            password_list[i] = char

    # Shuffle to randomize positions
    import random
    random.shuffle(password_list)
    
    return "".join(password_list)


def is_password_strong(
    password: str, 
    min_length: Optional[int] = None,
    custom_requirements: Optional[Dict[str, bool]] = None
) -> Tuple[bool, List[str]]:
    """Check if password meets comprehensive strength requirements.

    Args:
        password: Password to check
        min_length: Minimum required length (uses settings default if not provided)
        custom_requirements: Optional custom requirements override

    Returns:
        Tuple of (is_strong, list_of_issues)
    """
    if not password:
        return False, ["Password cannot be empty"]
    
    settings = get_settings()
    min_length = min_length or settings.password_min_length
    
    issues = []

    # Length requirements
    if len(password) < min_length:
        issues.append(f"Password must be at least {min_length} characters long")
    
    if len(password) > 128:
        issues.append("Password must be less than 128 characters long")

    # Character type requirements
    requirements = custom_requirements or {
        "lowercase": True,
        "uppercase": True, 
        "digit": True,
        "special": True
    }
    
    if requirements.get("lowercase", True) and not any(c.islower() for c in password):
        issues.append("Password must contain at least one lowercase letter")

    if requirements.get("uppercase", True) and not any(c.isupper() for c in password):
        issues.append("Password must contain at least one uppercase letter")

    if requirements.get("digit", True) and not any(c.isdigit() for c in password):
        issues.append("Password must contain at least one digit")

    if requirements.get("special", True) and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        issues.append("Password must contain at least one special character")

    # Advanced security checks
    issues.extend(_check_password_patterns(password))
    issues.extend(_check_common_passwords(password))
    issues.extend(_check_repetitive_patterns(password))

    return len(issues) == 0, issues


def _check_password_patterns(password: str) -> List[str]:
    """Check for dangerous password patterns."""
    issues = []
    
    # Sequential characters (abc, 123)
    if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password.lower()):
        issues.append("Password contains sequential characters")
    
    if re.search(r'(012|123|234|345|456|567|678|789)', password):
        issues.append("Password contains sequential numbers")
    
    # Keyboard patterns
    keyboard_patterns = [
        'qwerty', 'asdf', 'zxcv', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
        'password', 'admin', 'root', 'user', 'guest', 'test'
    ]
    
    for pattern in keyboard_patterns:
        if pattern in password.lower():
            issues.append(f"Password contains keyboard pattern or common word: {pattern}")
    
    # Repeated characters (aaa, 111)
    if re.search(r'(.)\1{2,}', password):
        issues.append("Password contains too many repeated characters")
    
    return issues


def _check_common_passwords(password: str) -> List[str]:
    """Check against common/leaked passwords."""
    issues = []
    
    # Most common passwords (subset)
    common_passwords = {
        'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
        'welcome', 'monkey', '1234567890', 'abc123', 'iloveyou', 'adobe123',
        'passw0rd', 'password1', '123456789', 'welcome123', 'admin123',
        'guest', 'root', 'toor', 'pass', 'test', 'user', 'login', 'god',
        'love', 'sex', 'secret', 'jesus', 'hello', 'master', 'freedom',
        'whatever', 'access', 'dragon', 'sunshine', 'football', 'baseball'
    }
    
    if password.lower() in common_passwords:
        issues.append("Password is in the list of commonly used passwords")
    
    # Check if password is just a word with numbers appended
    word_with_numbers = re.match(r'^([a-zA-Z]+)(\d+)$', password)
    if word_with_numbers and word_with_numbers.group(1).lower() in common_passwords:
        issues.append("Password is a common word with numbers appended")
    
    return issues


def _check_repetitive_patterns(password: str) -> List[str]:
    """Check for repetitive patterns in password."""
    issues = []
    
    # Check for alternating patterns (abab, 1212)
    if len(password) >= 4:
        for i in range(len(password) - 3):
            if password[i] == password[i+2] and password[i+1] == password[i+3]:
                issues.append("Password contains alternating repetitive patterns")
                break
    
    # Check for simple incrementing (abc, 123)
    if len(password) >= 3:
        for i in range(len(password) - 2):
            try:
                if (ord(password[i+1]) == ord(password[i]) + 1 and 
                    ord(password[i+2]) == ord(password[i+1]) + 1):
                    issues.append("Password contains incrementing character sequences")
                    break
            except:
                continue
    
    return issues


def calculate_password_entropy(password: str) -> float:
    """Calculate password entropy bits.
    
    Args:
        password: Password to analyze
        
    Returns:
        Entropy in bits
    """
    if not password:
        return 0.0
    
    # Character space size
    char_space = 0
    
    if any(c.islower() for c in password):
        char_space += 26
    if any(c.isupper() for c in password):
        char_space += 26
    if any(c.isdigit() for c in password):
        char_space += 10
    if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?/\\\"'`~" for c in password):
        char_space += 32
    
    if char_space == 0:
        return 0.0
    
    # Calculate entropy: log2(char_space^length)
    import math
    entropy = len(password) * math.log2(char_space)
    
    # Reduce entropy for patterns
    if re.search(r'(.)\1{2,}', password):  # Repeated characters
        entropy *= 0.8
    if re.search(r'(abc|123|qwe)', password.lower()):  # Sequential patterns
        entropy *= 0.7
    
    return entropy


def get_password_strength_score(password: str) -> Tuple[int, str]:
    """Get password strength score from 0-100.
    
    Args:
        password: Password to evaluate
        
    Returns:
        Tuple of (score, description)
    """
    if not password:
        return 0, "No password"
    
    score = 0
    entropy = calculate_password_entropy(password)
    
    # Base score from entropy
    if entropy >= 60:
        score += 40
    elif entropy >= 40:
        score += 30
    elif entropy >= 20:
        score += 20
    else:
        score += 10
    
    # Length bonus
    if len(password) >= 12:
        score += 20
    elif len(password) >= 8:
        score += 15
    elif len(password) >= 6:
        score += 10
    
    # Character variety bonus
    variety = 0
    if any(c.islower() for c in password):
        variety += 1
    if any(c.isupper() for c in password):
        variety += 1
    if any(c.isdigit() for c in password):
        variety += 1
    if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        variety += 1
    
    score += variety * 10
    
    # Check for weaknesses
    is_strong, issues = is_password_strong(password)
    if issues:
        penalty = min(len(issues) * 10, 40)
        score -= penalty
    
    score = max(0, min(100, score))
    
    if score >= 80:
        return score, "Very Strong"
    elif score >= 60:
        return score, "Strong"
    elif score >= 40:
        return score, "Moderate"
    elif score >= 20:
        return score, "Weak"
    else:
        return score, "Very Weak"