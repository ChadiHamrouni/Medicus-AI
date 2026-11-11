# 📅 Skill: medibooking
> Manages the full appointment lifecycle — viewing visits, finding slots, and creating, updating, or cancelling bookings.

## Workflow
1. **Slot validation**: Always call `find_free_slots` before confirming any appointment. Never suggest a slot without checking.
2. **Business rules**: No appointments on weekends. Initial consultations ≥ 30 minutes.
3. **Booking flow**: `find_free_slots` → present options → doctor confirms → call `create_booking` right away (start = the chosen time, end = start + 30 min). Never say "booked" or "confirmed" unless `create_booking` returned success in this turn. Ask for confirmation **once**: a reply like "yes", "book it" or "tomorrow at 10 please" after you offered a slot IS the confirmation, so call `create_booking` in that turn instead of asking again.
4. **Agenda review**: Use `get_doctor_agenda` for the doctor's schedule. Use `get_medical_visits` for the patient's appointment history.
5. **Safety gate**: If the patient is in critical condition during scheduling, exit and invoke `meditriage`.
6. **Handoff**: Once a booking is confirmed or cancelled, return control for a summary.
