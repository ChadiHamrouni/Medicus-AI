-- Reference data required by the application. Idempotent: safe to re-run.

INSERT INTO public.languages (name, code) VALUES
    ('English', 'en'), ('French', 'fr'), ('Arabic', 'ar'), ('Spanish', 'es'),
    ('German', 'de'), ('Italian', 'it'), ('Portuguese', 'pt')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.countries (name, iso_code, phone_code) VALUES
    ('United States', 'US', '+1'), ('Canada', 'CA', '+1'), ('United Kingdom', 'GB', '+44'),
    ('France', 'FR', '+33'), ('Germany', 'DE', '+49'), ('Spain', 'ES', '+34'), ('Italy', 'IT', '+39'),
    ('Portugal', 'PT', '+351'), ('Belgium', 'BE', '+32'), ('Switzerland', 'CH', '+41'),
    ('Netherlands', 'NL', '+31'), ('Tunisia', 'TN', '+216'), ('Morocco', 'MA', '+212'),
    ('Algeria', 'DZ', '+213'), ('Egypt', 'EG', '+20'), ('Saudi Arabia', 'SA', '+966'),
    ('United Arab Emirates', 'AE', '+971'), ('Qatar', 'QA', '+974'), ('Turkey', 'TR', '+90'),
    ('India', 'IN', '+91'), ('Brazil', 'BR', '+55'), ('Mexico', 'MX', '+52'),
    ('Australia', 'AU', '+61'), ('Japan', 'JP', '+81'), ('South Africa', 'ZA', '+27'),
    ('Nigeria', 'NG', '+234'), ('Kenya', 'KE', '+254')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.specialty_super_categories (name, description, icon) VALUES
    ('Primary Care', 'General and family medicine', 'stethoscope'),
    ('Internal Medicine', 'Adult organ-system specialties', 'heart'),
    ('Surgery', 'Surgical specialties', 'scalpel'),
    ('Women & Children', 'Obstetrics, gynecology and pediatrics', 'baby'),
    ('Mind & Nervous System', 'Neurology and mental health', 'brain'),
    ('Diagnostics', 'Imaging and laboratory medicine', 'scan'),
    ('Aesthetics & Skin', 'Dermatology and aesthetic medicine', 'sparkles')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.specialties (name, super_category_id)
SELECT s.name, c.id FROM (VALUES
    ('General Practice', 'Primary Care'), ('Family Medicine', 'Primary Care'),
    ('Emergency Medicine', 'Primary Care'),
    ('Internal Medicine', 'Internal Medicine'), ('Cardiology', 'Internal Medicine'),
    ('Endocrinology', 'Internal Medicine'), ('Gastroenterology', 'Internal Medicine'),
    ('Oncology', 'Internal Medicine'), ('Pulmonology', 'Internal Medicine'),
    ('Nephrology', 'Internal Medicine'),
    ('General Surgery', 'Surgery'), ('Orthopedics', 'Surgery'), ('Urology', 'Surgery'),
    ('Ophthalmology', 'Surgery'), ('ENT', 'Surgery'), ('Anesthesiology', 'Surgery'),
    ('Gynecology', 'Women & Children'), ('Pediatrics', 'Women & Children'),
    ('Neurology', 'Mind & Nervous System'), ('Psychiatry', 'Mind & Nervous System'),
    ('Radiology', 'Diagnostics'), ('Pathology', 'Diagnostics'),
    ('Dermatology', 'Aesthetics & Skin'), ('Aesthetic Medicine', 'Aesthetics & Skin')
) AS s(name, category)
JOIN public.specialty_super_categories c ON c.name = s.category
ON CONFLICT (name) DO NOTHING;

-- Vitals knowledge base: canonical keys the clinical-coding job maps free text to.
INSERT INTO public.vitals (vital_key, display_name, category, unit, synonyms) VALUES
    ('systolic', 'Systolic Blood Pressure', 'vitals', 'mmHg', ARRAY['systolic','sbp','pression systolique']),
    ('diastolic', 'Diastolic Blood Pressure', 'vitals', 'mmHg', ARRAY['diastolic','dbp','pression diastolique']),
    ('blood_pressure', 'Blood Pressure', 'vitals', 'mmHg', ARRAY['bp','blood pressure','tension','tension artérielle','pression artérielle']),
    ('resting_heart_rate', 'Heart Rate', 'vitals', 'bpm', ARRAY['heart rate','pulse','hr','pouls','fréquence cardiaque']),
    ('temperature_c', 'Body Temperature', 'vitals', '°C', ARRAY['temperature','temp','température','fever']),
    ('oxygen_saturation', 'Oxygen Saturation', 'vitals', '%', ARRAY['spo2','o2 sat','saturation','oxygen']),
    ('respiratory_rate', 'Respiratory Rate', 'vitals', 'breaths/min', ARRAY['respiratory rate','rr','fréquence respiratoire']),
    ('blood_glucose', 'Blood Glucose', 'vitals', 'mg/dL', ARRAY['glucose','blood sugar','glycémie']),
    ('weight_kg', 'Weight', 'body_metrics', 'kg', ARRAY['weight','poids']),
    ('height_cm', 'Height', 'body_metrics', 'cm', ARRAY['height','taille']),
    ('bmi', 'Body Mass Index', 'body_metrics', 'kg/m²', ARRAY['bmi','imc','body mass index']),
    ('waist_cm', 'Waist Circumference', 'body_metrics', 'cm', ARRAY['waist','tour de taille']),
    ('smoking', 'Smoking', 'lifestyle', NULL, ARRAY['smoking','tobacco','tabac','cigarettes']),
    ('alcohol', 'Alcohol Use', 'lifestyle', NULL, ARRAY['alcohol','drinking','alcool']),
    ('exercise', 'Physical Activity', 'lifestyle', NULL, ARRAY['exercise','sport','activité physique']),
    ('sleep_hours', 'Sleep', 'lifestyle', 'h', ARRAY['sleep','sommeil']),
    ('diet', 'Diet', 'lifestyle', NULL, ARRAY['diet','régime','alimentation']),
    ('blood_type', 'Blood Type', 'biological', NULL, ARRAY['blood type','blood group','groupe sanguin']),
    ('allergies', 'Allergies', 'biological', NULL, ARRAY['allergy','allergies','allergie']),
    ('pregnancy_status', 'Pregnancy Status', 'reproductive', NULL, ARRAY['pregnant','pregnancy','grossesse']),
    ('vaccination', 'Vaccination', 'immunization', NULL, ARRAY['vaccine','vaccination','immunization','vaccin'])
ON CONFLICT (vital_key) DO NOTHING;

-- Threshold zones per vital: [{gender, age_min, age_max, zones:[{min,max,color,label,status}]}]
INSERT INTO public.vital_reference_ranges (vital_id, vital_key, thresholds)
SELECT v.vital_id, v.vital_key, t.thresholds::jsonb FROM (VALUES
    ('systolic', '[{"gender":"ALL","age_min":0,"age_max":150,"zones":[
        {"max":90,"color":"#3B82F6","label":"Low","status":"LOW"},
        {"min":90,"max":120,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":120,"max":140,"color":"#F59E0B","label":"Elevated","status":"ELEVATED"},
        {"min":140,"max":180,"color":"#EF4444","label":"High","status":"HIGH"},
        {"min":180,"color":"#7F1D1D","label":"Crisis","status":"EMERGENCY_HIGH"}]}]'),
    ('diastolic', '[{"gender":"ALL","age_min":0,"age_max":150,"zones":[
        {"max":60,"color":"#3B82F6","label":"Low","status":"LOW"},
        {"min":60,"max":80,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":80,"max":90,"color":"#F59E0B","label":"Elevated","status":"ELEVATED"},
        {"min":90,"max":120,"color":"#EF4444","label":"High","status":"HIGH"},
        {"min":120,"color":"#7F1D1D","label":"Crisis","status":"EMERGENCY_HIGH"}]}]'),
    ('resting_heart_rate', '[{"gender":"ALL","age_min":18,"age_max":150,"zones":[
        {"max":50,"color":"#3B82F6","label":"Low","status":"LOW"},
        {"min":50,"max":100,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":100,"max":130,"color":"#F59E0B","label":"High","status":"HIGH"},
        {"min":130,"color":"#EF4444","label":"Critical","status":"EMERGENCY_HIGH"}]}]'),
    ('temperature_c', '[{"gender":"ALL","age_min":0,"age_max":150,"zones":[
        {"max":35,"color":"#3B82F6","label":"Hypothermia","status":"EMERGENCY_LOW"},
        {"min":35,"max":37.5,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":37.5,"max":39,"color":"#F59E0B","label":"Fever","status":"HIGH"},
        {"min":39,"color":"#EF4444","label":"High Fever","status":"EMERGENCY_HIGH"}]}]'),
    ('oxygen_saturation', '[{"gender":"ALL","age_min":0,"age_max":150,"zones":[
        {"max":90,"color":"#EF4444","label":"Critical","status":"EMERGENCY_LOW"},
        {"min":90,"max":95,"color":"#F59E0B","label":"Low","status":"LOW"},
        {"min":95,"color":"#10B981","label":"Normal","status":"NORMAL"}]}]'),
    ('bmi', '[{"gender":"ALL","age_min":18,"age_max":150,"zones":[
        {"max":18.5,"color":"#3B82F6","label":"Underweight","status":"LOW"},
        {"min":18.5,"max":25,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":25,"max":30,"color":"#F59E0B","label":"Overweight","status":"ELEVATED"},
        {"min":30,"color":"#EF4444","label":"Obese","status":"HIGH"}]}]'),
    ('blood_glucose', '[{"gender":"ALL","age_min":0,"age_max":150,"zones":[
        {"max":70,"color":"#EF4444","label":"Low","status":"LOW"},
        {"min":70,"max":100,"color":"#10B981","label":"Normal","status":"NORMAL"},
        {"min":100,"max":126,"color":"#F59E0B","label":"Prediabetic","status":"ELEVATED"},
        {"min":126,"color":"#EF4444","label":"High","status":"HIGH"}]}]')
) AS t(vital_key, thresholds)
JOIN public.vitals v ON v.vital_key = t.vital_key
WHERE NOT EXISTS (SELECT 1 FROM public.vital_reference_ranges r WHERE r.vital_key = t.vital_key);

-- A starter set of common conditions and procedures. Extend freely or load a full
-- terminology (ICD-10, CPT) — the fuzzy search functions work on any size.
INSERT INTO public.conditions (display_name, icd10, category, is_chronic, synonyms)
SELECT * FROM (VALUES
    ('Essential hypertension', 'I10', 'cardiovascular', true, ARRAY['hypertension','high blood pressure','hta','hypertension artérielle']),
    ('Type 2 diabetes mellitus', 'E11', 'endocrine', true, ARRAY['type 2 diabetes','t2d','diabète type 2','diabetes']),
    ('Asthma', 'J45', 'respiratory', true, ARRAY['asthma','asthme']),
    ('Acute upper respiratory infection', 'J06.9', 'respiratory', false, ARRAY['cold','common cold','uri','rhume']),
    ('Migraine', 'G43', 'neurological', true, ARRAY['migraine','headache','céphalée']),
    ('Gastroesophageal reflux disease', 'K21', 'digestive', true, ARRAY['gerd','acid reflux','reflux']),
    ('Hypothyroidism', 'E03.9', 'endocrine', true, ARRAY['hypothyroidism','hypothyroïdie']),
    ('Hyperlipidemia', 'E78.5', 'metabolic', true, ARRAY['high cholesterol','dyslipidemia','cholestérol']),
    ('Major depressive disorder', 'F32', 'mental_health', true, ARRAY['depression','dépression']),
    ('Generalized anxiety disorder', 'F41.1', 'mental_health', true, ARRAY['anxiety','anxiété']),
    ('Iron deficiency anemia', 'D50', 'hematologic', false, ARRAY['anemia','anémie']),
    ('Acne vulgaris', 'L70.0', 'dermatologic', false, ARRAY['acne','acné']),
    ('Atopic dermatitis', 'L20', 'dermatologic', true, ARRAY['eczema','eczéma']),
    ('Osteoarthritis of knee', 'M17', 'musculoskeletal', true, ARRAY['knee arthritis','gonarthrose']),
    ('Low back pain', 'M54.5', 'musculoskeletal', false, ARRAY['back pain','lumbago','lombalgie']),
    ('Urinary tract infection', 'N39.0', 'genitourinary', false, ARRAY['uti','infection urinaire'])
) AS c(display_name, icd10, category, is_chronic, synonyms)
WHERE NOT EXISTS (SELECT 1 FROM public.conditions LIMIT 1);

INSERT INTO public.procedures (name, description, procedure_code, cpt_code, synonyms)
SELECT * FROM (VALUES
    ('Appendectomy', 'Surgical removal of the appendix', 'APPX', '44950', ARRAY['appendectomy','appendicectomie']),
    ('Knee arthroscopy', 'Minimally invasive knee joint surgery', 'KARTH', '29881', ARRAY['knee arthroscopy','arthroscopie du genou']),
    ('Colonoscopy', 'Endoscopic examination of the colon', 'COLO', '45378', ARRAY['colonoscopy','coloscopie']),
    ('Upper GI endoscopy', 'Endoscopic examination of the upper GI tract', 'EGD', '43235', ARRAY['gastroscopy','egd','fibroscopie']),
    ('Cataract surgery', 'Lens replacement surgery', 'CATR', '66984', ARRAY['cataract surgery','chirurgie de la cataracte']),
    ('Botulinum toxin injection', 'Aesthetic or therapeutic botulinum toxin injection', 'BOTX', '64615', ARRAY['botox','toxine botulique']),
    ('Platelet-rich plasma injection', 'PRP therapy injection', 'PRP', '0232T', ARRAY['prp','prp session','plasma riche en plaquettes']),
    ('Dermal filler injection', 'Hyaluronic acid filler injection', 'FILL', '11950', ARRAY['filler','fillers','acide hyaluronique']),
    ('Skin biopsy', 'Removal of skin tissue for analysis', 'SBX', '11102', ARRAY['skin biopsy','biopsie cutanée']),
    ('Cesarean section', 'Surgical delivery of a baby', 'CSEC', '59510', ARRAY['c-section','cesarean','césarienne'])
) AS p(name, description, procedure_code, cpt_code, synonyms)
WHERE NOT EXISTS (SELECT 1 FROM public.procedures LIMIT 1);
