"""MediKnowledge: doctors publish trusted material (procedures, preparation, prices,
policies); the assistant answers their patients' questions from it.

  ingest.py         file/text -> clean text -> chunks -> optional embeddings -> PostgreSQL
  hybrid_search.py  full-text + prefix + optional embedding search, fused with RRF
  knowledge.py      the `search_doctor_knowledge` agent tool
"""

from src.tools.mediknowledge.knowledge import search_doctor_knowledge

__all__ = ["search_doctor_knowledge"]
