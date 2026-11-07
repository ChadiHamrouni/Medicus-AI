-- Demo accounts for local development. NEVER load this into a real deployment.
--   doctor:  doctor@example.com  / MedicusDemo123!
--   patient: patient@example.com / MedicusDemo123!
-- Idempotent: does nothing if the demo users already exist.

DO $$
DECLARE
    v_doctor_user   integer;
    v_patient_user  integer;
    v_doctor_id     integer;
    v_patient_id    integer;
    v_patient_conv  uuid;
    v_doctor_conv   uuid;
    v_hash          text := crypt('MedicusDemo123!', gen_salt('bf', 12));
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'doctor@example.com') THEN
        RAISE NOTICE 'Demo data already present, skipping';
        RETURN;
    END IF;

    INSERT INTO auth.users (email, password, role, account_status, signup_step, is_email_verified)
    VALUES ('doctor@example.com', v_hash, 'doctor', 'active', 99, true)
    RETURNING id INTO v_doctor_user;

    INSERT INTO auth.users (email, password, role, account_status, signup_step, is_email_verified)
    VALUES ('patient@example.com', v_hash, 'patient', 'active', 99, true)
    RETURNING id INTO v_patient_user;

    INSERT INTO auth.user_profiles (user_id) VALUES (v_doctor_user), (v_patient_user);
    INSERT INTO auth.user_settings (user_id, is_default) VALUES (v_doctor_user, true), (v_patient_user, true);

    INSERT INTO public.doctors (
        user_id, first_name, last_name, gender, wa_number, medical_licence, established_since,
        specialty_id, country_id, language_id, contact, address, working_hours, medical_procedures
    ) VALUES (
        v_doctor_user, 'Amina', 'Haddad', 'FEMALE', '+15550000001', 'DEMO-LIC-0001', '2012-09-01',
        (SELECT id FROM public.specialties WHERE name = 'General Practice'),
        (SELECT id FROM public.countries WHERE iso_code = 'US'),
        (SELECT id FROM public.languages WHERE code = 'en'),
        '{"email": "doctor@example.com", "phone": "+15550000001"}',
        '{"clinic_address": "100 Demo Street, Springfield"}',
        '[{"day_of_week":"Monday","is_available":true,"time_slots":[{"start_time":"09:00","end_time":"17:00"}]},
          {"day_of_week":"Tuesday","is_available":true,"time_slots":[{"start_time":"09:00","end_time":"17:00"}]},
          {"day_of_week":"Wednesday","is_available":true,"time_slots":[{"start_time":"09:00","end_time":"13:00"}]},
          {"day_of_week":"Thursday","is_available":true,"time_slots":[{"start_time":"09:00","end_time":"17:00"}]},
          {"day_of_week":"Friday","is_available":true,"time_slots":[{"start_time":"09:00","end_time":"15:00"}]}]',
        '[{"procedure_name": "General consultation", "procedure_price": 60},
          {"procedure_name": "Follow-up visit", "procedure_price": 40}]'
    ) RETURNING id INTO v_doctor_id;

    INSERT INTO public.patients (
        user_id, first_name, last_name, dob, gender, relationship, wa_number, country_id, language_id,
        emergency_contact
    ) VALUES (
        v_patient_user, 'Sam', 'Rivera', '1988-04-12', 'MALE', 'main', '+15550000002',
        (SELECT id FROM public.countries WHERE iso_code = 'US'),
        (SELECT id FROM public.languages WHERE code = 'en'),
        '[{"name": "Alex Rivera", "relationship": "spouse", "phone": "+15550000003"}]'
    ) RETURNING id INTO v_patient_id;

    -- Patient <-> doctor thread: patient copy + doctor mirror.
    INSERT INTO dialog.conversations (user_id, patient_id, doctor_id, assistant)
    VALUES (v_patient_user, v_patient_id, v_doctor_id, 'mediaid') RETURNING id INTO v_patient_conv;
    INSERT INTO dialog.conversations (user_id, patient_id, doctor_id, assistant, mirror_conversation_id)
    VALUES (v_doctor_user, v_patient_id, v_doctor_id, 'medidoc', v_patient_conv) RETURNING id INTO v_doctor_conv;
    UPDATE dialog.conversations SET mirror_conversation_id = v_doctor_conv WHERE id = v_patient_conv;

    INSERT INTO dialog.messages (conversation_id, role, content, processed_by_ai) VALUES
        (v_patient_conv, 'assistant',
         '{"type":"app","text_io":"Hi Sam! I''m your Medicus assistant. How can I help you today?","assistant":"mediaid"}', true);

    -- A little clinical history so the assistant tools have something to show.
    INSERT INTO public.medical_vitals (patient_id, doctor_id, recorded_at, vital_values, meta_data) VALUES
        (v_patient_id, v_doctor_id, now() - interval '30 days',
         jsonb_build_array(
             jsonb_build_object('vital_text', 'systolic', 'vital_value', '128',
                                'vital_id', (SELECT vital_id FROM public.vitals WHERE vital_key = 'systolic')),
             jsonb_build_object('vital_text', 'diastolic', 'vital_value', '84',
                                'vital_id', (SELECT vital_id FROM public.vitals WHERE vital_key = 'diastolic')),
             jsonb_build_object('vital_text', 'heart rate', 'vital_value', '72',
                                'vital_id', (SELECT vital_id FROM public.vitals WHERE vital_key = 'resting_heart_rate'))),
         '{"tool":"seed","actor_role":"doctor"}'),
        (v_patient_id, v_doctor_id, now() - interval '2 days',
         jsonb_build_array(
             jsonb_build_object('vital_text', 'systolic', 'vital_value', '122',
                                'vital_id', (SELECT vital_id FROM public.vitals WHERE vital_key = 'systolic')),
             jsonb_build_object('vital_text', 'diastolic', 'vital_value', '80',
                                'vital_id', (SELECT vital_id FROM public.vitals WHERE vital_key = 'diastolic'))),
         '{"tool":"seed","actor_role":"doctor"}');

    INSERT INTO public.medical_conditions (patient_id, doctor_id, condition_id, condition_text, diagnosis_date, severity)
    VALUES (v_patient_id, v_doctor_id,
            (SELECT condition_id FROM public.conditions WHERE icd10 = 'I10'),
            'Essential hypertension', current_date - 400, 'mild');

    INSERT INTO public.medical_prescriptions (patient_id, doctor_id, date_prescribed, medications, notes)
    VALUES (v_patient_id, v_doctor_id, current_date - 30,
            '[{"medication_name":"Lisinopril","dosage":"10 mg","frequency":"once daily","duration":"90 days","form":"tablet","purpose":"blood pressure"}]',
            'Monitor blood pressure weekly');

    INSERT INTO public.medical_visits (patient_id, doctor_id, start_time, end_time, visit_type, visit_details, created_by)
    VALUES (v_patient_id, v_doctor_id,
            date_trunc('day', now()) + interval '7 days' + interval '10 hours',
            date_trunc('day', now()) + interval '7 days' + interval '10 hours 30 minutes',
            'follow-up', 'Blood pressure follow-up', 'seed');

    RAISE NOTICE 'Demo data created: doctor_id=%, patient_id=%', v_doctor_id, v_patient_id;
END $$;
