"""Tokens and passwords (medicus_common.auth)."""

from datetime import datetime, timedelta, timezone

import pytest

from medicus_common.auth.jwt_handler import JWTHandler
from medicus_common.auth.password import hash_password, verify_password
from medicus_common.core.exceptions import AuthenticationError, TokenExpiredError

SECRET = "unit-test-secret-0123456789abcdef0123"


@pytest.fixture
def jwt():
    return JWTHandler(secret=SECRET, issuer="medicus", audience="medicus-app")


def test_token_round_trip_keeps_identity_and_role(jwt):
    token = jwt.create_token(subject=42, email="emily@example.com", role="patient")
    payload = jwt.decode_token(token)
    assert (payload.sub, payload.email, payload.role) == ("42", "emily@example.com", "patient")


def test_token_signed_with_another_secret_is_rejected(jwt):
    forged = JWTHandler(secret="another-secret-0123456789abcdef012345", issuer="medicus",
                        audience="medicus-app").create_token(subject=1, role="doctor")
    with pytest.raises(AuthenticationError):
        jwt.decode_token(forged)
    assert jwt.verify_token(forged) is None


def test_token_for_another_audience_is_rejected(jwt):
    other = JWTHandler(secret=SECRET, issuer="medicus", audience="someone-else").create_token(subject=1)
    with pytest.raises(AuthenticationError):
        jwt.decode_token(other)


def test_expired_token_raises_token_expired(jwt):
    token = jwt.create_token(subject=1, expires_delta=timedelta(seconds=-5))
    with pytest.raises(TokenExpiredError):
        jwt.decode_token(token)
    assert jwt.is_token_expired(token)


def test_tampered_token_is_rejected(jwt):
    token = jwt.create_token(subject=1, role="patient")
    head, body, sig = token.split(".")
    with pytest.raises(AuthenticationError):
        jwt.decode_token(f"{head}.{body}x.{sig}")


def test_access_tokens_are_short_lived(jwt):
    lifetime = jwt.get_token_expiry(jwt.create_access_token(subject=1)) - datetime.now(timezone.utc)
    assert timedelta(minutes=14) < lifetime <= timedelta(minutes=15)


def test_zero_lifetime_means_expired_not_the_default(jwt):
    # Regression: timedelta(0) used to be treated as "not given" and produced a 7-day token.
    assert jwt.is_token_expired(jwt.create_token(subject=1, expires_delta=timedelta(0)))


def test_password_hash_verifies_only_the_right_password():
    hashed = hash_password("Showcase2026!", rounds=4)    # low cost: keep the test fast
    assert hashed != "Showcase2026!"
    assert verify_password("Showcase2026!", hashed)
    assert not verify_password("showcase2026!", hashed)


def test_empty_password_cannot_be_hashed_or_verified():
    with pytest.raises(ValueError):
        hash_password("")
    assert not verify_password("", "$2b$04$invalid")


def test_garbage_hash_does_not_raise():
    assert verify_password("anything", "not-a-bcrypt-hash") is False
