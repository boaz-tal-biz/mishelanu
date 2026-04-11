CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  full_name TEXT NOT NULL,
  business_name TEXT,
  address TEXT,
  mobile_phone TEXT NOT NULL,
  whatsapp_number TEXT,
  business_phone TEXT,
  email TEXT NOT NULL,
  service_categories TEXT[],
  raw_description TEXT,
  raw_external_links TEXT,
  parsed_profile JSONB,
  parsed_categories_suggestion TEXT[],
  profile_html TEXT,
  recommendation_token UUID UNIQUE DEFAULT gen_random_uuid(),
  status provider_status DEFAULT 'active',
  suspension_reason TEXT,
  live_at TIMESTAMPTZ,
  enrichment_status enrichment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_categories_registry (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  status category_status DEFAULT 'active',
  suggested_by_provider_id UUID REFERENCES providers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  recommender_name TEXT NOT NULL,
  recommender_email TEXT,
  relationship recommendation_relationship NOT NULL,
  recommendation_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_message TEXT,
  requester_phone TEXT,
  parsed_service_needed TEXT,
  parsed_location TEXT,
  parsed_urgency TEXT,
  parsed_context TEXT,
  matched_provider_id UUID REFERENCES providers(id),
  status service_request_status DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES service_requests(id),
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT
);

CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id),
  provider_id UUID REFERENCES providers(id),
  recipient_phone TEXT NOT NULL,
  message_type message_type NOT NULL,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'simulated'
);

CREATE TABLE admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id),
  alert_type alert_type NOT NULL,
  alert_message TEXT NOT NULL,
  due_date DATE,
  dismissed BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_providers_slug ON providers(slug);
CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_enrichment ON providers(enrichment_status);
CREATE INDEX idx_recommendations_provider ON recommendations(provider_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_profile_visits_provider ON profile_visits(provider_id);
CREATE INDEX idx_admin_alerts_dismissed ON admin_alerts(dismissed);
CREATE INDEX idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX idx_categories_status ON service_categories_registry(status);
