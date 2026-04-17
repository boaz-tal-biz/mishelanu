-- Phase 1 backend extension: seed category_aliases with canonical names + common variants.
-- Boaz-approved 2026-04-17.
-- All aliases stored lowercase. Canonical subcategory name itself is always seeded as an alias.

INSERT INTO category_aliases (alias, category_id)
SELECT lower(alias), id FROM (
  VALUES
  -- Household
  ('plumber',          'Plumber'),
  ('plumbing',         'Plumber'),
  ('electrician',      'Electrician'),
  ('electrical',       'Electrician'),
  ('electrics',        'Electrician'),
  ('gas engineer',     'Gas Engineer'),
  ('gas safe',         'Gas Engineer'),
  ('boiler engineer',  'Gas Engineer'),
  ('roofer',           'Roofer'),
  ('roofing',          'Roofer'),
  ('painter',          'Painter/Decorator'),
  ('decorator',        'Painter/Decorator'),
  ('painter/decorator','Painter/Decorator'),
  ('locksmith',        'Locksmith'),
  ('cleaner',          'Cleaner'),
  ('cleaning',         'Cleaner'),
  ('handyman',         'Handyman'),
  ('odd jobs',         'Handyman'),

  -- Professional
  ('accountant',       'Accountant'),
  ('accounting',       'Accountant'),
  ('bookkeeper',       'Accountant'),
  ('solicitor',        'Solicitor/Lawyer'),
  ('lawyer',           'Solicitor/Lawyer'),
  ('solicitor/lawyer', 'Solicitor/Lawyer'),
  ('legal',            'Solicitor/Lawyer'),
  ('financial advisor','Financial Advisor'),
  ('financial adviser','Financial Advisor'),
  ('ifa',              'Financial Advisor'),
  ('immigration advisor','Immigration Advisor'),
  ('immigration lawyer','Immigration Advisor'),

  -- Education
  ('tutor',            'Tutor'),
  ('tutoring',         'Tutor'),
  ('private tutor',    'Tutor'),
  ('music teacher',    'Music Teacher'),
  ('piano teacher',    'Music Teacher'),
  ('violin teacher',   'Music Teacher'),
  ('hebrew teacher',   'Hebrew Teacher'),
  ('hebrew tutor',     'Hebrew Teacher'),
  ('ivrit teacher',    'Hebrew Teacher'),

  -- Health
  ('dentist',          'Dentist'),
  ('dental',           'Dentist'),
  ('gp',               'GP'),
  ('doctor',           'GP'),
  ('general practitioner','GP'),
  ('physiotherapist',  'Physiotherapist'),
  ('physio',           'Physiotherapist'),
  ('therapist',        'Therapist/Counsellor'),
  ('counsellor',       'Therapist/Counsellor'),
  ('counselor',        'Therapist/Counsellor'),
  ('therapist/counsellor','Therapist/Counsellor'),
  ('psychotherapist',  'Therapist/Counsellor'),

  -- Property
  ('estate agent',     'Estate Agent'),
  ('letting agent',    'Estate Agent'),
  ('surveyor',         'Surveyor'),
  ('mortgage broker',  'Mortgage Broker'),
  ('mortgage advisor', 'Mortgage Broker'),
  ('mortgage adviser', 'Mortgage Broker'),

  -- Technology
  ('it support',       'IT Support'),
  ('computer repair',  'IT Support'),
  ('tech support',     'IT Support'),
  ('web developer',    'Web Developer'),
  ('website developer','Web Developer'),
  ('web designer',     'Web Developer'),

  -- Lifestyle
  ('dog walker',       'Dog Walker'),
  ('dog walking',      'Dog Walker'),
  ('pet care',         'Pet Care'),
  ('pet sitter',       'Pet Care'),
  ('pet sitting',      'Pet Care'),
  ('personal trainer', 'Personal Trainer'),
  ('pt',               'Personal Trainer'),
  ('photographer',     'Photographer'),
  ('photography',      'Photographer'),

  -- Events
  ('dj',               'DJ'),
  ('disc jockey',      'DJ'),
  ('caterer',          'Caterer'),
  ('catering',         'Caterer'),
  ('event planner',    'Event Planner'),
  ('event planning',   'Event Planner'),
  ('events planner',   'Event Planner')
) AS variants(alias, subcategory)
JOIN service_categories_registry r ON r.subcategory = variants.subcategory;
