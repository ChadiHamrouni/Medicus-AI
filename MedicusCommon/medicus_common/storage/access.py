"""Object-level authorization: may this user read this stored file?"""

from typing import Iterable, Optional

from medicus_common.core.database import db_manager

_VAULT_ACCESS_SQL = """
SELECT EXISTS (
    SELECT 1 FROM docs.patient_docs pd JOIN public.patients p ON p.id = pd.patient_id
    WHERE pd.blob_name = $1 AND pd.deleted_at IS NULL AND p.user_id = $2
    UNION ALL
    SELECT 1 FROM docs.doctor_docs dd JOIN public.doctors d ON d.id = dd.doctor_id
    WHERE dd.blob_name = $1 AND dd.deleted_at IS NULL AND d.user_id = $2
    UNION ALL
    SELECT 1 FROM docs.patient_shares s
    JOIN docs.patient_docs pd ON pd.id = s.doc_id AND pd.deleted_at IS NULL
    JOIN public.doctors d ON d.id = s.doctor_id
    WHERE pd.blob_name = $1 AND s.revoked_at IS NULL AND d.user_id = $2
    UNION ALL
    SELECT 1 FROM docs.doctor_shares s
    JOIN docs.doctor_docs dd ON dd.id = s.doc_id AND dd.deleted_at IS NULL
    JOIN public.patients p ON p.id = s.patient_id
    WHERE dd.blob_name = $1 AND s.revoked_at IS NULL AND p.user_id = $2
)
"""


async def accessible_conversation_ids(user_id: int, conversation_id: str) -> Optional[list[str]]:
    """The conversation and its mirror, if `user_id` owns the conversation; otherwise None."""
    row = await db_manager.fetchrow(
        "SELECT user_id, mirror_conversation_id FROM dialog.conversations WHERE id = $1::uuid",
        conversation_id,
    )
    if row is None or row["user_id"] != user_id:
        return None
    ids = [str(conversation_id)]
    if row["mirror_conversation_id"]:
        ids.append(str(row["mirror_conversation_id"]))
    return ids


async def user_can_read_object(user_id: int, key: str, conversation_ids: Iterable[str] = ()) -> bool:
    """
    True when `key` is an attachment stored under one of the given conversations
    (which the caller must already have authorized), or a vault document owned by
    or actively shared with the user. Message content is client-controlled and is
    deliberately NOT used as proof of access.
    """
    if any(key.startswith(f"attachments/{cid}/") for cid in conversation_ids):
        return True
    return bool(await db_manager.fetchval(_VAULT_ACCESS_SQL, key, user_id))


async def share_vault_object_in_conversation(user_id: int, key: str, conversation_id: str) -> bool:
    """
    Share a vault document the user owns with the other participant of
    `conversation_id` (called when it is attached to a message). Returns False if
    the user does not own the document or the conversation has no counterpart.
    """
    convo = await db_manager.fetchrow(
        "SELECT user_id, patient_id, doctor_id, assistant::text AS assistant FROM dialog.conversations WHERE id = $1::uuid",
        conversation_id,
    )
    if convo is None or convo["user_id"] != user_id or not (convo["patient_id"] and convo["doctor_id"]):
        return False

    if convo["assistant"] == "mediaid":
        doc_id = await db_manager.fetchval(
            """SELECT pd.id FROM docs.patient_docs pd JOIN public.patients p ON p.id = pd.patient_id
               WHERE pd.blob_name = $1 AND pd.deleted_at IS NULL AND p.user_id = $2""",
            key, user_id,
        )
        if doc_id is None:
            return False
        await db_manager.execute(
            """INSERT INTO docs.patient_shares (doc_id, doctor_id, conversation_id) VALUES ($1, $2, $3::uuid)
               ON CONFLICT (doc_id, doctor_id) DO UPDATE SET revoked_at = NULL, shared_at = now(),
                   conversation_id = EXCLUDED.conversation_id""",
            doc_id, convo["doctor_id"], conversation_id,
        )
        return True

    doc_id = await db_manager.fetchval(
        """SELECT dd.id FROM docs.doctor_docs dd JOIN public.doctors d ON d.id = dd.doctor_id
           WHERE dd.blob_name = $1 AND dd.deleted_at IS NULL AND d.user_id = $2""",
        key, user_id,
    )
    if doc_id is None:
        return False
    await db_manager.execute(
        """INSERT INTO docs.doctor_shares (doc_id, patient_id, conversation_id) VALUES ($1, $2, $3::uuid)
           ON CONFLICT (doc_id, patient_id) DO UPDATE SET revoked_at = NULL, shared_at = now(),
               conversation_id = EXCLUDED.conversation_id""",
        doc_id, convo["patient_id"], conversation_id,
    )
    return True
