"""Document vault: metadata in Postgres (docs schema), bytes in pluggable object storage."""

import os
import uuid
from typing import Any, Dict, List, Literal, Optional

from medicus_common.core.database import db_manager
from medicus_common.storage import get_storage, safe_filename

OwnerType = Literal["patient", "doctor"]


def _tables(owner_type: OwnerType) -> tuple[str, str, str]:
    """(documents table, shares table, owner fk column). owner_type is a Literal, never user text."""
    if owner_type == "patient":
        return "docs.patient_docs", "docs.patient_shares", "patient_id"
    return "docs.doctor_docs", "docs.doctor_shares", "doctor_id"


async def upload_document(owner_id: int, owner_type: OwnerType, file_content: bytes,
                          original_name: str, mime_type: str) -> Dict[str, Any]:
    owner_table = "public.patients" if owner_type == "patient" else "public.doctors"
    owner_uuid = await db_manager.fetchval(f"SELECT external_id FROM {owner_table} WHERE id = $1", owner_id)
    doc_external_id = uuid.uuid4()
    _, ext = os.path.splitext(safe_filename(original_name))
    key = f"vault/{owner_type[0]}-{owner_uuid}/d-{doc_external_id}{ext.lower()}"

    await get_storage().put(key, file_content, mime_type)

    doc_table, _, fk = _tables(owner_type)
    await db_manager.execute(
        f"""INSERT INTO {doc_table} ({fk}, external_id, blob_name, original_name, mime_type, size_bytes, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'available')""",
        owner_id, doc_external_id, key, original_name[:255], mime_type, len(file_content),
    )
    # blob_url is kept for older clients; it is the storage key, not a URL.
    return {"doc_external_id": str(doc_external_id), "original_name": original_name,
            "blob_path": key, "blob_url": key, "status": "available"}


async def share_document(doc_external_id: str, conversation_id: str, owner_type: OwnerType, user_id: int) -> None:
    """Share with the other participant of a conversation the caller owns."""
    doc_table, _, _ = _tables(owner_type)
    doc_id = await db_manager.fetchval(
        f"SELECT id FROM {doc_table} WHERE external_id = $1::uuid AND deleted_at IS NULL", doc_external_id
    )
    convo = await db_manager.fetchrow(
        "SELECT user_id, patient_id, doctor_id FROM dialog.conversations WHERE id = $1::uuid", conversation_id
    )
    if doc_id is None or convo is None or convo["user_id"] != user_id:
        raise ValueError("Document or conversation not found")

    if owner_type == "patient":
        if not convo["doctor_id"]:
            raise ValueError("This conversation has no doctor to share with")
        await db_manager.execute(
            """INSERT INTO docs.patient_shares (doc_id, doctor_id, conversation_id) VALUES ($1, $2, $3::uuid)
               ON CONFLICT (doc_id, doctor_id) DO UPDATE
               SET revoked_at = NULL, conversation_id = EXCLUDED.conversation_id, shared_at = now()""",
            doc_id, convo["doctor_id"], conversation_id,
        )
    else:
        if not convo["patient_id"]:
            raise ValueError("This conversation has no patient to share with")
        await db_manager.execute(
            """INSERT INTO docs.doctor_shares (doc_id, patient_id, conversation_id) VALUES ($1, $2, $3::uuid)
               ON CONFLICT (doc_id, patient_id) DO UPDATE
               SET revoked_at = NULL, conversation_id = EXCLUDED.conversation_id, shared_at = now()""",
            doc_id, convo["patient_id"], conversation_id,
        )


async def get_vault_docs(owner_id: int, owner_type: OwnerType) -> List[Dict[str, Any]]:
    """Images and PDFs owned by this patient/doctor."""
    view = "docs.patient_vault_view" if owner_type == "patient" else "docs.doctor_vault_view"
    _, _, fk = _tables(owner_type)
    rows = await db_manager.fetch(
        f"""SELECT external_id, original_name, mime_type, size_bytes, created_at, shared_with
            FROM {view}
            WHERE {fk} = $1 AND (mime_type LIKE 'image/%' OR mime_type = 'application/pdf')
            ORDER BY created_at DESC""",
        owner_id,
    )
    results = []
    for row in rows:
        shares = [s for s in (row["shared_with"] or []) if s and str(s).strip()]
        results.append({
            "external_id": str(row["external_id"]),
            "original_name": row["original_name"],
            "mime_type": row["mime_type"],
            "size_bytes": row["size_bytes"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "active_shares": len(shares),
            "shared_with": shares,
        })
    return results


async def get_shared_docs(owner_id: int, owner_type: OwnerType) -> List[Dict[str, Any]]:
    """Images and PDFs other participants shared with this patient/doctor."""
    if owner_type == "patient":
        view, fk, sender = "docs.patient_inbox_view", "patient_id", "from_doctor"
    else:
        view, fk, sender = "docs.doctor_inbox_view", "doctor_id", "from_patient"
    rows = await db_manager.fetch(
        f"""SELECT external_id, original_name, mime_type, shared_at, {sender} AS shared_by_name, conversation_id
            FROM {view}
            WHERE {fk} = $1 AND (mime_type LIKE 'image/%' OR mime_type = 'application/pdf')
            ORDER BY shared_at DESC""",
        owner_id,
    )
    return [{
        "external_id": str(row["external_id"]),
        "original_name": row["original_name"],
        "mime_type": row["mime_type"],
        "shared_at": row["shared_at"].isoformat() if row["shared_at"] else None,
        "shared_by_name": row["shared_by_name"],
        "conversation_id": str(row["conversation_id"]) if row["conversation_id"] else None,
    } for row in rows]


async def rename_document(doc_external_id: str, new_name: str, owner_type: OwnerType) -> None:
    doc_table, _, _ = _tables(owner_type)
    await db_manager.execute(
        f"UPDATE {doc_table} SET original_name = $1 WHERE external_id = $2::uuid AND deleted_at IS NULL",
        new_name[:255], doc_external_id,
    )


async def delete_document(doc_external_id: str, owner_type: OwnerType) -> None:
    """Soft-delete the record, revoke shares and remove the stored bytes."""
    doc_table, share_table, _ = _tables(owner_type)
    async with db_manager.transaction() as conn:
        key = await conn.fetchval(
            f"UPDATE {doc_table} SET deleted_at = now() WHERE external_id = $1::uuid AND deleted_at IS NULL RETURNING blob_name",
            doc_external_id,
        )
        await conn.execute(
            f"""UPDATE {share_table} SET revoked_at = now()
                WHERE doc_id = (SELECT id FROM {doc_table} WHERE external_id = $1::uuid) AND revoked_at IS NULL""",
            doc_external_id,
        )
    if key:
        await get_storage().delete(key)


async def get_document_shares_details(doc_external_id: str, owner_type: OwnerType) -> List[Dict[str, Any]]:
    if owner_type == "patient":
        query = """SELECT s.conversation_id, s.shared_at, d.first_name || ' ' || d.last_name AS recipient_name
                   FROM docs.patient_shares s
                   JOIN public.doctors d ON s.doctor_id = d.id
                   JOIN docs.patient_docs doc ON s.doc_id = doc.id
                   WHERE doc.external_id = $1::uuid AND s.revoked_at IS NULL
                   ORDER BY s.shared_at DESC"""
    else:
        query = """SELECT s.conversation_id, s.shared_at, p.first_name || ' ' || p.last_name AS recipient_name
                   FROM docs.doctor_shares s
                   JOIN public.patients p ON s.patient_id = p.id
                   JOIN docs.doctor_docs doc ON s.doc_id = doc.id
                   WHERE doc.external_id = $1::uuid AND s.revoked_at IS NULL
                   ORDER BY s.shared_at DESC"""
    rows = await db_manager.fetch(query, doc_external_id)
    return [{
        "conversation_id": str(row["conversation_id"]) if row["conversation_id"] else None,
        "recipient_name": row["recipient_name"],
        "shared_at": row["shared_at"].isoformat() if row["shared_at"] else None,
    } for row in rows]


async def revoke_share(doc_external_id: str, owner_type: OwnerType, conversation_id: Optional[str] = None) -> None:
    doc_table, share_table, _ = _tables(owner_type)
    sql = f"""UPDATE {share_table} SET revoked_at = now()
              WHERE doc_id = (SELECT id FROM {doc_table} WHERE external_id = $1::uuid) AND revoked_at IS NULL"""
    if conversation_id:
        await db_manager.execute(sql + " AND conversation_id = $2::uuid", doc_external_id, conversation_id)
    else:
        await db_manager.execute(sql, doc_external_id)


async def find_readable_document(doc_external_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    """The document's storage key and type if the user owns it or it is actively shared with them."""
    row = await db_manager.fetchrow(
        """
        SELECT blob_name, mime_type, original_name FROM (
            SELECT pd.blob_name, pd.mime_type, pd.original_name FROM docs.patient_docs pd
            JOIN public.patients p ON p.id = pd.patient_id
            WHERE pd.external_id = $1::uuid AND pd.deleted_at IS NULL AND p.user_id = $2
            UNION ALL
            SELECT dd.blob_name, dd.mime_type, dd.original_name FROM docs.doctor_docs dd
            JOIN public.doctors d ON d.id = dd.doctor_id
            WHERE dd.external_id = $1::uuid AND dd.deleted_at IS NULL AND d.user_id = $2
            UNION ALL
            SELECT pd.blob_name, pd.mime_type, pd.original_name FROM docs.patient_shares s
            JOIN docs.patient_docs pd ON pd.id = s.doc_id AND pd.deleted_at IS NULL
            JOIN public.doctors d ON d.id = s.doctor_id
            WHERE pd.external_id = $1::uuid AND s.revoked_at IS NULL AND d.user_id = $2
            UNION ALL
            SELECT dd.blob_name, dd.mime_type, dd.original_name FROM docs.doctor_shares s
            JOIN docs.doctor_docs dd ON dd.id = s.doc_id AND dd.deleted_at IS NULL
            JOIN public.patients p ON p.id = s.patient_id
            WHERE dd.external_id = $1::uuid AND s.revoked_at IS NULL AND p.user_id = $2
        ) readable LIMIT 1
        """,
        doc_external_id, user_id,
    )
    return dict(row) if row else None
