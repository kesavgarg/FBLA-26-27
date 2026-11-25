-- =====================================================================
-- Demo data and one-click reset
-- ---------------------------------------------------------------------
-- EVERYTHING here is fictional: patients, doctors, prescriptions, products,
-- prices and order history. No controlled substances are modelled.
--
-- The four demo accounts are created in Supabase Auth by
-- scripts/seed-demo-users.mjs with these fixed ids, then this function
-- fills in the rest. reset_demo_data() can be run again at any time
-- (Owner > Presenter guide > Reset demo) to restore the starting state.
-- Usability test results are NEVER deleted by a reset.
-- =====================================================================

-- Fixed ids for the demo accounts (also used by the seed script and tests).
create or replace function public.demo_user_id(p_key text)
returns uuid language sql immutable set search_path = ''
as $$
  select case p_key
    when 'owner'    then '0d000000-0000-4000-8000-000000000001'::uuid
    when 'staff'    then '0d000000-0000-4000-8000-000000000002'::uuid
    when 'doctor'   then '0d000000-0000-4000-8000-000000000003'::uuid
    when 'margaret' then '0d000000-0000-4000-8000-000000000010'::uuid
    when 'daniel'   then '0d000000-0000-4000-8000-000000000011'::uuid
  end;
$$;

-- ---------------------------------------------------------------------
-- Pickup slots: build 30-minute slots inside store hours for the next
-- p_days days (store time zone: America/New_York). Closed days get none.
-- Existing slots are kept, so bookings are never lost.
-- ---------------------------------------------------------------------
create or replace function public.ensure_pickup_slots(p_days int default 7)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.store_settings%rowtype;
  day_date date;
  day_hours jsonb;
  slot_start timestamp;
  slot_end timestamp;
  created int := 0;
begin
  select * into settings from public.store_settings where id = 1;
  for i in 0 .. greatest(p_days, 1) - 1 loop
    day_date := (now() at time zone 'America/New_York')::date + i;
    day_hours := settings.hours -> extract(dow from day_date)::int::text;
    continue when day_hours is null or jsonb_typeof(day_hours) = 'null';

    slot_start := day_date + (day_hours ->> 'open')::time;
    slot_end   := day_date + (day_hours ->> 'close')::time;
    while slot_start + make_interval(mins => settings.slot_minutes) <= slot_end loop
      insert into public.pickup_slots (starts_at, capacity)
      values (slot_start at time zone 'America/New_York', settings.slot_capacity)
      on conflict (starts_at) do nothing;
      if found then created := created + 1; end if;
      slot_start := slot_start + make_interval(mins => settings.slot_minutes);
    end loop;
  end loop;
  return created;
end;
$$;

-- ---------------------------------------------------------------------
-- The reset itself.
-- ---------------------------------------------------------------------
create or replace function public.reset_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := (select auth.role());
  v_owner    uuid := public.demo_user_id('owner');
  v_staff    uuid := public.demo_user_id('staff');
  v_doctor   uuid := public.demo_user_id('doctor');
  v_margaret uuid := public.demo_user_id('margaret');
  v_daniel   uuid := public.demo_user_id('daniel');
  v_child    uuid := 'f0000000-0000-4000-8000-000000000001';
  v_order    uuid;
  v_slot     uuid;
  v_day      int;
  v_lines    int;
  v_sub      int;
  v_tax      int;
  v_fee      int;
  v_method   public.fulfillment_method;
  v_status   public.order_status;
  v_seq      int := 0;
  v_created  timestamptz;
  prod       record;
begin
  -- Only the owner (from the app) or server-side code may reset.
  if not (jwt_role is null or jwt_role = 'service_role' or public.is_owner()) then
    raise exception 'Only the owner can reset the demo' using errcode = '42501';
  end if;

  if (select count(*) from public.profiles where id in (v_owner, v_staff, v_doctor, v_margaret, v_daniel)) < 5 then
    raise exception 'Demo accounts are missing. Run: npm run seed:users' using errcode = 'P0002';
  end if;

  -- 1. Clear everything that a demo run creates (children first).
  --    usability_sessions is deliberately NOT cleared.
  delete from public.messages where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.refill_requests where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.order_items where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.orders where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.prescriptions where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.consult_requests where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.symptom_logs where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.pickup_slots where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.audit_logs where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.allergies where profile_id in (v_margaret, v_daniel)
    or family_member_id in (select id from public.family_members where owner_id in (v_margaret, v_daniel));
  delete from public.current_medications where profile_id in (v_margaret, v_daniel);
  delete from public.family_members where owner_id in (v_margaret, v_daniel);
  delete from public.inventory where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.products where true; -- "where true": Supabase blocks DELETE without WHERE via the API
  delete from public.store_settings where true; -- "where true": Supabase blocks DELETE without WHERE via the API

  -- 2. Store settings. Hours are ASSUMED demo hours (the real store reports
  --    being closed on Sundays; weekday hours were not verified).
  insert into public.store_settings (id, hours) values (1, jsonb_build_object(
    '0', null,
    '1', jsonb_build_object('open', '09:00', 'close', '18:00'),
    '2', jsonb_build_object('open', '09:00', 'close', '18:00'),
    '3', jsonb_build_object('open', '09:00', 'close', '18:00'),
    '4', jsonb_build_object('open', '09:00', 'close', '18:00'),
    '5', jsonb_build_object('open', '09:00', 'close', '18:00'),
    '6', jsonb_build_object('open', '09:00', 'close', '13:00')
  ));

  -- 3. Demo profiles (names, roles, titles). Auth accounts already exist.
  update public.profiles set full_name = 'Lee Hartwell', role = 'owner', title = 'Owner (fictional)', is_demo = true,
    phone = '770-555-0101' where id = v_owner;
  update public.profiles set full_name = 'Dana Whitfield', role = 'staff', title = 'Pharmacist, PharmD (fictional)',
    is_demo = true, phone = '770-555-0102' where id = v_staff;
  update public.profiles set full_name = 'Dr. Priya Raman', role = 'doctor',
    title = 'Simulated prescriber · Maple Street Family Practice (fictional)', is_demo = true,
    phone = '770-555-0103' where id = v_doctor;
  update public.profiles set full_name = 'Margaret Ellis', role = 'customer', is_demo = true,
    date_of_birth = '1958-03-14', phone = '770-555-0110', title = null where id = v_margaret;
  update public.profiles set full_name = 'Daniel Ortiz', role = 'customer', is_demo = true,
    date_of_birth = '1987-09-02', phone = '770-555-0111', title = null where id = v_daniel;

  update public.user_preferences set budget_limit_cents = null, large_text = false, high_contrast = false,
    reduce_motion = false, locale = 'en'
  where profile_id in (v_margaret, v_daniel);

  -- 4. Patient context: allergies, medications, a family member.
  insert into public.allergies (profile_id, substance, reaction, severity) values
    (v_margaret, 'aspirin', 'Hives and wheezing', 'severe'),
    (v_margaret, 'penicillin', 'Rash', 'moderate');
  insert into public.current_medications (profile_id, name, ingredient) values
    (v_margaret, 'Lisinopril 10 mg (fictional record)', 'lisinopril'),
    (v_margaret, 'Levothyroxine 50 mcg (fictional record)', 'levothyroxine');
  insert into public.family_members (id, owner_id, full_name, birth_year, relationship) values
    (v_child, v_daniel, 'Sofia Ortiz', 2018, 'child');
  insert into public.allergies (family_member_id, substance, reaction, severity) values
    (v_child, 'peanut', 'Swelling', 'severe');

  -- 5. Catalog. Fictional products and prices. "Goodson Select" is a made-up house brand.
  insert into public.products
    (slug, name, name_es, description, description_es, category, price_cents, requires_rx, active_ingredient, is_featured, image_path, image_alt)
  values
    -- Pain relief
    ('select-acetaminophen-500', 'Goodson Select Acetaminophen 500 mg, 100 caplets', 'Acetaminofén 500 mg Goodson Select, 100 cápsulas',
     'Everyday relief for headaches, muscle aches and fever. Read and follow the package label.',
     'Alivio diario para dolores de cabeza, musculares y fiebre. Lea y siga la etiqueta del envase.',
     'pain_relief', 799, false, 'acetaminophen', true, '/products/pain-acetaminophen.webp', 'White bottle of acetaminophen caplets'),
    ('select-ibuprofen-200', 'Goodson Select Ibuprofen 200 mg, 100 tablets', 'Ibuprofeno 200 mg Goodson Select, 100 tabletas',
     'Relief for minor aches, pains and swelling. Read and follow the package label.',
     'Alivio para dolores leves e inflamación. Lea y siga la etiqueta del envase.',
     'pain_relief', 849, false, 'ibuprofen', false, '/products/pain-ibuprofen.webp', 'Bottle of ibuprofen tablets'),
    ('select-naproxen-220', 'Goodson Select Naproxen Sodium 220 mg, 50 caplets', 'Naproxeno sódico 220 mg Goodson Select, 50 cápsulas',
     'Long-lasting relief for minor joint and back pain. Read and follow the package label.',
     'Alivio prolongado para dolor leve de articulaciones y espalda. Lea y siga la etiqueta.',
     'pain_relief', 929, false, 'naproxen', false, '/products/pain-naproxen.webp', 'Box of naproxen sodium caplets'),
    ('select-aspirin-81', 'Goodson Select Low-Dose Aspirin 81 mg, 120 tablets', 'Aspirina de dosis baja 81 mg Goodson Select, 120 tabletas',
     'Low-dose aspirin. Ask your doctor before daily use. Read and follow the package label.',
     'Aspirina de dosis baja. Consulte a su médico antes de usarla a diario. Lea la etiqueta.',
     'pain_relief', 549, false, 'aspirin', false, '/products/pain-aspirin.webp', 'Bottle of low-dose aspirin tablets'),
    ('heat-wrap-back', 'ThermaCalm Back Heat Wraps, 3 count', 'Parches térmicos ThermaCalm para espalda, 3 unidades',
     'Air-activated heat wraps that stay warm for up to 8 hours.',
     'Parches térmicos activados por aire que se mantienen tibios hasta 8 horas.',
     'pain_relief', 1199, false, null, false, '/products/pain-heat-wrap.webp', 'Box of back heat wraps'),
    -- Cold and flu
    ('select-daytime-cold', 'Goodson Select Daytime Cold & Flu, 24 softgels', 'Resfriado y gripe de día Goodson Select, 24 cápsulas blandas',
     'Non-drowsy relief for congestion, cough and minor aches.',
     'Alivio sin somnolencia para congestión, tos y dolores leves.',
     'cold_flu', 1049, false, 'acetaminophen', true, '/products/cold-daytime.webp', 'Box of daytime cold and flu softgels'),
    ('select-cough-syrup', 'Goodson Select Cough Syrup DM, 8 fl oz', 'Jarabe para la tos DM Goodson Select, 8 oz',
     'Calms coughs and loosens chest congestion.',
     'Calma la tos y afloja la congestión del pecho.',
     'cold_flu', 899, false, 'dextromethorphan', false, '/products/cold-cough-syrup.webp', 'Bottle of cough syrup'),
    ('select-loratadine-10', 'Goodson Select Loratadine 10 mg, 30 tablets', 'Loratadina 10 mg Goodson Select, 30 tabletas',
     '24-hour non-drowsy allergy relief.',
     'Alivio de alergias por 24 horas sin somnolencia.',
     'cold_flu', 1299, false, 'loratadine', false, '/products/cold-loratadine.webp', 'Box of loratadine allergy tablets'),
    ('saline-nasal-spray', 'ClearBreeze Saline Nasal Spray, 1.5 fl oz', 'Aerosol nasal salino ClearBreeze, 1.5 oz',
     'Drug-free saline mist to moisten dry nasal passages.',
     'Rocío salino sin medicamento para humectar la nariz seca.',
     'cold_flu', 549, false, null, false, '/products/cold-saline.webp', 'Saline nasal spray bottle'),
    ('honey-lozenges', 'Meadow Honey Lemon Throat Lozenges, 30 count', 'Pastillas de miel y limón Meadow, 30 unidades',
     'Soothing honey lemon drops for a scratchy throat.',
     'Pastillas de miel y limón para aliviar la garganta.',
     'cold_flu', 399, false, 'menthol', false, '/products/cold-lozenges.webp', 'Bag of honey lemon lozenges'),
    -- Vitamins
    ('select-vitamin-d3', 'Goodson Select Vitamin D3 2000 IU, 120 softgels', 'Vitamina D3 2000 UI Goodson Select, 120 cápsulas',
     'Supports healthy bones and immune function.',
     'Ayuda a mantener huesos y sistema inmune saludables.',
     'vitamins', 999, false, null, true, '/products/vit-d3.webp', 'Bottle of vitamin D3 softgels'),
    ('select-multivitamin-50', 'Goodson Select Adults 50+ Multivitamin, 100 tablets', 'Multivitamínico para adultos 50+ Goodson Select, 100 tabletas',
     'Daily multivitamin formulated for adults over 50.',
     'Multivitamínico diario formulado para adultos mayores de 50 años.',
     'vitamins', 1449, false, null, false, '/products/vit-multi-50.webp', 'Bottle of multivitamin tablets'),
    ('kids-gummy-vitamins', 'Sunny Kids Gummy Vitamins, 90 count', 'Gomitas vitamínicas Sunny Kids, 90 unidades',
     'Fruit-flavored daily vitamins for children 4 and up. Contains no peanuts.',
     'Vitaminas diarias con sabor a fruta para niños de 4 años en adelante. Sin cacahuate.',
     'vitamins', 1199, false, null, false, '/products/vit-kids.webp', 'Jar of kids gummy vitamins'),
    ('select-vitamin-c', 'Goodson Select Vitamin C 1000 mg, 100 tablets', 'Vitamina C 1000 mg Goodson Select, 100 tabletas',
     'Antioxidant support in an easy daily tablet.',
     'Apoyo antioxidante en una tableta diaria.',
     'vitamins', 899, false, null, false, '/products/vit-c.webp', 'Bottle of vitamin C tablets'),
    -- First aid
    ('select-bandages-assorted', 'Goodson Select Flexible Bandages, 60 assorted', 'Vendas flexibles Goodson Select, 60 surtidas',
     'Breathable fabric bandages in four sizes.',
     'Vendas de tela transpirable en cuatro tamaños.',
     'first_aid', 499, false, null, false, '/products/aid-bandages.webp', 'Box of assorted bandages'),
    ('first-aid-kit-family', 'Family First Aid Kit, 140 pieces', 'Botiquín familiar de primeros auxilios, 140 piezas',
     'A stocked kit for home and car: bandages, gauze, tape, wipes and more.',
     'Botiquín completo para casa y auto: vendas, gasa, cinta, toallitas y más.',
     'first_aid', 2499, false, null, true, '/products/aid-kit.webp', 'Red first aid kit case'),
    ('antiseptic-wipes', 'CleanCare Antiseptic Wipes, 40 count', 'Toallitas antisépticas CleanCare, 40 unidades',
     'Individually wrapped wipes for cleaning minor cuts.',
     'Toallitas individuales para limpiar cortadas leves.',
     'first_aid', 449, false, null, false, '/products/aid-wipes.webp', 'Box of antiseptic wipes'),
    ('instant-cold-pack', 'ChillFast Instant Cold Packs, 2 count', 'Compresas frías instantáneas ChillFast, 2 unidades',
     'Squeeze to activate. No freezer needed.',
     'Apriete para activar. No necesita congelador.',
     'first_aid', 649, false, null, false, '/products/aid-cold-pack.webp', 'Two instant cold packs'),
    -- Personal care
    ('gentle-moisturizer', 'Calmwater Gentle Daily Moisturizer, 12 oz', 'Crema humectante diaria Calmwater, 12 oz',
     'Fragrance-free lotion for sensitive, dry skin.',
     'Loción sin fragancia para piel sensible y seca.',
     'personal_care', 1149, false, null, false, '/products/care-moisturizer.webp', 'Pump bottle of moisturizer'),
    ('spf-50-sunscreen', 'Calmwater Mineral Sunscreen SPF 50, 3 oz', 'Protector solar mineral FPS 50 Calmwater, 3 oz',
     'Broad-spectrum mineral sunscreen, water resistant for 80 minutes.',
     'Protector solar mineral de amplio espectro, resistente al agua 80 minutos.',
     'personal_care', 1399, false, null, false, '/products/care-sunscreen.webp', 'Tube of mineral sunscreen'),
    ('soft-toothbrush-2', 'BrightSmile Soft Toothbrushes, 2 pack', 'Cepillos de dientes suaves BrightSmile, 2 unidades',
     'Soft bristles that are gentle on gums.',
     'Cerdas suaves y delicadas con las encías.',
     'personal_care', 499, false, null, false, '/products/care-toothbrush.webp', 'Two soft toothbrushes'),
    ('lip-balm-shea', 'Calmwater Shea Lip Balm, 2 count', 'Bálsamo labial de karité Calmwater, 2 unidades',
     'Moisturizing lip balm with shea butter.',
     'Bálsamo humectante con manteca de karité.',
     'personal_care', 399, false, null, false, '/products/care-lip-balm.webp', 'Two lip balm tubes'),
    -- Health essentials
    ('digital-thermometer', 'Goodson Select Digital Thermometer', 'Termómetro digital Goodson Select',
     'Fast 10-second readings with a fever alert.',
     'Lecturas rápidas en 10 segundos con alerta de fiebre.',
     'health_essentials', 1299, false, null, true, '/products/ess-thermometer.webp', 'Digital thermometer'),
    ('bp-monitor-arm', 'SteadyPulse Upper Arm Blood Pressure Monitor', 'Monitor de presión arterial de brazo SteadyPulse',
     'Automatic monitor with an easy-to-read display and memory for two users.',
     'Monitor automático con pantalla fácil de leer y memoria para dos usuarios.',
     'health_essentials', 4999, false, null, false, '/products/ess-bp-monitor.webp', 'Upper arm blood pressure monitor'),
    ('weekly-pill-organizer', 'Weekly AM/PM Pill Organizer', 'Organizador semanal de pastillas mañana/noche',
     'Large compartments with easy-open lids for each morning and evening.',
     'Compartimentos grandes con tapas fáciles de abrir para cada mañana y noche.',
     'health_essentials', 799, false, null, false, '/products/ess-pill-organizer.webp', 'Weekly pill organizer'),
    ('reading-glasses-2', 'ClearView Reading Glasses +2.00', 'Lentes para leer ClearView +2.00',
     'Lightweight readers with a protective case.',
     'Lentes ligeros con estuche protector.',
     'health_essentials', 1599, false, null, false, '/products/ess-readers.webp', 'Pair of reading glasses'),
    -- Gifts
    ('bulldog-mug', 'Downtown Cumming Coffee Mug', 'Taza de café del centro de Cumming',
     'A 14 oz ceramic mug celebrating downtown Cumming. Fictional design.',
     'Taza de cerámica de 14 oz que celebra el centro de Cumming. Diseño ficticio.',
     'gifts', 1499, false, null, false, '/products/gift-mug.webp', 'White ceramic coffee mug'),
    ('get-well-basket', 'Get Well Soon Gift Basket', 'Canasta de regalo Que te mejores',
     'Tea, honey lozenges, lip balm and a cozy pair of socks.',
     'Té, pastillas de miel, bálsamo labial y un par de calcetines.',
     'gifts', 3499, false, null, true, '/products/gift-basket.webp', 'Gift basket with tea and socks'),
    ('scented-candle', 'Magnolia Morning Soy Candle', 'Vela de soya Magnolia Morning',
     'Hand-poured soy candle with a light magnolia scent.',
     'Vela de soya hecha a mano con un ligero aroma a magnolia.',
     'gifts', 1899, false, null, false, '/products/gift-candle.webp', 'Soy candle in a glass jar'),
    -- Prescription items (locked until a doctor approves; NOT controlled substances)
    ('rx-benzonatate-100', 'Benzonatate 100 mg capsules (Rx)', 'Benzonatato 100 mg cápsulas (receta)',
     'Prescription cough medicine. Available only after a prescriber approves it for you.',
     'Medicamento para la tos con receta. Disponible solo después de que un médico lo apruebe.',
     'prescription', 1200, true, 'benzonatate', false, '/products/rx-capsules.webp', 'Prescription bottle of capsules'),
    ('rx-amoxicillin-500', 'Amoxicillin 500 mg capsules (Rx)', 'Amoxicilina 500 mg cápsulas (receta)',
     'Prescription antibiotic. Available only after a prescriber approves it for you.',
     'Antibiótico con receta. Disponible solo después de que un médico lo apruebe.',
     'prescription', 1500, true, 'amoxicillin', false, '/products/rx-capsules-2.webp', 'Prescription bottle of capsules'),
    ('rx-lisinopril-10', 'Lisinopril 10 mg tablets (Rx)', 'Lisinopril 10 mg tabletas (receta)',
     'Prescription blood pressure medicine. Refill with an active prescription.',
     'Medicamento con receta para la presión arterial. Resurta con una receta activa.',
     'prescription', 900, true, 'lisinopril', false, '/products/rx-tablets.webp', 'Prescription bottle of tablets'),
    ('rx-atorvastatin-20', 'Atorvastatin 20 mg tablets (Rx)', 'Atorvastatina 20 mg tabletas (receta)',
     'Prescription cholesterol medicine. Refill with an active prescription.',
     'Medicamento con receta para el colesterol. Resurta con una receta activa.',
     'prescription', 1100, true, 'atorvastatin', false, '/products/rx-tablets-2.webp', 'Prescription bottle of tablets'),
    ('rx-levothyroxine-50', 'Levothyroxine 50 mcg tablets (Rx)', 'Levotiroxina 50 mcg tabletas (receta)',
     'Prescription thyroid medicine. Refill with an active prescription.',
     'Medicamento con receta para la tiroides. Resurta con una receta activa.',
     'prescription', 800, true, 'levothyroxine', false, '/products/rx-tablets-3.webp', 'Prescription bottle of tablets');

  -- 6. Stock. One item is sold out and two are low, for the failure demos.
  insert into public.inventory (product_id, quantity, low_stock_threshold)
  select id,
         case slug
           when 'select-loratadine-10' then 0   -- out-of-stock demo
           when 'digital-thermometer'  then 2   -- low stock / quantity-above-stock demo
           when 'get-well-basket'      then 3
           when 'bp-monitor-arm'       then 6
           else 25 + (abs(hashtext(slug)) % 40)
         end,
         5
  from public.products;

  -- 7. Prescriptions for Margaret (refill scenarios) and Daniel.
  insert into public.prescriptions
    (rx_number, patient_id, product_id, prescriber_id, directions, refills_remaining, status, written_on, expires_on)
  values
    ('RX-100231', v_margaret, (select id from public.products where slug = 'rx-lisinopril-10'), v_doctor,
     'Take 1 tablet by mouth once daily. (Fictional demo record.)', 3, 'active',
     current_date - 120, current_date + 245),
    ('RX-100232', v_margaret, (select id from public.products where slug = 'rx-atorvastatin-20'), v_doctor,
     'Take 1 tablet by mouth at bedtime. (Fictional demo record.)', 2, 'active',
     current_date - 400, current_date - 35),       -- EXPIRED: refill must be refused
    ('RX-100233', v_margaret, (select id from public.products where slug = 'rx-levothyroxine-50'), v_doctor,
     'Take 1 tablet by mouth every morning. (Fictional demo record.)', 0, 'active',
     current_date - 200, current_date + 165),      -- NO REFILLS LEFT
    ('RX-100240', v_daniel, (select id from public.products where slug = 'rx-amoxicillin-500'), v_doctor,
     'Take 1 capsule by mouth every 8 hours until finished. (Fictional demo record.)', 0, 'inactive',
     current_date - 90, current_date + 275);

  -- 8. A pending consult from Daniel (used for the "doctor denies" demo)
  --    and one older approved consult so approval-time analytics have data.
  insert into public.symptom_logs (patient_id, symptoms, severity, started_on, notes, triage_result, logged_at)
  values (v_daniel, array['cough', 'sore throat'], 4, current_date - 2,
          'Mild cough, no fever. Wants something stronger than cough drops. (Fictional.)', 'CONSULT', now() - interval '3 hours');
  insert into public.consult_requests
    (patient_id, symptom_log_id, requested_product_id, summary, allergies_snapshot, medications_snapshot, status, created_at)
  values (v_daniel, (select id from public.symptom_logs where patient_id = v_daniel limit 1),
          (select id from public.products where slug = 'rx-amoxicillin-500'),
          'Cough and sore throat for 2 days, severity 4/10, no fever. Requesting an antibiotic.',
          '{}', '{}', 'submitted', now() - interval '3 hours');

  insert into public.consult_requests
    (patient_id, requested_product_id, summary, status, doctor_id, doctor_note, created_at, decided_at)
  values (v_margaret, (select id from public.products where slug = 'rx-lisinopril-10'),
          'Blood pressure follow-up; requesting continuation of current prescription. (Fictional history.)',
          'approved', v_doctor, 'Continue current prescription. (Fictional.)',
          now() - interval '20 days', now() - interval '20 days' + interval '5 hours 10 minutes');

  -- 9. Pickup slots for the coming week.
  perform public.ensure_pickup_slots(7);

  -- 10. Simulated order history for the last 14 days (for analytics charts).
  --     Deterministic: the same reset always produces the same history.
  perform setseed(0.1959);
  for v_day in reverse 13 .. 1 loop
    for n in 1 .. (1 + floor(random() * 3))::int loop
      v_seq := v_seq + 1;
      v_created := date_trunc('day', now() - make_interval(days => v_day)) + interval '14 hours'
                   + make_interval(mins => (random() * 360)::int);
      v_method := case when random() < 0.35 then 'delivery' else 'pickup' end;
      v_status := case when random() < 0.08 then 'cancelled' else 'completed' end;
      v_order := gen_random_uuid();

      -- Past pickups need a slot row; create a historical one.
      v_slot := null;
      if v_method = 'pickup' then
        insert into public.pickup_slots (starts_at, capacity, booked_count)
        values (v_created + interval '2 hours', 4, 1)
        on conflict (starts_at) do update set booked_count = public.pickup_slots.booked_count
        returning id into v_slot;
      end if;

      insert into public.orders (id, order_number, customer_id, fulfillment, pickup_slot_id,
        delivery_line1, delivery_city, delivery_zip, status, subtotal_cents, tax_cents, delivery_fee_cents,
        total_cents, idempotency_key, created_at, updated_at)
      values (v_order,
        'GD-' || to_char(v_created at time zone 'America/New_York', 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0'),
        case when random() < 0.6 then v_margaret else v_daniel end,
        v_method, v_slot,
        case when v_method = 'delivery' then '200 Example Lane (fictional)' end,
        case when v_method = 'delivery' then 'Cumming' end,
        case when v_method = 'delivery' then '30040' end,
        v_status, 0, 0, 0, 0, gen_random_uuid(), v_created, v_created + interval '3 hours');

      v_lines := (1 + floor(random() * 3))::int;
      for prod in
        select id, price_cents from public.products
        where not requires_rx order by random() limit v_lines
      loop
        insert into public.order_items (order_id, product_id, quantity, unit_price_cents, is_taxable)
        values (v_order, prod.id, (1 + floor(random() * 2))::int, prod.price_cents, true);
      end loop;

      select coalesce(sum(quantity * unit_price_cents), 0) into v_sub from public.order_items where order_id = v_order;
      v_tax := round(v_sub * 700 / 10000.0);
      v_fee := case when v_method = 'delivery' and v_sub < 3500 then 599 else 0 end;
      update public.orders set subtotal_cents = v_sub, tax_cents = v_tax, delivery_fee_cents = v_fee,
        total_cents = v_sub + v_tax + v_fee where id = v_order;
    end loop;
  end loop;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, details)
  values ((select auth.uid()), public.current_user_role(), 'demo.reset', 'system',
          jsonb_build_object('orders_seeded', v_seq));

  return jsonb_build_object(
    'products', (select count(*) from public.products),
    'orders', (select count(*) from public.orders),
    'prescriptions', (select count(*) from public.prescriptions),
    'pickup_slots_upcoming', (select count(*) from public.pickup_slots where starts_at > now())
  );
end;
$$;

revoke execute on function public.reset_demo_data() from public, anon;
grant execute on function public.reset_demo_data() to authenticated;
revoke execute on function public.ensure_pickup_slots(int) from public, anon;
grant execute on function public.ensure_pickup_slots(int) to authenticated;
