-- Smoke test: every read model compiles and returns the demo data.
-- Run after migrations + seeds:  psql -v ON_ERROR_STOP=1 -f database/tests/smoke.sql
\set ON_ERROR_STOP on
\pset footer off

SELECT 'users_view' AS view, count(*) FROM auth.users_view
UNION ALL SELECT 'patients_view', count(*) FROM public.patients_view
UNION ALL SELECT 'doctors_view', count(*) FROM public.doctors_view
UNION ALL SELECT 'doctors_details_view', count(*) FROM public.doctors_details_view
UNION ALL SELECT 'doctors_discovery_view', count(*) FROM public.doctors_discovery_view
UNION ALL SELECT 'doctors_oon_view', count(*) FROM public.doctors_oon_view
UNION ALL SELECT 'countries_view', count(*) FROM public.countries_view
UNION ALL SELECT 'specialties_view', count(*) FROM public.specialties_view
UNION ALL SELECT 'medical_visits_view', count(*) FROM public.medical_visits_view
UNION ALL SELECT 'medical_conditions_view', count(*) FROM public.medical_conditions_view
UNION ALL SELECT 'medical_conditions_latest_view', count(*) FROM public.medical_conditions_latest_view
UNION ALL SELECT 'medical_notes_view', count(*) FROM public.medical_notes_view
UNION ALL SELECT 'medications_view', count(*) FROM public.medications_view
UNION ALL SELECT 'medical_exam_orders_view', count(*) FROM public.medical_exam_orders_view
UNION ALL SELECT 'medical_examinations_view', count(*) FROM public.medical_examinations_view
UNION ALL SELECT 'medical_procedures_view', count(*) FROM public.medical_procedures_view
UNION ALL SELECT 'medical_procedure_details_view', count(*) FROM public.medical_procedure_details_view
UNION ALL SELECT 'medical_vitals_view', count(*) FROM public.medical_vitals_view
UNION ALL SELECT 'medical_vitals_latest_view', count(*) FROM public.medical_vitals_latest_view
UNION ALL SELECT 'medical_events_view', count(*) FROM public.medical_events_view
UNION ALL SELECT 'doctors_events_view', count(*) FROM public.doctors_events_view
UNION ALL SELECT 'patients_analytics_view', count(*) FROM public.patients_analytics_view
UNION ALL SELECT 'doctors_analytics_view', count(*) FROM public.doctors_analytics_view
UNION ALL SELECT 'conversations_view', count(*) FROM dialog.conversations_view
UNION ALL SELECT 'conversation_details_view', count(*) FROM dialog.conversation_details_view
UNION ALL SELECT 'messages_view', count(*) FROM dialog.messages_view
UNION ALL SELECT 'patient_vault_view', count(*) FROM docs.patient_vault_view
UNION ALL SELECT 'doctor_vault_view', count(*) FROM docs.doctor_vault_view
UNION ALL SELECT 'patient_inbox_view', count(*) FROM docs.patient_inbox_view
UNION ALL SELECT 'doctor_inbox_view', count(*) FROM docs.doctor_inbox_view
UNION ALL SELECT 'patient_channel_settings_view', count(*) FROM notif.patient_channel_settings_view
UNION ALL SELECT 'patient_category_settings_view', count(*) FROM notif.patient_category_settings_view
UNION ALL SELECT 'doctor_channel_settings_view', count(*) FROM notif.doctor_channel_settings_view
UNION ALL SELECT 'doctor_category_settings_view', count(*) FROM notif.doctor_category_settings_view
UNION ALL SELECT 'tickets_view', count(*) FROM support.tickets_view;

-- Fuzzy clinical coding resolves free text to the knowledge base.
SELECT 'fuzzy condition' AS check, condition_id, display_name FROM public.search_conditions_fuzzy('hypertension artérielle') LIMIT 1;
SELECT 'fuzzy vital' AS check, vital_id, vital_key FROM public.search_vitals_fuzzy('tension artérielle') LIMIT 1;

-- Solo AI threads were created by trigger for each profile.
SELECT assistant, (patient_id IS NOT NULL) AS has_patient, (doctor_id IS NOT NULL) AS has_doctor, count(*)
FROM dialog.conversations GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- Double booking is rejected by the exclusion constraint.
DO $$
BEGIN
    INSERT INTO public.medical_visits (patient_id, doctor_id, start_time, end_time)
    SELECT patient_id, doctor_id, start_time + interval '10 minutes', end_time + interval '10 minutes'
    FROM public.medical_visits LIMIT 1;
    RAISE EXCEPTION 'overlapping visit was accepted';
EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE 'overlap correctly rejected';
END $$;
