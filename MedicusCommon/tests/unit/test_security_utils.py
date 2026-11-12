"""Untrusted file names, paths and text (medicus_common.utils.security)."""

import pytest

from medicus_common.core.exceptions import SecurityError
from medicus_common.utils.security import CryptoUtils, FileValidator, InputValidator, PathValidator


# --- paths and file names -------------------------------------------------------------------

def test_path_inside_an_allowed_directory_is_accepted(tmp_path):
    inside = tmp_path / "patients" / "33" / "scan.pdf"
    assert PathValidator.validate_file_path(inside, [str(tmp_path)]) == inside.resolve()


@pytest.mark.parametrize("attack", ["../../etc/passwd", "patients/../../secrets.env"])
def test_directory_traversal_is_rejected(tmp_path, attack):
    base = tmp_path / "storage"
    base.mkdir()
    with pytest.raises(SecurityError):
        PathValidator.validate_file_path(base / attack, [str(base)])


@pytest.mark.parametrize("name, expected", [
    ("lab results.pdf", "lab results.pdf"),
    ("../../etc/passwd", "_._etc_passwd"),
    ('x<y>:"z"|?*.png', "x_y___z____.png"),
    ("report..pdf", "report.pdf"),
])
def test_filenames_are_sanitised(name, expected):
    assert PathValidator.sanitize_filename(name) == expected


def test_filename_made_only_of_dots_gets_a_random_name():
    assert PathValidator.sanitize_filename("...").startswith("file_")


def test_very_long_filenames_keep_their_extension():
    name = PathValidator.sanitize_filename("a" * 400 + ".pdf")
    assert len(name) == 255 and name.endswith(".pdf")


def test_extension_check_is_case_insensitive():
    assert FileValidator.validate_file_extension("Scan.PDF", [".pdf", ".png"])
    assert not FileValidator.validate_file_extension("malware.exe", [".pdf", ".png"])


# --- text, emails, phones -------------------------------------------------------------------

@pytest.mark.parametrize("payload", [
    "<script>alert(1)</script>",
    "click javascript:steal()",
    '<img src=x onerror=alert(1)>',
    "data:text/html;base64,AAAA",
])
def test_injection_patterns_are_rejected(payload):
    with pytest.raises(SecurityError):
        InputValidator.sanitize_text_input(payload)


def test_control_characters_are_removed_and_text_is_trimmed():
    assert InputValidator.sanitize_text_input("  BP 150/95\x00\x07  ") == "BP 150/95"


def test_long_text_is_truncated():
    assert len(InputValidator.sanitize_text_input("a" * 5000, max_length=100)) == 100


@pytest.mark.parametrize("email, ok", [
    ("emily.carter@example.com", True),
    ("Emily.Carter@Example.com", True),
    ("not-an-email", False),
    ("", False),
])
def test_email_validation(email, ok):
    assert InputValidator.validate_email(email) is ok


@pytest.mark.parametrize("phone, ok", [
    ("+1 (512) 555-0118", True),
    ("+21698123456", True),
    ("12", False),
    ("call me", False),
])
def test_phone_validation(phone, ok):
    assert InputValidator.validate_phone_number(phone) is ok


# --- crypto ---------------------------------------------------------------------------------

def test_secure_tokens_are_random_and_of_the_requested_length():
    a, b = CryptoUtils.generate_secure_token(16), CryptoUtils.generate_secure_token(16)
    assert a != b and len(a) == 32


def test_file_hash_and_constant_time_comparison(tmp_path):
    f = tmp_path / "doc.txt"
    f.write_text("Bennett Heart & Vascular")
    digest = CryptoUtils.hash_file(f)
    assert CryptoUtils.compare_hashes(digest, CryptoUtils.hash_file(f))
    assert not CryptoUtils.compare_hashes(digest, "0" * 64)
