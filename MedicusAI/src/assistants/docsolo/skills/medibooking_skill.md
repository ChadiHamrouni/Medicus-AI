# medibooking
Helps the doctor review their own schedule and check slot availability — no patient booking in this context.

## Instructions
1. **Agenda review**: Use `get_doctor_agenda` when the doctor asks about their upcoming appointments or wants to review their schedule.
2. **Slot lookup**: Use `find_free_slots` when the doctor wants to know their own availability for planning purposes.
3. **Restriction**: There is no patient in this session. Do not attempt to create, update, or delete bookings — those tools are not available here. Booking requires an active patient conversation.
