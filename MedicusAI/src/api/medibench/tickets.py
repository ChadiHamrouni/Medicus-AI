import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from medicus_common.core.database import db_manager

router = APIRouter(prefix="/tickets", tags=["tickets"])

class CreateTicketRequest(BaseModel):
    subject: str
    priority: str
    category: str
    body: dict

@router.post("")
async def create_ticket(payload: CreateTicketRequest):
    try:
        row = await db_manager.fetchrow(
            """
            INSERT INTO support.tickets (subject, priority, category, body, status)
            VALUES ($1, $2::support.ticket_priority, $3::support.ticket_category, $4::jsonb, 'open'::support.ticket_status)
            RETURNING id, created_at
            """,
            payload.subject, payload.priority, payload.category, json.dumps(payload.body),
        )
        return {"id": row["id"], "created_at": row["created_at"].isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-coverage")
async def get_tickets_by_coverage(domain: str, coverage: str, lang: str = "en"):
    try:
        rows = await db_manager.fetch(
            """
            SELECT id, subject, status, priority, created_at
            FROM support.tickets_view
            WHERE domain = $1 AND coverage = $2 AND lang = $3
            ORDER BY created_at DESC
            """,
            domain, coverage, lang,
        )
        return [
            {
                "id": row["id"], "subject": row["subject"],
                "status": str(row["status"]), "priority": str(row["priority"]),
                "created_at": row["created_at"].isoformat(),
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: int):
    try:
        row = await db_manager.fetchrow(
            "SELECT id, subject, status, priority, category, body, created_at FROM support.tickets_view WHERE id = $1",
            ticket_id,
        )
        if not row: raise HTTPException(status_code=404, detail="Ticket not found")
        return {
            "id": row["id"], "subject": row["subject"],
            "status": str(row["status"]), "priority": str(row["priority"]),
            "category": str(row["category"]), "body": row["body"],
            "created_at": row["created_at"].isoformat(),
        }
    except HTTPException: raise

@router.put("/{ticket_id}")
async def update_ticket(ticket_id: int, payload: dict):
    try:
        update_parts = []
        params = [ticket_id]
        idx = 2
        for key, value in payload.items():
            if key in ["subject", "status", "priority", "category", "body"]:
                if key == "body" and isinstance(value, dict):
                    value = json.dumps(value)
                update_parts.append(f"{key} = ${idx}")
                params.append(value)
                idx += 1
        
        if not update_parts:
            return {"ok": False, "message": "No valid fields to update"}
            
        set_clause = ", ".join(update_parts)
        await db_manager.execute(f"UPDATE support.tickets SET {set_clause} WHERE id = $1", *params)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
