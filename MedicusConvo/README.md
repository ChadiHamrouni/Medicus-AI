# MedicusConvo

Conversations and messages.

- Patient and doctor copies of each thread, plus each user's solo assistant conversation.
- Messages, file/voice uploads to pluggable storage (local, S3, Azure), signed media links.
- Real-time delivery over Socket.IO at `/api/MedicusConvo/socketio` (JWT-authenticated; clients may only join conversations they own).
- Internal broadcast API used by MedicusAI (protected by `INTERNAL_API_KEY`, blocked at the gateway).

Run with `docker compose up -d --build convo`. Overview: root [README](../README.md).